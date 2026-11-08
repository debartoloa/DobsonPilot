/**
 * Dobson Pilot - Hardware Calibrations Module
 * Implements the 6 hardware calibration workflows conforming to CosmoPilot firmware:
 * 1. Joystick Calib (Idle deadband & 10s Max movement)
 * 2. Directions (Interactive wizard with raw DIR_CALIB_RESULT & NEXT)
 * 3. Gear Ratio (AZ & ALT 1-100 or 1-200)
 * 4. Backlash (AZ & ALT 0-4000 arcsec with Scope/App joy tabs & guide)
 * 5. Gear Ratio Check (Test speed 4.0°/s, chronometer timer, ratio estimation)
 * 6. Factory Reset (3-second long press safety confirmation)
 */

import { ProtocolCommands } from "../transport/protocol.js";
import { appState } from "../state.js";

// Helper for standard screen header
function makeHeader(title, onBack, lockBack = false) {
  return `
    <div class="screen-header">
      <button class="btn-header-back" id="btn-calib-back" ${lockBack ? 'disabled style="opacity: 0.3;"' : ''}>
        <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
      </button>
      <h2 class="screen-title">${title}</h2>
    </div>
    <div class="screen-divider"></div>
  `;
}

// Helper for standard footer home
function makeFooterHome() {
  return `
    <div class="screen-footer-home">
      <button class="btn-footer-home" data-action="home" title="Torna alla Home">
        <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      </button>
    </div>
  `;
}

// ==========================================
// 1. JOYSTICK CALIBRATION VIEW
// ==========================================
export class JoystickCalibView {
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.element = null;
    this.maxTimer = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    el.innerHTML = `
      ${makeHeader("Joystick Calib", this.onBack)}

      <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
        <!-- Step 1: Idle Calibration -->
        <div class="config-card">
          <div class="card-title">1. Calibrazione Posizione Neutra (Idle)</div>
          <div class="card-description" style="font-size: 12px; color: var(--text-dim); margin-bottom: 12px;">
            Lascia la levetta analogica del telescopio completamente ferma al centro per calibrare la zona morta (deadband).
          </div>
          <button class="btn-gold btn-block" id="btn-calib-idle" style="min-height: 48px;">
            Calibrate Idle Position 🎯
          </button>
        </div>

        <!-- Step 2: Max Movement Calibration -->
        <div class="config-card">
          <div class="card-title">2. Calibrazione Escursione Massima</div>
          <div class="card-description" style="font-size: 12px; color: var(--text-dim); margin-bottom: 12px;">
            Dopo aver premuto il pulsante, ruota la levetta fisica in tutte le direzioni estreme (su, giù, destra, sinistra) per <strong>10 secondi</strong>.
          </div>

          <div id="max-timer-display" style="display: none; text-align: center; margin-bottom: 12px; background: rgba(0,0,0,0.5); padding: 12px; border-radius: 8px; border: 1px solid var(--gold-primary);">
            <div style="font-size: 13px; color: var(--gold-highlight); margin-bottom: 4px;">Muovi la levetta in tutte le direzioni!</div>
            <div style="font-size: 28px; font-weight: 700; color: #f1c40f; font-family: ui-monospace, monospace;" id="lbl-countdown">10s</div>
            <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 8px; overflow: hidden;">
              <div id="prog-countdown" style="height: 100%; width: 100%; background: var(--gold-primary); transition: width 1s linear;"></div>
            </div>
          </div>

          <button class="btn-gold btn-block" id="btn-calib-max" style="min-height: 48px;">
            Start Max Movement (10 s) ⏱️
          </button>
        </div>
      </div>

      ${makeFooterHome()}
    `;

    el.querySelector("#btn-calib-back").addEventListener("click", () => {
      if (this.maxTimer) clearInterval(this.maxTimer);
      if (this.onBack) this.onBack();
    });

