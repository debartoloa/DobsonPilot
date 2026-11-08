/**
 * Dobson Pilot - Automated Unit & Integration Tests (Phase 2)
 * Validates Joystick commands, 8-way directional control, keepalive (3.5s timeout),
 * RADEC telemetry streaming, tracking toggling, and Hand Move alignment revocation.
 */

import {
  ProtocolCommands,
  isPriorityCommand
} from "../js/transport/protocol.js";

import { MockTransport } from "../js/transport/mock-transport.js";
import { CommandQueue } from "../js/transport/command-queue.js";

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

async function runPhase2Tests() {
  console.log("\n==========================================");
  console.log(" DOBSON PILOT - TEST SUITE FASE 2 (JOYSTICK)");
  console.log("==========================================\n");

  // 1. Command builders for App Joystick
  console.log("1. Test Costruttori Comandi Joystick:");
  assertEquals(ProtocolCommands.appJoystickStart(), "CMD APP_JOYSTICK START", "CMD APP_JOYSTICK START");
  assertEquals(ProtocolCommands.appDir("UP"), "CMD APP DIR UP", "CMD APP DIR UP");
  assertEquals(ProtocolCommands.appDir("DLEFT"), "CMD APP DIR DLEFT", "CMD APP DIR DLEFT (diagonale)");
  assertEquals(ProtocolCommands.appDir("STOP"), "CMD APP DIR STOP", "CMD APP DIR STOP");
  assertEquals(ProtocolCommands.appSpeed(4), "CMD APP SPEED 4", "CMD APP SPEED 4");
  assertEquals(ProtocolCommands.appKeepalive(), "CMD APP KEEPALIVE", "CMD APP KEEPALIVE");
  assertEquals(ProtocolCommands.appToggle(true, false), "CMD APP TOGGLE 1 0", "CMD APP TOGGLE 1 0 (invert ALT)");
  assertEquals(ProtocolCommands.appToggle(false, true), "CMD APP TOGGLE 0 1", "CMD APP TOGGLE 0 1 (invert AZ)");
  assertEquals(ProtocolCommands.appStartTracking(), "CMD APP START TRACKING", "CMD APP START TRACKING");
  assertEquals(ProtocolCommands.appSkyBoxAssist(true), "CMD APP SKY_BOX_ASSIST START", "CMD APP SKY_BOX_ASSIST START");
  assertEquals(ProtocolCommands.appSkyBoxAssist(false), "CMD APP SKY_BOX_ASSIST STOP", "CMD APP SKY_BOX_ASSIST STOP");

  // 2. Command builders for Analog Joystick & Hand Move
  console.log("\n2. Test Costruttori Scope Joystick & Hand Move:");
  assertEquals(ProtocolCommands.analogJoystick(), "CMD ANALOG_JOYSTICK", "CMD ANALOG_JOYSTICK");
  assertEquals(ProtocolCommands.analogSpeed(5), "CMD ANALOG SPEED 5", "CMD ANALOG SPEED 5");
  assertEquals(ProtocolCommands.analogToggle(true, true), "CMD ANALOG TOGGLE 1 1", "CMD ANALOG TOGGLE 1 1");
  assertEquals(ProtocolCommands.analogStartTracking(), "CMD ANALOG START TRACKING", "CMD ANALOG START TRACKING");
  assertEquals(ProtocolCommands.analogStopTracking(), "CMD ANALOG STOP TRACKING", "CMD ANALOG STOP TRACKING");
  assertEquals(ProtocolCommands.releaseSteppers(), "CMD RELEASE_STEPPERS", "CMD RELEASE_STEPPERS");
  assertEquals(ProtocolCommands.none(), "CMD NONE", "CMD NONE (uscita modalità)");

  // 3. Priority routing
  console.log("\n3. Test Routing Prioritario:");
  assert(isPriorityCommand("CMD APP DIR UP"), "APP DIR UP prioritario");
  assert(isPriorityCommand("CMD APP DIR STOP"), "APP DIR STOP prioritario");
  assert(isPriorityCommand("CMD APP KEEPALIVE"), "APP KEEPALIVE prioritario");
  assert(isPriorityCommand("CMD APP SPEED 4"), "APP SPEED prioritario");
  assert(isPriorityCommand("CMD APP TOGGLE 1 0"), "APP TOGGLE prioritario");

  // 4. MockTransport Joystick Mode & Telemetry Stream
  console.log("\n4. Test Integrazione App Joystick con MockTransport:");
  const mock = new MockTransport();
  const queue = new CommandQueue(mock);
  await mock.connect();

  await queue.send(ProtocolCommands.appJoystickStart());
  assertEquals(mock.mode, "joystick", "Mock entra in modalità joystick");

  // Collect RADEC packets
  let radecCount = 0;
  let lastRadec = null;
  const radecSub = mock.on("packet", (p) => {
    if (p.type === "RADEC") {
      radecCount++;
      lastRadec = p;
    }
  });

  // Wait ~600ms to receive ~2-3 RADEC packets (streaming at 4 Hz)
  await new Promise(r => setTimeout(r, 600));
  assert(radecCount >= 2, `Streaming coordinate RADEC attivo (${radecCount} pacchetti ricevuti in 600ms)`);
  assert(lastRadec && lastRadec.ra && lastRadec.dec, "Coordinate RA/Dec estratte correttamente dal flusso continuo");

  // Direction movement & keepalive
  console.log("\n5. Test Movimento Direzionale & Watchdog Keepalive (3.5s):");
  await queue.send(ProtocolCommands.appDir("UP"));
  assertEquals(mock.currentDir, "UP", "Direzione UP impostata nel firmware");

  // Send keepalive after 1 second
  await new Promise(r => setTimeout(r, 1000));
  await queue.send(ProtocolCommands.appKeepalive());
  assertEquals(mock.currentDir, "UP", "Direzione UP mantenuta attiva grazie al keepalive");

  // Now stop sending keepalive and wait > 3.5s
  console.log("  Attesa timeout watchdog (3.7s)...");
  await new Promise(r => setTimeout(r, 3700));
  assertEquals(mock.currentDir, "STOP", "Watchdog intervenuto: direzione automaticamente arrestata a STOP dopo > 3.5s di silenzio");

  // Manual STOP test
  await queue.send(ProtocolCommands.appDir("RIGHT"));
  assertEquals(mock.currentDir, "RIGHT", "Direzione RIGHT avviata");
  await queue.send(ProtocolCommands.appDir("STOP"));
  assertEquals(mock.currentDir, "STOP", "Direzione STOP arrestata manualmente al rilascio del tasto");

  // Tracking test
  console.log("\n6. Test Inseguimento Siderale (Tracking):");
  await queue.send(ProtocolCommands.appStartTracking());
  assert(mock.tracking, "Inseguimento avviato nel firmware");

  // Exit joystick mode
  await queue.send(ProtocolCommands.none());
  assertEquals(mock.mode, "idle", "Uscita da joystick con CMD NONE");
  assert(!mock.tracking, "Tracking arrestato all'uscita dalla modalità joystick");
  radecSub();

  // Hand Move test
  console.log("\n7. Test Hand Move & Revoca Allineamento:");
  mock.aligned = true; // Telescope was aligned
  mock.broadcastBinaryStatus();
  assert(mock.aligned, "Telescopio inizialmente allineato");

  await queue.send(ProtocolCommands.releaseSteppers());
  assertEquals(mock.mode, "steppers_released", "Motori rilasciati con RELEASE_STEPPERS");
  assert(!mock.aligned, "Allineamento perso istantaneamente al rilascio dei motori");

  // Re-enable steppers
  await queue.send(ProtocolCommands.none());
  assertEquals(mock.mode, "idle", "Motori riagganciati con CMD NONE");

  await mock.disconnect();

  console.log("\n==========================================");
  console.log(` RISULTATO: ${testsPassed} Superati, ${testsFailed} Falliti`);
  console.log("==========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch(err => {
  console.error("Phase 2 Test Error:", err);
  process.exit(1);
});
