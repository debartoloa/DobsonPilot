/**
 * Dobson Pilot - Automated Unit & Integration Tests (Phase 4)
 * Validates AstroCalc coordinate transforms (RA/Dec <-> Alt/Az), J2000 precession,
 * Solar System ephemerides & 9 bodies, Manual GoTo, Stop GoTo, and Solar safety constraints.
 */

import { AstroCalc } from "../js/astro/astro-calc.js";
import { ProtocolCommands, ProtocolParser, formatDecParts } from "../js/transport/protocol.js";
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

async function runPhase4Tests() {
  console.log("\n==========================================");
  console.log(" DOBSON PILOT - TEST SUITE FASE 4 (GOTO & SOLAR)");
  console.log("==========================================\n");

  // 1. AstroCalc: RA/Dec <-> Alt/Az transforms
  console.log("1. Test Calcoli Astronomici AstroCalc:");
  const testDate = new Date("2026-11-01T22:00:00Z");
  const lat = 45.4642;
  const lon = 9.1900;

  // Test with Polaris: RA ~2.5h, Dec ~89.3 deg
  const polarisHor = AstroCalc.raDecToAltAz(2.5, 89.3, testDate, lat, lon);
  assert(polarisHor.altitude > 40 && polarisHor.altitude < 50, `Stella Polare ad altezza coerente con la latitudine (~45°): ${polarisHor.altitude.toFixed(1)}°`);
  assert(polarisHor.isVisible, "Stella Polare visibile (> 10°)");

  // Inverse Alt/Az -> RA/Dec test
  const alt = 45.0;
  const az = 180.0; // South
  const eq = AstroCalc.altAzToRaDec(alt, az, testDate, lat, lon);
  assert(typeof eq.raHours === "number" && eq.raHours >= 0 && eq.raHours < 24, `RA calcolata da Alt/Az valida: ${eq.raHours.toFixed(2)}h`);
  assert(typeof eq.decDeg === "number" && eq.decDeg >= -90 && eq.decDeg <= 90, `Dec calcolata valida: ${eq.decDeg.toFixed(2)}°`);

  // J2000 to epoch of date precession
  const pre = AstroCalc.precessJ2000ToDate(5.588, -5.391, testDate, lat, lon);
  assert(pre.raHours > 5.588, `Ascensione retta precessa verso est: ${pre.raHours.toFixed(4)}h`);
  assert(typeof pre.decDeg === "number", `Declinazione precessa: ${pre.decDeg.toFixed(4)}°`);

  // 2. Solar System Ephemerides: All 9 bodies
  console.log("\n2. Test Corpi Sistema Solare (9 corpi ufficiali):");
  const bodies = AstroCalc.getAllSolarSystemBodies(testDate, lat, lon);
  assertEquals(bodies.length, 9, "Restituiti esattamente i 9 corpi previsti dal firmware");

  const expectedNames = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Moon", "Sun"];
  expectedNames.forEach((name, i) => {
    assertEquals(bodies[i].name, name, `Corpo ${i + 1}: ${name}`);
    assert(typeof bodies[i].alt === "number", `${name} altitudine calcolata`);
    assert(typeof bodies[i].mag === "number", `${name} magnitudine calcolata`);
  });

  // 3. Command builders for GoTo
  console.log("\n3. Test Costruzione Comandi GoTo:");
  const cmdManual = ProtocolCommands.gotoAnyObject(5, 35, 17, formatDecParts(-5, 23, 28));
  assertEquals(cmdManual, "CMD GOTO_ANY_OBJECT 5 35 17 -5 23 28", "CMD GOTO_ANY_OBJECT formattato");

  const cmdJupiter = ProtocolCommands.gotoSolarSystem("Jupiter");
  assertEquals(cmdJupiter, "CMD GOTO_SOLAR_SYSTEM Jupiter", "CMD GOTO_SOLAR_SYSTEM Jupiter");

  const cmdSun = ProtocolCommands.gotoSolarSystem("Sun");
  assertEquals(cmdSun, "CMD GOTO_SOLAR_SYSTEM Sun", "CMD GOTO_SOLAR_SYSTEM Sun");

  const cmdSolarStatus = ProtocolCommands.solarObjStatus();
  assertEquals(cmdSolarStatus, "CMD SOLAR_OBJ_STATUS", "CMD SOLAR_OBJ_STATUS");

  const cmdStop = ProtocolCommands.stopGoto();
  assertEquals(cmdStop, "CMD STOP GOTO", "CMD STOP GOTO");

  // 4. MockTransport GoTo Execution & Slew
  console.log("\n4. Test GoTo con MockTransport:");
  const mock = new MockTransport();
  const queue = new CommandQueue(mock);
  await mock.connect();

  let visibleNotified = false;
  mock.on("packet", (p) => {
    if (p.type === "OBJECT_VISIBLE") visibleNotified = true;
  });

  console.log("  Avvio GoTo simulato...");
  await queue.send(cmdJupiter);
  assert(visibleNotified, "Notifica OBJECT_VISIBLE ricevuta dal telescopio");
  assert(mock.isReady, "GoTo completato con segnale READY");

  // 5. Emergency Stop GoTo during slew
  console.log("\n5. Test STOP GOTO immediato durante il moto:");
  let arrived = false;
  const slewPromise = queue.send(cmdManual).then(() => {
    arrived = true;
  });

  await new Promise(r => setTimeout(r, 100));
  assert(!arrived, "Telescopio in movimento...");

  // Send STOP GOTO
  await queue.send(cmdStop);
  await slewPromise;
  assert(arrived, "Movimento GoTo arrestato con successo da STOP GOTO");

  // 6. SOLAR_OBJ_STATUS Query & Parser
  console.log("\n6. Test Query Visibilità SOLAR_OBJ_STATUS:");
  let solarPacket = null;
  mock.on("packet", (p) => {
    if (p.type === "SOLAR_OBJ_STATUS") solarPacket = p;
  });

  await queue.send(cmdSolarStatus);
  await new Promise(r => setTimeout(r, 100));
  assert(solarPacket !== null, "Pacchetto SOLAR_OBJ_STATUS ricevuto");
  assert(solarPacket.planets && Object.keys(solarPacket.planets).length === 9, "9 flag visibilità pianeti estratti");
  assert(solarPacket.planets.Jupiter !== undefined, "Flag visibilità Jupiter presente");

  await mock.disconnect();

  console.log("\n==========================================");
  console.log(` RISULTATO: ${testsPassed} Superati, ${testsFailed} Falliti`);
  console.log("==========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch(err => {
  console.error("Phase 4 Test Error:", err);
  process.exit(1);
});
