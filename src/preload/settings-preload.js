// src/preload/settings-preload.js
// Secure context bridge for the settings renderer

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('betterPaste', {
  /** Get all configured rules */
  getRules: () => ipcRenderer.invoke('rules:get'),

  /** Save the full rules array */
  saveRules: (rules) => ipcRenderer.invoke('rules:save', rules),

  /** Add a custom rule */
  addCustomRule: (rule) => ipcRenderer.invoke('rule:add-custom', rule),

  /** Delete a rule by id */
  deleteRule: (ruleId) => ipcRenderer.invoke('rule:delete', ruleId),

  /** Test a rule with sample text */
  testRule: (ruleId, text, options) => ipcRenderer.invoke('rule:test', ruleId, text, options),

  /** Get saved profiles */
  getProfiles: () => ipcRenderer.invoke('profiles:get'),

  /** Save a profile */
  saveProfile: (profile) => ipcRenderer.invoke('profile:save', profile),

  /** Open a file picker dialog */
  selectFilePath: (filters) => ipcRenderer.invoke('dialog:select-file', filters),

  /** Open an external URL in the default browser */
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  /** Get app configuration (hotkey, theme, etc.) */
  getAppSettings: () => ipcRenderer.invoke('settings:get-app'),

  /** Save app configuration */
  saveAppSettings: (settings) => ipcRenderer.invoke('settings:save-app', settings),

  /** Update and test global hotkey */
  updateHotkey: (hotkey, displayLabel) => ipcRenderer.invoke('hotkey:update', hotkey, displayLabel),

  /** Window controls */
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  /** Application updates */
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('updates:status', (_event, status) => callback(status));
  },
});
