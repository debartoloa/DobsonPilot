/**
 * Dobson Pilot - Automated Unit & Integration Tests (Phase 1)
 * Validates protocol serializer, declination formatting rules,
 * parser, priority commands, and MockTransport + CommandQueue handshake.
 */

import {
  formatDecParts,
  decimalDegToDms,
  decimalHoursToHms,
  ProtocolCommands,
  ProtocolParser,
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

async function runTests() {
  console.log("\n==========================================");
  console.log(" DOBSON PILOT - TEST SUITE FASE 1");
  console.log("==========================================\n");

  // 1. Declination sign convention
  console.log("1. Test Formattazione Declinazione (Convenzione CosmoPilot):");
  assertEquals(formatDecParts(-5, 23, 28), "-5 23 28", "Gradi negativi (-5° 23' 28\" -> -5 23 28)");
  assertEquals(formatDecParts(0, 30, 0, true), "0 -30 0", "Gradi zero con minuti negativi (-0° 30' 00\" -> 0 -30 0)");
  assertEquals(formatDecParts(0, 0, 45, true), "0 0 -45", "Gradi e minuti zero con secondi negativi (-0° 00' 45\" -> 0 0 -45)");
  assertEquals(formatDecParts(12, 5, 10), "12 5 10", "Gradi positivi (+12° 05' 10\" -> 12 5 10)");
  assertEquals(formatDecParts(90, 0, 0), "90 0 0", "Polo Nord celeste (+90° 00' 00\" -> 90 0 0)");
  assertEquals(formatDecParts(-90, 0, 0), "-90 0 0", "Polo Sud celeste (-90° 00' 00\" -> -90 0 0)");

  // 2. Conversion helpers
  console.log("\n2. Test Conversioni Coordinate:");
  const dmsNeg = decimalDegToDms(-5.3911);
  assertEquals(dmsNeg.isNegative, true, "Rilevamento segno negativo");
  assertEquals(dmsNeg.deg, 5, "DMS Gradi assoluti");
  assertEquals(dmsNeg.min, 23, "DMS Minuti");

  const hms = decimalHoursToHms(5.588);
  assertEquals(hms.h, 5, "HMS Ore");
  assertEquals(hms.m, 35, "HMS Minuti");

  // 3. Command builders and length constraints (< 127 bytes)
  console.log("\n3. Test Costruzione Comandi:");
  const cmdGoto = ProtocolCommands.gotoAnyObject(5, 35, 17, "-5 23 28");
  assertEquals(cmdGoto, "CMD GOTO_ANY_OBJECT 5 35 17 -5 23 28", "CMD GOTO_ANY_OBJECT generato correttamente");
  assert(cmdGoto.length <= 127, "Comando GOTO rispetta limite 127 byte");

  const cmdSolar = ProtocolCommands.gotoSolarSystem("Jupiter");
  assertEquals(cmdSolar, "CMD GOTO_SOLAR_SYSTEM Jupiter", "CMD GOTO_SOLAR_SYSTEM");

  const cmdDirSetup = ProtocolCommands.directionSetupStart();
  assertEquals(cmdDirSetup, "CMD DIRECTION_SETUP START", "CMD DIRECTION_SETUP START");

  const rawDirRes = ProtocolCommands.rawDirCalibResult(true);
  assertEquals(rawDirRes, "DIR_CALIB_RESULT 1", "Messaggio grezzo DIR_CALIB_RESULT 1 (senza prefisso CMD)");

  const rawNext = ProtocolCommands.rawNext();
  assertEquals(rawNext, "NEXT", "Messaggio grezzo NEXT (senza prefisso CMD)");

  const cmdOther = ProtocolCommands.otherSettings([1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 40, 300]);
  assertEquals(cmdOther, "CMD OTHER_SETTINGS 1 1 0 1 1 0 1 0 0 1 0 0 1 0 0 0 40 300", "CMD OTHER_SETTINGS con 18 parametri");
  assert(cmdOther.length <= 127, "Comando OTHER_SETTINGS rispetta limite 127 byte");

  // 4. Priority commands check
  console.log("\n4. Test Comandi Prioritari (Fuori Coda):");
  assert(isPriorityCommand("CMD STOP GOTO"), "STOP GOTO è prioritario");
  assert(isPriorityCommand("CMD APP KEEPALIVE"), "APP KEEPALIVE è prioritario");
  assert(isPriorityCommand("CMD APP DIR UP"), "APP DIR UP è prioritario");
  assert(isPriorityCommand("DIR_CALIB_RESULT 0"), "DIR_CALIB_RESULT è prioritario");
  assert(isPriorityCommand("NEXT"), "NEXT è prioritario");
  assert(!isPriorityCommand("CMD GOTO_ANY_OBJECT 5 35 17 -5 23 28"), "GOTO non è prioritario (deve attendere handshake)");
  assert(!isPriorityCommand("CMD SHOW_SETTINGS"), "SHOW_SETTINGS non è prioritario");

  // 5. Binary Status Packet Parser (0x53, statusByte)
  console.log("\n5. Test Parser Notifiche:");
  const statusBytes = new Uint8Array([0x53, 0b00011111]); // all 5 bits set
  const parsedStatus = ProtocolParser.parse(statusBytes);
  assertEquals(parsedStatus.type, "STATUS_BINARY", "Tipo STATUS_BINARY riconosciuto");
  assertEquals(parsedStatus.tracking, true, "Bit tracking attivo");
  assertEquals(parsedStatus.aligned, true, "Bit aligned attivo");
  assertEquals(parsedStatus.timeSet, true, "Bit timeSet attivo");
  assertEquals(parsedStatus.dateSet, true, "Bit dateSet attivo");
  assertEquals(parsedStatus.locationSet, true, "Bit locationSet attivo");

  // RADEC parser
  const radecBytes = new TextEncoder().encode("RADEC 5 35 17 -5 23 28 ");
  const parsedRadec = ProtocolParser.parse(radecBytes);
  assertEquals(parsedRadec.type, "RADEC", "Tipo RADEC riconosciuto");
  assertEquals(parsedRadec.ra.h, 5, "RADEC RA h");
  assertEquals(parsedRadec.dec.deg, -5, "RADEC Dec deg");

  // SHOW_SETTINGS line parser
  const gearLine = new TextEncoder().encode("GEAR 61.53 6.4");
  const parsedGear = ProtocolParser.parse(gearLine);
  assertEquals(parsedGear.type, "SETTING_LINE", "Tipo SETTING_LINE riconosciuto");
  assertEquals(parsedGear.key, "GEAR", "Chiave GEAR");
  assertEquals(parsedGear.az, 61.53, "Rapporto AZ 61.53");
  assertEquals(parsedGear.alt, 6.4, "Rapporto ALT 6.4");

  // 6. Integration: MockTransport + CommandQueue Handshake
  console.log("\n6. Test Integrazione MockTransport + CommandQueue Handshake:");
  const mock = new MockTransport();
  const queue = new CommandQueue(mock);

  await mock.connect();
  assert(mock.connected, "MockTransport connesso");

  // Send SHOW_SETTINGS through the queue
  console.log("  Invio CMD SHOW_SETTINGS...");
  const receivedLines = [];
  const settingSub = mock.on("packet", (p) => {
    if (p.type === "SETTING_LINE") receivedLines.push(p.key);
  });

  await queue.send(ProtocolCommands.showSettings());
  assert(receivedLines.length >= 8, `Ricevute ${receivedLines.length} linee di impostazioni da SHOW_SETTINGS`);
  settingSub();

  // Test GoTo and Stop GoTo
  console.log("  Test GoTo e Stop GoTo immediato...");
  let arrived = false;
  const gotoPromise = queue.send(ProtocolCommands.gotoAnyObject(5, 35, 17, "-5 23 28")).then(() => {
    arrived = true;
  });

  // Shortly after, send immediate STOP GOTO
  await new Promise(r => setTimeout(r, 100));
  assert(!arrived, "Il telescopio sta ancora compiendo il GoTo simulato");
  await queue.send(ProtocolCommands.stopGoto());
  await gotoPromise;
  assert(arrived, "GoTo interrotto con successo via STOP GOTO e completato con READY");

  await mock.disconnect();
  assert(!mock.connected, "MockTransport disconnesso pulitamente");

  console.log("\n==========================================");
  console.log(` RISULTATO: ${testsPassed} Superati, ${testsFailed} Falliti`);
  console.log("==========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
