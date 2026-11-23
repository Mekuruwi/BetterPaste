// src/main/clipboard-manager.js
// Handles clipboard read/write and ultra-fast native paste simulation into active window

const { clipboard } = require('electron');
const { execFile, execFileSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PASTE_HELPER = path.join(__dirname, 'bin', 'paste-helper.exe');

/**
 * Get the HWND of the currently active/focused window before opening popup.
 */
function getActiveWindowHwnd() {
  try {
    if (fs.existsSync(PASTE_HELPER)) {
      const out = execFileSync(PASTE_HELPER, ['get'], { timeout: 1000 }).toString().trim();
      return out || '0';
    }
  } catch (e) {
    // ignore
  }
  return '0';
}

/**
 * Read current clipboard text content.
 */
function readClipboard() {
  return clipboard.readText();
}

/**
 * Write text to the system clipboard.
 */
function writeClipboard(text) {
  clipboard.writeText(text);
}

/**
 * Write text to the clipboard and simulate Ctrl+V in the target window.
 * Uses native paste-helper.exe (fast Windows API SetForegroundWindow + keybd_event)
 * with graceful fallback to PowerShell SendKeys.
 */
function pasteToActiveWindow(text, targetHwnd) {
  clipboard.writeText(text);

  return new Promise((resolve) => {
    // 1. Try native helper (executes in <15ms)
    if (fs.existsSync(PASTE_HELPER)) {
      const args = targetHwnd && targetHwnd !== '0' ? [String(targetHwnd)] : [];
      execFile(PASTE_HELPER, args, { timeout: 3000 }, (err) => {
        if (!err) {
          return resolve();
        }
        console.warn('paste-helper failed, trying PowerShell fallback:', err.message);
        fallbackPaste().then(resolve);
      });
      return;
    }

    // 2. Fallback
    fallbackPaste().then(resolve);
  });
}

function fallbackPaste() {
  return new Promise((resolve) => {
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Start-Sleep -Milliseconds 80
      [System.Windows.Forms.SendKeys]::SendWait('^v')
    `;

    exec(
      `powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\n/g, ' ')}"`,
      { timeout: 4000 },
      () => resolve()
    );
  });
}

module.exports = {
  readClipboard,
  writeClipboard,
  pasteToActiveWindow,
  getActiveWindowHwnd,
};
