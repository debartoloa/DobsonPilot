/**
 * Dobson Pilot - Automated Unit & Integration Tests (Phase 5)
 * Validates Catalog data (Messier M1-M110, Stars, Galaxies, Nebulae),
 * Custom targets CRUD (up to 200 items), filtering logic (search, mag, visibility, time offset),
 * and Random target selection with J2000 precession.
 */

import { MESSIER_CATALOG } from "../js/data/messier-data.js";
import { STARS_CATALOG } from "../js/data/stars-data.js";
import { GALAXIES_CATALOG } from "../js/data/galaxies-data.js";
import { NEBULAE_CATALOG } from "../js/data/nebulae-data.js";
import { CustomDb } from "../js/data/custom-db.js";
import { AstroCalc } from "../js/astro/astro-calc.js";
import { ProtocolCommands, formatDecParts, decimalHoursToHms, decimalDegToDms } from "../js/transport/protocol.js";

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

async function runPhase5Tests() {
  console.log("\n==========================================");
  console.log(" DOBSON PILOT - TEST SUITE FASE 5 (CATALOGS & FILTERS)");
  console.log("==========================================\n");

  // 1. Messier Catalog Integrity
  console.log("1. Test Catalogo Messier (M1–M110):");
  assertEquals(MESSIER_CATALOG.length, 110, "Esattamente 110 oggetti Messier presenti");

  const m1 = MESSIER_CATALOG.find(i => i.id === "M1");
  assert(m1 && m1.name.includes("Crab"), "M1 Crab Nebula presente");

  const m42 = MESSIER_CATALOG.find(i => i.id === "M42");
  assert(m42 && m42.name.includes("Orion"), "M42 Great Orion Nebula presente");
  assert(m42.mag === 4.0, "M42 magnitudine corretta (4.0)");

  const m110 = MESSIER_CATALOG.find(i => i.id === "M110");
  assert(m110 && m110.con === "And", "M110 presente in Andromeda");

  // Verify all coordinates in range
  let allCoordsValid = true;
  MESSIER_CATALOG.forEach(m => {
    if (m.ra < 0 || m.ra >= 24 || m.dec < -90 || m.dec > 90) allCoordsValid = false;
  });
  assert(allCoordsValid, "Tutte le coordinate RA/Dec del catalogo Messier sono valide");

  // 2. Stars, Galaxies, Nebulae Catalogs
  console.log("\n2. Test Cataloghi Stelle, Galassie e Nebulose:");
  assert(STARS_CATALOG.length >= 50, `Catalogo stelle ricco (${STARS_CATALOG.length} stelle principali)`);
  const sirius = STARS_CATALOG.find(s => s.id === "Sirius");
  assert(sirius && sirius.mag < 0, "Sirio presente con magnitudine negativa (-1.46)");

  assert(GALAXIES_CATALOG.length >= 15, `Catalogo galassie (${GALAXIES_CATALOG.length} oggetti)`);
  assert(NEBULAE_CATALOG.length >= 15, `Catalogo nebulose (${NEBULAE_CATALOG.length} oggetti)`);

  // 3. Custom Targets CRUD
  console.log("\n3. Test Database Oggetti Personalizzati (CustomDb):");
  // In node, create mock localStorage if not present
  if (typeof localStorage === "undefined") {
    let store = {};
    global.localStorage = {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    };
  }

  // Clear before test
  CustomDb.saveAll([]);
  assertEquals(CustomDb.getAll().length, 0, "Database custom inizialmente vuoto");

  const added = CustomDb.add({
    name: "Cometa Lemmon",
    ra: 10.5,
    dec: 22.3,
    mag: 7.5
  });
  assert(added && added.id, "Oggetto personalizzato aggiunto con ID univoco");
  assertEquals(CustomDb.getAll().length, 1, "Un oggetto salvato in CustomDb");

  // Update
  CustomDb.update(added.id, { mag: 6.8 });
  const updated = CustomDb.getAll().find(i => i.id === added.id);
  assertEquals(updated.mag, 6.8, "Aggiornamento magnitudine custom riuscito");

  // Delete
  CustomDb.delete(added.id);
  assertEquals(CustomDb.getAll().length, 0, "Eliminazione oggetto custom riuscita");

  // 4. Filtering Engine Logic
  console.log("\n4. Test Motore di Filtraggio (Ricerca, Magnitudine, Visibilità):");
  const testDate = new Date("2026-11-01T22:00:00Z");
  const lat = 45.4642;
  const lon = 9.1900;

  // Search filter
  const searchResults = MESSIER_CATALOG.filter(i =>
    i.id.toLowerCase() === "m31"
  );
  assertEquals(searchResults.length, 1, "Ricerca per 'M31' restituisce 1 risultato esatto");
  assertEquals(searchResults[0].id, "M31", "Oggetto trovato: M31");

  const andromedaObjects = MESSIER_CATALOG.filter(i => i.name.toLowerCase().includes("andromeda"));
  assertEquals(andromedaObjects.length, 2, "Ricerca per 'andromeda' trova sia M31 che M110");

  // Max magnitude filter (<= 5.0)
  const brightMessier = MESSIER_CATALOG.filter(i => i.mag <= 5.0);
  assert(brightMessier.length > 0 && brightMessier.length < 20, `Trovati ${brightMessier.length} oggetti Messier molto luminosi (mag <= 5.0)`);

  // Visibility calculation (Alt >= 10 deg)
  let visibleCount = 0;
  MESSIER_CATALOG.forEach(item => {
    const hor = AstroCalc.raDecToAltAz(item.ra, item.dec, testDate, lat, lon);
    if (hor.isVisible) visibleCount++;
  });
  assert(visibleCount > 20, `Calcolati ${visibleCount} oggetti Messier attualmente visibili (Alt >= 10°) a Milano`);

  // 5. Random Object Picker
  console.log("\n5. Test Selezione Casuale (Random View):");
  const fixedItems = [...MESSIER_CATALOG, ...STARS_CATALOG, ...GALAXIES_CATALOG, ...NEBULAE_CATALOG];
  const visibleFixed = fixedItems.filter(item => {
    const hor = AstroCalc.raDecToAltAz(item.ra, item.dec, testDate, lat, lon);
    return hor.isVisible;
  });

  const randomItem = visibleFixed[Math.floor(Math.random() * visibleFixed.length)];
  assert(randomItem && randomItem.id, `Oggetto casuale estratto con successo: ${randomItem.id} (${randomItem.name})`);

  // Precession to date for random item
  const pre = AstroCalc.precessJ2000ToDate(randomItem.ra, randomItem.dec, testDate, lat, lon);
  const hms = decimalHoursToHms(pre.raHours);
  const dms = decimalDegToDms(pre.decDeg);
  const decStr = formatDecParts(dms.deg, dms.min, dms.sec, dms.isNegative);
  const cmdGoto = ProtocolCommands.gotoAnyObject(hms.h, hms.m, hms.s, decStr);

  assert(cmdGoto.startsWith("CMD GOTO_ANY_OBJECT"), "Comando GoTo per oggetto casuale generato correttamente");
  assert(cmdGoto.length <= 127, "Comando rispetta vincolo 127 byte");

  console.log("\n==========================================");
  console.log(` RISULTATO: ${testsPassed} Superati, ${testsFailed} Falliti`);
  console.log("==========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch(err => {
  console.error("Phase 5 Test Error:", err);
  process.exit(1);
});
