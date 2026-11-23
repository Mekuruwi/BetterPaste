// settings.js – Settings renderer logic with Funil Comercial design system

let rules = [];
let appSettings = {};
let editingCustomRuleId = null;
let recordingHotkey = false;
let recordedAccelerator = '';
let recordedDisplayLabel = '';

const SCRIPT_TEMPLATES = {
  js: `// A variável 'text' contém o conteúdo copiado.
// Retorne a string resultante:
return text.split('\\n').map(line => line.trim()).join('\\n');`,

  python: `# Lê de stdin e imprime em stdout
import sys

text = sys.stdin.read()
# Exemplo: prefixar linhas com >>
lines = text.splitlines()
result = "\\n".join([f">> {line}" for line in lines])
sys.stdout.write(result)`,

  vbs: `' Lê de StdIn e escreve em StdOut
Dim text
If Not WScript.StdIn.AtEndOfStream Then
    text = WScript.StdIn.ReadAll
    WScript.StdOut.Write UCase(text)
End If`,
};

// ============================================================================
// Navigation Tabs
// ============================================================================

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    item.classList.add('active');

    const tab = item.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    const targetPanel = document.getElementById(`tab-${tab}`);
    if (targetPanel) targetPanel.classList.add('active');
  });
});

// ============================================================================
// Data Initialization
// ============================================================================

async function init() {
  try {
    rules = await window.betterPaste.getRules();
    appSettings = await window.betterPaste.getAppSettings();

    renderBuiltinRules();
    renderCustomRules();
    renderHotkeySettings();
    renderGeneralSettings();
  } catch (err) {
    console.error('Failed to init settings:', err);
  }
}

// ============================================================================
// Built-in Rules Tab
// ============================================================================

function renderBuiltinRules() {
  const list = document.getElementById('builtin-rules-list');
  list.innerHTML = '';

  const searchQuery = (document.getElementById('rules-search').value || '').toLowerCase().trim();
  const categoryFilter = document.getElementById('rules-category-filter').value;

  const builtinRules = rules.filter((r) => r.type === 'builtin');

  for (const rule of builtinRules) {
    if (categoryFilter && rule.category !== categoryFilter) continue;
    if (searchQuery && !rule.name.toLowerCase().includes(searchQuery) && !rule.description.toLowerCase().includes(searchQuery)) continue;

    const card = document.createElement('div');
    card.className = 'rule-card';
    card.draggable = true;
    card.dataset.ruleId = rule.id;

    card.innerHTML = `
      <span class="drag-handle" title="Arraste para reordenar">⠿</span>
      <label class="switch">
        <input type="checkbox" ${rule.enabled ? 'checked' : ''} data-rule-id="${rule.id}" />
        <span class="slider"></span>
      </label>
      <div class="rule-card-info">
        <div class="rule-card-name">${escapeHtml(rule.name)}</div>
        <div class="rule-card-desc">${escapeHtml(rule.description)}</div>
      </div>
      <div class="rule-card-actions">
        ${rule.options ? `<button class="btn-icon" data-action="configure" data-rule-id="${rule.id}" title="Configurar Parâmetros">⚙</button>` : ''}
      </div>
    `;

    // Toggle
    const checkbox = card.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => onToggleRule(rule.id, checkbox.checked));

    // Configure options
    const configBtn = card.querySelector('[data-action="configure"]');
    if (configBtn) {
      configBtn.addEventListener('click', () => openRuleOptions(rule));
    }

    // Drag and drop
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragover', onDragOver);
    card.addEventListener('drop', onDrop);
    card.addEventListener('dragend', onDragEnd);

    list.appendChild(card);
  }
}

async function onToggleRule(ruleId, enabled) {
  const rule = rules.find((r) => r.id === ruleId);
  if (rule) {
    rule.enabled = enabled;
    await window.betterPaste.saveRules(rules);
  }
}

// ---- Rule Options Panel ----

let optionsRuleId = null;

function openRuleOptions(rule) {
  optionsRuleId = rule.id;
  const panel = document.getElementById('rule-options-panel');
  const title = document.getElementById('rule-options-title');
  const form = document.getElementById('rule-options-form');

  title.textContent = `Configurar: ${rule.name}`;
  form.innerHTML = '';

  const opts = rule.options || {};
  for (const [key, value] of Object.entries(opts)) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = `Parâmetro "${key}"`;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.dataset.optionKey = key;

    group.appendChild(label);
    group.appendChild(input);
    form.appendChild(group);
  }

  panel.classList.remove('hidden');
}

