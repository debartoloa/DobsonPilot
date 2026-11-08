/**
 * Dobson Pilot - 3-Phase Status Bar Component
 * Displays:
 * Phase 1: Bluetooth Connected
 * Phase 2: Date, Time & Location Synced
 * Phase 3: Alignment Executed
 * Plus Tracking indicator & quick Bluetooth setup shortcut.
 */

import { appState } from "../state.js";

export class StatusBar {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="status-bar-wrapper">
        <div class="status-phases">
          <div class="phase-segment phase-1" title="Fase 1: Bluetooth Connesso">
            <span class="phase-dot"></span>
            <span class="phase-label">BLE</span>
          </div>
          <div class="phase-connector connector-1"></div>
          <div class="phase-segment phase-2" title="Fase 2: Ora/Data/Pos Sincronizzati">
            <span class="phase-dot"></span>
            <span class="phase-label">SYNC</span>
          </div>
          <div class="phase-connector connector-2"></div>
          <div class="phase-segment phase-3" title="Fase 3: Allineamento Eseguito">
            <span class="phase-dot"></span>
            <span class="phase-label">ALIGN</span>
          </div>
        </div>

        <div class="status-extras">
          <span class="tracking-badge" id="tracking-indicator" title="Inseguimento siderale">TRK</span>
          <button class="ble-pill-btn" id="btn-ble-status" title="Stato / Connessione Bluetooth">
            <svg class="ble-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M7 12l5 5V7l-5 5zm5-9.5v6.09L8.41 5 7 6.41 11.59 11 7 15.59 8.41 17 12 13.41V19.5l5.5-5.5L13.41 10 17.5 5.91 12 2.5z"/>
            </svg>
            <span id="ble-status-text">OFF</span>
          </button>
        </div>
      </div>
    `;

    // Listen for state changes
    appState.on("status_changed", (summary) => this.render(summary));
    appState.on("connection_changed", () => this.render(appState.getStatusSummary()));

    // Hook click to open bluetooth page
    const btn = this.container.querySelector("#btn-ble-status");
    btn.addEventListener("click", () => {
      window.router?.navigate("config-bluetooth");
    });

    this.render(appState.getStatusSummary());
  }

  render(summary) {
    const seg1 = this.container.querySelector(".phase-1");
    const seg2 = this.container.querySelector(".phase-2");
    const seg3 = this.container.querySelector(".phase-3");
    const conn1 = this.container.querySelector(".connector-1");
    const conn2 = this.container.querySelector(".connector-2");
    const trkBadge = this.container.querySelector("#tracking-indicator");
    const bleText = this.container.querySelector("#ble-status-text");
    const bleBtn = this.container.querySelector("#btn-ble-status");

    // Phase 1: Connected
    if (summary.connected) {
      seg1.classList.add("active");
      bleBtn.classList.add("connected");
      bleText.textContent = summary.isMock ? "MOCK" : "ON";
    } else {
      seg1.classList.remove("active");
      bleBtn.classList.remove("connected");
      bleText.textContent = "OFF";
    }

    // Phase 2: Synced (time + date + loc)
    if (summary.isSynced) {
      seg2.classList.add("active");
      conn1.classList.add("active");
    } else {
      seg2.classList.remove("active");
      conn1.classList.remove("active");
    }

    // Phase 3: Aligned
    if (summary.aligned) {
      seg3.classList.add("active");
      conn2.classList.add("active");
    } else {
      seg3.classList.remove("active");
      conn2.classList.remove("active");
    }

    // Tracking indicator
    if (summary.tracking) {
      trkBadge.classList.add("active");
    } else {
      trkBadge.classList.remove("active");
    }
  }
}
