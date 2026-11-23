// src/preload/popup-preload.js
// Secure context bridge for the popup renderer

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('betterPaste', {
  /** Read current clipboard text */
  getClipboardText: () => ipcRenderer.invoke('clipboard:read'),

  /** Get all configured rules */
  getRules: () => ipcRenderer.invoke('rules:get'),

  /** Apply a rule to text, returning the transformed result */
  applyRule: (ruleId, text, options) => ipcRenderer.invoke('rule:apply', ruleId, text, options),

  /** Write transformed text to clipboard and paste into active window */
  pasteText: (text) => ipcRenderer.invoke('paste:text', text),

  /** Close the popup window */
  closePopup: () => ipcRenderer.send('popup:close'),

  /** Open the settings window */
  openSettings: () => ipcRenderer.send('settings:open'),

  /** Get display string of current hotkey */
  getHotkeyDisplay: () => ipcRenderer.invoke('hotkey:get-display'),

  /** Get personalized app settings */
  getAppSettings: () => ipcRenderer.invoke('settings:get-app'),

  /** Listen for clipboard updates (future use) */
  onClipboardUpdate: (callback) => {
    ipcRenderer.on('clipboard:updated', (_event, text) => callback(text));
  },
});
