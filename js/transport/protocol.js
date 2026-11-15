/**
 * Dobson Pilot - Protocol Handler
 * Serializer for ESP32 commands and parser for incoming BLE notifications.
 * Strictly adheres to CosmoPilot ESP32-S3 DIY v2.0 firmware specifications.
 */

import { BLE_CONFIG } from "../config.js";

/**
 * Format Declination according to CosmoPilot firmware convention:
 * The negative sign must reside on the first non-zero component!
 * E.g. -5° 23' 28" -> "-5 23 28"
 *      -0° 30' 00" -> "0 -30 0"
 *      -0° 00' 45" -> "0 0 -45"
 * At +/-90°, minutes and seconds must be 0.
 *
 * @param {number} deg - Degrees (-90 to +90)
 * @param {number} min - Minutes (0 to 59)
 * @param {number} sec - Seconds (0 to 59)
 * @param {boolean} [isNegative] - Explicit negative flag, useful when deg is 0 or -0
 * @returns {string} Formatted string "dd dm ds"
 */
export function formatDecParts(deg, min, sec, isNegative = null) {
  let d = Math.trunc(deg);
  let m = Math.abs(Math.trunc(min));
  let s = Math.abs(Math.trunc(sec));

  // Determine negative state
  const negative = isNegative !== null ? isNegative : (d < 0 || Object.is(deg, -0));
  d = Math.abs(d);

  // Clamp to 90
  if (d >= 90) {
    return (negative ? "-90 0 0" : "90 0 0");
  }

  if (!negative) {
    return `${d} ${m} ${s}`;
  }

  // If negative, place '-' on the first non-zero component
  if (d !== 0) {
    return `-${d} ${m} ${s}`;
  } else if (m !== 0) {
    return `0 -${m} ${s}`;
  } else if (s !== 0) {
    return `0 0 -${s}`;
  } else {
    // Exactly 0 0 0
    return "0 0 0";
  }
}

/**
 * Convert decimal degrees to signed { deg, min, sec, isNegative }
 */
export function decimalDegToDms(decimalDeg) {
  const isNegative = decimalDeg < 0;
  const abs = Math.abs(decimalDeg);
  const deg = Math.floor(abs);
  const remMinutes = (abs - deg) * 60;
  const min = Math.floor(remMinutes);
  const sec = Math.round((remMinutes - min) * 60);

  // Handle rounding edge case (60 seconds)
  let finalSec = sec;
  let finalMin = min;
  let finalDeg = deg;
  if (finalSec >= 60) {
    finalSec = 0;
    finalMin += 1;
  }
  if (finalMin >= 60) {
    finalMin = 0;
    finalDeg += 1;
  }

  return { deg: finalDeg, min: finalMin, sec: finalSec, isNegative };
}

/**
 * Convert decimal hours to { h, m, s }
 */
export function decimalHoursToHms(decimalHours) {
  const normalized = ((decimalHours % 24) + 24) % 24;
  const h = Math.floor(normalized);
  const remMinutes = (normalized - h) * 60;
  const m = Math.floor(remMinutes);
  const s = Math.round((remMinutes - m) * 60);

  let finalS = s;
  let finalM = m;
  let finalH = h;
  if (finalS >= 60) {
    finalS = 0;
    finalM += 1;
  }
  if (finalM >= 60) {
    finalM = 0;
    finalH = (finalH + 1) % 24;
  }

  return { h: finalH, m: finalM, s: finalS };
}

/**
 * Validate and serialize a command string ensuring <= maxCommandLength
 */
function buildCmd(commandStr) {
  if (commandStr.length > BLE_CONFIG.maxCommandLength) {
    throw new Error(`Command exceeds ${BLE_CONFIG.maxCommandLength} bytes: "${commandStr.slice(0, 30)}..."`);
  }
  return commandStr;
}

/**
 * High-level Command Builder
 */
