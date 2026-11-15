# Roadmap & Migliorie Future — Dobson Pilot 🔭

Questo documento raccoglie le idee e gli interventi pianificati per migliorare la precisione di puntamento e la fluidità dell'inseguimento (*tracking*), con l'obiettivo di affiancare all'osservazione visuale anche l'**astrofotografia a pose brevi (*Short-Exposure Stacking / EAA*)** e il **planetario (*Lucky Imaging*)**.

---

## 1. Migliorie Firmware (ESP32-S3)
*(Interventi lato [CosmoPilot_Firmware](https://github.com/CosmoPilotProject/CosmoPilot_Firmware))*

- [ ] **Inseguimento a Velocità Continua (Continuous Velocity Tracking)**
  - Sostituire l'attuale logica discreta (*calcola delta ogni `Tracking Interval` → muovi → ferma*) con un calcolo continuo delle velocità angolari istantanee $\dot{Az}(t)$ e $\dot{Alt}(t)$.
  - Pilotare gli stepper tramite timer hardware dell'ESP32-S3 (es. `FastAccelStepper` in modalità velocità continua) aggiornando la frequenza dei passi ogni 50–100 ms senza arresti tra un ciclo e l'altro.
- [ ] **Ottimizzazione Driver TMC2209**
  - Configurare microstepping elevato (64 / 256 micropassi) per ridurre vibrazioni e risonanze alle bassissime velocità di inseguimento.
  - Ottimizzare le correnti di marcia e mantenimento (`IRUN` / `IHOLD`) per contrastare l'attrito statico (*stiction*) della montatura.
- [ ] **Supporto Futuro Astrofotografia Avanzata**
  - Valutare il controllo di un eventuale **3° asse Derotatore di Campo** sul focheggiatore.
  - Valutare un bridge/protocollo per **Autoguida (Pulse Guiding)**.

---

## 2. Migliorie Meccaniche & Hardware

- [ ] **Aumento Rapporto di Riduzione Asse Altitudine (ALT)**
  - Attuale configurazione: `5.5:1` (puleggia asse 55 denti / puleggia motore 10 denti, ~`73.6"`/micropasso a 16x).
  - Obiettivo: portare la riduzione ALT nell'intervallo **`30:1` – `60:1`** (mediante riduttore epicicloidale 5:1 / 10:1 sul motore NEMA17 oppure doppia riduzione a cinghia GT2), allineando la risoluzione a quella dell'Azimuth (`61.53:1`, ~`6.6"`/micropasso) e aumentando la coppia disponibile.
- [ ] **Ottimizzazione Scorrevolezza & Backlash**
  - Ridurre l'attrito statico (*stick-slip*) sui cuscinetti di Altitudine e Azimuth.
  - Tarare la compensazione *Backlash* nell'app dopo eventuali modifiche alle cinghie.

---

## 3. Migliorie PWA (Dobson Pilot)

- [ ] **Profilo Rapido "EAA / Pose Brevi"**
  - Pulsante rapido nelle impostazioni per applicare i parametri ottimali di tracking (es. intervallo minimo `0.2 s`).
- [ ] **Calcolatore Rotazione di Campo & Tempo Posa Consigliato**
  - Mostrare nella vista bersaglio il tasso di rotazione di campo istantaneo ($\omega_{\text{rot}}$) calcolato da Latitudine, Azimut e Altitudine, con stima della posa massima consigliata prima che appaia mosso ai bordi.
- [ ] **Completamento Localizzazioni Multilingua**
  - Rifinire e verificare al 100% tutte le stringhe per `EN`, `ES`, `FR`, `PT` (dopo il completamento della lingua `IT`).