document.getElementById('rule-options-save').addEventListener('click', async () => {
  const rule = rules.find((r) => r.id === optionsRuleId);
  if (!rule) return;

  const inputs = document.querySelectorAll('#rule-options-form input');
  inputs.forEach((input) => {
    rule.options[input.dataset.optionKey] = input.value;
  });

  await window.betterPaste.saveRules(rules);
  document.getElementById('rule-options-panel').classList.add('hidden');
});

document.getElementById('rule-options-cancel').addEventListener('click', () => {
  document.getElementById('rule-options-panel').classList.add('hidden');
});

// ---- Drag and drop reordering ----

let draggedId = null;

function onDragStart(e) {
  draggedId = e.currentTarget.dataset.ruleId;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function onDrop(e) {
  e.preventDefault();
  const targetId = e.currentTarget.dataset.ruleId;
  if (!draggedId || draggedId === targetId) return;

  const fromIdx = rules.findIndex((r) => r.id === draggedId);
  const toIdx = rules.findIndex((r) => r.id === targetId);
  if (fromIdx < 0 || toIdx < 0) return;

  const [moved] = rules.splice(fromIdx, 1);
  rules.splice(toIdx, 0, moved);

  window.betterPaste.saveRules(rules);
  renderBuiltinRules();
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  draggedId = null;
}

document.getElementById('rules-search').addEventListener('input', renderBuiltinRules);
document.getElementById('rules-category-filter').addEventListener('change', renderBuiltinRules);

// ============================================================================
// Custom Rules Tab
// ============================================================================

function renderCustomRules() {
  const list = document.getElementById('custom-rules-list');
  const countBadge = document.getElementById('custom-rules-count-badge');
  list.innerHTML = '';

  const customRules = rules.filter((r) => r.type === 'custom');
  if (countBadge) countBadge.textContent = customRules.length;

  if (customRules.length === 0) {
    list.innerHTML = `
      <div class="card" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
        <p style="font-size: 14px; margin-bottom: 12px;">Nenhuma regra customizada criada ainda.</p>
        <button class="btn btn-primary" onclick="document.getElementById('add-custom-rule-btn').click()">+ Criar Primeira Regra</button>
      </div>
    `;
    return;
  }

  for (const rule of customRules) {
    const card = document.createElement('div');
    card.className = 'rule-card';
    card.dataset.ruleId = rule.id;

    const langBadge = (rule.scriptLang || 'js').toUpperCase();

    card.innerHTML = `
      <label class="switch">
        <input type="checkbox" ${rule.enabled ? 'checked' : ''} data-rule-id="${rule.id}" />
        <span class="slider"></span>
      </label>
      <div class="rule-card-info">
        <div class="rule-card-name">
          ${escapeHtml(rule.name)}
          <span class="badge badge-accent" style="margin-left: 8px;">${langBadge}</span>
        </div>
        <div class="rule-card-desc">${escapeHtml(rule.description || 'Regra personalizada')}</div>
      </div>
      <div class="rule-card-actions">
        <button class="btn-icon" data-action="edit" data-rule-id="${rule.id}" title="Editar">✏</button>
        <button class="btn-icon btn-danger" data-action="delete" data-rule-id="${rule.id}" title="Excluir">🗑</button>
      </div>
    `;

    card.querySelector('input[type="checkbox"]').addEventListener('change', (e) => onToggleRule(rule.id, e.target.checked));
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editCustomRule(rule));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteCustomRule(rule.id));

    list.appendChild(card);
  }
}

function updateSourceTypeVisibility() {
  const sourceType = document.getElementById('custom-rule-source-type').value;
  const inlineGroup = document.getElementById('inline-code-group');
  const fileGroup = document.getElementById('file-path-group');

  if (sourceType === 'inline') {
    inlineGroup.classList.remove('hidden');
    fileGroup.classList.add('hidden');
  } else {
    inlineGroup.classList.add('hidden');
    fileGroup.classList.remove('hidden');
  }
}

document.getElementById('custom-rule-source-type').addEventListener('change', updateSourceTypeVisibility);

document.getElementById('custom-rule-lang').addEventListener('change', (e) => {
  const codeEl = document.getElementById('custom-rule-code');
  const lang = e.target.value;
  if (!codeEl.value.trim() && SCRIPT_TEMPLATES[lang]) {
    codeEl.value = SCRIPT_TEMPLATES[lang];
  }
});

