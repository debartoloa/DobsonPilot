# Changelog

Tutte le modifiche rilevanti a **Dobson Pilot** sono documentate in questo file secondo il formato [Keep a Changelog](https://keepachangelog.com/it/1.0.0/) e il [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-15

### Added
- Client PWA open-source (Licenza MIT) senza build step in Vanilla HTML5, CSS3 e JavaScript ES6+ (`type="module"`), progettato per test WebBLE su iOS (*Bluefy*) con firmware CosmoPilot ESP32-S3.
- Barra di stato a 3 fasi (`BLE`, `SYNC`, `ALIGN`), indicatore inseguimento siderale (`TRK`) e selettore rapido lingua in testata.
- Supporto Web Bluetooth (`ble-transport.js`), simulatore offline (`mock-transport.js`) e coda comandi serializzata con handshake `READY`/`BUSY` (`command-queue.js`).
- Funzionalità complete di puntamento GoTo: Cataloghi offline (*Sistema Solare*, *Messier M1–M110*, *Stelle*, *Galassie*, *Nebulose*, *Oggetti Personalizzati*), *Random Target*, *Manual GoTo*, *Observing Tours* e *Astronomy Quiz Game*.
- Procedure di allineamento *1-Star* e *2-Star* con calcolo separazione angolare e movimento libero (*App Joystick*, *Scope Joystick*, *Hand Move*).
- Calibrazioni hardware (*Joystick Calib*, *Directions*, *Gear Ratio*, *Backlash*, *Gear Ratio Check*, *Factory Reset*) con rapporti di riduzione predefiniti `61.53:1` (Azimuth) e `5.5:1` (Altitudine).
- Design *Deep Space & Glassmorphism* Mobile-First, sfondo stellato procedurale (`starfield.js`) e *Night Mode* rosso scuro su 5 livelli.
- Supporto multilingua (IT, EN, ES, FR, PT) con traduzione integrale della UI in italiano.
- Suite di 317 test automatici (`test/test-phase1.js` – `test/test-phase10.js`).
