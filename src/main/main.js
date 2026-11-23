// src/main/main.js
// BetterPaste – main Electron process
// Creates system tray, global hotkey, popup & settings windows, and IPC handlers.

const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  dialog,
  shell,
} = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const { createTray, destroyTray, getIsActive, updateTrayHotkey } = require('./tray');
const {
  readClipboard,
  writeClipboard,
  pasteToActiveWindow,
  getActiveWindowHwnd,
} = require('./clipboard-manager');
const {
  loadRules,
  saveRules,
  loadProfiles,
  saveProfiles,
  loadSettings,
  saveSettings,
} = require('./config-manager');
const { applyTransform } = require('../transforms/engine');

// ---------------------------------------------------------------------------
// Single instance lock
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// ---------------------------------------------------------------------------
// State & references
// ---------------------------------------------------------------------------
let popupWindow = null;
let settingsWindow = null;
let rules = [];
let appSettings = {};
let lastForegroundHwnd = '0';
const APP_ICON = path.join(__dirname, '..', '..', 'assets', 'icon.png');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdateStatus(status) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('updates:status', status);
  }
}

autoUpdater.on('checking-for-update', () => sendUpdateStatus({ type: 'checking' }));
autoUpdater.on('update-available', (info) => sendUpdateStatus({ type: 'available', version: info.version }));
autoUpdater.on('update-not-available', (info) => sendUpdateStatus({ type: 'current', version: info.version }));
autoUpdater.on('download-progress', (progress) => sendUpdateStatus({
  type: 'progress',
  percent: Math.round(progress.percent),
}));
autoUpdater.on('update-downloaded', (info) => sendUpdateStatus({ type: 'downloaded', version: info.version }));
autoUpdater.on('error', (error) => sendUpdateStatus({ type: 'error', message: error.message }));

// ---------------------------------------------------------------------------
// Popup window (Floating PowerToys style)
// ---------------------------------------------------------------------------
function createPopupWindow(x, y) {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.focus();
    return;
  }

  const WIDTH = 440;
  const HEIGHT = 540;

  // Ensure window fits within the screen bounds
  const { workArea } = screen.getDisplayNearestPoint({ x, y });
  let winX = x;
  let winY = y;
  if (winX + WIDTH > workArea.x + workArea.width) winX = workArea.x + workArea.width - WIDTH;
  if (winY + HEIGHT > workArea.y + workArea.height) winY = workArea.y + workArea.height - HEIGHT;
  if (winX < workArea.x) winX = workArea.x;
  if (winY < workArea.y) winY = workArea.y;

  popupWindow = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: winX,
    y: winY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    icon: APP_ICON,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'popup-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  popupWindow.loadFile(path.join(__dirname, '..', 'renderer', 'popup', 'popup.html'));

  popupWindow.once('ready-to-show', () => {
    popupWindow.show();
  });

  // Dismiss popup when user clicks outside
  popupWindow.on('blur', () => {
    if (appSettings.autoClose !== false && popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close();
    }
  });

  popupWindow.on('closed', () => {
    popupWindow = null;
  });
}

function closePopup() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.close();
  }
}

// ---------------------------------------------------------------------------
// Settings window
// ---------------------------------------------------------------------------
function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 760,
    minHeight: 520,
    frame: false,
    show: false,
    title: 'BetterPaste - Configurações',
    icon: APP_ICON,
    backgroundColor: '#0f1021',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'settings-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings', 'settings.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Global Hotkey Manager