document.getElementById('insert-template-btn').addEventListener('click', () => {
  const lang = document.getElementById('custom-rule-lang').value;
  const codeEl = document.getElementById('custom-rule-code');
  if (SCRIPT_TEMPLATES[lang]) {
    codeEl.value = SCRIPT_TEMPLATES[lang];
  }
});

document.getElementById('add-custom-rule-btn').addEventListener('click', () => {
  editingCustomRuleId = null;
  document.getElementById('editor-title').textContent = 'Nova Regra Customizada';
  document.getElementById('custom-rule-name').value = '';
  document.getElementById('custom-rule-desc').value = '';
  document.getElementById('custom-rule-lang').value = 'js';
  document.getElementById('custom-rule-source-type').value = 'inline';
  document.getElementById('custom-rule-code').value = SCRIPT_TEMPLATES.js;
  document.getElementById('custom-rule-path').value = '';
  document.getElementById('custom-test-input').value = 'Linha 1\nLinha 2\nLinha 3';
  document.getElementById('custom-test-output').textContent = '(clique em Executar Teste)';
  updateSourceTypeVisibility();
  document.getElementById('custom-rule-editor').classList.remove('hidden');
  document.getElementById('custom-rule-editor').scrollIntoView({ behavior: 'smooth' });
});

function editCustomRule(rule) {
  editingCustomRuleId = rule.id;
  document.getElementById('editor-title').textContent = 'Editar Regra Customizada';
  document.getElementById('custom-rule-name').value = rule.name;
  document.getElementById('custom-rule-desc').value = rule.description || '';
  document.getElementById('custom-rule-lang').value = rule.scriptLang || 'js';

  if (rule.scriptCode) {
    document.getElementById('custom-rule-source-type').value = 'inline';
    document.getElementById('custom-rule-code').value = rule.scriptCode;
    document.getElementById('custom-rule-path').value = '';
  } else {
    document.getElementById('custom-rule-source-type').value = 'file';
    document.getElementById('custom-rule-path').value = rule.scriptPath || '';
    document.getElementById('custom-rule-code').value = '';
  }

  document.getElementById('custom-test-input').value = 'Texto de teste';
  document.getElementById('custom-test-output').textContent = '(clique em Executar Teste)';
  updateSourceTypeVisibility();
  document.getElementById('custom-rule-editor').classList.remove('hidden');
  document.getElementById('custom-rule-editor').scrollIntoView({ behavior: 'smooth' });
}

async function deleteCustomRule(ruleId) {
  if (!confirm('Tem certeza que deseja excluir esta regra customizada?')) return;
  rules = await window.betterPaste.deleteRule(ruleId);
  renderCustomRules();
}

document.getElementById('browse-script-btn').addEventListener('click', async () => {
  const lang = document.getElementById('custom-rule-lang').value;
  const extMap = { js: 'js', python: 'py', vbs: 'vbs' };
  const ext = extMap[lang] || '*';
  const filePath = await window.betterPaste.selectFilePath([
    { name: 'Scripts', extensions: [ext] },
  ]);
  if (filePath) {
    document.getElementById('custom-rule-path').value = filePath;
  }
});

document.getElementById('custom-test-btn').addEventListener('click', async () => {
  const input = document.getElementById('custom-test-input').value;
  const output = document.getElementById('custom-test-output');
  const lang = document.getElementById('custom-rule-lang').value;
  const sourceType = document.getElementById('custom-rule-source-type').value;
  const code = document.getElementById('custom-rule-code').value;
  const scriptPath = document.getElementById('custom-rule-path').value.trim();

  output.textContent = 'Executando teste...';

  const testRuleObj = {
    type: 'custom',
    scriptLang: lang,
    scriptCode: sourceType === 'inline' ? code : undefined,
    scriptPath: sourceType === 'file' ? scriptPath : undefined,
  };

  try {
    const result = await window.betterPaste.testRule(testRuleObj, input);
    output.textContent = result || '(resultado vazio)';
  } catch (err) {
    output.textContent = `Erro: ${err.message}`;
  }
});

