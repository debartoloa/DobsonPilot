/**
 * Dobson Pilot - Screen Templates
 * Renders views with high-fidelity gold/amber iconography and consistent navigation.
 */

import { APP_NAME, APP_VERSION, APP_CREDITS, GITHUB_REPO } from "../config.js";
import { appState } from "../state.js";

// Common SVG Icons
export const ICONS = {
  goto: `<svg viewBox="0 0 24 24"><path d="M7.5 5.6L5 7l1.4-2.5L5 2l2.5 1.4L10 2l-1.4 2.5L10 7 7.5 5.6zm12 9.8L22 14l-1.4 2.5L22 19l-2.5-1.4L17 19l1.4-2.5L17 14l2.5 1.4zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5L22 2zm-7.63 5.29c-.39-.39-1.02-.39-1.41 0L1.29 18.96c-.39.39-.39 1.02 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05c.39-.39.39-1.02 0-1.41l-2.33-2.35zm-1.06 3.47l-1.41-1.41 1.06-1.06 1.41 1.41-1.06 1.06z"/></svg>`,
  calib: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/><polygon points="12,8 13.5,11 17,11.5 14.5,14 15,17.5 12,16 9,17.5 9.5,14 7,11.5 10.5,11"/></svg>`,
  free: `<svg viewBox="0 0 24 24"><path d="M13 6.99h3L12 3 8 6.99h3v3.02H8v-3L4 11l4 4.01v-3.02h3v3.02H8L12 21l4-3.99h-3v-3.02h3v3.02L20 13l-4-4.01v3.02h-3V6.99z"/></svg>`,
  config: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
  about: `<svg viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4zm0 16v-2h12v2H6zm12-4H6v-2h12v2zm0-4h-5V4h5v8z"/><circle cx="12" cy="14" r="1.5"/><path d="M12 17v2"/></svg>`,
  ble: `<svg viewBox="0 0 24 24"><path d="M7 12l5 5V7l-5 5zm5-9.5v6.09L8.41 5 7 6.41 11.59 11 7 15.59 8.41 17 12 13.41V19.5l5.5-5.5L13.41 10 17.5 5.91 12 2.5z"/></svg>`,
  home: `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
  back: `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>`
};

function renderHeader(title, showBack = true) {
  return `
    <div class="screen-header">
      ${showBack ? `
        <button class="btn-header-back" data-action="back">
          ${ICONS.back} <span>Indietro</span>
        </button>
      ` : ""}
      <h2 class="screen-title">${title}</h2>
    </div>
    <div class="screen-divider"></div>
  `;
}

function renderFooterHome() {
  return `
    <div class="screen-footer-home">
      <button class="btn-footer-home" data-action="home" title="Torna alla Home">
        ${ICONS.home}
      </button>
    </div>
  `;
}

export const Screens = {
  // 1. HOME SCREEN
  home() {
    const el = document.createElement("div");
    el.className = "screen-container";
    el.innerHTML = `
      <div class="home-brand">
        <h1 class="home-logo-title">${APP_NAME}</h1>
        <div class="home-logo-underline"></div>
      </div>

      <div class="menu-list">
        <button class="menu-btn" data-route="goto-menu">
          <div class="menu-btn-icon">${ICONS.goto}</div>
          <div class="menu-btn-text">GoTo</div>
        </button>

        <button class="menu-btn" data-route="calib-menu">
          <div class="menu-btn-icon">${ICONS.calib}</div>
          <div class="menu-btn-text">Calib</div>
        </button>

        <button class="menu-btn" data-route="free-menu">
          <div class="menu-btn-icon">${ICONS.free}</div>
          <div class="menu-btn-text">Free</div>
        </button>

        <button class="menu-btn" data-route="config-menu">
          <div class="menu-btn-icon">${ICONS.config}</div>
          <div class="menu-btn-text">Config</div>
        </button>

        <button class="menu-btn" data-route="about">
          <div class="menu-btn-icon">${ICONS.about}</div>
          <div class="menu-btn-text">About</div>
        </button>
      </div>

      <div class="home-bottom-actions">
        <button class="ble-main-btn" data-route="config-bluetooth" title="Impostazioni Bluetooth">
          ${ICONS.ble}
        </button>
      </div>
    `;
    return el;
  },

  // 2. GOTO MENU
  gotoMenu() {
    const el = document.createElement("div");
    el.className = "screen-container";
    el.innerHTML = `
      ${renderHeader("GoTo Menu")}
      <div class="menu-list">
        <button class="menu-btn" data-route="catalog">
          <div class="menu-btn-icon">${ICONS.about}</div>
          <div class="menu-btn-text">Catalog</div>
        </button>

        <button class="menu-btn" data-route="tours">
          <div class="menu-btn-icon">${ICONS.goto}</div>
          <div class="menu-btn-text">Observing Tours</div>
        </button>

        <button class="menu-btn" data-route="game">
          <div class="menu-btn-icon">🎯</div>
          <div class="menu-btn-text">Game</div>
        </button>

        <button class="menu-btn" data-route="random">
          <div class="menu-btn-icon">🎲</div>
          <div class="menu-btn-text">Random</div>
        </button>

        <button class="menu-btn" data-route="manual">
          <div class="menu-btn-icon">📐</div>
          <div class="menu-btn-text">Manual</div>
        </button>
      </div>
      ${renderFooterHome()}
    `;
    return el;
  },

  // 3. CALIB MENU
  calibMenu() {
    const el = document.createElement("div");
    el.className = "screen-container";
    el.innerHTML = `
      ${renderHeader("Calib Menu")}
      <div class="menu-list">
        <button class="menu-btn" data-route="calib-auto-sync">
          <div class="menu-btn-icon">🔄</div>
          <div class="menu-btn-text">Auto Sync</div>
        </button>

        <button class="menu-btn" data-route="calib-1star">
          <div class="menu-btn-icon">⭐</div>
          <div class="menu-btn-text">1-Star Align</div>
        </button>

        <button class="menu-btn" data-route="calib-2star">
          <div class="menu-btn-icon">✨</div>
          <div class="menu-btn-text">2-Star Align</div>
        </button>
      </div>
      ${renderFooterHome()}
    `;
    return el;
  },

  // 4. FREE MENU
  freeMenu() {
    const el = document.createElement("div");
    el.className = "screen-container";
    el.innerHTML = `
      ${renderHeader("Free Movement")}
      <div class="menu-list">
        <button class="menu-btn" data-route="free-app-joystick">
          <div class="menu-btn-icon">${ICONS.free}</div>
          <div class="menu-btn-text">App Joystick</div>
        </button>

        <button class="menu-btn" data-route="free-analog-joystick">
          <div class="menu-btn-icon">🕹️</div>
          <div class="menu-btn-text">Scope Joystick</div>
        </button>

        <button class="menu-btn" data-route="free-hand-move">
          <div class="menu-btn-icon">✋</div>
          <div class="menu-btn-text">Hand Move</div>
        </button>
      </div>
      ${renderFooterHome()}
    `;
    return el;
  },

  // 5. CONFIG MENU
  configMenu() {
    const el = document.createElement("div");
    el.className = "screen-container";
    el.innerHTML = `
      ${renderHeader("Config")}
      <div class="menu-list">
        <button class="menu-btn" data-route="config-bluetooth">
          <div class="menu-btn-icon">${ICONS.ble}</div>
          <div class="menu-btn-text">Bluetooth</div>
        </button>

        <button class="menu-btn" data-route="config-telescope">
          <div class="menu-btn-icon">🔭</div>
          <div class="menu-btn-text">Telescope</div>
        </button>

        <button class="menu-btn" data-route="config-app">
          <div class="menu-btn-icon">📱</div>
          <div class="menu-btn-text">App Settings</div>
        </button>

        <button class="menu-btn" data-route="debug">
          <div class="menu-btn-icon">⚙️</div>
          <div class="menu-btn-text">Console Debug BLE</div>
        </button>
      </div>
      ${renderFooterHome()}
    `;
    return el;
  },

  // 6. TELESCOPE CONFIG
  configTelescope() {
    const el = document.createElement("div");
    el.className = "screen-container";
    el.innerHTML = `
      ${renderHeader("Telescope")}
      <div class="menu-list">
        <button class="menu-btn" data-route="config-calendar">
          <div class="menu-btn-icon">📅</div>
          <div class="menu-btn-text">Calendar & Location</div>
        </button>

        <button class="menu-btn" data-route="config-calibrations">
          <div class="menu-btn-icon">${ICONS.config}</div>
          <div class="menu-btn-text">Calibrations</div>
        </button>

        <button class="menu-btn" data-route="config-other">
          <div class="menu-btn-icon">⚙️</div>
          <div class="menu-btn-text">Other</div>
        </button>

        <button class="menu-btn" data-route="config-show-settings">
          <div class="menu-btn-icon">📋</div>
          <div class="menu-btn-text">Show Settings</div>
        </button>
      </div>
      ${renderFooterHome()}
    `;
    return el;
  },

  // 7. CALIBRATIONS MENU
  configCalibrations() {
    const el = document.createElement("div");
    el.className = "screen-container";
    el.innerHTML = `
      ${renderHeader("Calibrations")}
      <div class="menu-list">
        <button class="menu-btn" data-route="calib-joystick">
          <div class="menu-btn-icon">🎯</div>
          <div class="menu-btn-text">Joystick Calib</div>
        </button>

        <button class="menu-btn" data-route="calib-directions">
          <div class="menu-btn-icon">🧭</div>
          <div class="menu-btn-text">Directions</div>
        </button>

        <button class="menu-btn" data-route="calib-gear-ratio">
          <div class="menu-btn-icon">⚙️</div>
          <div class="menu-btn-text">Gear Ratio</div>
        </button>

        <button class="menu-btn" data-route="calib-backlash">
          <div class="menu-btn-icon">🔄</div>
          <div class="menu-btn-text">Backlash</div>
        </button>

        <button class="menu-btn" data-route="calib-gear-check">
          <div class="menu-btn-icon">⏱️</div>
          <div class="menu-btn-text">Gear Ratio Check</div>
        </button>

        <button class="menu-btn" data-route="calib-factory-reset">
          <div class="menu-btn-icon">⚠️</div>
          <div class="menu-btn-text">Factory Reset</div>
        </button>
      </div>
      ${renderFooterHome()}
    `;
    return el;
  },

  // 8. BLUETOOTH SETUP
  configBluetooth(transportManager) {
    const el = document.createElement("div");
    el.className = "screen-container";
    const status = appState.getStatusSummary();

    el.innerHTML = `
      ${renderHeader("Bluetooth Setup")}

      <div class="config-card">
        <div class="card-title">
          <span>Stato Connessione:</span>
          <strong style="color: ${status.connected ? 'var(--gold-highlight)' : 'var(--danger-color)'}">
            ${status.connected ? (status.isMock ? 'Simulatore Mock Attivo' : 'Connesso') : 'Disconnesso'}
          </strong>
        </div>
        <div class="card-description">
          ${status.connected 
            ? `Dispositivo: <strong>${appState.deviceName}</strong><br>Handshake READY/BUSY attivo.` 
            : 'Nessun telescopio connesso. Avvia la scansione Web Bluetooth oppure attiva il simulatore Mock.'}
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${!status.connected ? `
            <button class="btn-gold btn-block" id="btn-start-scan">
              ${ICONS.ble} <span>Start Scan (Web Bluetooth)</span>
            </button>
            <button class="btn-sm btn-block" id="btn-toggle-mock" style="min-height: 44px;">
              Attiva Simulatore Mock (Test senza hardware)
            </button>
          ` : `
            <button class="btn-gold btn-block" id="btn-disconnect" style="border-color: var(--danger-color); color: var(--danger-color);">
              Disconnetti
            </button>
          `}
        </div>
      </div>

      <div class="config-card">
        <div class="card-title">Piattaforme Supportate</div>
        <div class="card-description" style="margin-bottom: 0;">
          • <strong>Android & Desktop:</strong> Google Chrome / Edge supportano nativamente Web Bluetooth (HTTPS richiesto).<br><br>
          • <strong>iPhone / iPad (iOS):</strong> Apple Safari non include Web Bluetooth. Installa e apri questa PWA con il browser gratuito <strong>Bluefy</strong>.
        </div>
      </div>

      <div class="config-card">
        <div class="card-title">Console & Diagnostica</div>
        <button class="btn-sm btn-block" data-route="debug">
          Apri Console di Debug BLE & Log
        </button>
      </div>

      ${renderFooterHome()}
    `;

    // Hook events
    const btnScan = el.querySelector("#btn-start-scan");
    if (btnScan) {
      btnScan.addEventListener("click", async () => {
        try {
          btnScan.textContent = "Scansione in corso...";
          await transportManager.connectBle();
        } catch (err) {
          alert(`Errore scansione Bluetooth: ${err.message}`);
        } finally {
          window.router.render();
        }
      });
    }

    const btnMock = el.querySelector("#btn-toggle-mock");
    if (btnMock) {
      btnMock.addEventListener("click", async () => {
        await transportManager.setUseMock(true);
        window.router.render();
      });
    }

    const btnDisc = el.querySelector("#btn-disconnect");
    if (btnDisc) {
      btnDisc.addEventListener("click", async () => {
        await transportManager.disconnect();
        window.router.render();
      });
    }

    return el;
  },

  // 9. ABOUT SCREEN
  about() {
    const el = document.createElement("div");
    el.className = "screen-container";
    el.innerHTML = `
      ${renderHeader("About")}

      <div class="config-card" style="text-align: center;">
        <h3 style="font-family: var(--font-title); font-size: 20px; color: var(--gold-primary); margin-bottom: 6px;">
          ${APP_NAME}
        </h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
          Versione ${APP_VERSION} (Licenza MIT)
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: var(--gold-text); margin-bottom: 16px;">
          ${APP_CREDITS}. Sviluppato per sostituire l'app commerciale e controllare telescopi Dobson motorizzati (ESP32-S3 con 2 motori NEMA17 e driver TMC2209).
        </p>
        <a href="${GITHUB_REPO}" target="_blank" rel="noopener" class="btn-sm" style="display: inline-block; text-decoration: none;">
          Repository Firmware CosmoPilot (GitHub)
        </a>
      </div>

      <div class="config-card">
        <div class="card-title">Avvertenze di Sicurezza</div>
        <div class="card-description" style="margin-bottom: 0;">
          • Il GoTo e l'inseguimento sono processi autonomi gestiti dal firmware ESP32. Possono continuare anche a telefono disconnesso.<br>
          • Chiudere l'app o spegnere lo schermo NON ferma i motori: usa il pulsante <strong>Stop GoTo</strong>.<br>
          • <strong>Sicurezza Solare:</strong> Non puntare MAI il Sole senza filtro solare a tutta apertura certificato. Pericolo di cecità istantanea e danni al telescopio.
        </div>
      </div>

      ${renderFooterHome()}
    `;
    return el;
  }
};