    // Idle
    el.querySelector("#btn-calib-idle").addEventListener("click", async () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso!");
        return;
      }
      try {
        await this.queue.send(ProtocolCommands.joystickCalibIdle());
        alert("Calibrazione posizione neutra completata con successo!");
      } catch (e) {
        alert(`Errore: ${e.message}`);
      }
    });

    // Max Movement
    const btnMax = el.querySelector("#btn-calib-max");
    const timerBox = el.querySelector("#max-timer-display");
    const lblCount = el.querySelector("#lbl-countdown");
    const progBar = el.querySelector("#prog-countdown");

    btnMax.addEventListener("click", async () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso!");
        return;
      }

      btnMax.disabled = true;
      timerBox.style.display = "block";
      let timeLeft = 10;
      lblCount.textContent = `${timeLeft}s`;
      progBar.style.width = "100%";

      try {
        await this.queue.send(ProtocolCommands.joystickCalibMax());
      } catch (e) {
        console.warn("Calib max send warning:", e);
      }

      this.maxTimer = setInterval(() => {
        timeLeft--;
        lblCount.textContent = `${timeLeft}s`;
        progBar.style.width = `${(timeLeft / 10) * 100}%`;

        if (timeLeft <= 0) {
          clearInterval(this.maxTimer);
          this.maxTimer = null;
          timerBox.style.display = "none";
          btnMax.disabled = false;
          alert("Calibrazione escursione massima completata con successo!");
        }
      }, 1000);
    });

    return el;
  }
}