document.getElementById('custom-save-btn').addEventListener('click', async () => {
  const name = document.getElementById('custom-rule-name').value.trim();
  const desc = document.getElementById('custom-rule-desc').value.trim();
  const lang = document.getElementById('custom-rule-lang').value;
  const sourceType = document.getElementById('custom-rule-source-type').value;
  const code = document.getElementById('custom-rule-code').value;
  const scriptPath = document.getElementById('custom-rule-path').value.trim();

  if (!name) return alert('Por favor, informe o nome da regra.');
  if (sourceType === 'file' && !scriptPath) return alert('Selecione o arquivo de script no disco.');
  if (sourceType === 'inline' && !code.trim()) return alert('Digite o código do script.');

  if (editingCustomRuleId) {
    const rule = rules.find((r) => r.id === editingCustomRuleId);
    if (rule) {
      rule.name = name;
      rule.description = desc;
      rule.scriptLang = lang;
      if (sourceType === 'inline') {
        rule.scriptCode = code;
        delete rule.scriptPath;
      } else {
        rule.scriptPath = scriptPath;
        delete rule.scriptCode;
      }
      await window.betterPaste.saveRules(rules);
    }
  } else {
    const id = 'custom-' + Date.now();
    const newRule = {
      id,
      name,
      description: desc,
      category: 'custom',
      enabled: true,
      type: 'custom',
      scriptLang: lang,
      ...(sourceType === 'inline' ? { scriptCode: code } : { scriptPath }),
    };
    rules = await window.betterPaste.addCustomRule(newRule);
    editingCustomRuleId = id;
  }

  document.getElementById('custom-rule-editor').classList.add('hidden');
  renderCustomRules();
});

document.getElementById('custom-cancel-btn').addEventListener('click', () => {
  document.getElementById('custom-rule-editor').classList.add('hidden');
});

// ============================================================================
// Configurable Global Hotkey
// ============================================================================

function renderHotkeySettings() {
  const currentKey = appSettings.displayHotkey || 'Ctrl+Shift+V';
  const displayContainer = document.getElementById('active-hotkey-display');
  const sidebarKey = document.getElementById('sidebar-current-hotkey');

  if (sidebarKey) sidebarKey.textContent = currentKey;

  if (displayContainer) {
    displayContainer.innerHTML = currentKey
      .split('+')
      .map((k) => `<kbd>${k.trim()}</kbd>`)
      .join(' + ');
  }
}

const recorderBox = document.getElementById('recorder-display');
const recorderPrompt = document.getElementById('recorder-prompt');
const saveHotkeyBtn = document.getElementById('save-hotkey-btn');
const resetHotkeyBtn = document.getElementById('reset-hotkey-btn');
const feedbackEl = document.getElementById('hotkey-feedback');

recorderBox.addEventListener('click', startRecording);
recorderBox.addEventListener('focus', startRecording);

function startRecording() {
  recordingHotkey = true;
  recorderBox.classList.add('recording');
  recorderPrompt.textContent = 'Pressione as teclas no teclado... (ex: Ctrl+Alt+V)';
}

recorderBox.addEventListener('keydown', (e) => {
  if (!recordingHotkey) return;

  e.preventDefault();
  e.stopPropagation();

  if (e.key === 'Escape') {
    stopRecording();
    return;
  }

  // Modifiers
  const modifiers = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey) modifiers.push('Shift');
  if (e.metaKey) modifiers.push('Win');

  // Key
  let key = e.key;
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    // Modifier only, keep waiting for the main key
    recorderPrompt.innerHTML = modifiers.map((m) => `<kbd>${m}</kbd>`).join(' + ') + ' + ...';
    return;
  }

  // Format main key
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();

  const allParts = [...modifiers, key];
  recordedDisplayLabel = allParts.join('+');

  // Map to electron accelerator format
  const acceleratorParts = allParts.map((p) => {
    if (p === 'Ctrl') return 'CommandOrControl';
    if (p === 'Win') return 'Super';
    return p;
  });
  recordedAccelerator = acceleratorParts.join('+');

  recorderPrompt.innerHTML = allParts.map((p) => `<kbd>${p}</kbd>`).join(' + ');
  recorderBox.classList.remove('recording');
  recordingHotkey = false;

  saveHotkeyBtn.disabled = false;
});

function stopRecording() {
  recordingHotkey = false;
  recorderBox.classList.remove('recording');
  recorderPrompt.textContent = 'Clique aqui e pressione as teclas desejadas...';
  saveHotkeyBtn.disabled = true;
}

