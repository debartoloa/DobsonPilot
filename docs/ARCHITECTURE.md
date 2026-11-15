# Architettura Dobson Pilot PWA

## Stack Tecnologico
- **100% Vanilla Web Stack**: HTML5 semantico, CSS3 (Custom Properties, Flexbox, Grid, Glassmorphism) e JavaScript ES6+ nativo (`type="module"`).
- **Zero Build Step**: Nessun bundler, transpiler o dipendenza runtime esterna; eseguibile direttamente tramite server statico o GitHub Pages.
- **PWA Offline-First**: `manifest.json` + Service Worker (`sw.js`) con strategia *Network-First* e fallback cache.

## Moduli Principali (`js/`)
- `js/app.js`: Entry point applicativo, inizializzazione router, barra di stato, i18n, sfondo stellare e modale di onboarding.
- `js/config.js`: Costanti globali (`APP_NAME`, `APP_VERSION`, `GITHUB_REPO`).
- `js/state.js`: Gestione stato reattivo e persistenza in `localStorage` (impostazioni app, luoghi salvati, rapporti di riduzione predefiniti `61.53:1` AZ e `6.4:1` ALT).
- `js/transport/`: Livello astrazione BLE (`ble-transport.js`), simulatore offline (`mock-transport.js`), coda comandi con handshake `READY`/`BUSY` (`command-queue.js`) e costruttori/parser protocollo (`protocol.js`).
- `js/astro/astro-calc.js`: Calcoli astronomici (precessione J2000 → epoca corrente, conversioni RA/Dec → Alt/Az, effemeridi Sistema Solare via `vendor/astronomy-engine.esm.js`).
- `js/data/`: Cataloghi offline (`messier-data.js`, `stars-data.js`, `galaxies-data.js`, `nebulae-data.js`) e database locali (`custom-db.js`, `tours-db.js`).
- `js/i18n/`: Motore di traduzione DOM (`i18n.js`) e dizionari (`it.json`, `en.json`, `es.json`, `fr.json`, `pt.json`).
- `js/ui/`: Viste modulari dell'interfaccia, router e sfondo procedurale (`starfield.js`).
