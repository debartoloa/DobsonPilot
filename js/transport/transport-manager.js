/**
 * Dobson Pilot - Transport Manager
 * Orchestrates BleTransport and MockTransport, maintains active CommandQueue,
 * and feeds telemetry and status into appState.
 */

import { BleTransport } from "./ble-transport.js";
import { MockTransport } from "./mock-transport.js";
import { CommandQueue } from "./command-queue.js";
import { appState } from "../state.js";

export class TransportManager {
  constructor() {
    this.bleTransport = new BleTransport();
    this.mockTransport = new MockTransport();
    this.activeTransport = this.bleTransport;
    this.commandQueue = new CommandQueue(this.activeTransport);

    this.bindTransportEvents(this.bleTransport, false);
    this.bindTransportEvents(this.mockTransport, true);
  }

  bindTransportEvents(transport, isMock) {
    transport.on("connected", (info) => {
      appState.updateConnection(true, info.deviceName, isMock, info.deviceId);
      appState.addLog("INFO", `Connesso a ${info.deviceName} (${isMock ? "Mock" : "BLE"})`);
    });

    transport.on("disconnected", (info) => {
      appState.updateConnection(false, "Disconnesso", isMock, null);
      appState.addLog("INFO", `Disconnesso da ${info.deviceName || "dispositivo"}`);
    });

    transport.on("status", (status) => {
      appState.updateStatus(status);
      appState.addLog("RX", `[STATUS] Trk:${status.tracking ? 1 : 0} Aln:${status.aligned ? 1 : 0} Time:${status.timeSet ? 1 : 0} Date:${status.dateSet ? 1 : 0} Loc:${status.locationSet ? 1 : 0}`, "status");
    });

    transport.on("packet", (packet) => {
      if (packet.type === "RADEC") {
        appState.updateRaDec(packet.ra, packet.dec);
      } else if (packet.type === "SETTING_LINE") {
        this.handleSettingLine(packet);
      }
    });

    transport.on("tx", (cmd) => {
      appState.addLog("TX", cmd);
    });

    transport.on("rx", (bytes) => {
      const text = new TextDecoder().decode(bytes).trim();
      if (bytes.length === 2 && bytes[0] === 0x53) {
        // Binary status already logged above
      } else {
        appState.addLog("RX", text);
      }
    });

    transport.on("error", (err) => {
      appState.addLog("ERROR", err.message);
    });
  }

  handleSettingLine(packet) {
    const s = appState.telescopeSettings;
    if (packet.key === "FIRMWARE_VERSION") s.firmwareVersion = packet.value;
    if (packet.key === "GEAR") { s.gearAz = packet.az; s.gearAlt = packet.alt; }
    if (packet.key === "IDLE") s.idle = packet;
    if (packet.key === "INV") { s.invAlt = packet.invAlt; s.invAz = packet.invAz; }
    if (packet.key === "DATE") s.date = { year: packet.year, month: packet.month, day: packet.day };
    if (packet.key === "TIME") s.time = { hour: packet.hour, minute: packet.minute, second: packet.second };
    if (packet.key === "LOC") s.location = { lat: packet.lat, lon: packet.lon };
    if (packet.key === "BACKLASH") { s.backlashAz = packet.az; s.backlashAlt = packet.alt; }
    if (packet.key === "MAX_SPEED") s.maxSpeed = packet.value;
    if (packet.key === "TRAC_REFR") s.trackingRefresh = packet.value;
    s.lastUpdated = Date.now();
    appState.emit("telescope_settings_updated", s);
  }

  async setUseMock(useMock) {
    if (this.activeTransport.connected) {
      await this.activeTransport.disconnect();
    }

    if (useMock) {
      this.activeTransport = this.mockTransport;
      this.commandQueue.setTransport(this.mockTransport);
      await this.mockTransport.connect();
    } else {
      this.activeTransport = this.bleTransport;
      this.commandQueue.setTransport(this.bleTransport);
    }
  }

  async toggleTransport() {
    const nextMock = (this.activeTransport !== this.mockTransport);
    await this.setUseMock(nextMock);
  }

  async connectBle() {
    if (this.activeTransport !== this.bleTransport) {
      await this.setUseMock(false);
    }
    return this.bleTransport.connect();
  }

  async disconnect() {
    return this.activeTransport.disconnect();
  }

  get queue() {
    return this.commandQueue;
  }
}
