/**
 * Dobson Pilot - BLE Debug Console & Log Inspector
 * Full inspection of raw BLE GATT packets (TX/RX), manual command input,
 * quick test actions, log filtering, and text/JSON export.
 */

import { appState } from "../state.js";
import { ProtocolCommands } from "../transport/protocol.js";

export class DebugConsole {
  constructor(container, commandQueue, transportManager) {
    this.container = container;
    this.commandQueue = commandQueue;
    this.transportManager = transportManager;
    this.currentFilter = "all";
    this.autoScroll = true;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="debug-panel">
        <div class="debug-header">
          <div class="debug-title">
            <span class="debug-icon">⚙️</span>
            <span>Console di Debug BLE & Log TX/RX</span>
          </div>
          <div class="debug-actions-top">
            <button class="btn-sm" id="btn-toggle-transport">Cambia a Mock</button>
            <button class="btn-sm" id="btn-export-logs">Esporta</button>
            <button class="btn-sm" id="btn-clear-logs">Pulisci</button>
          </div>
        </div>

        <div class="debug-filters">
          <button class="filter-chip active" data-filter="all">Tutti</button>
          <button class="filter-chip" data-filter="TX">TX (Inviati)</button>
          <button class="filter-chip" data-filter="RX">RX (Ricevuti)</button>
          <button class="filter-chip" data-filter="STATUS">Status</button>
          <button class="filter-chip" data-filter="ERROR">Errori</button>
          <label class="autoscroll-label">
            <input type="checkbox" id="chk-autoscroll" checked /> Auto-scroll
          </label>
        </div>

        <div class="debug-log-view" id="debug-log-list"></div>

        <div class="debug-presets">
          <button class="btn-preset" data-cmd="CMD SHOW_SETTINGS">SHOW_SETTINGS</button>
          <button class="btn-preset" data-cmd="CMD APP_JOYSTICK START">JOYSTICK START</button>
          <button class="btn-preset" data-cmd="CMD APP DIR UP">DIR UP</button>
          <button class="btn-preset" data-cmd="CMD APP DIR STOP">DIR STOP</button>
          <button class="btn-preset" data-cmd="CMD STOP GOTO">STOP GOTO</button>
          <button class="btn-preset" data-cmd="CMD NONE">NONE (Esci)</button>
        </div>

        <form class="debug-input-bar" id="form-debug-send">
          <input 
            type="text" 
            id="input-debug-cmd" 
            placeholder="Digita comando (es. CMD SHOW_SETTINGS)" 
            autocomplete="off" 
            spellcheck="false"
          />
          <button type="submit" class="btn-gold" id="btn-send-cmd">Invia</button>
        </form>
      </div>
    `;

    this.logListEl = this.container.querySelector("#debug-log-list");
    this.inputCmdEl = this.container.querySelector("#input-debug-cmd");
    this.chkAutoScroll = this.container.querySelector("#chk-autoscroll");
    this.btnToggleTransport = this.container.querySelector("#btn-toggle-transport");

    this.bindEvents();
    this.renderLogs();
    this.updateTransportButton();
  }

  bindEvents() {
    // Form submit
    const form = this.container.querySelector("#form-debug-send");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.sendManualCommand();
    });

    // Preset buttons
    this.container.querySelectorAll(".btn-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-cmd");
        this.inputCmdEl.value = cmd;
        this.sendManualCommand();
      });
    });

    // Filters
    this.container.querySelectorAll(".filter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        this.container.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.currentFilter = chip.getAttribute("data-filter");
        this.renderLogs();
      });
    });

    // Auto-scroll checkbox
    this.chkAutoScroll.addEventListener("change", (e) => {
      this.autoScroll = e.target.checked;
    });

    // Clear logs
    this.container.querySelector("#btn-clear-logs").addEventListener("click", () => {
      appState.clearLogs();
    });

    // Export logs
    this.container.querySelector("#btn-export-logs").addEventListener("click", () => {
      this.exportLogs();
    });

    // Toggle transport (Mock / Real BLE)
    this.btnToggleTransport.addEventListener("click", async () => {
      if (this.transportManager) {
        await this.transportManager.toggleTransport();
        this.updateTransportButton();
      }
    });

    // Listen to new logs
    appState.on("log_added", (logEntry) => {
      if (this.matchesFilter(logEntry)) {
        this.appendLogEntry(logEntry);
      }
    });

    appState.on("logs_cleared", () => {
      this.logListEl.innerHTML = '<div class="debug-empty">Nessun log presente</div>';
    });

    appState.on("connection_changed", () => {
      this.updateTransportButton();
    });
  }

  updateTransportButton() {
    if (appState.isMock) {
      this.btnToggleTransport.textContent = "Passa a BLE Reale";
      this.btnToggleTransport.classList.add("active-mock");
    } else {
      this.btnToggleTransport.textContent = "Passa a Simulatore Mock";
      this.btnToggleTransport.classList.remove("active-mock");
    }
  }

  async sendManualCommand() {
    const cmd = this.inputCmdEl.value.trim();
    if (!cmd) return;

    try {
      if (!this.commandQueue.transport.connected) {
        alert("Telescopio non connesso! Connettiti via Bluetooth o attiva la modalità Mock.");
        return;
      }
      appState.addLog("TX", cmd);
      await this.commandQueue.send(cmd);
    } catch (err) {
      appState.addLog("ERROR", err.message);
    }
  }

  matchesFilter(entry) {
    if (this.currentFilter === "all") return true;
    if (this.currentFilter === "TX" && entry.direction === "TX") return true;
    if (this.currentFilter === "RX" && entry.direction === "RX") return true;
    if (this.currentFilter === "ERROR" && entry.direction === "ERROR") return true;
    if (this.currentFilter === "STATUS" && (entry.data?.type === "STATUS_BINARY" || entry.format === "status")) return true;
    return false;
  }

  renderLogs() {
    this.logListEl.innerHTML = "";
    const filtered = appState.logs.filter(entry => this.matchesFilter(entry));
    if (filtered.length === 0) {
      this.logListEl.innerHTML = '<div class="debug-empty">Nessun log corrispondente</div>';
      return;
    }
    filtered.forEach(entry => this.appendLogEntry(entry));
  }

  appendLogEntry(entry) {
    // Remove empty placeholder if present
    const emptyEl = this.logListEl.querySelector(".debug-empty");
    if (emptyEl) emptyEl.remove();

    const row = document.createElement("div");
    row.className = `log-row log-${entry.direction.toLowerCase()}`;

    let contentText = "";
    if (typeof entry.data === "string") {
      contentText = entry.data;
    } else if (entry.data instanceof Uint8Array) {
      const hex = Array.from(entry.data).map(b => b.toString(16).padStart(2, "0")).join(" ");
      const ascii = new TextDecoder().decode(entry.data).replace(/[^\x20-\x7E]/g, ".");
      contentText = `[HEX] ${hex} | [ASCII] ${ascii}`;
    } else if (typeof entry.data === "object") {
      contentText = JSON.stringify(entry.data);
    }

    row.innerHTML = `
      <span class="log-time">${entry.timestamp}</span>
      <span class="log-badge badge-${entry.direction.toLowerCase()}">${entry.direction}</span>
      <span class="log-content">${this.escapeHtml(contentText)}</span>
    `;

    this.logListEl.appendChild(row);

    if (this.autoScroll) {
      this.logListEl.scrollTop = this.logListEl.scrollHeight;
    }
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  exportLogs() {
    const textData = appState.logs.map(l => {
      let d = typeof l.data === "object" ? JSON.stringify(l.data) : l.data;
      return `[${l.timestamp}] [${l.direction}] ${d}`;
    }).join("\n");

    const blob = new Blob([textData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dobson_pilot_ble_log_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
