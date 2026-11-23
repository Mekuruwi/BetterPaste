// src/transforms/engine.js
// Transformation engine – routes to built-in transforms or custom scripts

const { execFile } = require('child_process');
const path = require('path');
const vm = require('vm');
const fs = require('fs');

const SCRIPT_TIMEOUT = 10000; // 10 seconds

// ---------------------------------------------------------------------------
// Built-in transforms
// ---------------------------------------------------------------------------

/**
 * Split text into words, normalising whitespace, hyphens, underscores, and
 * camelCase boundaries.
 */
function splitWords(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const builtins = {
  'plain-text': (text) => text, // clipboard.readText already returns plain text

  'trim-spaces': (text) =>
    text
      .split('\n')
      .map((l) => l.trim().replace(/\s{2,}/g, ' '))
      .join('\n'),

  'remove-blank-lines': (text) =>
    text
      .split('\n')
      .filter((l) => l.trim() !== '')
      .join('\n'),

  uppercase: (text) => text.toUpperCase(),

  lowercase: (text) => text.toLowerCase(),

  'title-case': (text) =>
    text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),

  'camel-case': (text) => {
    const words = splitWords(text);
    if (words.length === 0) return '';
    return (
      words[0].toLowerCase() +
      words
        .slice(1)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('')
    );
  },

  'snake-case': (text) => splitWords(text).join('_').toLowerCase(),

  'kebab-case': (text) => splitWords(text).join('-').toLowerCase(),

  'comma-to-semicolon': (text) => text.replace(/,/g, ';'),

  'semicolon-to-comma': (text) => text.replace(/;/g, ','),

  'tab-to-comma': (text) => text.replace(/\t/g, ','),

  'comma-to-tab': (text) => text.replace(/,/g, '\t'),

  'numbers-br-to-us': (text) =>
    text.replace(/(\d{1,3}(?:\.\d{3})*),(\d+)/g, (_, int, dec) => {
      return int.replace(/\./g, ',') + '.' + dec;
    }),

  'numbers-us-to-br': (text) =>
    text.replace(/(\d{1,3}(?:,\d{3})*)\.(\d+)/g, (_, int, dec) => {
      return int.replace(/,/g, '.') + ',' + dec;
    }),

  'remove-accents': (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),

  'remove-special-chars': (text) => text.replace(/[^a-zA-Z0-9\s]/g, ''),

  'add-prefix': (text, opts = {}) => {
    const prefix = opts.prefix ?? '> ';
    return text
      .split('\n')
      .map((l) => prefix + l)
      .join('\n');
  },

  'add-suffix': (text, opts = {}) => {
    const suffix = opts.suffix ?? ';';
    return text
      .split('\n')
      .map((l) => l + suffix)
      .join('\n');
  },

  'regex-replace': (text, opts = {}) => {
    const { pattern, replacement = '', flags = 'g' } = opts;
    if (!pattern) return text;
    try {
      const re = new RegExp(pattern, flags);
      return text.replace(re, replacement);
    } catch {
      return text;
    }
  },

  'split-lines': (text, opts = {}) => {
    const delimiter = opts.delimiter ?? ',';
    return text.split(delimiter).join('\n');
  },

  'join-lines': (text, opts = {}) => {
    const delimiter = opts.delimiter ?? ', ';
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(delimiter);
  },

  'numbers-only': (text) => text.replace(/\D/g, ''),

  'sort-lines-asc': (text) =>
    text
      .split('\n')
      .sort((a, b) => a.localeCompare(b))
      .join('\n'),

  'sort-lines-desc': (text) =>
    text
      .split('\n')
      .sort((a, b) => b.localeCompare(a))
      .join('\n'),

  'reverse-text': (text) => [...text].reverse().join(''),

  'remove-duplicates': (text) => {
    const seen = new Set();
    return text
      .split('\n')
      .filter((line) => {
        if (seen.has(line)) return false;
        seen.add(line);
        return true;
      })
      .join('\n');
  },

  'url-encode': (text) => encodeURIComponent(text),

  'url-decode': (text) => {
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  },

  'base64-encode': (text) => Buffer.from(text, 'utf-8').toString('base64'),

  'base64-decode': (text) => {
    try {
      return Buffer.from(text, 'base64').toString('utf-8');
    } catch {
      return text;
    }
  },
};

// ---------------------------------------------------------------------------
// Custom script execution
// ---------------------------------------------------------------------------

const os = require('os');

/**
 * Run a custom script, feeding `text` via stdin and reading stdout.
 * Supported languages: js (Node.js), python, vbscript.
 * Supports either an external script file (scriptPath) or inline code (scriptCode).
 */
