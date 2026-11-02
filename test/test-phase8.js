/**
 * Dobson Pilot - Automated Unit & Integration Tests (Phase 8)
 * Validates Hardware Calibrations:
 * 1. Joystick Calibration (Idle & Max movement)
 * 2. Directions Setup Wizard (Interactive ALT/AZ move, raw responses & NEXT)
 * 3. Gear Ratio Configuration (AZ & ALT 1-100 or 1-200)
 * 4. Backlash Calibration (0-4000 arcsec)
 * 5. Gear Ratio Check (Test speed & estimation formula)
 * 6. Factory Reset (Reset memory & parameters)
 */

import { MockTransport } from "../js/transport/mock-transport.js";
import { CommandQueue } from "../js/transport/command-queue.js";
import { ProtocolCommands, isPriorityCommand } from "../js/transport/protocol.js";

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

async function runPhase8Tests() {
  console.log("\n==========================================");
  console.log(" DOBSON PILOT - TEST SUITE FASE 8 (HARDWARE CALIBRATIONS)");
  console.log("==========================================\n");

  // 1. Command Generation & Boundaries
  console.log("1. Test Costruttori Comandi Calibrazioni Hardware:");
  const cmdIdle = ProtocolCommands.joystickCalibIdle();
  const cmdMax = ProtocolCommands.joystickCalibMax();
  const cmdDirStart = ProtocolCommands.directionSetupStart();
  const rawDir0 = ProtocolCommands.rawDirCalibResult(false);
  const rawDir1 = ProtocolCommands.rawDirCalibResult(true);
  const rawNext = ProtocolCommands.rawNext();
  const cmdGear = ProtocolCommands.setGearRatio(65, 75);
  const cmdBacklash = ProtocolCommands.backlashCalib(350, 420);
  const cmdReset = ProtocolCommands.factoryReset();

  assertEquals(cmdIdle, "CMD JOYSTICK_CALIB IDLE", "Comando JOYSTICK_CALIB IDLE valido");
  assertEquals(cmdMax, "CMD JOYSTICK_CALIB MAX", "Comando JOYSTICK_CALIB MAX valido");
  assertEquals(cmdDirStart, "CMD DIRECTION_SETUP START", "Comando DIRECTION_SETUP START valido");
  assertEquals(rawDir0, "DIR_CALIB_RESULT 0", "Messaggio grezzo DIR_CALIB_RESULT 0 senza CMD");
  assertEquals(rawDir1, "DIR_CALIB_RESULT 1", "Messaggio grezzo DIR_CALIB_RESULT 1 senza CMD");
  assertEquals(rawNext, "NEXT", "Messaggio grezzo NEXT senza CMD");
  assertEquals(cmdGear, "CMD SET_GEAR_RATIO 65 75", "Comando SET_GEAR_RATIO valido");
  assertEquals(cmdBacklash, "CMD BACKLASH_CALIB 350 420", "Comando BACKLASH_CALIB valido");
  assertEquals(cmdReset, "CMD FACTORY_RESET", "Comando FACTORY_RESET valido");

  // Priority verification for raw direction setup messages
  assert(isPriorityCommand(rawDir0), "DIR_CALIB_RESULT 0 è prioritario");
  assert(isPriorityCommand(rawDir1), "DIR_CALIB_RESULT 1 è prioritario");
  assert(isPriorityCommand(rawNext), "NEXT è prioritario");

  // 2. Formula Gear Ratio Check
  console.log("\n2. Test Formula Stima Rapporti di Riduzione:");
  // Formula: Stima = rapporto attuale × (tempo × velocità ÷ angolo)
  const curAltRatio = 60;
  const speed = 4.0; // deg/s
  const angleAlt = 90.0; // deg
  const measuredTimeAlt = 22.5; // s (22.5 * 4 = 90 deg -> exact ratio 60)
  const estAlt = curAltRatio * (measuredTimeAlt * speed / angleAlt);
  assertEquals(estAlt, 60, "Calcolo stima rapporto ALT esatto (60:1)");

  const curAzRatio = 60;
  const angleAz = 360.0;
  const measuredTimeAz = 90.0; // s (90 * 4 = 360 deg -> exact ratio 60)
  const estAz = curAzRatio * (measuredTimeAz * speed / angleAz);
  assertEquals(estAz, 60, "Calcolo stima rapporto AZ esatto (60:1)");

  // 3. Integration with MockTransport
  console.log("\n3. Test Integrazione Completa con MockTransport:");
  const mock = new MockTransport();
  const queue = new CommandQueue(mock);
  await mock.connect();

  // Test Joystick Calib
  console.log("  Invio CMD JOYSTICK_CALIB IDLE...");
  await queue.send(cmdIdle);
  console.log("  Invio CMD JOYSTICK_CALIB MAX (attesa risposta simulata)...");
  await queue.send(cmdMax);

  // Test Directions Setup Wizard
  console.log("  Avvio procedura Directions Setup (CMD DIRECTION_SETUP START)...");
  await queue.send(cmdDirStart);
  assertEquals(mock.mode, "dir_setup", "MockTransport entrato in modalità dir_setup");

  // Send ALT result (e.g. Yes -> 0)
  await queue.send(rawDir0);
  assertEquals(mock.invAlt, 0, "MockTransport: inversione ALT impostata a 0");

  // Send NEXT for AZ move
  await queue.send(rawNext);
  console.log("  Movimento AZ di prova completato.");

  // Send AZ result (e.g. No -> 1)
  await queue.send(rawDir1);
  assertEquals(mock.invAz, 1, "MockTransport: inversione AZ impostata a 1");
  assertEquals(mock.mode, "idle", "MockTransport tornato in modalità idle dopo calibrazione direzioni");

  // Test Gear Ratio
  await queue.send(ProtocolCommands.setGearRatio(80, 85));
  assertEquals(mock.gearAz, 80, "Mock: gearAz aggiornato a 80");
  assertEquals(mock.gearAlt, 85, "Mock: gearAlt aggiornato a 85");

  // Test Backlash
  await queue.send(ProtocolCommands.backlashCalib(250, 150));
  assertEquals(mock.backlashAz, 250, "Mock: backlashAz aggiornato a 250");
  assertEquals(mock.backlashAlt, 150, "Mock: backlashAlt aggiornato a 150");

  // Test Factory Reset
  console.log("  Esecuzione CMD FACTORY_RESET...");
  await queue.send(cmdReset);
  assertEquals(mock.gearAz, 60, "Mock: gearAz ripristinato a 60");
  assertEquals(mock.gearAlt, 60, "Mock: gearAlt ripristinato a 60");
  assertEquals(mock.invAlt, 0, "Mock: invAlt ripristinato a 0");
  assertEquals(mock.invAz, 0, "Mock: invAz ripristinato a 0");
  assertEquals(mock.backlashAz, 0, "Mock: backlashAz azzerato");
  assertEquals(mock.backlashAlt, 0, "Mock: backlashAlt azzerato");

  await mock.disconnect();

  console.log("\n==========================================");
  console.log(` RISULTATO: ${testsPassed} Superati, ${testsFailed} Falliti`);
  console.log("==========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase8Tests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
