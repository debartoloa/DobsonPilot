/**
 * Dobson Pilot - Web Bluetooth Transport
 * Directly communicates with CosmoPilot ESP32-S3 via GATT Service 0x00FF / Char 0xFF01.
 * Supports Chrome (Android/Desktop) and Bluefy (iOS/iPadOS).
 */

import { Transport } from "./transport.js";
import { BLE_CONFIG } from "../config.js";
import { ProtocolParser } from "./protocol.js";

export class BleTransport extends Transport {
  constructor() {
    super();
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.wakeLock = null;
    this.lastConnectedDeviceId = (typeof localStorage !== "undefined")
      ? localStorage.getItem("dobson_pilot_last_ble_id")
      : null;
    this.isReconnecting = false;
  }

  /**
   * Check if Web Bluetooth API is supported in the current browser
   */
  static isSupported() {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  /**
   * Request Bluetooth device via browser picker and connect
   */
  async requestDeviceAndConnect() {
    if (!BleTransport.isSupported()) {
      throw new Error("Web Bluetooth non supportato su questo browser. Usa Chrome su Android o Bluefy su iOS.");
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: BLE_CONFIG.devicePrefix },
          { services: [BLE_CONFIG.advertisedUuid] }
        ],
        optionalServices: [
          BLE_CONFIG.serviceUuid,
          BLE_CONFIG.serviceUuid128
        ]
      });

      this.device = device;
      this.deviceName = device.name || "CosmoPilot Telescope";
      if (device.id && typeof localStorage !== "undefined") {
        localStorage.setItem("dobson_pilot_last_ble_id", device.id);
        this.lastConnectedDeviceId = device.id;
      }

      await this.connectGatt();
    } catch (err) {
      this.emit("error", { message: err.message, original: err });
      throw err;
    }
  }

  /**
   * Auto-reconnect to known device using getDevices() if available
   */
  async tryAutoReconnect() {
    if (!BleTransport.isSupported() || !navigator.bluetooth.getDevices) {
      return false;
    }

    try {
      const devices = await navigator.bluetooth.getDevices();
      const match = devices.find(d => 
        (this.lastConnectedDeviceId && d.id === this.lastConnectedDeviceId) ||
        (d.name && d.name.startsWith(BLE_CONFIG.devicePrefix))
      );

      if (match) {
        this.device = match;
        this.deviceName = match.name || "CosmoPilot Telescope";
        await this.connectGatt();
        return true;
      }
    } catch (err) {
      console.warn("Auto-reconnection failed:", err);
    }
    return false;
  }

  async connect() {
    if (this.device) {
      await this.connectGatt();
    } else {
      await this.requestDeviceAndConnect();
    }
  }

  async connectGatt() {
    if (!this.device) {
      throw new Error("Nessun dispositivo BLE selezionato.");
    }

    // Set up disconnect listener
    this.device.removeEventListener("gattserverdisconnected", this._onDisconnectedBound);
    this._onDisconnectedBound = this.onGattDisconnected.bind(this);
    this.device.addEventListener("gattserverdisconnected", this._onDisconnectedBound);

    this.server = await this.device.gatt.connect();

    // Try finding service 0x00FF or 128-bit variant
    try {
      this.service = await this.server.getPrimaryService(BLE_CONFIG.serviceUuid);
    } catch (e) {
      this.service = await this.server.getPrimaryService(BLE_CONFIG.serviceUuid128);
    }

    // Try finding characteristic 0xFF01 or 128-bit variant
    try {
      this.characteristic = await this.service.getCharacteristic(BLE_CONFIG.charUuid);
    } catch (e) {
      this.characteristic = await this.service.getCharacteristic(BLE_CONFIG.charUuid128);
    }

    // Subscribe to notifications
    await this.characteristic.startNotifications();
    this.characteristic.addEventListener("characteristicvaluechanged", this.onNotificationReceived.bind(this));

    this.isConnected = true;
    this.emit("connected", { deviceName: this.deviceName, deviceId: this.device.id });

    // Request Screen Wake Lock to avoid sleep during active observation
    this.requestScreenWakeLock();
  }

  onNotificationReceived(event) {
    const value = event.target.value;
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

    this.emit("rx", bytes);
    const parsed = ProtocolParser.parse(value);
    this.emit("packet", parsed);

    if (parsed.type === "STATUS_BINARY") {
      this.emit("status", parsed);
    } else if (parsed.type === "READY") {
      this.emit("ready");
    } else if (parsed.type === "BUSY") {
      this.emit("busy");
    }
  }

  onGattDisconnected() {
    this.isConnected = false;
    this.releaseScreenWakeLock();
    this.emit("disconnected", { deviceName: this.deviceName });
  }

  async disconnect() {
    this.releaseScreenWakeLock();
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.emit("disconnected", { deviceName: this.deviceName });
  }

  /**
   * Send single ATT packet using writeValueWithResponse
   * @param {string|Uint8Array} data
   */
  async send(data) {
    if (!this.isConnected || !this.characteristic) {
      throw new Error("Dispositivo Bluetooth non connesso.");
    }

    let bytes;
    let text;
    if (typeof data === "string") {
      text = data;
      bytes = new TextEncoder().encode(data);
    } else {
      bytes = data;
      text = new TextDecoder().decode(data);
    }

    if (bytes.length > BLE_CONFIG.maxCommandLength) {
      throw new Error(`Comando troppo lungo (${bytes.length} bytes > ${BLE_CONFIG.maxCommandLength})`);
    }

    this.emit("tx", text);
    // Real firmware requires writeValueWithResponse (no write without response supported)
    await this.characteristic.writeValueWithResponse(bytes);
  }

  async requestScreenWakeLock() {
    if ("wakeLock" in navigator && !this.wakeLock) {
      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          this.wakeLock = null;
        });
      } catch (err) {
        console.warn("Screen Wake Lock could not be acquired:", err);
      }
    }
  }

  releaseScreenWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }
}
