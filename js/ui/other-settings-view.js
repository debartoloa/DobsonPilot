/**
 * Dobson Pilot - Other Hardware Settings View
 * Configures Tracking Refresh, SkyBox Assist, Max Speed, Telescope Display, and Standalone mode.
 * Strictly formats 'CMD OTHER_SETTINGS' with 18 integer fields according to firmware specification.
 */

import { ProtocolCommands } from "../transport/protocol.js";

export class OtherSettingsView {
  /**
   * @param {Object} options
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.element = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-othersettings-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">Other Settings</h2>
      </div>
      <div class="screen-divider"></div>

      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
        Seleziona le caselle "Applica" per le sezioni che desideri modificare. Le sezioni non spuntate resteranno invariate sul telescopio.
      </div>

      <!-- Section 1: Tracking Refreshment -->
      <div class="config-card">
        <div class="card-title">
          <label class="section-apply-label">
            <input type="checkbox" id="chk-apply-trac" />
            <span>Applica Tracking Refreshment</span>
          </label>
        </div>
        <div class="card-description">Intervallo di aggiornamento dell'inseguimento siderale dei motori.</div>
        <select id="select-trac-refr" class="gold-select">
          <option value="20">0.2 s (Molto frequente)</option>
          <option value="50">0.5 s</option>
          <option value="100">1.0 s</option>
          <option value="300" selected>3.0 s (Consigliato)</option>
          <option value="500">5.0 s</option>
          <option value="1000">10.0 s</option>
          <option value="1500">15.0 s</option>
          <option value="2000">20.0 s</option>
          <option value="2500">25.0 s</option>
        </select>
      </div>

      <!-- Section 2: SkyBox Assist -->
      <div class="config-card">
        <div class="card-title">
          <label class="section-apply-label">
            <input type="checkbox" id="chk-apply-skybox" />
            <span>Applica SkyBox Assist Settings</span>
          </label>
        </div>
        <div class="card-description">Sensibilità e velocità della funzione di assistenza all'inquadratura.</div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Sensibilità</label>
            <select id="select-skybox-sens" class="gold-select">
              <option value="low">Bassa (Low)</option>
              <option value="med" selected>Media (Medium)</option>
              <option value="high">Alta (High)</option>
            </select>
          </div>
          <div>
            <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Velocità</label>
            <select id="select-skybox-speed" class="gold-select">
              <option value="slow">Lenta (Slow)</option>
              <option value="norm" selected>Normale (Normal)</option>
              <option value="fast">Veloce (Fast)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Section 3: Max Speed -->
      <div class="config-card">
        <div class="card-title">
          <label class="section-apply-label">
            <input type="checkbox" id="chk-apply-speed" />
            <span>Applica Set Max Speed</span>
          </label>
        </div>
        <div class="card-description">
          Velocità massima di puntamento rapido GoTo e manuale: <strong id="lbl-max-speed-val">4.0 °/s</strong>
        </div>
        <input 
          type="range" 
          id="slider-max-speed" 
          min="25" 
          max="70" 
          step="5" 
          value="40" 
          class="gold-slider" 
        />
        <div class="speed-ticks">
          <span>2.5 °/s</span>
          <span>4.0 °/s</span>
          <span>7.0 °/s</span>
        </div>
      </div>

      <!-- Section 4: Display Settings -->
      <div class="config-card">
        <div class="card-title">
          <label class="section-apply-label">
            <input type="checkbox" id="chk-apply-display" />
            <span>Applica Display Settings</span>
          </label>
        </div>
        <div class="card-description">Accensione/spegnimento dello schermo OLED/TFT fisico del telescopio.</div>
        <label class="toggle-control">
          <input type="checkbox" id="chk-val-display" checked />
          <span class="toggle-slider"></span>
          <span class="toggle-label">Schermo Telescopio Attivo</span>
        </label>
      </div>

      <!-- Section 5: Standalone Mode -->
      <div class="config-card">
        <div class="card-title">
          <label class="section-apply-label">
            <input type="checkbox" id="chk-apply-standalone" />
            <span>Applica Standalone Mode</span>
          </label>
        </div>
        <div class="card-description">
          Consente l'uso autonomo della levetta fisica all'avvio del telescopio, senza connessione all'app.
        </div>
        <label class="toggle-control">
          <input type="checkbox" id="chk-val-standalone" />
          <span class="toggle-slider"></span>
          <span class="toggle-label">Modalità Standalone all'Avvio</span>
        </label>
      </div>

      <!-- Send Button -->
      <button class="btn-gold btn-block" id="btn-send-other-settings" style="min-height: 52px; font-size: 16px; margin-bottom: 20px;">
        📤 Invia Modifiche al Telescopio
      </button>

      <!-- Footer Home -->
      <div class="screen-footer-home">
        <button class="btn-footer-home" id="btn-othersettings-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindEvents(el);
    return el;
  }

  bindEvents(el) {
    el.querySelector("#btn-othersettings-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-othersettings-home").addEventListener("click", () => {
      window.router?.home();
    });

    // Speed slider display
    const sliderSpeed = el.querySelector("#slider-max-speed");
    const lblSpeed = el.querySelector("#lbl-max-speed-val");
    sliderSpeed.addEventListener("input", (e) => {
      lblSpeed.textContent = `${(parseInt(e.target.value, 10) / 10).toFixed(1)} °/s`;
    });

    // Send Button
    el.querySelector("#btn-send-other-settings").addEventListener("click", async () => {
      await this.sendSettings(el);
    });
  }

  async sendSettings(el) {
    const applyDisplay = el.querySelector("#chk-apply-display").checked ? 1 : 0;
    const applySkyBox = el.querySelector("#chk-apply-skybox").checked ? 1 : 0;
    const applyStandalone = el.querySelector("#chk-apply-standalone").checked ? 1 : 0;
    const applyMaxSpeed = el.querySelector("#chk-apply-speed").checked ? 1 : 0;
    const applyTracRefr = el.querySelector("#chk-apply-trac").checked ? 1 : 0;

    const anyChecked = applyDisplay || applySkyBox || applyStandalone || applyMaxSpeed || applyTracRefr;
    if (!anyChecked) {
      alert("Spunta almeno una casella 'Applica' per inviare le modifiche.");
      return;
    }

    if (!this.queue.transport.connected) {
      alert("Telescopio non connesso! Connettiti via Bluetooth o attiva la modalità Mock.");
      return;
    }

    // Values
    const displayOn = el.querySelector("#chk-val-display").checked ? 1 : 0;
    const standaloneOn = el.querySelector("#chk-val-standalone").checked ? 1 : 0;
    const maxSpeedTenths = parseInt(el.querySelector("#slider-max-speed").value, 10) || 40;
    const tracCentisecs = parseInt(el.querySelector("#select-trac-refr").value, 10) || 300;

    const sensVal = el.querySelector("#select-skybox-sens").value;
    const speedVal = el.querySelector("#select-skybox-speed").value;

    const sensLow = sensVal === "low" ? 1 : 0;
    const sensMed = sensVal === "med" ? 1 : 0;
    const sensHigh = sensVal === "high" ? 1 : 0;

    const speedSlow = speedVal === "slow" ? 1 : 0;
    const speedNorm = speedVal === "norm" ? 1 : 0;
    const speedFast = speedVal === "fast" ? 1 : 0;

    // Build the 18-element integer array
    const fields = [
      applyDisplay,     // [0]
      applySkyBox,      // [1]
      applyStandalone,  // [2]
      applyMaxSpeed,    // [3]
      applyTracRefr,    // [4]
      0,                // [5] Unused
      displayOn,        // [6]
      0,                // [7] Unused
      sensLow,          // [8]
      sensMed,          // [9]
      sensHigh,         // [10]
      speedSlow,        // [11]
      speedNorm,        // [12]
      speedFast,        // [13]
      standaloneOn,     // [14]
      0,                // [15] Unused
      maxSpeedTenths,   // [16] (decimi di grado/s, es. 40 = 4.0 °/s)
      tracCentisecs     // [17] (centesimi di secondo, es. 300 = 3.00 s)
    ];

    const btn = el.querySelector("#btn-send-other-settings");
    btn.disabled = true;
    btn.textContent = "Invio in corso...";

    try {
      const cmd = ProtocolCommands.otherSettings(fields);
      await this.queue.send(cmd);
      alert("Parametri inviati con successo all'ESP32!");
    } catch (err) {
      alert(`Errore invio impostazioni: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "📤 Invia Modifiche al Telescopio";
    }
  }
}
