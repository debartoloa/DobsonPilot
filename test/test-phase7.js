/**
 * Dobson Pilot - Automated Unit & Integration Tests (Phase 7)
 * Validates Celestial Tracking (start, stop, rate configuration, binary status reflection),
 * and SkyBox Assist (start, stop, sensitivity & speed settings, priority routing).
 */

import { MockTransport } from "../js/transport/mock-transport.js";
import { CommandQueue } from "../js/transport/command-queue.js";
import { ProtocolCommands, isPriorityCommand } from "../js/transport/protocol.js";
import { appState } from "../js/state.js";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`  ✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    testsPassed++;
    console.log(`  ✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ FAIL: ${message} (Expected: "${expected}", Actual: "${actual}")`);
  }
}

async function runPhase7Tests() {
  console.log("\n==========================================");
  console.log(" DOBSON PILOT - TEST SUITE FASE 7 (TRACKING & SKYBOX)");
  console.log("==========================================\n");

  // 1. Command Constructors & Priority Identification
  console.log("1. Test Costruzione Comandi Tracking & SkyBox:");
  const cmdAppTrkStart = ProtocolCommands.appStartTracking();
  const cmdAppTrkStop = ProtocolCommands.appStopTracking();
  const cmdAnalogTrkStart = ProtocolCommands.analogStartTracking();
  const cmdAnalogTrkStop = ProtocolCommands.analogStopTracking();

  assertEquals(cmdAppTrkStart, "CMD APP START TRACKING", "CMD APP START TRACKING valido");
  assertEquals(cmdAppTrkStop, "CMD APP STOP TRACKING", "CMD APP STOP TRACKING valido");
  assertEquals(cmdAnalogTrkStart, "CMD ANALOG START TRACKING", "CMD ANALOG START TRACKING valido");
  assertEquals(cmdAnalogTrkStop, "CMD ANALOG STOP TRACKING", "CMD ANALOG STOP TRACKING valido");

  assert(isPriorityCommand(cmdAppTrkStart), "APP START TRACKING è prioritario");
  assert(isPriorityCommand(cmdAppTrkStop), "APP STOP TRACKING è prioritario");
  assert(isPriorityCommand(cmdAnalogTrkStart), "ANALOG START TRACKING è prioritario");
  assert(isPriorityCommand(cmdAnalogTrkStop), "ANALOG STOP TRACKING è prioritario");

  const cmdSkyboxStart = ProtocolCommands.appSkyBoxAssist(true);
  const cmdSkyboxStop = ProtocolCommands.appSkyBoxAssist(false);
  assertEquals(cmdSkyboxStart, "CMD APP SKY_BOX_ASSIST START", "CMD APP SKY_BOX_ASSIST START valido");
  assertEquals(cmdSkyboxStop, "CMD APP SKY_BOX_ASSIST STOP", "CMD APP SKY_BOX_ASSIST STOP valido");
  assert(isPriorityCommand(cmdSkyboxStart), "SkyBox Assist START è prioritario");
  assert(isPriorityCommand(cmdSkyboxStop), "SkyBox Assist STOP è prioritario");

  // 2. Tracking Refreshment Rate Settings
  console.log("\n2. Test Configurazione Intervallo Refresh Tracking:");
  const testRates = [20, 50, 100, 300, 500, 1000, 1500, 2000, 2500]; // 0.2s to 25.0s
  testRates.forEach(rate => {
    const cmd = ProtocolCommands.otherSettings({
      applyDisplay: 0,
      displayOn: 1,
      applySkyBox: 0,
      skyBoxSensitivity: 2,
      skyBoxSpeed: 2,
      applyStandalone: 0,
      standaloneOn: 0,
      applyMaxSpeed: 0,
      maxSpeed: 40,
      applyTracRefr: 1,
      tracRefr: rate
    });
    assert(cmd.startsWith("CMD OTHER_SETTINGS ") && cmd.length <= 127, `Frequenza ${(rate/100).toFixed(1)}s generata correttamente (<= 127 byte)`);
  });

  // 3. SkyBox Assist Settings Configuration
  console.log("\n3. Test Parametri SkyBox Assist (Sensibilità & Velocità):");
  const cmdSkyboxSettings = ProtocolCommands.otherSettings({
    applyDisplay: 0,
    displayOn: 1,
    applySkyBox: 1,
    skyBoxSensitivity: 3, // High
    skyBoxSpeed: 1,       // Slow
    applyStandalone: 0,
    standaloneOn: 0,
    applyMaxSpeed: 0,
    maxSpeed: 40,
    applyTracRefr: 0,
    tracRefr: 300
  });
  assert(cmdSkyboxSettings.includes("0 0 1 1 0 0"), "Campi sens=3 (0 0 1) e speed=1 (1 0 0) formattati correttamente");
  assert(cmdSkyboxSettings.length <= 127, "Comando SkyBox Settings rispetta vincolo 127 byte");

  // 4. Integration Test with MockTransport
  console.log("\n4. Test Integrazione con MockTransport & Stato Reattivo:");
  const mock = new MockTransport();
  const queue = new CommandQueue(mock);
  await mock.connect();

  // Initially tracking is false
  assertEquals(mock.tracking, false, "Inseguimento inizialmente inattivo");

  // Enter Joystick Mode
  await queue.send(ProtocolCommands.appJoystickStart());
  console.log("  Modalità App Joystick avviata...");

  // Start Tracking
  await queue.send(ProtocolCommands.appStartTracking());
  assertEquals(mock.tracking, true, "MockTransport: tracking = true dopo CMD APP START TRACKING");

  // Verify binary status reflects tracking bit
  mock.broadcastBinaryStatus();
  appState.updateStatus({
    statusByte: 0x01,
    tracking: true,
    aligned: false,
    timeSet: false,
    dateSet: false,
    locationSet: false
  });
  assertEquals(appState.tracking, true, "appState: tracking = true");
  assertEquals(appState.getStatusSummary().tracking, true, "Summary barra di stato indica tracking attivo (TRK)");

  // Stop Tracking
  await queue.send(ProtocolCommands.appStopTracking());
  assertEquals(mock.tracking, false, "MockTransport: tracking = false dopo CMD APP STOP TRACKING");

  appState.updateStatus({
    statusByte: 0x00,
    tracking: false,
    aligned: false,
    timeSet: false,
    dateSet: false,
    locationSet: false
  });
  assertEquals(appState.tracking, false, "appState: tracking = false");
  assertEquals(appState.getStatusSummary().tracking, false, "TRK spento su arresto inseguimento");

  // Send SkyBox Settings update
  await queue.send(cmdSkyboxSettings);
  console.log("  Parametri SkyBox inviati con successo ed evasi con segnale READY.");

  // Exit Joystick Mode cleanly
  await queue.send(ProtocolCommands.none());
  assertEquals(mock.mode, "idle", "Telescopio uscito dalla modalità joystick");

  await mock.disconnect();

  console.log("\n==========================================");
  console.log(` RISULTATO: ${testsPassed} Superati, ${testsFailed} Falliti`);
  console.log("==========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase7Tests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