// ==========================================
// 2. DIRECTIONS WIZARD VIEW
// ==========================================
export class DirectionsView {
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.element = null;
    this.step = "ready"; // 'ready' | 'moving_alt' | 'ask_alt' | 'moving_az' | 'ask_az' | 'done'
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;
    this.renderCurrentStep(el);
    return el;
  }

  renderCurrentStep(el) {
    const isLocked = this.step === "moving_alt" || this.step === "moving_az";

    el.innerHTML = `
      ${makeHeader("Direction Setup", this.onBack, isLocked)}

      <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
        ${this.getContentHtml()}
      </div>

      ${!isLocked ? makeFooterHome() : ""}
    `;

    const backBtn = el.querySelector("#btn-calib-back");
    if (backBtn && !isLocked) {
      backBtn.addEventListener("click", () => {
        if (this.onBack) this.onBack();
      });
    }

    this.bindStepEvents(el);
  }

  getContentHtml() {
    switch (this.step) {
      case "ready":
        return `
          <div class="config-card">
            <div class="card-title">🧭 Configurazione Direzioni Motori</div>
            <p style="font-size: 13px; color: var(--text-dim); line-height: 1.5; margin: 0 0 14px 0;">
              Prima di iniziare, posiziona manualmente il tubo del telescopio ad un'inclinazione di <strong>circa 45°</strong>, lontano da ostacoli o finecorsa.
            </p>
            <p style="font-size: 12px; color: var(--gold-text); margin: 0 0 16px 0;">
              Il telescopio eseguirà un piccolo movimento verso l'alto (≈5°) e successivamente verso destra (≈20°). La navigazione rimarrà bloccata durante i test di movimento.
            </p>
            <button class="btn-gold btn-block" id="btn-start-direction-setup" style="min-height: 50px; font-size: 15px;">
              Start Direction Setup 🚀
            </button>
          </div>
        `;

      case "moving_alt":
        return `
          <div class="config-card" style="text-align: center; padding: 32px 16px;">
            <div style="font-size: 36px; animation: spin 3s linear infinite; margin-bottom: 16px;">🧭</div>
            <h3 style="color: var(--gold-highlight); font-size: 18px; margin: 0 0 8px 0;">Test Movimento ALTEZZA (≈5°)</h3>
            <p style="font-size: 13px; color: var(--text-dim); margin: 0;">Attendi che il telescopio completi il movimento di prova...</p>
          </div>
        `;

      case "ask_alt":
        return `
          <div class="config-card">
            <div class="card-title">Verifica Altezza (ALT)</div>
            <p style="font-size: 16px; font-weight: 700; color: var(--gold-highlight); margin: 10px 0 20px 0; text-align: center;">
              Did the telescope move UP?
            </p>
            <div style="font-size: 13px; color: var(--text-dim); text-align: center; margin-bottom: 24px;">
              Il tubo si è inclinato verso l'alto (verso lo zenit)?
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <button class="btn-sm" id="btn-alt-no" style="min-height: 52px; font-size: 15px; border-color: rgba(231,76,60,0.5); color: #e74c3c;">
                No (Inverti)
              </button>
              <button class="btn-gold" id="btn-alt-yes" style="min-height: 52px; font-size: 15px;">
                Yes (Corretto)
              </button>
            </div>
          </div>
        `;

      case "moving_az":
        return `
          <div class="config-card" style="text-align: center; padding: 32px 16px;">
            <div style="font-size: 36px; animation: spin 3s linear infinite; margin-bottom: 16px;">🧭</div>
            <h3 style="color: var(--gold-highlight); font-size: 18px; margin: 0 0 8px 0;">Test Movimento AZIMUTH (≈20°)</h3>
            <p style="font-size: 13px; color: var(--text-dim); margin: 0;">Attendi che il telescopio completi il movimento verso destra...</p>
          </div>
        `;

      case "ask_az":
        return `
          <div class="config-card">
            <div class="card-title">Verifica Azimuth (AZ)</div>
            <p style="font-size: 16px; font-weight: 700; color: var(--gold-highlight); margin: 10px 0 20px 0; text-align: center;">
              Did the telescope move RIGHT?
            </p>
            <div style="font-size: 13px; color: var(--text-dim); text-align: center; margin-bottom: 24px;">
              La base ha ruotato in senso orario (verso destra)?
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              <button class="btn-sm" id="btn-az-no" style="min-height: 52px; font-size: 15px; border-color: rgba(231,76,60,0.5); color: #e74c3c;">
                No (Inverti)
              </button>
              <button class="btn-gold" id="btn-az-yes" style="min-height: 52px; font-size: 15px;">
                Yes (Corretto)
              </button>
            </div>
          </div>
        `;

      case "done":
        return `
          <div class="config-card" style="text-align: center; padding: 32px 16px;">
            <div style="width: 68px; height: 68px; border-radius: 50%; background: rgba(46,204,113,0.15); border: 2px solid #2ecc71; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #2ecc71; margin: 0 auto 18px auto;">
              ✓
            </div>
            <h3 style="color: var(--gold-highlight); font-size: 20px; margin: 0 0 8px 0;">Calibrazione Direzioni Completata!</h3>
            <p style="font-size: 13px; color: var(--text-dim); line-height: 1.5; margin: 0 0 24px 0;">
              Le inversioni dei motori di altezza e azimut sono state registrate con successo nella memoria EEPROM del telescopio.
            </p>
            <button class="btn-gold btn-block" id="btn-finish-directions" style="min-height: 48px;">
              Torna alle Calibrazioni ✓
            </button>
          </div>
        `;
    }
  }

  bindStepEvents(el) {
    if (this.step === "ready") {
      el.querySelector("#btn-start-direction-setup").addEventListener("click", async () => {
        if (!this.queue.transport.connected) {
          alert("Telescopio non connesso!");
          return;
        }
        this.step = "moving_alt";
        this.renderCurrentStep(el);

        try {
          // Send CMD DIRECTION_SETUP START
          await this.queue.send(ProtocolCommands.directionSetupStart());
          this.step = "ask_alt";
          this.renderCurrentStep(el);
        } catch (e) {
          alert(`Errore: ${e.message}`);
          this.step = "ready";
          this.renderCurrentStep(el);
        }
      });
    } else if (this.step === "ask_alt") {
      const sendAltResult = async (invert) => {
        try {
          this.step = "moving_az";
          this.renderCurrentStep(el);

          // 1. Send raw DIR_CALIB_RESULT 0|1
          await this.queue.send(ProtocolCommands.rawDirCalibResult(invert));
          // 2. Send raw NEXT
          await this.queue.send(ProtocolCommands.rawNext());

          this.step = "ask_az";
          this.renderCurrentStep(el);
        } catch (e) {
          alert(`Errore: ${e.message}`);
          this.step = "ready";
          this.renderCurrentStep(el);
        }
      };

      el.querySelector("#btn-alt-yes").addEventListener("click", () => sendAltResult(false));
      el.querySelector("#btn-alt-no").addEventListener("click", () => sendAltResult(true));
    } else if (this.step === "ask_az") {
      const sendAzResult = async (invert) => {
        try {
          // Send raw DIR_CALIB_RESULT 0|1
          await this.queue.send(ProtocolCommands.rawDirCalibResult(invert));
          this.step = "done";
          this.renderCurrentStep(el);
        } catch (e) {
          alert(`Errore: ${e.message}`);
          this.step = "ready";
          this.renderCurrentStep(el);
        }
      };

      el.querySelector("#btn-az-yes").addEventListener("click", () => sendAzResult(false));
      el.querySelector("#btn-az-no").addEventListener("click", () => sendAzResult(true));
    } else if (this.step === "done") {
      el.querySelector("#btn-finish-directions").addEventListener("click", () => {
        if (this.onBack) this.onBack();
      });
    }
  }
}

