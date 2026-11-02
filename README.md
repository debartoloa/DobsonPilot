# Dobson Pilot 🔭

**Dobson Pilot** è una Progressive Web App (PWA) open-source con licenza **MIT** progettata per sostituire l'app commerciale "CosmoPilot" nel controllo di telescopi Dobson motorizzati basati su microcontrollore **ESP32-S3** (firmware CosmoPilot DIY v2.0, due motori stepper NEMA17 e driver TMC2209) via **Web Bluetooth (BLE)**.

---

## 🌌 Caratteristiche Principali

- **100% Client-Side & Open Source**: Nessun build step obbligatorio, nessun framework pesante, zero dipendenze runtime da CDN esterne (tutto in `/vendor`).
- **Web Bluetooth Nativo**: Supporto per Google Chrome (Android & Desktop) e browser **Bluefy** (iOS / iPadOS).
- **Simulatore Firmware Mock Integrato**: Consente lo sviluppo, il collaudo dell'interfaccia e l'esecuzione dei flussi operativi anche senza avere il telescopio fisico connesso.
- **Handshake Robusto**: Gestione rigorosa dei pacchetti `READY` / `BUSY`, prioritizzazione immediata dei comandi critici (`STOP GOTO`, keepalive joystick, direzioni) ed evasione serializzata dei comandi con limite ATT a 127 byte.
- **Barra di Stato a 3 Fasi**: Monitoraggio continuo dello stato telescopio (BLE connesso → Sincronizzazione Ora/Data/Luogo → Allineamento eseguito) e spia di tracking siderale.
- **UI Astro-Friendly**: Tema ambra/oro su nero ossidiana a bassissimo abbagliamento, cielo stellato procedurale su canvas, target touch ampi (≥ 48px) e safe-area iOS.
- **PWA Completa**: Manifest, Service Worker per utilizzo offline completo sul campo, Screen Wake Lock per impedire lo spegnimento dello schermo.

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

L'applicazione include una suite di test automatici eseguibile con Node.js:

```bash
# Esegui la suite di test completa del protocollo e simulatore
npm test
```

I test verificano:
- Regola di formattazione della declinazione (il segno negativo sul primo componente non nullo: es. `-0° 30' 00"` -> `0 -30 0`).
- Rispetto della lunghezza massima del pacchetto ATT BLE (<= 127 byte).
- Coda comandi con handshake asincrono `READY`/`BUSY`.
- Bypass prioritario per `STOP GOTO`, direzioni joystick e keepalive.
- Parser notifiche binarie (pacchetto 2 byte con marcatore `0x53`).

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

## 🗺️ Fasi di Sviluppo

- [x] **Fase 1**: Trasporto BLE, protocollo, gestione coda handshake, simulatore Mock, console di debug TX/RX, architettura base, PWA shell e navigazione.
- [x] **Fase 2**: App Joystick, Scope Joystick (Analog), keepalive (3.5s) e rilascio motori (Hand Move).
- [x] **Fase 3**: Calendar, Auto Sync ora/data/GPS e Show Settings.
- [x] **Fase 4**: GoTo manuale (RA/Dec + Alt/Az) e Solar System con safety check Sole.
- [x] **Fase 5**: Cataloghi offline (Messier, Stars, Galaxies, Nebulae, Custom), filtri visibilità e Random.
- [ ] **Fase 6**: Procedura di Allineamento a 1 stella e 2 stelle.
- [ ] **Fase 7**: Inseguimento (Tracking siderale) e SkyBox Assist.
- [ ] **Fase 8**: Calibrazioni hardware (Directions setup interattivo, Gear Ratio Check, Backlash, Joystick Calib, Factory Reset).
- [ ] **Fase 9**: Observing Tours (pianificazione a 3 step) e Quiz Game astronomico.
- [ ] **Fase 10**: Internazionalizzazione completa (IT, EN, ES, FR, PT), 7 sfondi originali selezionabili, Night Mode rosso progressivo e test offline PWA.

---

## 📄 Licenza e Crediti

- **Licenza**: MIT License.
- **Crediti**: *Dobson Pilot* è un client non ufficiale compatibile con il firmware open-source ESP32-S3 CosmoPilot DIY v2.0 (`https://github.com/CosmoPilotProject/CosmoPilot_Firmware`).
- Astronomia calcolata offline con [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT).
