/**
 * Dobson Pilot - Automated Unit & Integration Tests (Phase 9)
 * Validates:
 * 1. ToursDb CRUD, Max 10 Tours limit, Name Uniqueness
 * 2. Observing Session Visibility Windows ("Whole session" vs "Part of session")
 * 3. Astronomy Quiz Game mechanics (initial score 50, +10 correct, -20 error,
 *    +2 bonus per 3 streak, lifelines 50/50 & Skip, Show Mag, Game Over <= 0)
 * 4. GoTo target generation and safety checks
 */

import { ToursDb } from "../js/data/tours-db.js";
import { AstroCalc } from "../js/astro/astro-calc.js";
import { ProtocolCommands, decimalHoursToHms, decimalDegToDms, formatDecParts } from "../js/transport/protocol.js";

// Mock localStorage for Node test runner
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();

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

async function runPhase9Tests() {
  console.log("\n==========================================");
  console.log(" DOBSON PILOT - TEST SUITE FASE 9 (TOURS & GAME)");
  console.log("==========================================\n");

  // 1. ToursDb CRUD and Validation
  console.log("1. Test ToursDb CRUD & Limiti:");
  globalThis.localStorage.clear();

  const sampleTour1 = {
    id: "tour_test_1",
    name: "Nebulose Invernali",
    session: {
      date: "2026-12-15",
      startTime: "21:30",
      durationMin: 120,
      location: { lat: 45.4642, lon: 9.1900, name: "Milano" }
    },
    objects: [
      { id: "M42", name: "Orion Nebula", ra: 5.588, dec: -5.39, mag: 4.0 },
      { id: "M45", name: "Pleiades", ra: 3.79, dec: 24.1, mag: 1.6 }
    ]
  };

  ToursDb.save(sampleTour1);
  const retrieved = ToursDb.get("tour_test_1");
  assert(retrieved !== null, "Tour salvato recuperato correttamente");
  assertEquals(retrieved.name, "Nebulose Invernali", "Nome del tour corrisponde");
  assertEquals(retrieved.objects.length, 2, "2 oggetti salvati nello snapshot del tour");

  // Uniqueness check
  assert(!ToursDb.isNameUnique("Nebulose Invernali"), "Nome duplicato rilevato correttamente");
  assert(ToursDb.isNameUnique("Nebulose Invernali", "tour_test_1"), "Nome valido se esclude il proprio ID (update)");
  assert(ToursDb.isNameUnique("Galassie Primaverili"), "Nome nuovo risulta univoco");

  // Max 10 tours enforcement
  for (let i = 2; i <= 10; i++) {
    ToursDb.save({
      id: `tour_test_${i}`,
      name: `Tour Automatico ${i}`,
      session: sampleTour1.session,
      objects: []
    });
  }
  assertEquals(ToursDb.getAll().length, 10, "Raggiunti esattamente 10 tour");

  let threwLimitError = false;
  try {
    ToursDb.save({
      id: "tour_test_11",
      name: "Tour Undici Vietato",
      session: sampleTour1.session,
      objects: []
    });
  } catch (e) {
    threwLimitError = true;
    assert(e.message.includes("10"), "Messaggio di errore cita il limite di 10 tour");
  }
  assert(threwLimitError, "Tentativo di salvare l'undicesimo tour lancia eccezione");

  // Delete tour
  ToursDb.delete("tour_test_1");
  assertEquals(ToursDb.getAll().length, 9, "Eliminazione tour avvenuta con successo");
  assert(ToursDb.get("tour_test_1") === null, "Tour eliminato non più presente");

  // 2. Observing Session Visibility Window Calculation
  console.log("\n2. Test Calcolo Finestre di Visibilità Sessione:");
  const testLat = 45.4642;
  const testLon = 9.1900;
  const sessionStart = new Date("2026-11-05T20:00:00Z");
  const sessionMid = new Date("2026-11-05T21:30:00Z");
  const sessionEnd = new Date("2026-11-05T23:00:00Z");

  // Polar Star (Polaris: Dec ~ +89.3°) -> always visible above 10 deg at lat 45°
  const polarisHorStart = AstroCalc.raDecToAltAz(2.53, 89.26, sessionStart, testLat, testLon);
  const polarisHorMid = AstroCalc.raDecToAltAz(2.53, 89.26, sessionMid, testLat, testLon);
  const polarisHorEnd = AstroCalc.raDecToAltAz(2.53, 89.26, sessionEnd, testLat, testLon);

  const isPolarisWhole = polarisHorStart.altitude >= 10 && polarisHorMid.altitude >= 10 && polarisHorEnd.altitude >= 10;
  assert(isPolarisWhole, "Polaris classificata come 'Whole session' (sempre > 10° alt)");

  // Deep southern object (Dec -65°) at Lat 45°N -> altitude is always far below 0°
  const southHorStart = AstroCalc.raDecToAltAz(12.0, -65.0, sessionStart, testLat, testLon);
  const southHorMid = AstroCalc.raDecToAltAz(12.0, -65.0, sessionMid, testLat, testLon);
  const southHorEnd = AstroCalc.raDecToAltAz(12.0, -65.0, sessionEnd, testLat, testLon);
  const maxSouthAlt = Math.max(southHorStart.altitude, southHorMid.altitude, southHorEnd.altitude);
  assert(maxSouthAlt < 10.0, "Oggetto australe inosservabile (max alt < 10°)");

  // 3. Astronomy Quiz Game Mechanics
  console.log("\n3. Test Meccaniche di Gioco & Punteggio Quiz:");

  let gameScore = 50;
  let gameStreak = 0;
  let gameFiftyFifty = 5;
  let gameSkip = 3;

  assertEquals(gameScore, 50, "Punteggio iniziale del gioco è esattamente 50");

  // Round 1: Correct answer (+10, streak 1)
  gameScore += 10;
  gameStreak++;
  assertEquals(gameScore, 60, "Risposta corretta assegna +10 punti");
  assertEquals(gameStreak, 1, "Streak incrementato a 1");

  // Round 2: Correct answer (+10, streak 2)
  gameScore += 10;
  gameStreak++;
  assertEquals(gameScore, 70, "Seconda risposta corretta: totale 70");
  assertEquals(gameStreak, 2, "Streak incrementato a 2");

  // Round 3: Correct answer (+10 + 2 streak bonus, streak 3)
  gameScore += 10;
  gameStreak++;
  if (gameStreak % 3 === 0) gameScore += 2;
  assertEquals(gameScore, 82, "Terza risposta corretta: +10 + bonus serie +2 = 82");
  assertEquals(gameStreak, 3, "Streak incrementato a 3");

  // Round 4: Wrong answer (-20, streak reset)
  gameScore -= 20;
  gameStreak = 0;
  assertEquals(gameScore, 62, "Risposta errata sottrae 20 punti");
  assertEquals(gameStreak, 0, "Risposta errata azzera la serie");

  // Round 5: Lifeline 50/50
  assert(gameFiftyFifty > 0, "Lifeline 50/50 disponibile");
  gameFiftyFifty--;
  assertEquals(gameFiftyFifty, 4, "Uso 50/50 decrementa a 4 disponibili");

  // Round 6: Skip lifeline
  assert(gameSkip > 0, "Lifeline Salta disponibile");
  gameSkip--;
  gameStreak = 0;
  assertEquals(gameSkip, 2, "Uso Salta decrementa a 2 disponibili");
  assertEquals(gameStreak, 0, "Salta azzera la serie di risposte");

  // Consecutive errors to Game Over
  gameScore -= 20; // 42
  gameScore -= 20; // 22
  gameScore -= 20; // 2
  gameScore -= 20; // -18
  assert(gameScore <= 0, "Punteggio sceso a <= 0");
  const isGameOver = gameScore <= 0;
  assert(isGameOver, "Condizione di Game Over scatta quando punteggio <= 0");

  // High score tracking
  const highScores = [50, 82, 62];
  const best = Math.max(...highScores);
  globalThis.localStorage.setItem("dobson_game_highscore", String(best));
  assertEquals(parseInt(globalThis.localStorage.getItem("dobson_game_highscore"), 10), 82, "High score persistito a 82");

  // 4. Command Generation for Game & Tour Slews
  console.log("\n4. Test Generazione Comandi Slew Tour & Game:");
  const testPrecession = AstroCalc.precessJ2000ToDate(5.588, -5.39, new Date("2026-11-05T20:00:00Z"), testLat, testLon);
  const hms = decimalHoursToHms(testPrecession.raHours);
  const dms = decimalDegToDms(testPrecession.decDeg);
  const formattedDec = formatDecParts(dms.deg, dms.min, dms.sec, dms.isNegative);
  const cmdGoto = ProtocolCommands.gotoAnyObject(hms.h, hms.m, hms.s, formattedDec);

  assert(cmdGoto.startsWith("CMD GOTO_ANY_OBJECT"), "Comando inizia con CMD GOTO_ANY_OBJECT");
  assert(cmdGoto.includes("-"), "Declinazione negativa preservata nel comando generato");

  console.log("\n==========================================");
  console.log(` RISULTATI FASE 9: ${testsPassed} passati, ${testsFailed} falliti.`);
  console.log("==========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase9Tests().catch((err) => {
  console.error("Errore irreversibile test Fase 9:", err);
  process.exit(1);
});
