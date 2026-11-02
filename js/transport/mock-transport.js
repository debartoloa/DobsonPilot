/**
 * Dobson Pilot - Mock BLE Transport (Firmware Simulator)
 * Fully simulates CosmoPilot ESP32-S3 DIY v2.0 firmware responses in memory.
 * Enables 100% test coverage and offline UI testing without physical telescope.
 */

import { Transport } from "./transport.js";
import { ProtocolParser } from "./protocol.js";

export class MockTransport extends Transport {
  constructor() {
    super();
    this.deviceName = "CosmoPilot Telescope (MOCK)";
    this.isReady = true;
    this.statusTimer = null;
    this.readyTimer = null;
    this.radecTimer = null;
    this.keepaliveTimer = null;
    this.slewTimer = null;

    // Simulated firmware internal state
    this.firmwareVersion = "2.0";
    this.tracking = false;
    this.aligned = false;
    this.timeSet = false;
    this.dateSet = false;
    this.locationSet = false;

    // Hardware parameters
    this.gearAz = 60;
    this.gearAlt = 60;
    this.invAlt = 0;
    this.invAz = 0;
    this.backlashAz = 0;
    this.backlashAlt = 0;
    this.maxSpeed = 40; // 4.0 deg/s
    this.tracRefr = 300; // 3.0 s

    // Location & Time
    this.year = 2026;
    this.month = 11;
    this.day = 1;
    this.hour = 12;
    this.minute = 0;
    this.second = 0;
    this.lat = 45.4642;
    this.lon = 9.1900;

    // Current pointing coordinate (Orion Nebula area by default)
    this.currentRa = { h: 5, m: 35, s: 17 };
    this.currentDec = { deg: -5, min: 23, sec: 28 };

    // Modes
    this.mode = "idle"; // 'idle' | 'joystick' | 'analog' | 'dir_setup' | 'calib_2' | 'steppers_released'
    this.currentDir = "STOP";
    this.lastKeepalive = Date.now();
  }

  async connect() {
    if (this.isConnected) return;
    this.isConnected = true;
    this.isReady = true;
    this.emit("connected", { deviceName: this.deviceName });

    // Start 2.5s binary status broadcast
    this.statusTimer = setInterval(() => {
      this.broadcastBinaryStatus();
    }, 2500);

    // Initial binary status packet
    this.broadcastBinaryStatus();

    // Start 1s periodic READY broadcast when idle
    this.readyTimer = setInterval(() => {
      if (this.isConnected && this.isReady && this.mode === "idle") {
        this.receiveText("READY");
      }
    }, 1000);
  }

  async disconnect() {
    if (!this.isConnected) return;
    this.isConnected = false;
    this.isReady = false;
    this.mode = "idle";

    if (this.statusTimer) clearInterval(this.statusTimer);
    if (this.readyTimer) clearInterval(this.readyTimer);
    if (this.radecTimer) clearInterval(this.radecTimer);
    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
    if (this.slewTimer) clearTimeout(this.slewTimer);

    this.emit("disconnected", { deviceName: this.deviceName });
  }

  /**
   * Produce 2-byte binary status packet [0x53, statusByte]
   */
  broadcastBinaryStatus() {
    if (!this.isConnected) return;
    let byte = 0;
    if (this.tracking) byte |= 0x01;
    if (this.aligned) byte |= 0x02;
    if (this.timeSet) byte |= 0x04;
    if (this.dateSet) byte |= 0x08;
    if (this.locationSet) byte |= 0x10;

    const data = new Uint8Array([0x53, byte]);
    this.receiveBytes(data);
  }

  /**
   * Simulate sending bytes into the application
   */
  receiveBytes(bytes) {
    this.emit("rx", bytes);
    const parsed = ProtocolParser.parse(bytes);
    this.emit("packet", parsed);
    if (parsed.type === "STATUS_BINARY") {
      this.emit("status", parsed);
    }
  }

  /**
   * Simulate sending text into the application
   */
  receiveText(text) {
    const bytes = new TextEncoder().encode(text);
    this.receiveBytes(bytes);
    if (text === "READY") {
      this.isReady = true;
      this.emit("ready");
    } else if (text === "BUSY") {
      this.isReady = false;
      this.emit("busy");
    }
  }

  /**
   * Send a command from the app to the mock ESP32
   */
  async send(data) {
    if (!this.isConnected) {
      throw new Error("MockTransport is not connected");
    }

    const cmdStr = typeof data === "string" ? data.trim() : new TextDecoder().decode(data).trim();
    this.emit("tx", cmdStr);

    // Process command asynchronously like real firmware
    return new Promise(resolve => {
      setTimeout(() => {
        this.processCommand(cmdStr);
        resolve();
      }, 10);
    });
  }

