// src/main/config-manager.js
// Manages user rules configuration (load/save from userData/rules.json)

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(app.getPath('userData'), 'rules.json');
const PROFILES_FILE = path.join(app.getPath('userData'), 'profiles.json');

/**
 * Returns the full set of default built-in rules.
 */
function getDefaultRules() {
  return [
    {
      id: 'plain-text',
      name: 'Texto Puro',
      description: 'Remove toda formatação, cola como texto simples',
      category: 'formatting',
      enabled: true,
      type: 'builtin',
      builtinId: 'plain-text',
    },
    {
      id: 'trim-spaces',
      name: 'Remover Espaços Extras',
      description: 'Remove espaços no início/fim e colapsa espaços múltiplos',
      category: 'whitespace',
      enabled: true,
      type: 'builtin',
      builtinId: 'trim-spaces',
    },
    {
      id: 'remove-blank-lines',
      name: 'Remover Linhas em Branco',
      description: 'Remove linhas vazias do texto',
      category: 'whitespace',
      enabled: true,
      type: 'builtin',
      builtinId: 'remove-blank-lines',
    },
    {
      id: 'uppercase',
      name: 'MAIÚSCULAS',
      description: 'Converte todo o texto para maiúsculas',
      category: 'case',
      enabled: true,
      type: 'builtin',
      builtinId: 'uppercase',
    },
    {
      id: 'lowercase',
      name: 'minúsculas',
      description: 'Converte todo o texto para minúsculas',
      category: 'case',
      enabled: true,
      type: 'builtin',
      builtinId: 'lowercase',
    },
    {
      id: 'title-case',
      name: 'Primeira Maiúscula',
      description: 'Capitaliza a primeira letra de cada palavra',
      category: 'case',
      enabled: true,
      type: 'builtin',
      builtinId: 'title-case',
    },
    {
      id: 'camel-case',
      name: 'camelCase',
      description: 'Converte para camelCase',
      category: 'case',
      enabled: true,
      type: 'builtin',
      builtinId: 'camel-case',
    },
    {
      id: 'snake-case',
      name: 'snake_case',
      description: 'Converte para snake_case',
      category: 'case',
      enabled: true,
      type: 'builtin',
      builtinId: 'snake-case',
    },
    {
      id: 'kebab-case',
      name: 'kebab-case',
      description: 'Converte para kebab-case',
      category: 'case',
      enabled: true,
      type: 'builtin',
      builtinId: 'kebab-case',
    },
    {
      id: 'comma-to-semicolon',
      name: 'Vírgula → Ponto-e-vírgula',
      description: 'Substitui vírgulas por ponto-e-vírgula',
      category: 'replace',
      enabled: true,
      type: 'builtin',
      builtinId: 'comma-to-semicolon',
    },
    {
      id: 'semicolon-to-comma',
      name: 'Ponto-e-vírgula → Vírgula',
      description: 'Substitui ponto-e-vírgula por vírgulas',
      category: 'replace',
      enabled: true,
      type: 'builtin',
      builtinId: 'semicolon-to-comma',
    },
    {
      id: 'tab-to-comma',
      name: 'Tab → Vírgula',
      description: 'Substitui tabulações por vírgulas',
      category: 'replace',
      enabled: true,
      type: 'builtin',
      builtinId: 'tab-to-comma',
    },
    {
      id: 'comma-to-tab',
      name: 'Vírgula → Tab',
      description: 'Substitui vírgulas por tabulações',
      category: 'replace',
      enabled: true,
      type: 'builtin',
      builtinId: 'comma-to-tab',
    },
    {
      id: 'numbers-br-to-us',
      name: 'Números BR → US',
      description: 'Converte 1.000,50 para 1,000.50',
      category: 'numbers',
      enabled: true,
      type: 'builtin',
      builtinId: 'numbers-br-to-us',
    },
    {
      id: 'numbers-us-to-br',
      name: 'Números US → BR',
      description: 'Converte 1,000.50 para 1.000,50',
      category: 'numbers',
      enabled: true,
      type: 'builtin',
      builtinId: 'numbers-us-to-br',
    },
    {
      id: 'remove-accents',
      name: 'Remover Acentos',
      description: 'Remove acentos e marcas diacríticas',
      category: 'formatting',
      enabled: true,
      type: 'builtin',
      builtinId: 'remove-accents',
    },
    {
      id: 'remove-special-chars',
      name: 'Só Alfanuméricos',
      description: 'Mantém apenas letras, números e espaços',
      category: 'formatting',
      enabled: true,
      type: 'builtin',
      builtinId: 'remove-special-chars',
    },
    {
      id: 'add-prefix',
      name: 'Adicionar Prefixo',
      description: 'Adiciona prefixo em cada linha (configurável)',
      category: 'lines',
      enabled: true,
      type: 'builtin',
      builtinId: 'add-prefix',
      options: { prefix: '> ' },
    },
    {
      id: 'add-suffix',
      name: 'Adicionar Sufixo',
      description: 'Adiciona sufixo em cada linha (configurável)',
      category: 'lines',
      enabled: true,
      type: 'builtin',
      builtinId: 'add-suffix',
      options: { suffix: ';' },
    },
    {
      id: 'regex-replace',
      name: 'Regex Find & Replace',
      description: 'Substituição usando expressão regular (configurável)',
      category: 'advanced',
      enabled: true,
      type: 'builtin',
      builtinId: 'regex-replace',
      options: { pattern: '', replacement: '', flags: 'g' },
    },
    {
      id: 'split-lines',
      name: 'Dividir por Delimitador',
      description: 'Divide texto por delimitador em linhas separadas',
      category: 'lines',
      enabled: true,
      type: 'builtin',
      builtinId: 'split-lines',
      options: { delimiter: ',' },
    },
    {
      id: 'join-lines',
      name: 'Juntar Linhas',
      description: 'Junta todas as linhas com um delimitador',
      category: 'lines',
      enabled: true,
      type: 'builtin',
      builtinId: 'join-lines',
      options: { delimiter: ', ' },
    },
    {
      id: 'numbers-only',
      name: 'Somente Números',
      description: 'Extrai apenas dígitos do texto',
      category: 'numbers',
      enabled: true,
      type: 'builtin',
      builtinId: 'numbers-only',
    },
    {
      id: 'sort-lines-asc',
      name: 'Ordenar Linhas A→Z',
      description: 'Ordena linhas em ordem crescente',
      category: 'lines',
      enabled: true,
      type: 'builtin',
      builtinId: 'sort-lines-asc',
    },
    {
      id: 'sort-lines-desc',
      name: 'Ordenar Linhas Z→A',
      description: 'Ordena linhas em ordem decrescente',
      category: 'lines',
      enabled: true,
      type: 'builtin',
      builtinId: 'sort-lines-desc',
    },
    {
      id: 'reverse-text',
      name: 'Inverter Texto',
      description: 'Inverte a ordem dos caracteres',
      category: 'formatting',
      enabled: true,
      type: 'builtin',
      builtinId: 'reverse-text',
    },
    {
      id: 'remove-duplicates',
      name: 'Remover Duplicados',
      description: 'Remove linhas duplicadas',
      category: 'lines',
      enabled: true,
      type: 'builtin',
      builtinId: 'remove-duplicates',
    },
    {
      id: 'url-encode',
      name: 'URL Encode',
      description: 'Codifica texto para uso em URLs',
      category: 'encoding',
      enabled: true,
      type: 'builtin',
      builtinId: 'url-encode',
    },
    {
      id: 'url-decode',
      name: 'URL Decode',
      description: 'Decodifica texto codificado de URL',
      category: 'encoding',
      enabled: true,
      type: 'builtin',
      builtinId: 'url-decode',
    },
    {
      id: 'base64-encode',
      name: 'Base64 Encode',
      description: 'Codifica texto em Base64',
      category: 'encoding',
      enabled: true,
      type: 'builtin',
      builtinId: 'base64-encode',
    },
    {
      id: 'base64-decode',
      name: 'Base64 Decode',
      description: 'Decodifica texto de Base64',
      category: 'encoding',
      enabled: true,
      type: 'builtin',
      builtinId: 'base64-decode',
    },
  ];
}