// ==========================================
// 3. GEAR RATIO VIEW
// ==========================================
export class GearRatioView {
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.element = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    const maxRatio = appState.settings.extendGearRatio ? 200 : 100;
    const curAz = appState.telescopeSettings.gearAz ?? 61.53;
    const curAlt = appState.telescopeSettings.gearAlt ?? 6.4;

    el.innerHTML = `
      ${makeHeader("Gear Ratio", this.onBack)}

      <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
        <div class="config-card">
          <div class="card-title">⚙️ Rapporti di Riduzione Meccanica</div>
          <div class="card-description" style="font-size: 12px; color: var(--text-dim); margin-bottom: 14px;">
            Imposta i rapporti di riduzione complessivi dei motori stepper (cinghie + pulegge o riduttori epicicloidali). 
            I valori di AZ e ALT vengono inviati insieme al telescopio.
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <label style="font-size: 12px; color: var(--gold-text);">Rapporto AZ (Azimuth):</label>
                <strong style="color: var(--gold-highlight); font-family: ui-monospace, monospace;" id="lbl-val-az">${curAz} : 1</strong>
              </div>
              <input type="number" id="input-gear-az" min="1" max="${maxRatio}" step="0.01" value="${curAz}" class="gold-input" />
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <label style="font-size: 12px; color: var(--gold-text);">Rapporto ALT (Altezza):</label>
                <strong style="color: var(--gold-highlight); font-family: ui-monospace, monospace;" id="lbl-val-alt">${curAlt} : 1</strong>
              </div>
              <input type="number" id="input-gear-alt" min="1" max="${maxRatio}" step="0.01" value="${curAlt}" class="gold-input" />
            </div>
          </div>

          <div style="font-size: 11px; color: var(--text-muted); margin-top: 10px;">
            Intervallo consentito: 1 – ${maxRatio} ${appState.settings.extendGearRatio ? '(Estensione 200 attiva)' : '(Estendibile a 200 nelle Impostazioni App)'}.
          </div>
        </div>

        <button class="btn-gold btn-block" id="btn-save-gear-ratio" style="min-height: 50px; font-size: 15px;">
          Salva Rapporti nel Telescopio 💾
        </button>
      </div>

      ${makeFooterHome()}
    `;

    el.querySelector("#btn-calib-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    const inAz = el.querySelector("#input-gear-az");
    const inAlt = el.querySelector("#input-gear-alt");
    const lblAz = el.querySelector("#lbl-val-az");
    const lblAlt = el.querySelector("#lbl-val-alt");

    inAz.addEventListener("input", (e) => lblAz.textContent = `${e.target.value} : 1`);
    inAlt.addEventListener("input", (e) => lblAlt.textContent = `${e.target.value} : 1`);

    el.querySelector("#btn-save-gear-ratio").addEventListener("click", async () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso!");
        return;
      }

      const az = parseFloat(inAz.value);
      const alt = parseFloat(inAlt.value);

      if (isNaN(az) || isNaN(alt) || az < 1 || alt < 1 || az > maxRatio || alt > maxRatio) {
        alert(`Inserisci valori validi compresi tra 1 e ${maxRatio}.`);
        return;
      }

      try {
        await this.queue.send(ProtocolCommands.setGearRatio(az, alt));
        appState.saveTelescopeSettings({ gearAz: az, gearAlt: alt });
        alert("Rapporti di riduzione salvati con successo!");
      } catch (err) {
        alert(`Errore invio rapporti: ${err.message}`);
      }
    });

    return el;
  }
}

// ==========================================
// 4. BACKLASH CALIBRATION VIEW
// ==========================================
export class BacklashView {
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.element = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    const curAz = appState.telescopeSettings.backlashAz || 0;
    const curAlt = appState.telescopeSettings.backlashAlt || 0;

