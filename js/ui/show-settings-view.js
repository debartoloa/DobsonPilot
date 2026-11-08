/**
 * Dobson Pilot - Show Settings View Component
 * Queries and displays all hardware and operational parameters directly from firmware.
 * Enforces rule: screen loads empty until user taps 'Get Telescope Settings'.
 */

import { appState } from "../state.js";
import { ProtocolCommands } from "../transport/protocol.js";

export class ShowSettingsView {
  /**
   * @param {Object} options
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.element = null;
    this.unsub = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-showsettings-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">Show Settings</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Action Button Card -->
      <div class="config-card" style="text-align: center; padding: 18px 14px;">
        <button class="btn-gold btn-block" id="btn-get-settings" style="min-height: 52px; font-size: 16px;">
          📥 Get Telescope Settings
        </button>
        <div id="lbl-settings-status" style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
          Tocca il pulsante per interrogare l'ESP32 e leggere i parametri attuali.
        </div>
      </div>

      <!-- Settings Display Container -->
      <div id="settings-content-wrapper">
        ${this.renderSettingsContent(appState.telescopeSettings)}
      </div>

      <!-- Footer Home -->
      <div class="screen-footer-home">
        <button class="btn-footer-home" id="btn-showsettings-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindEvents(el);
    return el;
  }

  renderSettingsContent(s) {
    if (!s || !s.lastUpdated) {
      return `
        <div class="config-card" style="text-align: center; color: var(--text-dim); padding: 32px 16px;">
          <em>Nessuna lettura effettuata.<br>Premi "Get Telescope Settings" per richiedere i dati al firmware.</em>
        </div>
      `;
    }

    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = s.date ? `${s.date.year}-${pad(s.date.month)}-${pad(s.date.day)}` : "Non impostata";
    const timeStr = s.time ? `${pad(s.time.hour)}:${pad(s.time.minute)}:${pad(s.time.second)} UTC` : "Non impostata";
    const locStr = s.location ? `Lat ${s.location.lat.toFixed(4)}°, Lon ${s.location.lon.toFixed(4)}°` : "Non impostata";
    const lastReadTime = new Date(s.lastUpdated).toLocaleTimeString();

    return `
      <!-- Firmware & Reduction -->
      <div class="config-card">
        <div class="card-title">⚙️ Sistema & Riduzioni Meccaniche</div>
        <div class="setting-grid">
          <div class="setting-item">
            <span class="setting-label">Firmware ESP32</span>
            <span class="setting-val">${s.firmwareVersion || '2.0'}</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Gear Ratio AZ</span>
            <span class="setting-val">${s.gearAz} : 1</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Gear Ratio ALT</span>
            <span class="setting-val">${s.gearAlt} : 1</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Inversione Assi</span>
            <span class="setting-val">ALT: ${s.invAlt ? 'Sì' : 'No'} | AZ: ${s.invAz ? 'Sì' : 'No'}</span>
          </div>
        </div>
      </div>

      <!-- Time & Location -->
      <div class="config-card">
        <div class="card-title">📅 Data, Ora & Coordinate Telescopio</div>
        <div class="setting-grid">
          <div class="setting-item">
            <span class="setting-label">Data Ricevuta</span>
            <span class="setting-val">${dateStr}</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Ora UTC Ricevuta</span>
            <span class="setting-val">${timeStr}</span>
          </div>
          <div class="setting-item" style="grid-column: span 2;">
            <span class="setting-label">Posizione Geografica</span>
            <span class="setting-val">${locStr}</span>
          </div>
        </div>
      </div>

      <!-- Motion & Calibration Parameters -->
      <div class="config-card">
        <div class="card-title">🎯 Movimento & Calibrazioni</div>
        <div class="setting-grid">
          <div class="setting-item">
            <span class="setting-label">Backlash AZ</span>
            <span class="setting-val">${s.backlashAz} arcsec</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Backlash ALT</span>
            <span class="setting-val">${s.backlashAlt} arcsec</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Velocità Massima</span>
            <span class="setting-val">${(s.maxSpeed || 40) / 10} °/s</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Intervallo Tracking</span>
            <span class="setting-val">${(s.trackingRefresh || 300) / 100} s</span>
          </div>
        </div>
        ${s.idle ? `
          <div style="margin-top: 10px; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--gold-dim); padding-top: 8px;">
            Joystick Idle: X=${s.idle.xi}, Y=${s.idle.yi} | Range: X[${s.idle.xmin}..${s.idle.xmax}], Y[${s.idle.ymin}..${s.idle.ymax}]
          </div>
        ` : ""}
      </div>

      <div style="text-align: right; font-size: 11px; color: var(--text-dim); margin-top: -6px; margin-bottom: 14px;">
        Ultima lettura: ${lastReadTime}
      </div>
    `;
  }

  bindEvents(el) {
    el.querySelector("#btn-showsettings-back").addEventListener("click", () => {
      this.destroy();
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-showsettings-home").addEventListener("click", () => {
      this.destroy();
      window.router?.home();
    });

    const btnGet = el.querySelector("#btn-get-settings");
    const lblStatus = el.querySelector("#lbl-settings-status");

    btnGet.addEventListener("click", async () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso! Connettiti via Bluetooth o attiva la modalità Mock.");
        return;
      }

      btnGet.disabled = true;
      btnGet.textContent = "Lettura in corso...";
      lblStatus.textContent = "Invio CMD SHOW_SETTINGS e ricezione linee...";

      try {
        await this.queue.send(ProtocolCommands.showSettings());
        lblStatus.textContent = "✓ Lettura completata con successo!";
      } catch (err) {
        lblStatus.textContent = `Errore di lettura: ${err.message}`;
      } finally {
        btnGet.disabled = false;
        btnGet.textContent = "📥 Get Telescope Settings";
      }
    });

    // Re-render when telescope settings update
    this.unsub = appState.on("telescope_settings_updated", (settings) => {
      const container = this.element?.querySelector("#settings-content-wrapper");
      if (container) {
        container.innerHTML = this.renderSettingsContent(settings);
      }
    });
  }

  destroy() {
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
  }
}
