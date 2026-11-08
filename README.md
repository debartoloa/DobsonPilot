# Dobson Pilot 🔭

**Dobson Pilot** è una Progressive Web App (PWA) open-source con licenza **MIT** progettata per sostituire l'app commerciale "CosmoPilot" nel controllo di telescopi Dobson motorizzati basati su microcontrollore **ESP32-S3** (firmware CosmoPilot DIY v2.0, due motori stepper NEMA17 e driver TMC2209) via **Web Bluetooth (BLE)**.

---

## 🌌 Caratteristiche Principali

- **100% Client-Side & Open Source**: Nessun build step obbligatorio, nessun framework pesante, zero dipendenze runtime da CDN esterne (tutto in `/vendor`).
- **Web Bluetooth Nativo**: Supporto per Google Chrome (Android & Desktop) e browser **Bluefy** (iOS / iPadOS).
- **Simulatore Firmware Mock Integrato**: Consente lo sviluppo, il collaudo dell'interfaccia e l'esecuzione dei flussi operativi anche senza avere il telescopio fisico connesso.
- **Handshake Robusto**: Gestione rigorosa dei pacchetti `READY` / `BUSY`, prioritizzazione immediata dei comandi critici (`STOP GOTO`, keepalive joystick, direzioni) ed evasione serializzata dei comandi con limite ATT a 127 byte.
- **Barra di Stato a 3 Fasi**: Monitoraggio continuo dello stato telescopio:
  1. *Fase 1*: BLE connesso
  2. *Fase 2*: Sincronizzazione Ora/Data/Luogo
  3. *Fase 3*: Allineamento stellare eseguito
  - Indicatore dinamico di inseguimento siderale (`TRK`).
- **Allineamento Stellare Completo**:
  - **1-Star Align**: selezione stella visibile (mag ≤ 4.0), centraggio manuale a 8 direzioni, comando `CMD STAR_1_CALIB`.
  - **2-Star Align**: stella 1, calcolo live della separazione angolare sferica raccomandata (≥ 30°), slewing automatico (`CMD NEXT`) e rifinitura finale (`CMD FINISH_2_STAR_CALIB`).
- **Inseguimento & SkyBox Assist**:
  - Tracking siderale (App Joystick & Scope Joystick).
  - SkyBox Assist con configurazione integrata di sensibilità (Low/Med/High) e velocità (Slow/Norm/Fast).
- **Calibrazioni Hardware di Bordo**:
  - **Joystick Calib**: calibrazione punto neutro / deadband e corsa massima con timer 10s.
  - **Directions Setup**: procedura guidata interattiva con blocco navigazione indietro durante i movimenti di test, risposte grezze `DIR_CALIB_RESULT 0|1` e `NEXT`.
  - **Gear Ratio & Backlash**: configurazione rapporti di riduzione (1-100 o 1-200) e gioco meccanico (0-4000 arcsec).
  - **Gear Ratio Check**: misura empirica dei tempi di rotazione a velocità costante (4.0°/s) con cronometro interattivo e stima dei rapporti di riduzione effettivi con intervallo di confidenza ±5%.
  - **Factory Reset**: ripristino di fabbrica dei parametri memorizzati su EEPROM/NVS con pulsante a pressione prolungata di sicurezza (3 secondi).
- **Pianificazione Tour Osservativi & Quiz Game**:
  - **Observing Tours**: wizard a 3 passaggi (Sessione con verifica altezza ≥ 10°, Oggetti "Whole session" vs "Part of session", Rivedi e ordina), salvataggio fino a 10 tour con snapshot in local storage e player dedicato con pulsanti di GoTo e navigazione.
  - **Astronomy Quiz Game**: gioco a quiz astronomico con slewing automatico senza conferma verso un bersaglio visibile a sorpresa, punteggio iniziale 50 pt, +10 corretto (+2 bonus serie ogni 3), -20 errore, aiuti 50/50, Salta, Mostra Magnitudine e persistenza record.
- **Internazionalizzazione & Modalità Notturna**:
  - Supporto completo multilingua (Italiano, English, Español, Français, Português) con commutazione dinamica.
  - 7 sfondi stellari procedurali su canvas (`Deep Space`, `Saturn Rings`, `Orion Nebula`, `Pleiades`, `Andromeda`, `Milky Way`, `Obsidian Black`) e caricamento di immagine astronomica personalizzata (fino a 5 MB).
  - Night Mode monocromatico rosso scuro a contrasto elevato con 5 livelli di luminosità progressivi per preservare l'adattamento dell'occhio al buio all'oculare (non-persistente).