/**
 * Load rules from disk, or create defaults on first run.
 */
function loadRules() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load rules, resetting to defaults:', err);
  }
  const defaults = getDefaultRules();
  saveRules(defaults);
  return defaults;
}

/**
 * Persist rules to disk.
 */
function saveRules(rules) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(rules, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save rules:', err);
  }
}

/**
 * Load profiles from disk.
 */
function loadProfiles() {
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const data = fs.readFileSync(PROFILES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load profiles:', err);
  }
  const defaultProfiles = [
    { id: 'default', name: 'Padrão', ruleIds: null }, // null = all rules
  ];
  saveProfiles(defaultProfiles);
  return defaultProfiles;
}

/**
 * Persist profiles to disk.
 */
function saveProfiles(profiles) {
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save profiles:', err);
  }
}

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

/**
 * Default general settings.
 */
function getDefaultSettings() {
  return {
    globalHotkey: 'CommandOrControl+Shift+V',
    displayHotkey: 'Ctrl+Shift+V',
    theme: 'dark',
    autoClose: true,
  };
}

/**
 * Load app settings from disk or initialize defaults.
 */
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...getDefaultSettings(), ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  const defaults = getDefaultSettings();
  saveSettings(defaults);
  return defaults;
}

/**
 * Save app settings to disk.
 */
function saveSettings(settings) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

module.exports = {
  getDefaultRules,
  loadRules,
  saveRules,
  loadProfiles,
  saveProfiles,
  loadSettings,
  saveSettings,
  getDefaultSettings,
};