    el.innerHTML = `
      ${makeHeader("Backlash", this.onBack)}

      <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
        <div class="config-card">
          <div class="card-title">🔄 Compensazione Gioco Meccanico (Backlash)</div>
          <div class="card-description" style="font-size: 12px; color: var(--text-dim); margin-bottom: 14px;">
            Imposta la compensazione del gioco d'inversione meccanico in arcosecondi (0 – 4000 arcsec).
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="font-size: 12px; color: var(--gold-text); display: block; margin-bottom: 4px;">Backlash AZ (arcosecondi):</label>
              <input type="number" id="in-backlash-az" min="0" max="4000" step="50" value="${curAz}" class="gold-input" />
            </div>

            <div>
              <label style="font-size: 12px; color: var(--gold-text); display: block; margin-bottom: 4px;">Backlash ALT (arcosecondi):</label>
              <input type="number" id="in-backlash-alt" min="0" max="4000" step="50" value="${curAlt}" class="gold-input" />
            </div>
          </div>
        </div>

        <button class="btn-gold btn-block" id="btn-save-backlash" style="min-height: 48px;">
          Salva Backlash nel Telescopio 💾
        </button>

        <!-- Centering Shortcuts -->
        <div class="config-card" style="background: rgba(168,85,247,0.06);">
          <div style="font-size: 12px; color: var(--gold-primary); font-weight: 700; margin-bottom: 8px;">
            🎮 Verifica Gioco con i Joystick:
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button class="btn-sm" data-route="free-analog-joystick">Scope Joystick</button>
            <button class="btn-sm" data-route="free-app-joystick">App Joystick</button>
          </div>
        </div>

        <!-- Help Accordions -->
        <details class="config-card" style="cursor: pointer;">
          <summary style="font-weight: 700; color: var(--gold-highlight); font-size: 13px;">📖 What is Backlash?</summary>
          <p style="font-size: 12px; color: var(--text-dim); line-height: 1.5; margin-top: 8px;">
            Il backlash (gioco meccanico) è il piccolo ritardo di movimento che si verifica quando un motore inverte la direzione di rotazione prima che i denti degli ingranaggi o delle cinghie facciano nuovamente presa.
          </p>
        </details>

        <details class="config-card" style="cursor: pointer;">
          <summary style="font-weight: 700; color: var(--gold-highlight); font-size: 13px;">🔍 How to Check Backlash?</summary>
          <p style="font-size: 12px; color: var(--text-dim); line-height: 1.5; margin-top: 8px;">
            Punta una stella ad alto ingrandimento. Premi 'Destra' sul joystick, poi rilascia e premi 'Sinistra'. Se c'è una pausa prima che la stella cominci a muoversi in direzione opposta, aumenta il valore in arcosecondi fino a quando il moto è istantaneo senza scatti.
          </p>
        </details>
      </div>

      ${makeFooterHome()}
    `;

    el.querySelector("#btn-calib-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-save-backlash").addEventListener("click", async () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso!");
        return;
      }
      const az = parseInt(el.querySelector("#in-backlash-az").value, 10);
      const alt = parseInt(el.querySelector("#in-backlash-alt").value, 10);

      if (isNaN(az) || isNaN(alt) || az < 0 || alt < 0 || az > 4000 || alt > 4000) {
        alert("Inserisci valori di backlash compresi tra 0 e 4000 arcosecondi.");
        return;
      }

      try {
        await this.queue.send(ProtocolCommands.backlashCalib(az, alt));
        appState.telescopeSettings.backlashAz = az;
        appState.telescopeSettings.backlashAlt = alt;
        alert("Calibrazione backlash registrata con successo!");
      } catch (e) {
        alert(`Errore: ${e.message}`);
      }
    });

    return el;
  }
}

// ==========================================
// 5. GEAR RATIO CHECK VIEW
// ==========================================
export class GearRatioCheckView {
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.element = null;
    this.timer = null;
    this.startTime = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    const curAz = appState.telescopeSettings.gearAz ?? 61.53;
    const curAlt = appState.telescopeSettings.gearAlt ?? 6.4;