// ---------------------------------------------------------------------------
function registerGlobalHotkey(hotkeyString) {
  globalShortcut.unregisterAll();

  if (!getIsActive()) return true;

  const keyToRegister = hotkeyString || appSettings.globalHotkey || 'CommandOrControl+Shift+V';
  
  // Normalization for electron accelerator format
  let accelerator = keyToRegister
    .replace(/\bCtrl\b/gi, 'CommandOrControl')
    .replace(/\bSuper\b|\bWin\b/gi, 'Super')
    .replace(/\s+/g, '');

  const success = globalShortcut.register(accelerator, () => {
    if (!getIsActive()) return;

    // Capture the active window HWND right before our popup takes focus
    lastForegroundHwnd = getActiveWindowHwnd();
    const cursorPos = screen.getCursorScreenPoint();
    createPopupWindow(cursorPos.x, cursorPos.y);
  });

  if (success) {
    updateTrayHotkey(appSettings.displayHotkey || keyToRegister);
    return true;
  } else {
    console.error(`Failed to register global shortcut: ${accelerator}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------
function setupIPC() {
  // ---- Popup IPC ----

  ipcMain.handle('clipboard:read', () => {
    return readClipboard();
  });

  ipcMain.handle('rules:get', () => {
    return rules;
  });

  ipcMain.handle('hotkey:get-display', () => {
    return appSettings.displayHotkey || 'Ctrl+Shift+V';
  });

  ipcMain.handle('rule:apply', async (_event, ruleId, text, options) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) throw new Error(`Regra não encontrada: ${ruleId}`);
    return applyTransform(rule, text, options);
  });

  ipcMain.handle('paste:text', async (_event, text) => {
    // Hide popup immediately so target window begins regaining focus
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.hide();
    }
    // Paste directly and immediately into the previous window
    await pasteToActiveWindow(text, lastForegroundHwnd);
    closePopup();
  });

  ipcMain.on('popup:close', () => {
    closePopup();
  });

  ipcMain.on('settings:open', () => {
    closePopup();
    createSettingsWindow();
  });

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('updates:check', async () => {
    if (!app.isPackaged) {
      return { type: 'error', message: 'As atualizações ficam disponíveis apenas na versão instalada.' };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return { type: 'checking', version: result?.updateInfo?.version };
    } catch (error) {
      return { type: 'error', message: error.message };
    }
  });

  ipcMain.handle('updates:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { type: 'progress', percent: 0 };
    } catch (error) {
      return { type: 'error', message: error.message };
    }
  });

  ipcMain.handle('updates:install', () => {
    autoUpdater.quitAndInstall();
  });

  // ---- Settings IPC ----

  ipcMain.handle('settings:get-app', () => {
    return appSettings;
  });

  ipcMain.handle('settings:save-app', (_event, updatedSettings) => {
    appSettings = { ...appSettings, ...updatedSettings };
    saveSettings(appSettings);
    registerGlobalHotkey(appSettings.globalHotkey);
    return appSettings;
  });

  ipcMain.handle('hotkey:update', (_event, newHotkey, displayLabel) => {
    const testSuccess = registerGlobalHotkey(newHotkey);
    if (testSuccess) {
      appSettings.globalHotkey = newHotkey;
      appSettings.displayHotkey = displayLabel || newHotkey;
      saveSettings(appSettings);
      return { success: true };
    } else {
      // Revert to old
      registerGlobalHotkey(appSettings.globalHotkey);
      return {
        success: false,
        error: `Não foi possível registrar o atalho "${displayLabel || newHotkey}". Talvez já esteja em uso por outro aplicativo do Windows.`,
      };
    }
  });

  ipcMain.handle('rules:save', (_event, updatedRules) => {
    rules = updatedRules;
    saveRules(rules);
    return true;
  });

  ipcMain.handle('rule:add-custom', (_event, rule) => {
    rules.push(rule);
    saveRules(rules);
    return rules;
  });

  ipcMain.handle('rule:delete', (_event, ruleId) => {
    rules = rules.filter((r) => r.id !== ruleId);
    saveRules(rules);
    return rules;
  });

  ipcMain.handle('rule:test', async (_event, ruleOrId, text, options) => {
    const rule = typeof ruleOrId === 'string'
      ? rules.find((r) => r.id === ruleOrId)
      : ruleOrId;
    if (!rule) throw new Error(`Regra não encontrada: ${ruleOrId}`);
    return applyTransform(rule, text, options);
  });

  ipcMain.handle('profiles:get', () => {
    return loadProfiles();
  });

  ipcMain.handle('profile:save', (_event, profile) => {
    const profiles = loadProfiles();
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) profiles[idx] = profile;
    else profiles.push(profile);
    saveProfiles(profiles);
    return profiles;
  });

  ipcMain.handle('dialog:select-file', async (_event, filters) => {
    const result = await dialog.showOpenDialog(settingsWindow, {
      properties: ['openFile'],
      filters: filters || [{ name: 'Scripts', extensions: ['js', 'py', 'vbs'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('shell:open-external', (_event, url) => {
    shell.openExternal(url);
  });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  // Load persisted rules & app settings
  rules = loadRules();
  appSettings = loadSettings();

  // System tray
  createTray(
    {
      onShowSettings: createSettingsWindow,
      onToggleActive: (active) => {
        if (active) {
          registerGlobalHotkey();
        } else {
          globalShortcut.unregisterAll();
        }
      },
      onQuit: () => {
        app.quit();
      },
    },
    appSettings.displayHotkey || 'Ctrl+Shift+V'
  );

  // Register configured global hotkey
  registerGlobalHotkey();

  if (appSettings.autoCheckUpdates !== false && app.isPackaged) {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
  }

  // Setup IPC handlers
  setupIPC();
});

// Second instance – bring existing settings window to front
app.on('second-instance', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.focus();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  destroyTray();
});

// Prevent default quit on all windows closed (runs in system tray)
app.on('window-all-closed', () => {
  // Keep running in tray
});