  processCommand(cmd) {
    // 1. STOP GOTO is always handled immediately
    if (cmd === "CMD STOP GOTO") {
      if (this.slewTimer) {
        clearTimeout(this.slewTimer);
        this.slewTimer = null;
      }
      this.isReady = true;
      this.receiveText("READY");
      return;
    }

    // 2. Keepalive in joystick mode
    if (cmd === "CMD APP KEEPALIVE") {
      this.lastKeepalive = Date.now();
      return;
    }

    // 3. Joystick direction
    if (cmd.startsWith("CMD APP DIR ")) {
      this.lastKeepalive = Date.now();
      const dir = cmd.replace("CMD APP DIR ", "").trim();
      this.currentDir = dir;
      return;
    }

    // 4. Direction setup raw messages
    if (this.mode === "dir_setup") {
      if (cmd.startsWith("DIR_CALIB_RESULT")) {
        const parts = cmd.split(" ");
        const inv = parts[1] === "1";
        if (this.dirSetupStep === 1) {
          this.invAlt = inv ? 1 : 0;
          this.dirSetupStep = 2;
          this.receiveText("READY");
        } else if (this.dirSetupStep === 3) {
          this.invAz = inv ? 1 : 0;
          this.mode = "idle";
          this.dirSetupStep = 0;
          // Firmware sends ESP_RESPONSE 1 twice, then READY
          this.receiveText("ESP_RESPONSE 1");
          setTimeout(() => {
            this.receiveText("ESP_RESPONSE 1");
            this.receiveText("READY");
          }, 50);
        }
        return;
      }

      if (cmd === "NEXT" && this.dirSetupStep === 2) {
        this.dirSetupStep = 3;
        // Simulates AZ test move
        setTimeout(() => {
          this.receiveText("READY");
        }, 300);
        return;
      }
    }

    // Handshake check for normal CMD
    if (!this.isReady && !cmd.startsWith("CMD NONE")) {
      this.receiveText("BUSY");
      return;
    }

    // Command processing
    if (cmd === "CMD SHOW_SETTINGS") {
      this.isReady = false;
      const lines = [
        `SHOW_SETTINGS FIRMWARE_VERSION ${this.firmwareVersion}`,
        `GEAR ${this.gearAz} ${this.gearAlt}`,
        `IDLE 1850 1850 400 3600 400 3600`,
        `INV ${this.invAlt} ${this.invAz}`,
        `DATE ${this.year} ${this.month} ${this.day}`,
        `TIME ${this.hour} ${this.minute} ${this.second}`,
        `LOC ${this.lat.toFixed(4)} ${this.lon.toFixed(4)}`,
        `BACKLASH ${this.backlashAz} ${this.backlashAlt}`,
        `MAX_SPEED ${this.maxSpeed}`,
        `TRAC_REFR ${this.tracRefr}`,
        "READY"
      ];
      lines.forEach((line, index) => {
        setTimeout(() => {
          this.receiveText(line);
        }, (index + 1) * 100);
      });
      return;
    }

    if (cmd.startsWith("CMD SET_DATE ")) {
      const parts = cmd.split(" ");
      this.year = parseInt(parts[2], 10);
      this.month = parseInt(parts[3], 10);
      this.day = parseInt(parts[4], 10);
      this.dateSet = true;
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD SET_TIME ")) {
      const parts = cmd.split(" ");
      this.hour = parseInt(parts[2], 10);
      this.minute = parseInt(parts[3], 10);
      this.second = parseInt(parts[4], 10);
      this.timeSet = true;
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD SET_LOCATION ")) {
      const parts = cmd.split(" ");
      this.lat = parseFloat(parts[2]);
      this.lon = parseFloat(parts[3]);
      this.locationSet = true;
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD SET_GEAR_RATIO ")) {
      const parts = cmd.split(" ");
      this.gearAz = parseInt(parts[2], 10);
      this.gearAlt = parseInt(parts[3], 10);
      this.aligned = false; // Reset alignment on gear change
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD BACKLASH_CALIB ")) {
      const parts = cmd.split(" ");
      this.backlashAz = parseInt(parts[2], 10);
      this.backlashAlt = parseInt(parts[3], 10);
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD OTHER_SETTINGS ")) {
      this.receiveText("READY");
      return;
    }

    if (cmd === "CMD CALIB_START") {
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD STAR_1_CALIB ")) {
      this.aligned = true;
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD STAR_2_CALIB ")) {
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD NEXT ")) {
      // Simulate moving to second star
      setTimeout(() => {
        this.receiveText("READY");
      }, 500);
      return;
    }

    if (cmd === "CMD FINISH_2_STAR_CALIB") {
      this.aligned = true;
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd === "CMD APP_JOYSTICK START" || cmd === "CMD ANALOG_JOYSTICK") {
      this.mode = cmd === "CMD ANALOG_JOYSTICK" ? "analog" : "joystick";
      this.lastKeepalive = Date.now();
      this.receiveText("READY");

      if (this.radecTimer) clearInterval(this.radecTimer);
      this.radecTimer = setInterval(() => {
        if (this.mode === "joystick" || this.mode === "analog") {
          // Adjust coordinates slightly if moving in joystick mode
          if (this.currentDir === "UP") this.currentDec.min = (this.currentDec.min + 1) % 60;
          if (this.currentDir === "DOWN") this.currentDec.min = (this.currentDec.min + 59) % 60;
          if (this.currentDir === "RIGHT") this.currentRa.s = (this.currentRa.s + 1) % 60;
          if (this.currentDir === "LEFT") this.currentRa.s = (this.currentRa.s + 59) % 60;

          const radec = `RADEC ${this.currentRa.h} ${this.currentRa.m} ${this.currentRa.s} ${this.currentDec.deg} ${this.currentDec.min} ${this.currentDec.sec} `;
          this.receiveText(radec);
        }
      }, 250); // 4 times a second

      // Keepalive monitor (3.5s timeout for app joystick)
      if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = setInterval(() => {
        if (this.mode === "joystick" && this.currentDir !== "STOP") {
          if (Date.now() - this.lastKeepalive > 3500) {
            this.currentDir = "STOP";
          }
        }
      }, 100);
      return;
    }

    if (cmd.startsWith("CMD APP SPEED ") || cmd.startsWith("CMD ANALOG SPEED ")) {
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD APP TOGGLE ") || cmd.startsWith("CMD ANALOG TOGGLE ")) {
      const parts = cmd.split(" ");
      this.invAlt = parseInt(parts[3], 10) || 0;
      this.invAz = parseInt(parts[4], 10) || 0;
      this.receiveText("READY");
      return;
    }

    if (cmd === "CMD APP START TRACKING" || cmd === "CMD ANALOG START TRACKING") {
      this.tracking = true;
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd === "CMD APP STOP TRACKING" || cmd === "CMD ANALOG STOP TRACKING") {
      this.tracking = false;
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD APP SKY_BOX_ASSIST") || cmd.startsWith("CMD ANALOG SKY_BOX_ASSIST")) {
      this.receiveText("READY");
      return;
    }

    if (cmd === "CMD APP DIR STOP") {
      this.currentDir = "STOP";
      // Stopping tracking or movement
      return;
    }

    if (cmd === "CMD NONE") {
      this.mode = "idle";
      this.currentDir = "STOP";
      this.tracking = false;
      if (this.radecTimer) clearInterval(this.radecTimer);
      if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd === "CMD DIRECTION_SETUP START") {
      this.mode = "dir_setup";
      this.dirSetupStep = 1;
      // Simulate 10 deg ALT move
      setTimeout(() => {
        this.receiveText("READY");
      }, 400);
      return;
    }

    if (cmd === "CMD JOYSTICK_CALIB IDLE") {
      this.receiveText("READY");
      return;
    }

    if (cmd === "CMD JOYSTICK_CALIB MAX") {
      setTimeout(() => {
        this.receiveText("ESP_RESPONSE 1");
        this.receiveText("READY");
      }, 1000);
      return;
    }

    if (cmd === "CMD RELEASE_STEPPERS") {
      this.aligned = false;
      this.mode = "steppers_released";
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    if (cmd.startsWith("CMD GOTO_ANY_OBJECT ") || cmd.startsWith("CMD GOTO_SOLAR_SYSTEM ")) {
      this.isReady = false;
      // Emit OBJECT_VISIBLE 1 (3 times)
      this.receiveText("OBJECT_VISIBLE 1");
      this.receiveText("OBJECT_VISIBLE 1");
      this.receiveText("OBJECT_VISIBLE 1");

      // Simulate slewing for 2.5s
      this.slewTimer = setTimeout(() => {
        this.slewTimer = null;
        this.isReady = true;
        this.receiveText("READY");
      }, 2500);
      return;
    }

    if (cmd === "CMD SOLAR_OBJ_STATUS") {
      this.receiveText("SOLAR_OBJ_STATUS 1 1 1 1 1 1 1 1 1");
      this.receiveText("READY");
      return;
    }

    if (cmd === "CMD FACTORY_RESET") {
      this.gearAz = 60;
      this.gearAlt = 60;
      this.invAlt = 0;
      this.invAz = 0;
      this.backlashAz = 0;
      this.backlashAlt = 0;
      this.aligned = false;
      this.timeSet = false;
      this.dateSet = false;
      this.locationSet = false;
      this.broadcastBinaryStatus();
      this.receiveText("READY");
      return;
    }

    // Default fallback
    this.receiveText("READY");
  }
}