    el.innerHTML = `
      ${makeHeader("Gear Ratio Check", this.onBack)}

      <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
        <!-- Pre-check setup buttons -->
        <div class="config-card">
          <div class="card-title">1. Preparazione Test</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
            <button class="btn-sm" id="btn-send-test-speed" style="padding: 10px;">
              ⚡ Send Test Speed (4.0°/s)
            </button>
            <button class="btn-sm" id="btn-get-settings" style="padding: 10px;">
              📋 Get Telescope Settings
            </button>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;" id="lbl-check-cur-ratios">
            Rapporti attuali letti: AZ <strong>${curAz}</strong> : 1 | ALT <strong>${curAlt}</strong> : 1
          </div>
        </div>

        <!-- Check ALT section -->
        <div class="config-card">
          <div class="card-title">2. Check ALT (90° da Orizzontale a Verticale)</div>
          <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 10px;">
            Porta il tubo orizzontale (0°). Tieni premuto il pulsante qui sotto mentre il tubo sale esattamente a 90° (verticale), poi rilascia:
          </div>
          <button class="btn-gold btn-block btn-hold-measure" id="btn-measure-alt" style="min-height: 52px; font-size: 15px;">
            Hold UP (Misura ALT 90°) ⏱️
          </button>
          <div id="res-alt" style="display: none; margin-top: 10px; font-size: 13px; color: var(--gold-highlight); background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 6px;"></div>
        </div>

        <!-- Check AZ section -->
        <div class="config-card">
          <div class="card-title">3. Check AZ (Rotazione Completa 360°)</div>
          <div style="font-size: 12px; color: var(--text-dim); margin-bottom: 10px;">
            Allinea un punto di riferimento sulla base. Tieni premuto mentre il telescopio compie un giro completo di 360°, poi rilascia:
          </div>
          <button class="btn-gold btn-block btn-hold-measure" id="btn-measure-az" style="min-height: 52px; font-size: 15px;">
            Hold RIGHT (Misura AZ 360°) ⏱️
          </button>
          <div id="res-az" style="display: none; margin-top: 10px; font-size: 13px; color: var(--gold-highlight); background: rgba(0,0,0,0.4); padding: 8px 12px; border-radius: 6px;"></div>
        </div>

        <!-- Reminder Alert -->
        <div class="config-card" style="border-color: rgba(168,85,247,0.4); background: rgba(168,85,247,0.08); padding: 10px 14px;">
          <div style="font-size: 12px; color: var(--gold-highlight); display: flex; align-items: center; gap: 8px;">
            <span>⚠️</span> <span>Ricorda di ripristinare la velocità massima al termine del test. Stima calcolata con incertezza indicativa ±5%.</span>
          </div>
        </div>
      </div>

      ${makeFooterHome()}
    `;

    el.querySelector("#btn-calib-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    // Send test speed
    el.querySelector("#btn-send-test-speed").addEventListener("click", async () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso!");
        return;
      }
      try {
        await this.queue.send(ProtocolCommands.appSpeed(4));
        alert("Velocità di test impostata a 4.0 °/s!");
      } catch (e) {
        alert(`Errore: ${e.message}`);
      }
    });

    // Get settings
    el.querySelector("#btn-get-settings").addEventListener("click", async () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso!");
        return;
      }
      try {
        await this.queue.send(ProtocolCommands.showSettings());
        setTimeout(() => {
          const az = appState.telescopeSettings.gearAz ?? 61.53;
          const alt = appState.telescopeSettings.gearAlt ?? 6.4;
          el.querySelector("#lbl-check-cur-ratios").innerHTML = `Rapporti attuali letti: AZ <strong>${az}</strong> : 1 | ALT <strong>${alt}</strong> : 1`;
          alert("Impostazioni lette con successo!");
        }, 800);
      } catch (e) {
        alert(`Errore: ${e.message}`);
      }
    });

    // Hold ALT measurement
    this.bindHoldMeasurement(el.querySelector("#btn-measure-alt"), el.querySelector("#res-alt"), "UP", 90, () => appState.telescopeSettings.gearAlt ?? 6.4);
    // Hold AZ measurement
    this.bindHoldMeasurement(el.querySelector("#btn-measure-az"), el.querySelector("#res-az"), "RIGHT", 360, () => appState.telescopeSettings.gearAz ?? 61.53);

    return el;
  }

  bindHoldMeasurement(btn, resEl, dir, targetAngleDeg, getCurRatio) {
    let timerInterval = null;
    let startTime = null;

    const start = (e) => {
      e.preventDefault();
      if (!this.queue.transport.connected) return;

      btn.classList.add("active");
      startTime = Date.now();
      if (this.queue.transport.connected) {
        this.queue.sendPriority(ProtocolCommands.appDir(dir));
      }

      resEl.style.display = "block";
      resEl.textContent = `Movimento in corso... 0.0s`;

      timerInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        resEl.textContent = `Movimento in corso... ${elapsed.toFixed(1)}s`;
      }, 100);
    };

    const stop = (e) => {
      e.preventDefault();
      if (!startTime) return;

      btn.classList.remove("active");
      clearInterval(timerInterval);
      if (this.queue.transport.connected) {
        this.queue.sendPriority(ProtocolCommands.appDir("STOP"));
      }

      const elapsedSec = (Date.now() - startTime) / 1000;
      startTime = null;

      // Formula prompt: Stima = rapporto attuale × (tempo × velocità ÷ angolo)
      const curRatio = getCurRatio();
      const testSpeedDegSec = 4.0;
      const estimatedRatio = curRatio * (elapsedSec * testSpeedDegSec / targetAngleDeg);

      resEl.innerHTML = `
        Tempo: <strong>${elapsedSec.toFixed(2)} s</strong><br>
        Rapporto Stimato: <strong>${estimatedRatio.toFixed(1)} : 1</strong> (±5% incertezza)<br>
        <small style="color: var(--text-muted);">Rapporto attuale configurato: ${curRatio}:1</small>
      `;
    };

    btn.addEventListener("mousedown", start);
    btn.addEventListener("mouseup", stop);
    btn.addEventListener("mouseleave", stop);
    btn.addEventListener("touchstart", start, { passive: false });
    btn.addEventListener("touchend", stop, { passive: false });
  }
}

