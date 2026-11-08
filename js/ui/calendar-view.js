/**
 * Dobson Pilot - Calendar, Time & Location Management
 * Handles Auto Sync (1-click time/date/GPS sync) and Calendar settings.
 * All data sent to firmware is strictly in UTC and decimal coordinates (N/E positive).
 */

import { appState } from "../state.js";
import { ProtocolCommands } from "../transport/protocol.js";

const SAVED_LOCATIONS_KEY = "dobson_pilot_saved_locations";

export class CalendarView {
  /**
   * @param {Object} options
   * @param {boolean} [options.isAutoSyncOnly] - If true, displays the streamlined Auto Sync UI
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.isAutoSyncOnly = Boolean(options.isAutoSyncOnly);
    this.queue = options.commandQueue;
    this.onBack = options.onBack;

    this.savedLocations = this.loadSavedLocations();
    this.element = null;
    this.clockInterval = null;
  }

  loadSavedLocations() {
    try {
      const data = localStorage.getItem(SAVED_LOCATIONS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Error loading saved locations:", e);
    }
    return [
      { name: "Milano", lat: 45.4642, lon: 9.1900 },
      { name: "Roma", lat: 41.9028, lon: 12.4964 }
    ];
  }

  saveLocations(list) {
    this.savedLocations = list.slice(0, 5); // Max 5 favorites
    try {
      localStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(this.savedLocations));
    } catch (e) {
      console.warn("Error saving locations:", e);
    }
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    const title = this.isAutoSyncOnly ? "Auto Sync" : "Calendar & Location";

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-calendar-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">${title}</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Live Clock & GPS Status Card -->
      <div class="config-card">
        <div class="card-title">
          <span>🕒 Orario UTC Corrente</span>
          <span id="live-utc-time" style="margin-left: auto; font-family: ui-monospace, monospace; color: var(--gold-highlight); font-size: 15px;">--:--:-- UTC</span>
        </div>
        <div class="card-description" style="margin-bottom: 0;">
          Data UTC: <strong id="live-utc-date">----/--/--</strong> | Fuso Locale: <strong id="live-local-tz">--</strong>
        </div>
      </div>

      ${this.isAutoSyncOnly ? `
        <!-- Quick Auto Sync Card -->
        <div class="config-card" style="text-align: center; padding: 24px 16px;">
          <div style="font-size: 44px; margin-bottom: 12px;">🔄</div>
          <div class="card-title" style="justify-content: center; font-size: 18px;">
            Sincronizzazione Automatica
          </div>
          <div class="card-description">
            Invia al telescopio Data (UTC), Ora (UTC) e Posizione GPS rilevate automaticamente dal telefono.
          </div>

          <div style="margin: 20px 0;">
            <button class="btn-gold btn-block" id="btn-run-autosync" style="min-height: 54px; font-size: 16px;">
              🔄 Sincronizza Adesso
            </button>
          </div>

          <div id="autosync-feedback" style="display: none; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 600;"></div>
        </div>

        <div class="config-card">
          <div class="card-title">ℹ️ Nota Firmware</div>
          <div class="card-description" style="margin-bottom: 0;">
            La posizione GPS viene memorizzata nella memoria non-volatile dell'ESP32. 
            Data e Ora invece non vengono conservate allo spegnimento e vanno risincronizzate dopo ogni accensione del telescopio.
          </div>
        </div>
      ` : `
        <!-- Manual / Detailed Calendar Settings -->
        <div class="config-card">
          <div class="card-title">📅 Data & Ora (UTC)</div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Data UTC</label>
              <input type="date" id="input-date-utc" class="gold-input" />
            </div>
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Ora UTC</label>
              <input type="time" step="1" id="input-time-utc" class="gold-input" />
            </div>
          </div>

          <button class="btn-sm btn-block" id="btn-use-device-time">
            Usa Ora e Data del Telefono (UTC)
          </button>
        </div>

        <!-- Location Settings -->
        <div class="config-card">
          <div class="card-title">📍 Posizione Geografica</div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Latitudine (° Nord +)</label>
              <input type="number" step="0.0001" id="input-lat" class="gold-input" placeholder="45.4642" />
            </div>
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Longitudine (° Est +)</label>
              <input type="number" step="0.0001" id="input-lon" class="gold-input" placeholder="9.1900" />
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <button class="btn-gold" id="btn-get-gps" style="flex: 1; min-height: 40px; font-size: 13px;">
              📡 Rileva GPS
            </button>
            <button class="btn-sm" id="btn-save-as-fav" style="min-height: 40px;">
              ⭐ Salva Luogo
            </button>
          </div>

          <!-- Saved Locations List -->
          <div class="card-title" style="font-size: 13px; margin-top: 14px; margin-bottom: 8px;">
            Luoghi Preferiti (fino a 5)
          </div>
          <div id="saved-locations-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
        </div>

        <!-- Send All Button -->
        <button class="btn-gold btn-block" id="btn-send-calendar-all" style="min-height: 52px; font-size: 16px; margin-bottom: 16px;">
          📤 Invia Tutti al Telescopio
        </button>
      `}

      <!-- Footer Home -->
      <div class="screen-footer-home">
        <button class="btn-footer-home" id="btn-calendar-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindEvents(el);
    this.startClock();

    return el;
  }

  startClock() {
    const update = () => {
      const now = new Date();
      const elUtcTime = this.element?.querySelector("#live-utc-time");
      const elUtcDate = this.element?.querySelector("#live-utc-date");
      const elLocalTz = this.element?.querySelector("#live-local-tz");

      if (elUtcTime) {
        elUtcTime.textContent = `${now.toISOString().substring(11, 19)} UTC`;
      }
      if (elUtcDate) {
        elUtcDate.textContent = now.toISOString().substring(0, 10);
      }
      if (elLocalTz) {
        const offsetMin = -now.getTimezoneOffset();
        const sign = offsetMin >= 0 ? "+" : "-";
        const hours = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
        const mins = String(Math.abs(offsetMin) % 60).padStart(2, "0");
        elLocalTz.textContent = `UTC${sign}${hours}:${mins}`;
      }
    };

    update();
    this.clockInterval = setInterval(update, 1000);
  }

  bindEvents(el) {
    // Back & Home
    el.querySelector("#btn-calendar-back").addEventListener("click", () => {
      this.destroy();
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-calendar-home").addEventListener("click", () => {
      this.destroy();
      window.router?.home();
    });

    // Auto Sync button
    const btnAutoSync = el.querySelector("#btn-run-autosync");
    if (btnAutoSync) {
      btnAutoSync.addEventListener("click", () => this.runAutoSync());
    }

    // Detailed Calendar events
    if (!this.isAutoSyncOnly) {
      this.initDetailedEvents(el);
    }
  }

  initDetailedEvents(el) {
    const inputDate = el.querySelector("#input-date-utc");
    const inputTime = el.querySelector("#input-time-utc");
    const inputLat = el.querySelector("#input-lat");
    const inputLon = el.querySelector("#input-lon");

    // Populate initial inputs from device UTC
    const setInputsFromDate = () => {
      const now = new Date();
      inputDate.value = now.toISOString().substring(0, 10);
      inputTime.value = now.toISOString().substring(11, 19);
    };
    setInputsFromDate();

    // Use current settings location if exists, or first saved, or default
    if (appState.telescopeSettings.location) {
      inputLat.value = Number(appState.telescopeSettings.location.lat).toFixed(4);
      inputLon.value = Number(appState.telescopeSettings.location.lon).toFixed(4);
    } else if (this.savedLocations.length > 0) {
      inputLat.value = Number(this.savedLocations[0].lat).toFixed(4);
      inputLon.value = Number(this.savedLocations[0].lon).toFixed(4);
    } else {
      inputLat.value = "45.4642";
      inputLon.value = "9.1900";
    }

    el.querySelector("#btn-use-device-time").addEventListener("click", () => {
      setInputsFromDate();
    });

    // GPS Button
    el.querySelector("#btn-get-gps").addEventListener("click", () => {
      if (!("geolocation" in navigator)) {
        alert("Geolocalizzazione non supportata dal browser.");
        return;
      }
      const btn = el.querySelector("#btn-get-gps");
      btn.textContent = "📡 Rilevamento...";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          btn.textContent = "📡 Rileva GPS";
          inputLat.value = pos.coords.latitude.toFixed(4);
          inputLon.value = pos.coords.longitude.toFixed(4);
        },
        (err) => {
          btn.textContent = "📡 Rileva GPS";
          alert(`Impossibile ottenere posizione GPS: ${err.message}`);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    // Save Location Button
    el.querySelector("#btn-save-as-fav").addEventListener("click", () => {
      const lat = parseFloat(inputLat.value);
      const lon = parseFloat(inputLon.value);
      if (isNaN(lat) || isNaN(lon)) {
        alert("Inserisci coordinate valide prima di salvare.");
        return;
      }
      const name = prompt("Nome del luogo (es. Casa, Montagna):", `Sito ${this.savedLocations.length + 1}`);
      if (name && name.trim()) {
        this.savedLocations.push({ name: name.trim(), lat, lon });
        this.saveLocations(this.savedLocations);
        this.renderSavedLocations(el);
      }
    });

    // Send All Button
    el.querySelector("#btn-send-calendar-all").addEventListener("click", async () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso! Connettiti via Bluetooth o attiva la modalità Mock prima di inviare i dati.");
        return;
      }

      // Parse date robustly
      const dateVal = (inputDate.value || "").trim();
      let y, m, d;
      if (dateVal.includes("-")) {
        const parts = dateVal.split("-").map(Number);
        if (parts[0] > 1000) {
          [y, m, d] = parts;
        } else {
          [d, m, y] = parts;
        }
      } else if (dateVal.includes("/")) {
        const parts = dateVal.split("/").map(Number);
        if (parts[0] > 1000) {
          [y, m, d] = parts;
        } else {
          [d, m, y] = parts;
        }
      } else {
        const now = new Date();
        y = now.getUTCFullYear();
        m = now.getUTCMonth() + 1;
        d = now.getUTCDate();
      }

      // Parse time robustly
      const timeVal = (inputTime.value || "").trim();
      let h = 0, min = 0, s = 0;
      if (timeVal) {
        const tParts = timeVal.split(":").map(Number);
        h = tParts[0];
        min = tParts[1] || 0;
        s = tParts[2] || 0;
      }

      const lat = parseFloat(inputLat.value);
      const lon = parseFloat(inputLon.value);

      if (
        isNaN(y) || isNaN(m) || isNaN(d) ||
        isNaN(h) || isNaN(min) || isNaN(s) ||
        isNaN(lat) || isNaN(lon) ||
        h < 0 || h > 23 || min < 0 || min > 59 || s < 0 || s > 59 ||
        m < 1 || m > 12 || d < 1 || d > 31 || y < 2020 || y > 2060 ||
        lat < -90 || lat > 90 || lon < -180 || lon > 180
      ) {
        alert("Compila tutti i campi con valori validi (Data valida, Ora 0-23/0-59, Coordinate valide).");
        return;
      }

      const btn = el.querySelector("#btn-send-calendar-all");
      btn.disabled = true;

      try {
        btn.textContent = "1/3 Invio Data UTC...";
        await this.queue.send(ProtocolCommands.setDate(y, m, d));
        await new Promise(r => setTimeout(r, 200));

        btn.textContent = "2/3 Invio Ora UTC...";
        await this.queue.send(ProtocolCommands.setTime(h, min, s));
        await new Promise(r => setTimeout(r, 200));

        btn.textContent = "3/3 Invio Posizione...";
        await this.queue.send(ProtocolCommands.setLocation(lat, lon));
        await new Promise(r => setTimeout(r, 100));

        // Update local app state
        appState.dateSet = true;
        appState.timeSet = true;
        appState.locationSet = true;
        appState.saveTelescopeSettings({
          location: { lat, lon, name: "Posizione Osservatore" }
        });
        appState.emit("status_changed", appState.getStatusSummary());

        alert("Data, ora e posizione sincronizzate con successo nel telescopio!");
      } catch (err) {
        alert(`Errore durante l'invio: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = "📤 Invia Tutti al Telescopio";
      }
    });

    this.renderSavedLocations(el);
  }

  renderSavedLocations(el) {
    const listEl = el.querySelector("#saved-locations-list");
    if (!listEl) return;

    listEl.innerHTML = "";
    if (this.savedLocations.length === 0) {
      listEl.innerHTML = `<span style="font-size: 12px; color: var(--text-dim); font-style: italic;">Nessun luogo preferito salvato</span>`;
      return;
    }

    this.savedLocations.forEach((loc, idx) => {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.4); border: 1px solid var(--gold-dim); border-radius: 8px; padding: 6px 10px;";
      row.innerHTML = `
        <div style="cursor: pointer; flex: 1;" title="Carica coordinate">
          <strong style="color: var(--gold-highlight); font-size: 13px;">${loc.name}</strong>
          <span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">(${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)})</span>
        </div>
        <button class="btn-sm" style="padding: 2px 8px; font-size: 11px; color: var(--danger-color); border-color: rgba(231,76,60,0.3);">✕</button>
      `;

      // Click to load
      row.querySelector("div").addEventListener("click", () => {
        el.querySelector("#input-lat").value = loc.lat.toFixed(4);
        el.querySelector("#input-lon").value = loc.lon.toFixed(4);
      });

      // Click to delete
      row.querySelector("button").addEventListener("click", (e) => {
        e.stopPropagation();
        this.savedLocations.splice(idx, 1);
        this.saveLocations(this.savedLocations);
        this.renderSavedLocations(el);
      });

      listEl.appendChild(row);
    });
  }

  async runAutoSync() {
    const btn = this.element.querySelector("#btn-run-autosync");
    const feedback = this.element.querySelector("#autosync-feedback");

    if (!this.queue.transport.connected) {
      alert("Telescopio non connesso! Connettiti via Bluetooth o attiva la modalità Mock.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sincronizzazione in corso...";
    feedback.style.display = "block";
    feedback.style.background = "rgba(168, 85, 247, 0.18)";
    feedback.style.color = "var(--gold-highlight)";
    feedback.textContent = "Rilevamento coordinate GPS...";

    let lat = appState.telescopeSettings.location?.lat || 45.4642;
    let lon = appState.telescopeSettings.location?.lon || 9.1900;

    // 1. Try GPS
    try {
      if ("geolocation" in navigator) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000
          });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }
    } catch (e) {
      console.warn("GPS failed, using fallback location:", e);
    }

    // 2. Obtain current UTC time & date
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const d = now.getUTCDate();
    const h = now.getUTCHours();
    const min = now.getUTCMinutes();
    const s = now.getUTCSeconds();

    try {
      feedback.textContent = `Invio Data UTC: ${y}-${m}-${d}...`;
      await this.queue.send(ProtocolCommands.setDate(y, m, d));

      feedback.textContent = `Invio Ora UTC: ${h}:${min}:${s}...`;
      await this.queue.send(ProtocolCommands.setTime(h, min, s));

      feedback.textContent = `Invio Posizione: Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}...`;
      await this.queue.send(ProtocolCommands.setLocation(lat, lon));

      // Update local app state
      appState.dateSet = true;
      appState.timeSet = true;
      appState.locationSet = true;
      appState.saveTelescopeSettings({
        location: { lat, lon, name: "Posizione GPS" }
      });
      appState.emit("status_changed", appState.getStatusSummary());

      feedback.style.background = "rgba(46, 204, 113, 0.2)";
      feedback.style.color = "#2ecc71";
      feedback.innerHTML = "✓ Sincronizzazione completata con successo!<br><small>Fase 2 (SYNC) attiva.</small>";

    } catch (err) {
      feedback.style.background = "rgba(231, 76, 60, 0.2)";
      feedback.style.color = "#ff7675";
      feedback.textContent = `Errore di sincronizzazione: ${err.message}`;
    } finally {
      btn.disabled = false;
      btn.textContent = "🔄 Sincronizza Adesso";
    }
  }

  destroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }
}
