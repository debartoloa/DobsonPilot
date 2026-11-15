/**
 * Dobson Pilot - Automated Unit & Integration Tests (Phase 6)
 * Validates 1-Star and 2-Star Alignment workflows,
 * J2000 to date equinox coordinate precession, declination formatting,
 * angular separation calculations, and MockTransport state transitions.
 */

import { MockTransport } from "../js/transport/mock-transport.js";
import { CommandQueue } from "../js/transport/command-queue.js";
import { ProtocolCommands, decimalHoursToHms, decimalDegToDms, formatDecParts } from "../js/transport/protocol.js";
import { AstroCalc } from "../js/astro/astro-calc.js";
import { STARS_CATALOG } from "../js/data/stars-data.js";

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

async function runPhase6Tests() {
  console.log("\n==========================================");
  console.log(" DOBSON PILOT - TEST SUITE FASE 6 (ALIGNMENT)");
  console.log("==========================================\n");

  // 1. Angular Distance & Separation
  console.log("1. Test Calcolo Separazione Angolare:");
  const vega = STARS_CATALOG.find(s => s.id === "Vega");
  const altair = STARS_CATALOG.find(s => s.id === "Altair");
  const polaris = STARS_CATALOG.find(s => s.id === "Polaris");

  assert(vega && altair && polaris, "Stelle chiave Vega, Altair e Polaris presenti");

  const distVegaAltair = AstroCalc.angularDistance(vega.ra, vega.dec, altair.ra, altair.dec);
  assert(distVegaAltair >= 33 && distVegaAltair <= 36, `Separazione Vega-Altair realistica (~34°): ${distVegaAltair.toFixed(1)}°`);
  assert(distVegaAltair >= 30, "Vega-Altair supera la soglia raccomandata di 30° per l'allineamento 2 stelle");

  const distVegaVega = AstroCalc.angularDistance(vega.ra, vega.dec, vega.ra, vega.dec);
  assert(distVegaVega < 0.001, "Distanza angolare di una stella con se stessa è 0°");

  // 2. Precession & Declination Formatting
  console.log("\n2. Test Precessione J2000 ed Equatore della Data:");
  const preVega = AstroCalc.precessJ2000ToDate(vega.ra, vega.dec, new Date());
  assert(preVega.raHours > 0 && preVega.raHours < 24, "RA precessa valida");
  assert(preVega.decDeg > 35 && preVega.decDeg < 45, "Dec precessa valida");

  const hms = decimalHoursToHms(preVega.raHours);
  const dms = decimalDegToDms(preVega.decDeg);
  const decStr = formatDecParts(dms.deg, dms.min, dms.sec, dms.isNegative);

  const cmdStar1 = ProtocolCommands.star1Calib(hms.h, hms.m, hms.s, decStr);
  assert(cmdStar1.startsWith("CMD STAR_1_CALIB "), "Comando CMD STAR_1_CALIB generato");
  assert(cmdStar1.length <= 127, "Comando sotto limite ATT 127 byte");

  // 3. 1-Star Alignment Integration with MockTransport
  console.log("\n3. Test Integrazione Allineamento a 1 Stella:");
  const mock1 = new MockTransport();
  const queue1 = new CommandQueue(mock1);
  await mock1.connect();

  assertEquals(mock1.aligned, false, "Telescopio inizialmente non allineato");

  // Send CMD CALIB_START
  await queue1.send(ProtocolCommands.calibStart());
  console.log("  Avviata sessione di calibrazione (CALIB_START)...");

  // Send CMD STAR_1_CALIB
  await queue1.send(cmdStar1);
  assertEquals(mock1.aligned, true, "Telescopio ALLINEATO dopo CMD STAR_1_CALIB!");

  await mock1.disconnect();

  // 4. 2-Star Alignment Integration with MockTransport
  console.log("\n4. Test Integrazione Allineamento a 2 Stelle:");
  const mock2 = new MockTransport();
  const queue2 = new CommandQueue(mock2);
  await mock2.connect();

  assertEquals(mock2.aligned, false, "Telescopio inizialmente non allineato");

  // Step 1: CALIB_START
  await queue2.send(ProtocolCommands.calibStart());

  // Step 2: STAR_2_CALIB (first star)
  const preStar1 = AstroCalc.precessJ2000ToDate(vega.ra, vega.dec, new Date());
  const hms1 = decimalHoursToHms(preStar1.raHours);
  const dms1 = decimalDegToDms(preStar1.decDeg);
  const dec1 = formatDecParts(dms1.deg, dms1.min, dms1.sec, dms1.isNegative);
  await queue2.send(ProtocolCommands.star2Calib(hms1.h, hms1.m, hms1.s, dec1));
  console.log("  Prima stella registrata (CMD STAR_2_CALIB)...");
  assertEquals(mock2.aligned, false, "Non ancora allineato dopo prima stella (attesa 2a stella)");

  // Step 3: NEXT (second star auto-slew)
  const preStar2 = AstroCalc.precessJ2000ToDate(altair.ra, altair.dec, new Date());
  const hms2 = decimalHoursToHms(preStar2.raHours);
  const dms2 = decimalDegToDms(preStar2.decDeg);
  const dec2 = formatDecParts(dms2.deg, dms2.min, dms2.sec, dms2.isNegative);
  
  console.log("  Invio CMD NEXT verso la seconda stella (auto-slew)...");
  await queue2.send(ProtocolCommands.nextStar(hms2.h, hms2.m, hms2.s, dec2));
  console.log("  Telescopio arrivato sulla seconda stella.");

  // Step 4: FINISH_2_STAR_CALIB
  await queue2.send(ProtocolCommands.finish2StarCalib());
  assertEquals(mock2.aligned, true, "Allineamento a 2 Stelle COMPLETATO con successo (aligned = true)!");

  await mock2.disconnect();

  console.log("\n==========================================");
  console.log(` RISULTATO: ${testsPassed} Superati, ${testsFailed} Falliti`);
  console.log("==========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
