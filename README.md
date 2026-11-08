# Dobson Pilot 🔭

**Dobson Pilot** è una Progressive Web App (PWA) sperimentale **Open-Source** (rilasciata sotto licenza **MIT**), sviluppata **esclusivamente a scopo di test, studio e sperimentazione in ambito iOS** (tramite Web Bluetooth / browser Bluefy) per il controllo di telescopi Dobson motorizzati fai-da-te basati su microcontrollore **ESP32-S3** (2 motori stepper NEMA17 e driver TMC2209).

---

## ⚠️ Disclaimer Importante & Progetto Ufficiale

- **Finalità di Test in Ambito iOS**: Questo progetto è un client sperimentale indipendente e **non ufficiale**, nato unicamente per consentire test tecnici di comunicazione Bluetooth Low Energy (BLE) su dispositivi **iOS / iPadOS** (tramite browser compatibili WebBLE come *Bluefy*).
- **Compatibilità Firmware Open-Source**: Il client comunica con il firmware open-source rilasciato pubblicamente su GitHub:
  - 🔗 **Firmware Repository**: [https://github.com/CosmoPilotProject/CosmoPilot_Firmware](https://github.com/CosmoPilotProject/CosmoPilot_Firmware)
- **Applicazione Commerciale & Ecosistema Ufficiale**: Questo progetto **non intende in alcun modo sostituire** o porsi in concorrenza con l'applicazione ufficiale. Per l'utilizzo standard, il supporto ufficiale, i kit hardware e l'esperienza completa si rimanda al sito e all'applicazione ufficiale **CosmoPilot**:
  - 🌐 **Website Ufficiale**: [https://cosmo-pilot.com](https://cosmo-pilot.com)

*Tutti i marchi e i nomi citati appartengono ai rispettivi proprietari. Il software è fornito "così com'è" (AS IS), senza alcuna garanzia espressa o implicita.*

---

## 🌌 Caratteristiche Tecniche (Ambiente di Test)

- **100% Client-Side & Open Source (MIT)**: Nessun build step obbligatorio, zero dipendenze runtime da CDN esterne (libreria astronomica inclusa localmente in `/vendor`).
- **Sperimentazione Web Bluetooth su iOS**: Compatibile con il browser gratuito **Bluefy** su iPhone e iPad (e nativamente con Chrome/Edge su Desktop/Android per il debug).
- **Simulatore Firmware Mock Integrato**: Consente il collaudo dell'interfaccia e la verifica dei flussi di protocollo anche senza avere l'hardware fisico collegato.
- **Handshake BLE Serializzato**: Gestione dei pacchetti `READY` / `BUSY`, prioritizzazione immediata dei comandi critici (`STOP GOTO`, keepalive joystick, direzioni) e rispetto del limite ATT a 127 byte.
- **Barra di Stato a 3 Fasi**:
  1. *Fase 1 (`BLE`)*: Connessione Bluetooth attiva
  2. *Fase 2 (`SYNC`)*: Sincronizzazione Data, Ora e Coordinate GPS completata
  3. *Fase 3 (`ALIGN`)*: Allineamento stellare eseguito
  - Indicatore dinamico di inseguimento siderale (`TRK`).
- **Allineamento Stellare (1-Star & 2-Star Align)**:
  - **1-Star Align**: selezione stella visibile (mag ≤ 4.0), centraggio manuale a 8 direzioni e invio `CMD STAR_1_CALIB`.
  - **2-Star Align**: calcolo live della separazione angolare sferica raccomandata (≥ 30°), slewing automatico (`CMD NEXT`) e rifinitura finale (`CMD FINISH_2_STAR_CALIB`).
- **Inseguimento Siderale & SkyBox Assist**:
  - Controllo tramite App Joystick virtuale a 8 direzioni (con watchdog keepalive di sicurezza a 3.5s) e supporto Scope Joystick analogico / Hand Move (`CMD RELEASE_STEPPERS`).
  - SkyBox Assist con configurazione di sensibilità (Low/Med/High) e velocità (Slow/Norm/Fast).
- **Calibrazioni Hardware**:
  - **Joystick Calib**: calibrazione punto neutro e corsa massima.
  - **Directions Setup**: procedura guidata interattiva per l'inversione degli assi Alt/Az.
  - **Gear Ratio & Backlash**: configurazione rapporti di riduzione anche decimali (valori predefiniti custom: **AZ `61.53:1`**, **ALT `6.4:1`**) e compensazione del gioco meccanico (0–4000 arcsec).
  - **Gear Ratio Check**: misura empirica dei tempi di rotazione a velocità costante (4.0°/s) con cronometro interattivo.
  - **Factory Reset**: ripristino dei parametri NVS con pressione prolungata di sicurezza (3 secondi).
- **Cataloghi Offline, Tour Osservativi & Modalità Notturna**:
  - Database offline integrati (*Sistema Solare*, *Messier*, *Stelle*, *Galassie*, *Nebulose*, *Oggetti Custom*), pianificatore di **Observing Tours** e **Quiz Game** didattico.
  - Design **Deep Space & Glassmorphism** Mobile-First con **Night Mode** monocromatico rosso scuro su 5 livelli di intensità per preservare l'adattamento scotopico della pupilla.
  - Supporto multilingua (Italiano, English, Español, Français, Português).

---

## 📱 Guida per i Test su iOS (iPhone / iPad)

Poiché Apple Safari su iOS non implementa l'API standard Web Bluetooth:
1. Installa l'app gratuita **Bluefy – Web BLE Browser** dall'App Store di Apple.
2. Apri l'URL HTTPS della PWA (es. tramite GitHub Pages) all'interno di **Bluefy**.
3. Dalla schermata **Config → Bluetooth**, avvia la scansione Web Bluetooth o attiva il **Simulatore Mock** per i test offline.
4. *Nota*: Lo Screen Wake Lock viene richiesto automaticamente alla connessione per evitare lo spegnimento dello schermo durante i test.

---

## 🧪 Suite di Test Automatici

Il repository include una suite di **317 test automatici** eseguibili via Node.js senza dipendenze esterne:

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

## 🚀 Avvio Locale per Sviluppo

```bash
# Avvia un server statico locale
npx serve .
# oppure
python -m http.server 8080
```

---

## ⚠️ Avvertenze di Sicurezza Fisica e Solare

- **Movimento Autonomo dei Motori**: Le operazioni di GoTo e inseguimento sono gestite direttamente dal firmware sull'ESP32 e continuano anche se il telefono si disconnette o il browser viene chiuso. Usa sempre il comando **Stop GoTo** per fermare i motori e verifica che non vi siano cavi o ostacoli attorno al telescopio.
- **Pericolo Solare**: **NON puntare MAI il Sole** senza un filtro solare certificato a tutta apertura saldamente installato davanti all'obiettivo. Rischio di cecità immediata e irreversibile e danni gravi allo strumento.

---

## 📄 Licenza e Riferimenti

- **Licenza**: Rilasciato sotto [Licenza MIT](https://opensource.org/licenses/MIT).
- **Sito Ufficiale CosmoPilot**: [https://cosmo-pilot.com](https://cosmo-pilot.com)
- **Firmware Open-Source ESP32**: [https://github.com/CosmoPilotProject/CosmoPilot_Firmware](https://github.com/CosmoPilotProject/CosmoPilot_Firmware)
- **Effemeridi Astronomiche Offline**: Calcolate tramite [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT License).