// ==========================================
// 6. FACTORY RESET VIEW
// ==========================================
export class FactoryResetView {
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.element = null;
    this.pressTimer = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    el.innerHTML = `
      ${makeHeader("Factory Reset", this.onBack)}

      <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
        <div class="config-card" style="border-color: rgba(231,76,60,0.5); background: rgba(231,76,60,0.06);">
          <div class="card-title" style="color: #e74c3c;">⚠️ Ripristino Dati di Fabbrica</div>
          <p style="font-size: 13px; color: var(--text-dim); line-height: 1.5; margin: 10px 0;">
            Questa operazione cancellerà tutte le calibrazioni, i rapporti di riduzione, le posizioni del joystick e le inversioni salvate nell'ESP32, ripristinando i valori di fabbrica.
          </p>
        </div>

        <div class="config-card" style="text-align: center; padding: 24px 16px;">
          <div style="font-size: 13px; color: var(--gold-highlight); margin-bottom: 12px;">
            Per evitare ripristini accidentali, <strong>tieni premuto per 3 secondi</strong>:
          </div>

          <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 20px;">
            <div id="prog-factory-reset" style="height: 100%; width: 0%; background: #e74c3c; transition: width 0.1s linear;"></div>
          </div>

          <button class="btn-sm btn-block" id="btn-hold-factory-reset" style="min-height: 54px; font-size: 16px; border-color: rgba(231,76,60,0.6); color: #e74c3c; user-select: none; -webkit-user-select: none;">
            ⚠️ Tieni premuto 3 secondi per Reset
          </button>
        </div>
      </div>

      ${makeFooterHome()}
    `;

    el.querySelector("#btn-calib-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    const btn = el.querySelector("#btn-hold-factory-reset");
    const prog = el.querySelector("#prog-factory-reset");
    let holdStart = null;

    const startHold = (e) => {
      e.preventDefault();
      holdStart = Date.now();
      prog.style.width = "0%";

      this.pressTimer = setInterval(async () => {
        const elapsed = Date.now() - holdStart;
        const pct = Math.min(100, (elapsed / 3000) * 100);
        prog.style.width = `${pct}%`;

        if (elapsed >= 3000) {
          clearInterval(this.pressTimer);
          this.pressTimer = null;
          prog.style.width = "100%";

          if (!this.queue.transport.connected) {
            alert("Telescopio non connesso!");
            prog.style.width = "0%";
            return;
          }

          try {
            await this.queue.send(ProtocolCommands.factoryReset());
            alert("Ripristino di fabbrica completato con successo!");
            if (this.onBack) this.onBack();
          } catch (err) {
            alert(`Errore durante il reset: ${err.message}`);
            prog.style.width = "0%";
          }
        }
      }, 50);
    };

    const cancelHold = (e) => {
      e.preventDefault();
      if (this.pressTimer) {
        clearInterval(this.pressTimer);
        this.pressTimer = null;
      }
      prog.style.width = "0%";
    };

    btn.addEventListener("mousedown", startHold);
    btn.addEventListener("mouseup", cancelHold);
    btn.addEventListener("mouseleave", cancelHold);
    btn.addEventListener("touchstart", startHold, { passive: false });
    btn.addEventListener("touchend", cancelHold, { passive: false });

    return el;
  }
}