export const ProtocolCommands = {
  // Movement & GoTo
  gotoAnyObject(rh, rm, rs, decStr) {
    // rh, rm, rs, dd, dm, ds
    return buildCmd(`CMD GOTO_ANY_OBJECT ${Math.trunc(rh)} ${Math.trunc(rm)} ${Math.trunc(rs)} ${decStr}`);
  },

  gotoSolarSystem(planetName) {
    // Valid: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Moon, Sun
    const valid = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "moon", "sun"];
    const lower = planetName.trim().toLowerCase();
    if (!valid.includes(lower)) {
      throw new Error(`Invalid solar system target: ${planetName}`);
    }
    // Capitalize first letter
    const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
    return buildCmd(`CMD GOTO_SOLAR_SYSTEM ${capitalized}`);
  },

  stopGoto() {
    return buildCmd("CMD STOP GOTO");
  },

  solarObjStatus() {
    return buildCmd("CMD SOLAR_OBJ_STATUS");
  },

  // Date, Time, Location (All UTC, decimal coordinates N/E positive)
  setDate(year, month, day) {
    return buildCmd(`CMD SET_DATE ${Math.trunc(year)} ${Math.trunc(month)} ${Math.trunc(day)}`);
  },

  setTime(hours, minutes, seconds) {
    return buildCmd(`CMD SET_TIME ${Math.trunc(hours)} ${Math.trunc(minutes)} ${Math.trunc(seconds)}`);
  },

  setLocation(lat, lon) {
    const latStr = Number(lat).toFixed(4);
    const lonStr = Number(lon).toFixed(4);
    return buildCmd(`CMD SET_LOCATION ${latStr} ${lonStr}`);
  },

  // Alignment
  calibStart() {
    return buildCmd("CMD CALIB_START");
  },

  star1Calib(rh, rm, rs, decStr) {
    return buildCmd(`CMD STAR_1_CALIB ${Math.trunc(rh)} ${Math.trunc(rm)} ${Math.trunc(rs)} ${decStr}`);
  },

  star2Calib(rh, rm, rs, decStr) {
    return buildCmd(`CMD STAR_2_CALIB ${Math.trunc(rh)} ${Math.trunc(rm)} ${Math.trunc(rs)} ${decStr}`);
  },

  nextStar(rh, rm, rs, decStr) {
    return buildCmd(`CMD NEXT ${Math.trunc(rh)} ${Math.trunc(rm)} ${Math.trunc(rs)} ${decStr}`);
  },

  finish2StarCalib() {
    return buildCmd("CMD FINISH_2_STAR_CALIB");
  },

  // App Joystick Mode
  appJoystickStart() {
    return buildCmd("CMD APP_JOYSTICK START");
  },

  appDir(dir) {
    const validDirs = ["UP", "DOWN", "LEFT", "RIGHT", "ULEFT", "URIGHT", "DLEFT", "DRIGHT", "STOP"];
    const d = dir.toUpperCase();
    if (!validDirs.includes(d)) throw new Error(`Invalid direction: ${dir}`);
    return buildCmd(`CMD APP DIR ${d}`);
  },

  appSpeed(speed) {
    const sp = Math.min(10, Math.max(1, Number(speed)));
    return buildCmd(`CMD APP SPEED ${sp}`);
  },

  appKeepalive() {
    return buildCmd("CMD APP KEEPALIVE");
  },

  appToggle(invertUpDown, invertLeftRight) {
    const ud = invertUpDown ? 1 : 0;
    const lr = invertLeftRight ? 1 : 0;
    return buildCmd(`CMD APP TOGGLE ${ud} ${lr}`);
  },

  appStartTracking() {
    return buildCmd("CMD APP START TRACKING");
  },

  appStopTracking() {
    return buildCmd("CMD APP STOP TRACKING");
  },

  appSkyBoxAssist(start) {
    return buildCmd(start ? "CMD APP SKY_BOX_ASSIST START" : "CMD APP SKY_BOX_ASSIST STOP");
  },

  // Analog Joystick Mode
  analogJoystick() {
    return buildCmd("CMD ANALOG_JOYSTICK");
  },

  analogSpeed(speed) {
    const sp = Math.min(10, Math.max(1, Number(speed)));
    return buildCmd(`CMD ANALOG SPEED ${sp}`);
  },

  analogToggle(invertUpDown, invertLeftRight) {
    const ud = invertUpDown ? 1 : 0;
    const lr = invertLeftRight ? 1 : 0;
    return buildCmd(`CMD ANALOG TOGGLE ${ud} ${lr}`);
  },

  analogStartTracking() {
    return buildCmd("CMD ANALOG START TRACKING");
  },

  analogStopTracking() {
    return buildCmd("CMD ANALOG STOP TRACKING");
  },

  analogSkyBoxAssist(start) {
    return buildCmd(start ? "CMD ANALOG SKY_BOX_ASSIST START" : "CMD ANALOG SKY_BOX_ASSIST STOP");
  },

  // Hand Move
  releaseSteppers() {
    return buildCmd("CMD RELEASE_STEPPERS");
  },

  // General Stop / Exit Joystick Mode
  none() {
    return buildCmd("CMD NONE");
  },

  // Hardware & Calibration Configuration
  setGearRatio(gearAz, gearAlt) {
    const az = Math.min(200, Math.max(1, Number(gearAz)));
    const alt = Math.min(200, Math.max(1, Number(gearAlt)));
    const azStr = Number.isInteger(az) ? az.toString() : az.toFixed(2).replace(/\.?0+$/, "");
    const altStr = Number.isInteger(alt) ? alt.toString() : alt.toFixed(2).replace(/\.?0+$/, "");
    return buildCmd(`CMD SET_GEAR_RATIO ${azStr} ${altStr}`);
  },

  backlashCalib(backlashAz, backlashAlt) {
    const az = Math.min(5000, Math.max(0, Math.trunc(backlashAz)));
    const alt = Math.min(5000, Math.max(0, Math.trunc(backlashAlt)));
    return buildCmd(`CMD BACKLASH_CALIB ${az} ${alt}`);
  },

  showSettings() {
    return buildCmd("CMD SHOW_SETTINGS");
  },

  factoryReset() {
    return buildCmd("CMD FACTORY_RESET");
  },

  joystickCalibIdle() {
    return buildCmd("CMD JOYSTICK_CALIB IDLE");
  },

  joystickCalibMax() {
    return buildCmd("CMD JOYSTICK_CALIB MAX");
  },

  /**
   * Direction Setup requires RAW messages without 'CMD ' after START
   */
  directionSetupStart() {
    return buildCmd("CMD DIRECTION_SETUP START");
  },

  rawDirCalibResult(invert) {
    // Invert: 0 = moved as expected, 1 = invert
    return buildCmd(`DIR_CALIB_RESULT ${invert ? 1 : 0}`);
  },

  rawNext() {
    return buildCmd("NEXT");
  },

  /**
   * OTHER_SETTINGS with exactly 18 integer fields
   * Accepts either an array of 18 numbers or a configuration object
   */
  otherSettings(input) {
    let fields;
    if (Array.isArray(input)) {
      fields = input;
    } else if (input && typeof input === "object") {
      const applyDisplay = input.applyDisplay ? 1 : 0;
      const applySkyBox = input.applySkyBox ? 1 : 0;
      const applyStandalone = input.applyStandalone ? 1 : 0;
      const applyMaxSpeed = input.applyMaxSpeed ? 1 : 0;
      const applyTracRefr = input.applyTracRefr ? 1 : 0;

      const displayOn = input.displayOn !== undefined ? (input.displayOn ? 1 : 0) : 1;
      const standaloneOn = input.standaloneOn ? 1 : 0;
      const maxSpeedTenths = Math.trunc(input.maxSpeed !== undefined ? input.maxSpeed : 40);
      const tracCentisecs = Math.trunc(input.tracCentisecs !== undefined ? input.tracCentisecs : (input.tracRefr || 300));

      const sens = input.skyBoxSensitivity || 2; // 1=low, 2=med, 3=high
      const speed = input.skyBoxSpeed || 2;       // 1=slow, 2=norm, 3=fast

      fields = [
        applyDisplay,
        applySkyBox,
        applyStandalone,
        applyMaxSpeed,
        applyTracRefr,
        0,
        displayOn,
        0,
        sens === 1 ? 1 : 0,
        sens === 2 ? 1 : 0,
        sens === 3 ? 1 : 0,
        speed === 1 ? 1 : 0,
        speed === 2 ? 1 : 0,
        speed === 3 ? 1 : 0,
        standaloneOn,
        0,
        maxSpeedTenths,
        tracCentisecs
      ];
    } else {
      throw new Error("OTHER_SETTINGS requires 18 integer fields array or configuration object.");
    }

    if (fields.length !== 18) {
      throw new Error(`OTHER_SETTINGS requires exactly 18 integer fields. Provided: ${fields?.length}`);
    }
    const cleanFields = fields.map(v => Math.trunc(v) || 0);
    return buildCmd(`CMD OTHER_SETTINGS ${cleanFields.join(" ")}`);
  }
};

