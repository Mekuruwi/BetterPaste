// popup.js – Popup renderer logic with Funil Comercial styling

const CATEGORY_LABELS = {
  formatting: 'Formatação',
  whitespace: 'Espaços',
  case: 'Caixa de Texto',
  replace: 'Substituição',
  numbers: 'Números',
  lines: 'Linhas & Listas',
  encoding: 'Codificação',
  advanced: 'Avançado',
  custom: 'Customizadas',
};

const CATEGORY_ICONS = {
  formatting: '📝',
  whitespace: '⬜',
  case: '🔤',
  replace: '🔄',
  numbers: '🔢',
  lines: '📋',
  encoding: '🔐',
  advanced: '⚡',
  custom: '🛠',
};

let allRules = [];
let filteredRules = [];
let selectedIndex = 0;
let clipboardText = '';

// ---- Initialization ----

async function init() {
  try {
    clipboardText = await window.betterPaste.getClipboardText();
    allRules = await window.betterPaste.getRules();
    allRules = allRules.filter((r) => r.enabled);
    filteredRules = [...allRules];

    // Load active hotkey for the status bar
    try {
      const displayKey = await window.betterPaste.getHotkeyDisplay();
      if (displayKey) {
        const ind = document.getElementById('hotkey-indicator');
        if (ind) ind.textContent = displayKey;
      }
    } catch (_) {}

    renderRules();
    updatePreview();
  } catch (err) {
    console.error('Failed to initialize popup:', err);
  }
}

// ---- Rendering ----

function renderRules() {
  const listEl = document.getElementById('rules-list');
  const countEl = document.getElementById('search-count');
  listEl.innerHTML = '';

  if (countEl) {
    countEl.textContent = `${filteredRules.length} regra${filteredRules.length === 1 ? '' : 's'}`;
  }

  if (filteredRules.length === 0) {
    listEl.innerHTML = '<div class="no-results">Nenhuma regra encontrada para a busca</div>';
    return;
  }

  // Group by category
  const groups = {};
  for (const rule of filteredRules) {
    const cat = rule.category || 'custom';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(rule);
  }

  let globalIndex = 0;
  for (const [category, rules] of Object.entries(groups)) {
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<span>${CATEGORY_ICONS[category] || '🔹'}</span> ${CATEGORY_LABELS[category] || category}`;
    listEl.appendChild(header);

    for (const rule of rules) {
      const item = document.createElement('div');
      item.className = 'rule-item';
      item.dataset.index = globalIndex;
      item.dataset.ruleId = rule.id;

      if (globalIndex === selectedIndex) {
        item.classList.add('selected');
      }

      const icon = document.createElement('div');
      icon.className = 'rule-icon';
      icon.textContent = CATEGORY_ICONS[rule.category] || '⚡';

      const info = document.createElement('div');
      info.className = 'rule-info';

      const name = document.createElement('div');
      name.className = 'rule-name';
      name.textContent = rule.name;

      const desc = document.createElement('div');
      desc.className = 'rule-desc';
      desc.textContent = rule.description;

      info.appendChild(name);
      info.appendChild(desc);

      item.appendChild(icon);
      item.appendChild(info);

      // Shortcut hint 1-9
      if (globalIndex < 9) {
        const shortcut = document.createElement('span');
        shortcut.className = 'rule-shortcut';
        shortcut.textContent = globalIndex + 1;
        item.appendChild(shortcut);
      }

      item.addEventListener('click', () => applyRuleAtIndex(parseInt(item.dataset.index)));
      item.addEventListener('mouseenter', () => {
        selectedIndex = parseInt(item.dataset.index);
        highlightSelected();
        updatePreview();
      });

      listEl.appendChild(item);
      globalIndex++;
    }
  }
}

function highlightSelected() {
  const items = document.querySelectorAll('.rule-item');
  items.forEach((item) => {
    item.classList.toggle('selected', parseInt(item.dataset.index) === selectedIndex);
  });

  const selectedItem = document.querySelector('.rule-item.selected');
  if (selectedItem) {
    selectedItem.scrollIntoView({ block: 'nearest' });
  }
}

// ---- Preview ----

async function updatePreview() {
  const beforeEl = document.getElementById('preview-before-text');
  const afterEl = document.getElementById('preview-after-text');
  const ruleBadge = document.getElementById('preview-rule-name');

  const previewText = clipboardText.length > 180 ? clipboardText.slice(0, 180) + '…' : clipboardText;
  beforeEl.textContent = previewText || '(área de transferência vazia)';

  if (filteredRules.length === 0 || !clipboardText) {
    afterEl.textContent = '';
    if (ruleBadge) ruleBadge.textContent = 'Nenhuma regra';
    return;
  }

  const rule = filteredRules[selectedIndex];
  if (!rule) {
    afterEl.textContent = '';
    if (ruleBadge) ruleBadge.textContent = 'Nenhuma regra';
    return;
  }

  if (ruleBadge) {
    ruleBadge.textContent = rule.name;
  }

  try {
    const result = await window.betterPaste.applyRule(rule.id, clipboardText);
    const resultPreview = result.length > 180 ? result.slice(0, 180) + '…' : result;
    afterEl.textContent = resultPreview;
  } catch (err) {
    afterEl.textContent = `(erro: ${err.message})`;
  }
}

// ---- Search & Filtering ----

function filterRules(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    filteredRules = allRules.filter((r) => r.enabled);
  } else {
    filteredRules = allRules.filter((r) => {
      if (!r.enabled) return false;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }
  selectedIndex = 0;
  renderRules();
  updatePreview();
}

// ---- Rule Application (Direct Paste) ----

async function applyRuleAtIndex(index) {
  const rule = filteredRules[index];
  if (!rule || !clipboardText) return;

  try {
    const result = await window.betterPaste.applyRule(rule.id, clipboardText);
    // Paste directly into the active window
    await window.betterPaste.pasteText(result);
  } catch (err) {
    console.error('Failed to apply rule:', err);
  }
}

// ---- Event Handlers ----

document.addEventListener('DOMContentLoaded', init);

document.getElementById('search-input').addEventListener('input', (e) => {
  filterRules(e.target.value);
});

document.getElementById('settings-btn').addEventListener('click', () => {
  window.betterPaste.openSettings();
});

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'Escape':
      window.betterPaste.closePopup();
      break;

    case 'ArrowDown':
      e.preventDefault();
      if (filteredRules.length > 0) {
        selectedIndex = (selectedIndex + 1) % filteredRules.length;
        highlightSelected();
        updatePreview();
      }
      break;

    case 'ArrowUp':
      e.preventDefault();
      if (filteredRules.length > 0) {
        selectedIndex = (selectedIndex - 1 + filteredRules.length) % filteredRules.length;
        highlightSelected();
        updatePreview();
      }
      break;

    case 'Enter':
      e.preventDefault();
      applyRuleAtIndex(selectedIndex);
      break;

    default:
      // Number shortcuts 1-9 for quick access when search input is empty
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.altKey) {
        const searchInput = document.getElementById('search-input');
        if (searchInput.value === '') {
          const idx = parseInt(e.key) - 1;
          if (idx < filteredRules.length) {
            e.preventDefault();
            applyRuleAtIndex(idx);
          }
        }
      }
      break;
  }
});
