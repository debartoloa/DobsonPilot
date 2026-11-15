/**
 * Dobson Pilot - Global Reactive State
 * Centralized state for connection, 3-phase telescope status, settings & logs.
 */

import { DEFAULT_SETTINGS } from "./config.js";

class AppState {
  constructor() {
    this.listeners = new Map();

    // Connection & Transport
    this.connected = false;
    this.isMock = false;
    this.deviceName = "Disconnesso";
    this.deviceId = null;

    // 3-Phase Status Bits from firmware 0x53 status byte
    this.statusByte = 0;
    this.tracking = false;
    this.aligned = false;
    this.timeSet = false;
    this.dateSet = false;
    this.locationSet = false;

    // Pointing coordinates (from RADEC notifications)
    this.currentRa = { h: 0, m: 0, s: 0 };
    this.currentDec = { deg: 0, min: 0, sec: 0 };

    // Telescope hardware settings (from SHOW_SETTINGS or user save)
    this.telescopeSettings = this.loadTelescopeSettings();

    // User settings
    this.settings = this.loadSettings();

    // TX/RX Log history for Debug Console
    this.logs = [];
    this.maxLogs = 500;
  }

  loadTelescopeSettings() {
    const defaults = {
      firmwareVersion: "Sconosciuta",
      gearAz: 61.53,
      gearAlt: 6.4,
      idle: null,
      invAlt: 0,
      invAz: 0,
      date: null,
      time: null,
      location: { lat: 45.4642, lon: 9.1900 },
      backlashAz: 0,
      backlashAlt: 0,
      maxSpeed: 4.0,
      trackingRefresh: 3.0,
      lastUpdated: null
    };
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("dobson_pilot_telescope_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Migrate old default placeholder 60:60 to the new customized defaults
          if (parsed.gearAz === 60 && parsed.gearAlt === 60) {
            parsed.gearAz = 61.53;
            parsed.gearAlt = 6.4;
          }
          return { ...defaults, ...parsed };
        }
      }
    } catch (e) {
      console.warn("Failed loading saved telescope settings:", e);
    }
    return defaults;
  }

  saveTelescopeSettings(newSettings) {
    this.telescopeSettings = { ...this.telescopeSettings, ...newSettings };
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("dobson_pilot_telescope_settings", JSON.stringify(this.telescopeSettings));
      }
    } catch (e) {
      console.warn("Failed saving telescope settings:", e);
    }
    this.emit("telescope_settings_changed", this.telescopeSettings);
  }

  loadSettings() {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("dobson_pilot_settings");
        if (saved) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
      }
    } catch (e) {
      console.warn("Failed loading saved settings:", e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("dobson_pilot_settings", JSON.stringify(this.settings));
      }
    } catch (e) {
      console.warn("Failed saving settings:", e);
    }
    this.emit("settings_changed", this.settings);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in state event '${event}':`, err);
        }
      }
    }
  }

  updateConnection(connected, deviceName = "Disconnesso", isMock = false, deviceId = null) {
    this.connected = connected;
    this.deviceName = deviceName;
    this.isMock = isMock;
    this.deviceId = deviceId;

    if (!connected) {
      this.statusByte = 0;
      this.tracking = false;
      this.aligned = false;
      this.timeSet = false;
      this.dateSet = false;
      this.locationSet = false;
    }

    this.emit("connection_changed", {
      connected: this.connected,
      deviceName: this.deviceName,
      isMock: this.isMock
    });
    this.emit("status_changed", this.getStatusSummary());
  }

  updateStatus(statusPacket) {
    this.statusByte = statusPacket.statusByte;
    this.tracking = statusPacket.tracking;
    this.aligned = statusPacket.aligned;
    this.timeSet = statusPacket.timeSet;
    this.dateSet = statusPacket.dateSet;
    this.locationSet = statusPacket.locationSet;

    this.emit("status_changed", this.getStatusSummary());
  }

  updateRaDec(ra, dec) {
    this.currentRa = ra;
    this.currentDec = dec;
    this.emit("radec_changed", { ra, dec });
  }

  /**
   * 3-Phase status evaluation:
   * Phase 1: Bluetooth Connected
   * Phase 2: Date, Time & Location synced
   * Phase 3: Alignment performed
   */
  getStatusSummary() {
    const isSynced = this.timeSet && this.dateSet && this.locationSet;
    let phase = 0;
    if (this.connected) phase = 1;
    if (this.connected && isSynced) phase = 2;
    if (this.connected && isSynced && this.aligned) phase = 3;

    return {
      connected: this.connected,
      isSynced,
      aligned: this.aligned,
      tracking: this.tracking,
      timeSet: this.timeSet,
      dateSet: this.dateSet,
      locationSet: this.locationSet,
      phase, // 0 to 3
      isMock: this.isMock
    };
  }

  get isSynced() {
    return this.timeSet && this.dateSet && this.locationSet;
  }

  get telescopeStatus() {
    return {
      isSynced: this.isSynced,
      aligned: this.aligned,
      tracking: this.tracking,
      timeSet: this.timeSet,
      dateSet: this.dateSet,
      locationSet: this.locationSet
    };
  }

  addLog(direction, data, format = "text") {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString().substring(11, 23),
      direction, // 'TX' | 'RX' | 'INFO' | 'ERROR'
      data,
      format
    };
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.emit("log_added", logEntry);
  }

  clearLogs() {
    this.logs = [];
    this.emit("logs_cleared");
  }
}

export const appState = new AppState();