/**
 * Identify if a command is urgent / unqueued (sent directly without handshake)
 */
export function isPriorityCommand(cmd) {
  const c = cmd.trim();
  return (
    c === "CMD STOP GOTO" ||
    c === "CMD APP KEEPALIVE" ||
    c.startsWith("CMD APP DIR ") ||
    c.startsWith("CMD APP SPEED ") ||
    c.startsWith("CMD APP TOGGLE ") ||
    c.startsWith("CMD APP SKY_BOX_ASSIST") ||
    c.startsWith("CMD ANALOG SKY_BOX_ASSIST") ||
    c === "CMD APP START TRACKING" ||
    c === "CMD APP STOP TRACKING" ||
    c === "CMD ANALOG START TRACKING" ||
    c === "CMD ANALOG STOP TRACKING" ||
    c.startsWith("DIR_CALIB_RESULT ") ||
    c === "NEXT"
  );
}

/**
 * Protocol Parser for incoming packets from ESP32
 */
export class ProtocolParser {
  /**
   * Parse a DataView or Uint8Array received via BLE notification
   * @param {DataView|Uint8Array} data
   * @returns {Object} Parsed packet representation
   */
  static parse(data) {
    const bytes = data instanceof DataView 
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data);

    // 1. Binary status packet: exactly 2 bytes starting with 0x53 ('S')
    if (bytes.length === 2 && bytes[0] === 0x53) {
      const statusByte = bytes[1];
      return {
        type: "STATUS_BINARY",
        raw: bytes,
        tracking: Boolean(statusByte & 0x01),
        aligned: Boolean(statusByte & 0x02),
        timeSet: Boolean(statusByte & 0x04),
        dateSet: Boolean(statusByte & 0x08),
        locationSet: Boolean(statusByte & 0x10),
        statusByte
      };
    }

