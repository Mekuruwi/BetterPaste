// src/main/tray.js
// System tray icon and context menu management

const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let isActive = true;
let currentHotkeyText = 'Ctrl+Shift+V';

/**
 * Create a simple 16×16 icon using nativeImage as fallback.
 */
function createDefaultIcon() {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let r = 99, g = 102, b = 241, a = 255; // Indigo #6366f1

      // Clipboard outline
      if (x >= 3 && x <= 12 && y >= 4 && y <= 14) {
        if (x === 3 || x === 12 || y === 4 || y === 14) {
          r = 240; g = 240; b = 255;
        }
      }
      // Top bracket
      if (x >= 6 && x <= 9 && y >= 2 && y <= 5) {
        r = 255; g = 255; b = 255;
      }
      buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

/**
 * Load tray icon – prefers the PNG asset, falls back to generated icon.
 */
function loadIcon() {
  const pngPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
  if (fs.existsSync(pngPath)) {
    const img = nativeImage.createFromPath(pngPath);
    if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
  }
  return createDefaultIcon();
}

/**
 * Build context menu, taking callback functions from the main process.
 */
function buildContextMenu({ onShowSettings, onToggleActive, onQuit }) {
  return Menu.buildFromTemplate([
    {
      label: 'Configurações',
      click: () => onShowSettings(),
    },
    { type: 'separator' },
    {
      label: isActive ? '✔  Ativo' : '✘  Inativo',
      click: () => {
        isActive = !isActive;
        onToggleActive(isActive);
        tray.setContextMenu(buildContextMenu({ onShowSettings, onToggleActive, onQuit }));
        tray.setToolTip(
          isActive ? `BetterPaste - ${currentHotkeyText}` : 'BetterPaste (inativo)'
        );
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => onQuit(),
    },
  ]);
}

/**
 * Create and configure the system tray.
 */
function createTray(callbacks, hotkeyDisplay = 'Ctrl+Shift+V') {
  currentHotkeyText = hotkeyDisplay;
  const icon = loadIcon();
  tray = new Tray(icon);
  tray.setToolTip(`BetterPaste - ${currentHotkeyText}`);
  tray.setContextMenu(buildContextMenu(callbacks));

  tray.on('double-click', () => {
    callbacks.onShowSettings();
  });

  return tray;
}

function updateTrayHotkey(hotkeyDisplay) {
  currentHotkeyText = hotkeyDisplay;
  if (tray) {
    tray.setToolTip(
      isActive ? `BetterPaste - ${currentHotkeyText}` : 'BetterPaste (inativo)'
    );
  }
}

function getIsActive() {
  return isActive;
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = {
  createTray,
  destroyTray,
  getIsActive,
  updateTrayHotkey,
};
