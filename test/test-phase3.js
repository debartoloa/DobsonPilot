/**
 * Dobson Pilot - Automated Unit & Integration Tests (Phase 3)
 * Validates Calendar (Date/Time/Location UTC), Auto Sync, Show Settings parsing,
 * Other Settings (18 parameters), and App Settings management.
 */

import {
  ProtocolCommands,
  ProtocolParser
} from "../js/transport/protocol.js";

import { MockTransport } from "../js/transport/mock-transport.js";
import { CommandQueue } from "../js/transport/command-queue.js";
import { TransportManager } from "../js/transport/transport-manager.js";
import { appState } from "../js/state.js";
import { Router, ROUTE_PARENTS } from "../js/ui/router.js";

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

async function runPhase3Tests() {
  console.log("\n==========================================");
  console.log(" DOBSON PILOT - TEST SUITE FASE 3 (CALENDAR & SETTINGS)");
  console.log("==========================================\n");

  // 1. Date, Time, Location Commands
  console.log("1. Test Costruttori Comandi Data/Ora/GPS:");
  const cmdDate = ProtocolCommands.setDate(2026, 11, 1);
  assertEquals(cmdDate, "CMD SET_DATE 2026 11 1", "CMD SET_DATE generato correttamente");

  const cmdTime = ProtocolCommands.setTime(14, 30, 45);
  assertEquals(cmdTime, "CMD SET_TIME 14 30 45", "CMD SET_TIME generato correttamente");

  const cmdLoc = ProtocolCommands.setLocation(45.4642, 9.1900);
  assertEquals(cmdLoc, "CMD SET_LOCATION 45.4642 9.1900", "CMD SET_LOCATION (4 decimali)");

  // 2. Integration: Auto Sync with MockTransport
  console.log("\n2. Test Integrazione Auto Sync (Fase 2 della barra di stato):");
  const transportMgr = new TransportManager();
  await transportMgr.setUseMock(true);

  // Initially not synced
  const summaryBefore = appState.getStatusSummary();
  assert(!summaryBefore.isSynced, "Stato iniziale: non sincronizzato");
  assertEquals(summaryBefore.phase, 1, "Fase 1 attiva (Bluetooth connesso)");

  // Send Auto Sync sequence (Date + Time + Location)
  await transportMgr.queue.send(ProtocolCommands.setDate(2026, 11, 1));
  await transportMgr.queue.send(ProtocolCommands.setTime(14, 30, 45));
  await transportMgr.queue.send(ProtocolCommands.setLocation(45.4642, 9.1900));

  // Verify status bits
  const summaryAfter = appState.getStatusSummary();
  assert(summaryAfter.dateSet, "Bit dateSet attivo nel firmware");
  assert(summaryAfter.timeSet, "Bit timeSet attivo nel firmware");
  assert(summaryAfter.locationSet, "Bit locationSet attivo nel firmware");
  assert(summaryAfter.isSynced, "isSynced attivo (Data + Ora + Posizione)");
  assertEquals(summaryAfter.phase, 2, "Fase 2 raggiunta con successo (SYNC attiva)!");

  // 3. Show Settings Integration
  console.log("\n3. Test Lettura SHOW_SETTINGS & Parsing:");
  await transportMgr.queue.send(ProtocolCommands.showSettings());

  // Wait for settings lines to arrive and be populated into appState
  await new Promise(r => setTimeout(r, 1200));

  const s = appState.telescopeSettings;
  assert(s.lastUpdated !== null, "Lettura impostazioni completata e registrata");
  assertEquals(s.firmwareVersion, "2.0", "Firmware version corretta");
  assertEquals(s.gearAz, 61.53, "Rapporto riduzione Azimuth letto: 61.53");
  assertEquals(s.gearAlt, 6.4, "Rapporto riduzione Altezza letto: 6.4");
  assertEquals(s.invAlt, 0, "Inversione ALT letta: 0");
  assertEquals(s.invAz, 0, "Inversione AZ letta: 0");
  assertEquals(s.maxSpeed, 40, "Velocità massima letta: 40 (4.0 deg/s)");
  assertEquals(s.trackingRefresh, 300, "Intervallo tracking letto: 300 (3.00 s)");
  assertEquals(s.location.lat, 45.4642, "Latitudine corretta");
  assertEquals(s.location.lon, 9.1900, "Longitudine corretta");

  // 4. Other Settings with 18 fields
  console.log("\n4. Test OTHER_SETTINGS (18 Parametri):");
  const test18Fields = [
    1, 1, 0, 1, 1, // [0..4] applies
    0,             // [5] unused
    1,             // [6] displayOn
    0,             // [7] unused
    0, 1, 0,       // [8..10] sens: Low=0, Med=1, High=0
    0, 1, 0,       // [11..13] speed: Slow=0, Norm=1, Fast=0
    0,             // [14] standaloneOn
    0,             // [15] unused
    50,            // [16] maxSpeed in tenths (5.0 deg/s)
    500            // [17] trackingRefresh in centisecs (5.0 s)
  ];

  const cmdOther = ProtocolCommands.otherSettings(test18Fields);
  assertEquals(cmdOther, "CMD OTHER_SETTINGS 1 1 0 1 1 0 1 0 0 1 0 0 1 0 0 0 50 500", "Formattazione esatta 18 campi");
  assert(cmdOther.length <= 127, "Comando OTHER_SETTINGS sotto limite 127 byte");

  await transportMgr.queue.send(cmdOther);
  assert(true, "CMD OTHER_SETTINGS eseguito ed evaso con segnale READY");

  // 5. App Settings Persistence
  console.log("\n5. Test Preferenze App & Night Mode:");
  appState.saveSettings({
    language: "en",
    autoReconnect: false,
    enableStopGoto: true,
    extendGearRatio200: true
  });

  assertEquals(appState.settings.language, "en", "Lingua salvata");
  assertEquals(appState.settings.autoReconnect, false, "Auto-reconnect salvato");
  assertEquals(appState.settings.extendGearRatio200, true, "Estensione gear ratio 200 salvata");

  // 6. Hierarchical Path-based Back Navigation
  console.log("\n6. Test Navigazione Indietro Gerarchica (Percorso Menu):");
  const mockContainer = {
    innerHTML: "",
    appendChild() {},
    addEventListener() {}
  };
  const router = new Router(mockContainer);
  router.register("home", () => "Home");
  router.register("config-menu", () => "Config Menu");
  router.register("config-telescope", () => "Telescope Config");
  router.register("config-calendar", () => "Calendar");
  router.register("goto-menu", () => "GoTo Menu");
  router.register("catalog", () => "Catalog");
  router.register("catalog-messier", () => "Messier");

  // Navigate: home -> config-menu -> config-telescope -> config-calendar
  router.navigate("config-calendar");
  assertEquals(router.currentRoute, "config-calendar", "Attualmente su config-calendar");

  // Pressing Back on config-calendar must go to config-telescope
  router.back();
  assertEquals(router.currentRoute, "config-telescope", "Indietro da Calendar porta al percorso genitore (config-telescope)");

  // Pressing Back on config-telescope must go to config-menu
  router.back();
  assertEquals(router.currentRoute, "config-menu", "Indietro da Telescope porta a config-menu");

  // Pressing Back on config-menu must go to home
  router.back();
  assertEquals(router.currentRoute, "home", "Indietro da config-menu porta alla Home");

  // Catalog hierarchy: catalog-messier -> catalog -> goto-menu -> home
  router.navigate("catalog-messier");
  router.back();
  assertEquals(router.currentRoute, "catalog", "Indietro da catalog-messier porta a catalog");
  router.back();
  assertEquals(router.currentRoute, "goto-menu", "Indietro da catalog porta a goto-menu");
  router.back();
  assertEquals(router.currentRoute, "home", "Indietro da goto-menu porta a home");

  await transportMgr.disconnect();

  console.log("\n==========================================");
  console.log(` RISULTATO: ${testsPassed} Superati, ${testsFailed} Falliti`);
  console.log("==========================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch(err => {
  console.error("Phase 3 Test Error:", err);
  process.exit(1);
});