    // 2. Text response decoded from ASCII/UTF-8
    const text = new TextDecoder("utf-8").decode(bytes).trim();

    if (text === "READY") {
      return { type: "READY", rawText: text };
    }

    if (text === "BUSY") {
      return { type: "BUSY", rawText: text };
    }

    if (text.startsWith("OBJECT_VISIBLE")) {
      const parts = text.split(/\s+/);
      const isVisible = parts[1] === "1";
      return { type: "OBJECT_VISIBLE", visible: isVisible, rawText: text };
    }

    if (text.startsWith("ESP_RESPONSE")) {
      const parts = text.split(/\s+/);
      const success = parts[1] === "1";
      return { type: "ESP_RESPONSE", success, rawText: text };
    }

    // RADEC h m s d m s
    if (text.startsWith("RADEC")) {
      const parts = text.split(/\s+/);
      if (parts.length >= 7) {
        return {
          type: "RADEC",
          ra: {
            h: parseInt(parts[1], 10),
            m: parseInt(parts[2], 10),
            s: parseInt(parts[3], 10)
          },
          dec: {
            deg: parseInt(parts[4], 10),
            min: parseInt(parts[5], 10),
            sec: parseInt(parts[6], 10)
          },
          rawText: text
        };
      }
    }

    // SOLAR_OBJ_STATUS: 9 flags (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Moon, Sun)
    if (text.startsWith("SOLAR_OBJ_STATUS")) {
      const parts = text.split(/\s+/).slice(1);
      const planets = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Moon", "Sun"];
      const status = {};
      planets.forEach((p, idx) => {
        status[p] = parts[idx] === "1";
      });
      return { type: "SOLAR_OBJ_STATUS", planets: status, rawText: text };
    }

