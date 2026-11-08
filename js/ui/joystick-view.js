/**
 * Dobson Pilot - Joystick View Component
 * Supports both App Joystick (virtual 8-way pad) and Scope Joystick (hardware levetta).
 * Features RA/Dec telemetry, speed slider (1-10 with microstep support),
 * axis invert toggles, tracking/SkyBox controls, control lock, and 3.5s keepalive safety.
 */

import { appState } from "../state.js";
import { ProtocolCommands } from "../transport/protocol.js";

export class JoystickView {
  /**
   * @param {Object} options
   * @param {boolean} options.isAnalog - If true, displays Telescope/Scope joystick mode
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.isAnalog = Boolean(options.isAnalog);
    this.queue = options.commandQueue;
    this.onBack = options.onBack;

    this.speed = 4; // Default level 4
    this.invertAlt = false;
    this.invertAz = false;
    this.trackingActive = false;
    this.skyboxActive = false;
    this.controlsLocked = false;

    this.activeDirection = null;
    this.keepaliveTimer = null;
    this.radecUnsub = null;
    this.statusUnsub = null;

    this.element = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container joystick-screen";
    this.element = el;

    const title = this.isAnalog ? "Scope Joystick" : "App Joystick";

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-joystick-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">${title}</h2>
        <button class="btn-lock-toggle ${this.controlsLocked ? 'locked' : ''}" id="btn-toggle-lock" title="Blocca controlli">
          <span class="lock-icon">${this.controlsLocked ? '🔒' : '🔓'}</span>
        </button>
      </div>
      <div class="screen-divider"></div>

      ${!appState.connected ? `
        <div class="config-card" id="banner-disconnected-hint" style="border-color: rgba(241, 196, 15, 0.4); background: rgba(25, 20, 10, 0.85); padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 12px; color: var(--gold-highlight);">
            ⚠️ Telescopio non connesso.
          </span>
          <button class="btn-sm" id="btn-quick-enable-mock" style="font-size: 11px; padding: 4px 8px; border-color: var(--gold-primary);">
            Attiva Mock
          </button>
        </div>
      ` : ""}

      <!-- Live Coordinates Display -->
      <div class="coords-card">
        <div class="coord-row">
          <span class="coord-label">RA (Epoca):</span>
          <div class="coord-values">
            <span class="coord-box" id="val-ra-h">00<small>h</small></span>
            <span class="coord-box" id="val-ra-m">00<small>m</small></span>
            <span class="coord-box" id="val-ra-s">00<small>s</small></span>
          </div>
        </div>
        <div class="coord-row">
          <span class="coord-label">DEC:</span>
          <div class="coord-values">
            <span class="coord-box" id="val-dec-deg">+00<small>°</small></span>
            <span class="coord-box" id="val-dec-min">00<small>'</small></span>
            <span class="coord-box" id="val-dec-sec">00<small>"</small></span>
          </div>
        </div>
      </div>

      <!-- Speed Control Slider -->
      <div class="joystick-control-card">
        <div class="speed-header">
          <span>Velocità Motori: <strong id="lbl-speed-val">Livello ${this.speed}</strong></span>
          <span class="speed-deg-sec" id="lbl-speed-deg">${this.calculateSpeedDegSec(this.speed)} °/s</span>
        </div>
        <input 
          type="range" 
          id="slider-motor-speed" 
          min="1" 
          max="10" 
          step="1" 
          value="${this.speed}" 
          class="gold-slider"
        />
        <div class="speed-ticks">
          <span>1 (Micro)</span>
          <span>5</span>
          <span>10 (Max)</span>
        </div>
      </div>

      <!-- Axis Inversion Toggles -->
      <div class="joystick-control-card toggles-card">
        <label class="toggle-control">
          <input type="checkbox" id="chk-inv-alt" ${this.invertAlt ? 'checked' : ''} />
          <span class="toggle-slider"></span>
          <span class="toggle-label">Inverti Su/Giù (ALT)</span>
        </label>
        <label class="toggle-control">
          <input type="checkbox" id="chk-inv-az" ${this.invertAz ? 'checked' : ''} />
          <span class="toggle-slider"></span>
          <span class="toggle-label">Inverti Dx/Sx (AZ)</span>
        </label>
      </div>

      <!-- Action Toggles: Tracking & SkyBox -->
      <div class="joystick-action-grid" style="display: flex; gap: 8px;">
        <button class="btn-gold btn-toggle-action ${this.trackingActive ? 'active' : ''}" id="btn-toggle-tracking" style="flex: 1;">
          <span class="action-icon">🔄</span>
          <span id="lbl-tracking-btn">${this.trackingActive ? 'Ferma Inseguimento' : 'Avvia Inseguimento'}</span>
        </button>

        <div style="display: flex; gap: 6px; flex: 1;">
          <button class="btn-gold btn-toggle-action ${this.skyboxActive ? 'active' : ''}" id="btn-toggle-skybox" style="flex: 1;">
            <span class="action-icon">✨</span>
            <span id="lbl-skybox-btn">${this.skyboxActive ? 'SkyBox ON' : 'SkyBox Assist'}</span>
          </button>
          <button class="btn-sm" id="btn-skybox-settings" style="padding: 0 10px; font-size: 14px;" title="Impostazioni SkyBox Assist">
            ⚙️
          </button>
        </div>
      </div>

      <!-- 8-Direction Pad (App Joystick only) -->
      ${!this.isAnalog ? `
        <div class="dpad-wrapper ${this.controlsLocked ? 'dpad-locked' : ''}">
          <div class="dpad-container" id="dpad-grid">
            <button class="dpad-btn dpad-diag dpad-ul" data-dir="ULEFT" title="Su-Sinistra">◤</button>
            <button class="dpad-btn dpad-card dpad-up" data-dir="UP" title="Su">▲</button>
            <button class="dpad-btn dpad-diag dpad-ur" data-dir="URIGHT" title="Su-Destra">◥</button>
            
            <button class="dpad-btn dpad-card dpad-left" data-dir="LEFT" title="Sinistra">◀</button>
            <button class="dpad-btn dpad-center" id="btn-dpad-stop" title="STOP / Arresto">
              <span class="stop-icon">🛑</span>
            </button>
            <button class="dpad-btn dpad-card dpad-right" data-dir="RIGHT" title="Destra">▶</button>
            
            <button class="dpad-btn dpad-diag dpad-dl" data-dir="DLEFT" title="Giù-Sinistra">◣</button>
            <button class="dpad-btn dpad-card dpad-down" data-dir="DOWN" title="Giù">▼</button>
            <button class="dpad-btn dpad-diag dpad-dr" data-dir="DRIGHT" title="Giù-Destra">◢</button>
          </div>
          ${this.controlsLocked ? `
            <div class="lock-overlay" id="dpad-lock-msg">
              <span>🔒 Controlli Bloccati</span>
            </div>
          ` : ""}
        </div>
      ` : `
        <div class="analog-info-card">
          <div class="analog-icon">🕹️</div>
          <div class="analog-title">Levetta Fisica Attiva</div>
          <div class="analog-desc">
            Muovi il telescopio tramite la levetta analogica montata sul tubo. 
            Il pulsante fisico cicla le velocità preimpostate.
          </div>
        </div>
      `}

      <!-- Bottom Home Button -->
      <div class="screen-footer-home">
        <button class="btn-footer-home" id="btn-joystick-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindEvents(el);
    this.startMode();

    return el;
  }

  calculateSpeedDegSec(n) {
    const vmax = appState.telescopeSettings.maxSpeed || 4.0;
    const v = 0.1 + (n - 1) * (vmax - 0.1) / 9;
    return v.toFixed(2);
  }

  async startMode() {
    try {
      if (this.isAnalog) {
        await this.queue.send(ProtocolCommands.analogJoystick());
      } else {
        await this.queue.send(ProtocolCommands.appJoystickStart());
      }
    } catch (err) {
      console.warn("Could not start joystick mode:", err);
    }
  }

  async stopMode() {
    this.stopDirectionMovement();
    try {
      await this.queue.send(ProtocolCommands.none());
    } catch (e) {
      console.warn("Error exiting joystick mode:", e);
    }
  }

  bindEvents(el) {
    // Quick enable mock from banner
    const btnQuickMock = el.querySelector("#btn-quick-enable-mock");
    if (btnQuickMock) {
      btnQuickMock.addEventListener("click", async () => {
        if (window.transportManager) {
          await window.transportManager.setUseMock(true);
          const banner = el.querySelector("#banner-disconnected-hint");
          if (banner) banner.remove();
          this.startMode();
        }
      });
    }

    // Back & Home
    el.querySelector("#btn-joystick-back").addEventListener("click", async () => {
      await this.stopMode();
      this.destroy();
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-joystick-home").addEventListener("click", async () => {
      await this.stopMode();
      this.destroy();
      window.router?.home();
    });

    // Lock toggle
    const btnLock = el.querySelector("#btn-toggle-lock");
    btnLock.addEventListener("click", () => {
      this.controlsLocked = !this.controlsLocked;
      btnLock.classList.toggle("locked", this.controlsLocked);
      btnLock.querySelector(".lock-icon").textContent = this.controlsLocked ? '🔒' : '🔓';
      
      const dpadWrapper = el.querySelector(".dpad-wrapper");
      if (dpadWrapper) {
        dpadWrapper.classList.toggle("dpad-locked", this.controlsLocked);
        let overlay = el.querySelector("#dpad-lock-msg");
        if (this.controlsLocked && !overlay) {
          overlay = document.createElement("div");
          overlay.id = "dpad-lock-msg";
          overlay.className = "lock-overlay";
          overlay.innerHTML = `<span>🔒 Controlli Bloccati</span>`;
          dpadWrapper.appendChild(overlay);
        } else if (!this.controlsLocked && overlay) {
          overlay.remove();
        }
      }
    });

    // Speed Slider
    const slider = el.querySelector("#slider-motor-speed");
    const lblVal = el.querySelector("#lbl-speed-val");
    const lblDeg = el.querySelector("#lbl-speed-deg");

    slider.addEventListener("input", (e) => {
      this.speed = parseInt(e.target.value, 10);
      const isMicro = this.speed <= 2 ? " (Micro)" : "";
      lblVal.textContent = `Livello ${this.speed}${isMicro}`;
      lblDeg.textContent = `${this.calculateSpeedDegSec(this.speed)} °/s`;
    });

    slider.addEventListener("change", async (e) => {
      const sp = parseInt(e.target.value, 10);
      if (this.isAnalog) {
        await this.queue.send(ProtocolCommands.analogSpeed(sp));
      } else {
        await this.queue.send(ProtocolCommands.appSpeed(sp));
      }
    });

    // Inversion Toggles
    const chkAlt = el.querySelector("#chk-inv-alt");
    const chkAz = el.querySelector("#chk-inv-az");

    const onToggleChange = async () => {
      this.invertAlt = chkAlt.checked;
      this.invertAz = chkAz.checked;
      if (this.isAnalog) {
        await this.queue.send(ProtocolCommands.analogToggle(this.invertAlt, this.invertAz));
      } else {
        await this.queue.send(ProtocolCommands.appToggle(this.invertAlt, this.invertAz));
      }
    };
    chkAlt.addEventListener("change", onToggleChange);
    chkAz.addEventListener("change", onToggleChange);

    // Tracking Button
    const btnTracking = el.querySelector("#btn-toggle-tracking");
    const lblTracking = el.querySelector("#lbl-tracking-btn");
    btnTracking.addEventListener("click", async () => {
      this.trackingActive = !this.trackingActive;
      btnTracking.classList.toggle("active", this.trackingActive);
      lblTracking.textContent = this.trackingActive ? "Ferma Inseguimento" : "Avvia Inseguimento";

      if (this.trackingActive) {
        if (this.isAnalog) {
          await this.queue.send(ProtocolCommands.analogStartTracking());
        } else {
          await this.queue.send(ProtocolCommands.appStartTracking());
        }
      } else {
        if (this.isAnalog) {
          await this.queue.send(ProtocolCommands.analogStopTracking());
        } else {
          await this.queue.send(ProtocolCommands.appStopTracking());
        }
      }
    });

    // SkyBox Button
    const btnSkybox = el.querySelector("#btn-toggle-skybox");
    const lblSkybox = el.querySelector("#lbl-skybox-btn");
    btnSkybox.addEventListener("click", async () => {
      this.skyboxActive = !this.skyboxActive;
      btnSkybox.classList.toggle("active", this.skyboxActive);
      lblSkybox.textContent = this.skyboxActive ? "SkyBox ON" : "SkyBox Assist";

      if (this.isAnalog) {
        await this.queue.send(ProtocolCommands.analogSkyBoxAssist(this.skyboxActive));
      } else {
        await this.queue.send(ProtocolCommands.appSkyBoxAssist(this.skyboxActive));
      }
    });

    // SkyBox Settings button
    const btnSkyboxSettings = el.querySelector("#btn-skybox-settings");
    if (btnSkyboxSettings) {
      btnSkyboxSettings.addEventListener("click", () => {
        this.showSkyboxSettingsModal(el);
      });
    }

    // 8-Direction Pad (App mode only)
    if (!this.isAnalog) {
      const dpadButtons = el.querySelectorAll(".dpad-btn[data-dir]");
      dpadButtons.forEach(btn => {
        const dir = btn.getAttribute("data-dir");

        const startMoving = (e) => {
          if (this.controlsLocked) return;
          e.preventDefault();
          this.startDirectionMovement(dir, btn);
        };

        const stopMoving = (e) => {
          e.preventDefault();
          this.stopDirectionMovement();
        };

        btn.addEventListener("pointerdown", startMoving);
        btn.addEventListener("pointerup", stopMoving);
        btn.addEventListener("pointercancel", stopMoving);
        btn.addEventListener("pointerleave", (e) => {
          // Stop if pointer drifts outside button
          if (this.activeDirection === dir) {
            stopMoving(e);
          }
        });
      });

      // Explicit center STOP button
      const btnStop = el.querySelector("#btn-dpad-stop");
      btnStop.addEventListener("click", () => {
        this.stopDirectionMovement();
      });
    }

    // Safety Listeners: blur, visibilitychange, pagehide
    this._onVisibilityChange = () => {
      if (document.hidden) {
        this.stopDirectionMovement();
      }
    };
    this._onBlur = () => {
      this.stopDirectionMovement();
    };
    this._onPageHide = () => {
      this.stopDirectionMovement();
      this.stopMode();
    };

    document.addEventListener("visibilitychange", this._onVisibilityChange);
    window.addEventListener("blur", this._onBlur);
    window.addEventListener("pagehide", this._onPageHide);

    // Coordinate telemetry listener
    this.radecUnsub = appState.on("radec_changed", ({ ra, dec }) => {
      this.updateCoordsDisplay(ra, dec);
    });

    // Status listener (tracking bit update)
    this.statusUnsub = appState.on("status_changed", (summary) => {
      if (summary.tracking !== this.trackingActive) {
        this.trackingActive = summary.tracking;
        btnTracking.classList.toggle("active", this.trackingActive);
        lblTracking.textContent = this.trackingActive ? "Ferma Inseguimento" : "Avvia Inseguimento";
      }
    });
  }

  startDirectionMovement(dir, btnElement) {
    if (this.activeDirection === dir) return;
    this.stopDirectionMovement();

    this.activeDirection = dir;
    if (btnElement) btnElement.classList.add("btn-pressed");

    // 1. Send direction command immediately (priority outside queue)
    this.queue.send(ProtocolCommands.appDir(dir)).catch(() => {});

    // 2. Start 1-second keepalive timer (must arrive within 3.5s)
    this.keepaliveTimer = setInterval(() => {
      if (this.activeDirection) {
        this.queue.send(ProtocolCommands.appKeepalive()).catch(() => {});
      }
    }, 1000);
  }

  stopDirectionMovement() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }

    if (this.activeDirection) {
      this.activeDirection = null;
      if (this.element) {
        this.element.querySelectorAll(".dpad-btn").forEach(b => b.classList.remove("btn-pressed"));
      }
      // Send STOP direction command immediately
      this.queue.send(ProtocolCommands.appDir("STOP")).catch(() => {});
    }
  }

  updateCoordsDisplay(ra, dec) {
    if (!this.element) return;
    const pad = (n) => String(Math.abs(n)).padStart(2, "0");

    const elRaH = this.element.querySelector("#val-ra-h");
    const elRaM = this.element.querySelector("#val-ra-m");
    const elRaS = this.element.querySelector("#val-ra-s");

    const elDecDeg = this.element.querySelector("#val-dec-deg");
    const elDecMin = this.element.querySelector("#val-dec-min");
    const elDecSec = this.element.querySelector("#val-dec-sec");

    if (elRaH && ra) {
      elRaH.innerHTML = `${pad(ra.h)}<small>h</small>`;
      elRaM.innerHTML = `${pad(ra.m)}<small>m</small>`;
      elRaS.innerHTML = `${pad(ra.s)}<small>s</small>`;
    }

    if (elDecDeg && dec) {
      const sign = (dec.deg < 0 || Object.is(dec.deg, -0)) ? "-" : "+";
      elDecDeg.innerHTML = `${sign}${pad(dec.deg)}<small>°</small>`;
      elDecMin.innerHTML = `${pad(dec.min)}<small>'</small>`;
      elDecSec.innerHTML = `${pad(dec.sec)}<small>"</small>`;
    }
  }

  showSkyboxSettingsModal(parentEl) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";

    const currentSens = appState.settings.skyboxSensitivity || "med";
    const currentSpeed = appState.settings.skyboxSpeed || "norm";

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 420px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-family: var(--font-title); color: var(--gold-primary); font-size: 18px; margin: 0;">
            ✨ SkyBox Assist Settings
          </h3>
          <button class="btn-sm" id="btn-close-skybox-modal" style="padding: 2px 8px;">✕</button>
        </div>

        <div class="config-card" style="margin-bottom: 14px;">
          <div class="card-description" style="font-size: 12px; color: var(--text-dim); margin-bottom: 12px; line-height: 1.4;">
            Regola i parametri dell'algoritmo di assistenza all'inquadratura per mantenere il corpo celeste centrato durante la ricerca.
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Sensibilità</label>
              <select id="modal-skybox-sens" class="gold-select">
                <option value="low" ${currentSens === 'low' ? 'selected' : ''}>Bassa (Low)</option>
                <option value="med" ${currentSens === 'med' ? 'selected' : ''}>Media (Medium)</option>
                <option value="high" ${currentSens === 'high' ? 'selected' : ''}>Alta (High)</option>
              </select>
            </div>

            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">Velocità Correzione</label>
              <select id="modal-skybox-speed" class="gold-select">
                <option value="slow" ${currentSpeed === 'slow' ? 'selected' : ''}>Lenta (Slow)</option>
                <option value="norm" ${currentSpeed === 'norm' ? 'selected' : ''}>Normale (Normal)</option>
                <option value="fast" ${currentSpeed === 'fast' ? 'selected' : ''}>Veloce (Fast)</option>
              </select>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button class="btn-sm" id="btn-cancel-skybox" style="min-height: 46px;">Annulla</button>
          <button class="btn-gold" id="btn-apply-skybox" style="min-height: 46px;">Salva & Invia</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#btn-close-skybox-modal").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-cancel-skybox").addEventListener("click", () => modal.remove());

    modal.querySelector("#btn-apply-skybox").addEventListener("click", async () => {
      const sens = modal.querySelector("#modal-skybox-sens").value;
      const speed = modal.querySelector("#modal-skybox-speed").value;

      appState.saveSettings({
        skyboxSensitivity: sens,
        skyboxSpeed: speed
      });

      if (this.queue.transport.connected) {
        const sensMap = { low: 1, med: 2, high: 3 };
        const speedMap = { slow: 1, norm: 2, fast: 3 };

        const cmd = ProtocolCommands.otherSettings({
          applyDisplay: 0,
          displayOn: 1,
          applySkyBox: 1,
          skyBoxSensitivity: sensMap[sens] || 2,
          skyBoxSpeed: speedMap[speed] || 2,
          applyStandalone: 0,
          standaloneOn: 0,
          applyMaxSpeed: 0,
          maxSpeed: 40,
          applyTracRefr: 0,
          tracRefr: 300
        });

        try {
          await this.queue.send(cmd);
        } catch (e) {
          console.warn("Could not send SkyBox settings to firmware:", e);
        }
      }

      modal.remove();
    });
  }

  destroy() {
    this.stopDirectionMovement();
    if (this.radecUnsub) this.radecUnsub();
    if (this.statusUnsub) this.statusUnsub();
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    window.removeEventListener("blur", this._onBlur);
    window.removeEventListener("pagehide", this._onPageHide);
  }
}