---

## 📱 Guida per Piattaforma

### Android e Desktop (PC / Mac / Linux)
1. Apri Google Chrome o Microsoft Edge.
2. Accedi alla PWA tramite URL HTTPS (o `http://localhost:8080`).
3. Dalla pagina **Bluetooth Setup**, tocca **Start Scan (Web Bluetooth)** e seleziona il tuo telescopio `CosmoPilot Telescope`.
4. Puoi installare l'app sulla home del telefono toccando i tre puntini del browser -> **Installa app**.

### iPhone e iPad (iOS)
Apple Safari non supporta l'API standard Web Bluetooth:
1. Installa l'app gratuita **Bluefy - Web BLE Browser** dall'App Store.
2. Apri l'indirizzo HTTPS della tua PWA all'interno di Bluefy.
3. Seleziona il telescopio e concedi l'accesso Bluetooth.
4. *Nota*: Lo Screen Wake Lock viene attivato automaticamente alla connessione per prevenire la sospensione di iOS.

---

## 🧪 Collaudo e Test Automatici

L'applicazione include una suite esaustiva di **305 test automatici** senza alcuna dipendenza esterna:

```bash
# Esegui la suite completa (Fasi 1-10)
npm test

# Oppure esegui i test delle singole fasi
npm run test:phase1   # Protocollo, declinazione, comandi e parser
npm run test:phase2   # Joystick, watchdog keepalive (3.5s), Hand Move
npm run test:phase3   # Calendar, Auto Sync ora/data/GPS, Show Settings
npm run test:phase4   # Manual GoTo (RA/Dec, Alt/Az), Solar System
npm run test:phase5   # Cataloghi (Messier, Stars, Galaxies, Nebulae, Custom, Random)
npm run test:phase6   # Allineamento stellare 1 e 2 stelle, separazione angolare
npm run test:phase7   # Tracking siderale, refresh e SkyBox Assist
npm run test:phase8   # Calibrazioni hardware (Directions, Gear, Backlash, Reset)
npm run test:phase9   # Observing Tours (CRUD, finestre di visibilità) e Quiz Game
npm run test:phase10  # Localizzazioni i18n (5 lingue), sfondi e Night Mode
```

---

## 🚀 Avvio Locale Rapido

Per avviare la PWA sul proprio computer o su rete locale (per provarla con smartphone connesso alla stessa Wi-Fi):

```bash
# Avvia un server locale HTTPS o HTTP (es. npx serve o python)
npx serve .
# oppure
python -m http.server 8080
```

---

## 🗺️ Stato di Avanzamento Roadmap

- [x] **Fase 1**: Trasporto BLE, protocollo, gestione coda handshake, simulatore Mock, console di debug TX/RX, architettura base, PWA shell e navigazione.
- [x] **Fase 2**: App Joystick, Scope Joystick (Analog), keepalive (3.5s) e rilascio motori (Hand Move).
- [x] **Fase 3**: Calendar, Auto Sync ora/data/GPS e Show Settings.
- [x] **Fase 4**: GoTo manuale (RA/Dec + Alt/Az) e Solar System con safety check Sole.
- [x] **Fase 5**: Cataloghi offline (Messier, Stars, Galaxies, Nebulae, Custom), filtri visibilità e Random.
- [x] **Fase 6**: Procedura di Allineamento a 1 stella e 2 stelle.
- [x] **Fase 7**: Inseguimento (Tracking siderale) e SkyBox Assist.
- [x] **Fase 8**: Calibrazioni hardware (Directions setup interattivo, Gear Ratio Check, Backlash, Joystick Calib, Factory Reset).
- [x] **Fase 9**: Observing Tours (pianificazione a 3 step) e Quiz Game astronomico.
- [x] **Fase 10**: Internazionalizzazione completa (IT, EN, ES, FR, PT), 7 sfondi procedurali canvas selezionabili, Night Mode rosso progressivo e Service Worker offline PWA (v10.0).

---

## 📄 Licenza e Crediti

- **Licenza**: MIT License.
- **Crediti**: *Dobson Pilot* è un client non ufficiale compatibile con il firmware open-source ESP32-S3 CosmoPilot DIY v2.0 (`https://github.com/CosmoPilotProject/CosmoPilot_Firmware`).
- Astronomia calcolata offline con [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT).
