/**
 * Dobson Pilot - Configuration & Constants
 * Single source of truth for app branding, versions, and BLE parameters.
 * MIT License - Compatible with CosmoPilot ESP32-S3 DIY firmware v2.0
 */

export const APP_NAME = "Dobson Pilot";
export const APP_SUBTITLE = "Open-Source Dobsonian Telescope Controller";
export const APP_VERSION = "1.0.0";
export const APP_CREDITS = "Client open-source non ufficiale compatibile con CosmoPilot ESP32-S3";
export const GITHUB_REPO = "https://github.com/CosmoPilotProject/CosmoPilot_Firmware";

export const BLE_CONFIG = {
  // Service 0x00FF with characteristic 0xFF01
  serviceUuid: 0x00ff,
  serviceUuid128: "000000ff-0000-1000-8000-00805f9b34fb",
  charUuid: 0xff01,
  charUuid128: "0000ff01-0000-1000-8000-00805f9b34fb",
  
  // Custom 128-bit advertised UUID by CosmoPilot ESP32 firmware
  advertisedUuid: "b2e27f67-ffe7-4763-88a8-cc2b2133010e",
  devicePrefix: "CosmoPilot",
  
  // CCCD UUID for notifications
  cccdUuid: 0x2902,
  
  // ATT write constraints
  maxCommandLength: 127,
  
  // Handshake timeouts
  handshakeTimeoutMs: 15000,
  gotoTimeoutMs: 120000,
  
  // Joystick keepalive
  keepaliveIntervalMs: 1000,
  keepaliveTimeoutMs: 3500
};

export const DEFAULT_SETTINGS = {
  language: "it",
  backgroundIndex: 0,
  nightMode: false,
  nightModeLevel: 1, // 1 to 5
  autoReconnect: true,
  enableStopGoto: true,
  lockJoystickControls: false,
  extendGearRatio200: false,
  mockMode: false,
  maxMagnitude: 6.0,
  altitudeLimitDeg: 10.0
};