function applyCustomScript(rule, text) {
  const { scriptPath, scriptCode, scriptLang } = rule;
  const lang = (scriptLang || 'js').toLowerCase();

  // If inline JS code, we can run it directly via VM for maximum performance!
  if (scriptCode && (lang === 'js' || lang === 'javascript')) {
    return new Promise((resolve, reject) => {
      try {
        // Provide standard sandbox with `text` variable
        const sandbox = {
          text: String(text),
          input: String(text),
          result: null,
          console: { log: () => {} },
          Buffer: Buffer,
        };
        const context = vm.createContext(sandbox);
        // Wrap to allow return statement or direct expression
        const wrappedCode = `
          (function() {
            ${scriptCode.includes('return ') ? scriptCode : `return (${scriptCode});`}
          })()
        `;
        const res = vm.runInContext(wrappedCode, context, { timeout: SCRIPT_TIMEOUT });
        resolve(res !== undefined && res !== null ? String(res) : sandbox.result !== null ? String(sandbox.result) : '');
      } catch (err) {
        reject(new Error(`Erro ao executar script JS: ${err.message}`));
      }
    });
  }

  return new Promise((resolve, reject) => {
    let tempFilePath = null;
    let actualScriptPath = scriptPath;

    // If inline code for Python or VBScript (or JS fallback), write to a temp file
    if (scriptCode && !actualScriptPath) {
      const ext = lang.startsWith('py') ? '.py' : lang.startsWith('vb') ? '.vbs' : '.js';
      tempFilePath = path.join(os.tmpdir(), `bp_script_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`);
      try {
        fs.writeFileSync(tempFilePath, scriptCode, 'utf-8');
        actualScriptPath = tempFilePath;
      } catch (err) {
        return reject(new Error(`Falha ao criar arquivo temporário: ${err.message}`));
      }
    }

    if (!actualScriptPath) {
      return reject(new Error('Regra customizada requer um arquivo de script ou código inline.'));
    }

    // Determine executable and arguments
    let cmd;
    let args;
    const execOptions = {
      timeout: SCRIPT_TIMEOUT,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      maxBuffer: 10 * 1024 * 1024,
    };

    switch (lang) {
      case 'javascript':
      case 'js':
      case 'node':
        cmd = 'node';
        args = [actualScriptPath];
        break;
      case 'python':
      case 'py':
        cmd = 'python';
        args = [actualScriptPath];
        break;
      case 'vbscript':
      case 'vbs':
        cmd = 'cscript.exe';
        args = ['//Nologo', actualScriptPath];
        break;
      default:
        if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        return reject(new Error(`Linguagem de script não suportada: ${scriptLang}`));
    }

    const cleanup = () => {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (_) {}
      }
    };

    const child = execFile(cmd, args, execOptions, (err, stdout, stderr) => {
      cleanup();
      if (err) {
        // If 'node' wasn't found in PATH, try Electron as Node fallback
        if (err.code === 'ENOENT' && cmd === 'node' && process.execPath) {
          const fallbackChild = execFile(process.execPath, [actualScriptPath], execOptions, (fErr, fStdout, fStderr) => {
            if (fErr) reject(new Error(fStderr || fErr.message));
            else resolve(fStdout);
          });
          if (fallbackChild.stdin) {
            fallbackChild.stdin.write(text);
            fallbackChild.stdin.end();
          }
          return;
        }
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout);
      }
    });

    // Feed text via stdin
    if (child.stdin) {
      child.stdin.write(text);
      child.stdin.end();
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply a built-in transform by its builtinId.
 */
function applyBuiltin(builtinId, text, options) {
  const fn = builtins[builtinId];
  if (!fn) throw new Error(`Unknown built-in transform: ${builtinId}`);
  return fn(text, options);
}

/**
 * Apply a transform rule (built-in or custom).
 * `rule` must have at least { type, builtinId? | scriptPath?, scriptCode?, scriptLang? }.
 */
async function applyTransform(rule, text, options) {
  if (rule.type === 'builtin') {
    return applyBuiltin(rule.builtinId, text, { ...rule.options, ...options });
  }

  if (rule.type === 'custom') {
    if (!rule.scriptPath && !rule.scriptCode) {
      throw new Error('Regra customizada requer um caminho de script ou código inline');
    }
    return applyCustomScript(rule, text);
  }

  throw new Error(`Tipo de regra desconhecido: ${rule.type}`);
}

module.exports = {
  applyTransform,
  applyBuiltin,
  applyCustomScript,
};