saveHotkeyBtn.addEventListener('click', async () => {
  if (!recordedAccelerator) return;

  saveHotkeyBtn.disabled = true;
  saveHotkeyBtn.textContent = 'Registrando...';

  try {
    const result = await window.betterPaste.updateHotkey(recordedAccelerator, recordedDisplayLabel);

    if (result.success) {
      appSettings.globalHotkey = recordedAccelerator;
      appSettings.displayHotkey = recordedDisplayLabel;
      renderHotkeySettings();

      feedbackEl.className = 'feedback-msg success';
      feedbackEl.textContent = `✔ Atalho "${recordedDisplayLabel}" registrado com sucesso!`;
      feedbackEl.classList.remove('hidden');
      stopRecording();
    } else {
      feedbackEl.className = 'feedback-msg error';
      feedbackEl.textContent = `✘ ${result.error || 'Falha ao registrar atalho'}`;
      feedbackEl.classList.remove('hidden');
    }
  } catch (err) {
    feedbackEl.className = 'feedback-msg error';
    feedbackEl.textContent = `✘ Erro: ${err.message}`;
    feedbackEl.classList.remove('hidden');
  } finally {
    saveHotkeyBtn.textContent = 'Salvar Atalho';
  }
});

resetHotkeyBtn.addEventListener('click', async () => {
  const result = await window.betterPaste.updateHotkey('CommandOrControl+Shift+V', 'Ctrl+Shift+V');
  if (result.success) {
    appSettings.globalHotkey = 'CommandOrControl+Shift+V';
    appSettings.displayHotkey = 'Ctrl+Shift+V';
    renderHotkeySettings();
    feedbackEl.className = 'feedback-msg success';
    feedbackEl.textContent = '✔ Atalho restaurado para o padrão (Ctrl+Shift+V).';
    feedbackEl.classList.remove('hidden');
    stopRecording();
  }
});

// ============================================================================
// General Tab
// ============================================================================

function renderGeneralSettings() {
  const autoCloseCheck = document.getElementById('setting-auto-close');
  if (autoCloseCheck) {
    autoCloseCheck.checked = appSettings.autoClose !== false;
    autoCloseCheck.addEventListener('change', async (e) => {
      appSettings.autoClose = e.target.checked;
      await window.betterPaste.saveAppSettings(appSettings);
    });
  }

  const accentInput = document.getElementById('setting-accent-color');
  if (accentInput) {
    accentInput.value = appSettings.accentColor || '#6366f1';
    accentInput.addEventListener('change', async (e) => {
      appSettings.accentColor = e.target.value;
      await window.betterPaste.saveAppSettings(appSettings);
    });
  }

  const autoUpdatesCheck = document.getElementById('setting-auto-updates');
  if (autoUpdatesCheck) {
    autoUpdatesCheck.checked = appSettings.autoCheckUpdates !== false;
    autoUpdatesCheck.addEventListener('change', async (e) => {
      appSettings.autoCheckUpdates = e.target.checked;
      await window.betterPaste.saveAppSettings(appSettings);
    });
  }

  setupUpdateControls();
}

async function setupUpdateControls() {
  const statusEl = document.getElementById('update-status');
  const versionEl = document.getElementById('app-version');
  const checkBtn = document.getElementById('check-update-btn');
  const downloadBtn = document.getElementById('download-update-btn');
  const installBtn = document.getElementById('install-update-btn');

  if (versionEl) {
    versionEl.textContent = await window.betterPaste.getAppVersion();
  }

  checkBtn?.addEventListener('click', async () => {
    statusEl.textContent = 'Verificando novas versões...';
    const result = await window.betterPaste.checkForUpdates();
    if (result.type === 'error') statusEl.textContent = result.message;
  });

  downloadBtn?.addEventListener('click', () => window.betterPaste.downloadUpdate());
  installBtn?.addEventListener('click', () => window.betterPaste.installUpdate());

  window.betterPaste.onUpdateStatus((status) => {
    downloadBtn?.classList.add('hidden');
    installBtn?.classList.add('hidden');
    if (status.type === 'checking') statusEl.textContent = 'Verificando novas versões...';
    if (status.type === 'available') {
      statusEl.textContent = `Nova versão disponível: ${status.version}`;
      downloadBtn?.classList.remove('hidden');
    }
    if (status.type === 'current') statusEl.textContent = `Você está usando a versão mais recente (${status.version}).`;
    if (status.type === 'progress') statusEl.textContent = `Baixando atualização... ${status.percent}%`;
    if (status.type === 'downloaded') {
      statusEl.textContent = `Versão ${status.version} pronta para instalar.`;
      installBtn?.classList.remove('hidden');
    }
    if (status.type === 'error') statusEl.textContent = status.message || 'Não foi possível verificar atualizações.';
  });
}

// ============================================================================
// Utility
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);

document.getElementById('minimize-window')?.addEventListener('click', () => {
  window.betterPaste.minimizeWindow();
});

document.getElementById('close-window')?.addEventListener('click', () => {
  window.betterPaste.closeWindow();
});