    // SHOW_SETTINGS lines
    if (text.startsWith("SHOW_SETTINGS FIRMWARE_VERSION")) {
      const version = text.split(/\s+/)[2];
      return { type: "SETTING_LINE", key: "FIRMWARE_VERSION", value: version, rawText: text };
    }

    if (text.startsWith("GEAR")) {
      const parts = text.split(/\s+/);
      return { type: "SETTING_LINE", key: "GEAR", az: parseFloat(parts[1]), alt: parseFloat(parts[2]), rawText: text };
    }

    if (text.startsWith("IDLE")) {
      const parts = text.split(/\s+/);
      return {
        type: "SETTING_LINE",
        key: "IDLE",
        xi: parseInt(parts[1], 10),
        yi: parseInt(parts[2], 10),
        xmin: parseInt(parts[3], 10),
        xmax: parseInt(parts[4], 10),
        ymin: parseInt(parts[5], 10),
        ymax: parseInt(parts[6], 10),
        rawText: text
      };
    }

    if (text.startsWith("INV")) {
      const parts = text.split(/\s+/);
      return { type: "SETTING_LINE", key: "INV", invAlt: parseInt(parts[1], 10), invAz: parseInt(parts[2], 10), rawText: text };
    }

    if (text.startsWith("DATE")) {
      const parts = text.split(/\s+/);
      return { type: "SETTING_LINE", key: "DATE", year: parseInt(parts[1], 10), month: parseInt(parts[2], 10), day: parseInt(parts[3], 10), rawText: text };
    }

    if (text.startsWith("TIME")) {
      const parts = text.split(/\s+/);
      return { type: "SETTING_LINE", key: "TIME", hour: parseInt(parts[1], 10), minute: parseInt(parts[2], 10), second: parseInt(parts[3], 10), rawText: text };
    }

    if (text.startsWith("LOC")) {
      const parts = text.split(/\s+/);
      return { type: "SETTING_LINE", key: "LOC", lat: parseFloat(parts[1]), lon: parseFloat(parts[2]), rawText: text };
    }

    if (text.startsWith("BACKLASH")) {
      const parts = text.split(/\s+/);
      return { type: "SETTING_LINE", key: "BACKLASH", az: parseInt(parts[1], 10), alt: parseInt(parts[2], 10), rawText: text };
    }

    if (text.startsWith("MAX_SPEED")) {
      const parts = text.split(/\s+/);
      return { type: "SETTING_LINE", key: "MAX_SPEED", value: parseFloat(parts[1]), rawText: text };
    }

    if (text.startsWith("TRAC_REFR")) {
      const parts = text.split(/\s+/);
      return { type: "SETTING_LINE", key: "TRAC_REFR", value: parseFloat(parts[1]), rawText: text };
    }

    // Default generic text
    return { type: "TEXT", text, rawText: text };
  }
}
