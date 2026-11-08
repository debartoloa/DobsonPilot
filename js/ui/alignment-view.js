/**
 * Dobson Pilot - 1-Star & 2-Star Alignment Engine
 * High-fidelity implementation conforming to CosmoPilot firmware protocol:
 * - 1-Star: Start Calibration -> Pick star (mag <= 4.0, search, Visible) -> "Align to [name]" -> Scope/App joystick -> Finish Calibration (CMD STAR_1_CALIB)
 * - 2-Star: Center 1st star -> Finish First Star (CMD STAR_2_CALIB) -> Pick 2nd star (angular sep >= 30°) -> Auto slew (CMD NEXT) -> Fine centering -> Finish Calibration (CMD FINISH_2_STAR_CALIB)
 * - J2000 -> Equator of date precession before sending star coordinates
 */

import { STARS_CATALOG } from "../data/stars-data.js";
import { AstroCalc } from "../astro/astro-calc.js";
import { ProtocolCommands, decimalHoursToHms, decimalDegToDms, formatDecParts } from "../transport/protocol.js";
import { appState } from "../state.js";

// Persistent wizard state across joystick navigation
let activeCalibState = null;

export class AlignmentView {
  /**
   * @param {Object} options
   * @param {'1star' | '2star'} options.mode
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.mode = options.mode || "1star";
    this.queue = options.commandQueue;
    this.onBack = options.onBack;

    // Restore or initialize state
    if (activeCalibState && activeCalibState.mode === this.mode) {
      this.state = activeCalibState;
    } else {
      this.state = {
        mode: this.mode,
        step: "intro", // 'intro' | 'select1' | 'center1' | 'select2' | 'slewing2' | 'center2' | 'success'
        star1: null,
        star2: null,
        searchTerm: "",
        maxMag: 4.0,
        visibleOnly: true,
        isSlewing: false,
        errorMsg: null,
        // Embedded mini joystick speed & axis
        joySpeed: 3,
        joyInvertAlt: false,
        joyInvertAz: false
      };
      activeCalibState = this.state;
    }

    this.element = null;
  }

  static clearSavedState() {
    activeCalibState = null;
  }

  get lat() {
    return appState.telescopeSettings.location?.lat || 45.4642;
  }

  get lon() {
    return appState.telescopeSettings.location?.lon || 9.1900;
  }

  render() {
    if (!this.element) {
      this.element = document.createElement("div");
      this.element.className = "screen-container";
    } else {
      this.element.innerHTML = "";
    }

    switch (this.state.step) {
      case "intro":
        this.renderIntro(this.element);
        break;
      case "select1":
        this.renderSelectStar(this.element, 1);
        break;
      case "center1":
        this.renderCenterStar(this.element, 1);
        break;
      case "select2":
        this.renderSelectStar(this.element, 2);
        break;
      case "slewing2":
        this.renderSlewing(this.element);
        break;
      case "center2":
        this.renderCenterStar(this.element, 2);
        break;
      case "success":
        this.renderSuccess(this.element);
        break;
      default:
        this.renderIntro(this.element);
    }

    return this.element;
  }

  // 1. INTRO STEP
  renderIntro(el) {
    const is2Star = this.mode === "2star";
    const title = is2Star ? "2-Star Alignment" : "1-Star Alignment";

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" data-action="back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">${title}</h2>
      </div>
      <div class="screen-divider"></div>

      <div style="flex: 1; display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
        <div class="config-card">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
            <span style="font-size: 28px;">${is2Star ? '✨' : '⭐'}</span>
            <div>
              <strong style="color: var(--gold-highlight); font-size: 16px;">
                ${is2Star ? 'Allineamento a Due Stelle' : 'Allineamento a Una Stella'}
              </strong>
              <div style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">
                ${is2Star ? 'Calibrazione completa Alt/Az per puntamenti di massima precisione' : 'Riferimento celeste rapido'}
              </div>
            </div>
          </div>
          <p style="font-size: 13px; color: var(--text-dim); line-height: 1.5; margin: 0;">
            ${is2Star 
              ? 'Punterai manualmente una prima stella e la centrerai nell\'oculare. Successivamente sceglierai una seconda stella (separata di almeno 30°): <strong>il telescopio ci andrà da solo</strong>, permettendoti la centratura fine finale.' 
              : 'Seleziona una stella luminosa e visibile in cielo, quindi centrala nell\'oculare con l\'App Joystick o lo Scope Joystick. La procedura imposterà l\'azimut iniziale e attiverà l\'inseguimento siderale.'}
          </p>
        </div>

        ${!appState.isSynced ? `
          <div class="config-card" style="border-color: rgba(230,126,34,0.6); background: rgba(230,126,34,0.08);">
            <div style="display: flex; align-items: center; gap: 8px; color: #e67e22; font-weight: 700; font-size: 13px; margin-bottom: 4px;">
              <span>⚠️</span> <span>Sincronizzazione consigliata</span>
            </div>
            <p style="font-size: 12px; color: var(--text-dim); margin: 0 0 10px 0;">
              Data, ora o GPS non risultano ancora sincronizzati col telescopio. Esegui prima un <strong>Auto Sync</strong> per la massima accuratezza di puntamento.
            </p>
            <button class="btn-sm" data-route="calib-auto-sync" style="color: #e67e22; border-color: rgba(230,126,34,0.5);">
              Vai ad Auto Sync ➔
            </button>
          </div>
        ` : `
          <div class="config-card" style="border-color: rgba(46,204,113,0.5); background: rgba(46,204,113,0.06); padding: 10px 14px;">
            <div style="display: flex; align-items: center; gap: 8px; color: #2ecc71; font-weight: 700; font-size: 12px;">
              <span>✓</span> <span>Telescopio sincronizzato con data, ora UTC e GPS</span>
            </div>
          </div>
        `}

        <div style="margin-top: auto; padding-top: 14px;">
          <button class="btn-gold btn-block" id="btn-start-calib-flow" style="min-height: 52px; font-size: 16px;">
            Start Calibration 🚀
          </button>
        </div>
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    el.querySelector("#btn-start-calib-flow").addEventListener("click", async () => {
      await this.startCalibrationSession();
    });
  }

  async startCalibrationSession() {
    if (!this.queue.transport.connected) {
      alert("Telescopio non connesso! Connettiti via Bluetooth o attiva la modalità Mock.");
      return;
    }

    try {
      // Send CMD CALIB_START
      await this.queue.send(ProtocolCommands.calibStart());
      this.state.step = "select1";
      this.render();
    } catch (err) {
      alert(`Errore avvio calibrazione: ${err.message}`);
    }
  }

  // 2. STAR SELECTION STEP
  renderSelectStar(el, starNumber) {
    const title = this.mode === "2star" 
      ? (starNumber === 1 ? "Select First Star" : "Select Second Star")
      : "Select Alignment Star";

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-back-to-prev-step">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">${title}</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Search & Filters -->
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <input 
          type="text" 
          id="input-star-search" 
          placeholder="Cerca stella (es. Vega, Polaris)..." 
          value="${this.state.searchTerm}" 
          class="gold-input" 
          style="flex: 1;"
        />
        <button class="btn-sm" id="btn-toggle-vis-filter" style="padding: 0 10px; font-size: 11px; white-space: nowrap; ${this.state.visibleOnly ? 'color: #2ecc71; border-color: rgba(46,204,113,0.5);' : ''}">
          ${this.state.visibleOnly ? '✓ Solo Visibili' : 'Tutte'}
        </button>
      </div>

      ${starNumber === 2 && this.state.star1 ? `
        <div class="config-card" style="padding: 10px 14px; margin-bottom: 12px; background: rgba(168,85,247,0.08);">
          <div style="font-size: 11px; color: var(--text-muted);">Prima stella selezionata:</div>
          <strong style="color: var(--gold-highlight); font-size: 14px;">${this.state.star1.name}</strong>
          <span style="font-size: 11px; color: var(--gold-text); margin-left: 8px;">(Scegli una stella con separazione ≥ 30°)</span>
        </div>
      ` : ""}

      <!-- Stars List -->
      <div id="star-items-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; overflow-y: auto;">
        ${this.renderStarsListHtml(starNumber)}
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    // Back button
    el.querySelector("#btn-back-to-prev-step").addEventListener("click", () => {
      if (starNumber === 1) {
        this.state.step = "intro";
      } else {
        this.state.step = "center1";
      }
      this.render();
    });

    // Search filter
    const searchInput = el.querySelector("#input-star-search");
    searchInput.addEventListener("input", (e) => {
      this.state.searchTerm = e.target.value;
      const c = el.querySelector("#star-items-container");
      if (c) {
        c.innerHTML = this.renderStarsListHtml(starNumber);
        this.bindStarRowClicks(el, starNumber);
      }
    });

    // Visible only toggle
    el.querySelector("#btn-toggle-vis-filter").addEventListener("click", () => {
      this.state.visibleOnly = !this.state.visibleOnly;
      this.render();
    });

    this.bindStarRowClicks(el, starNumber);
  }

  renderStarsListHtml(starNumber) {
    const query = (this.state.searchTerm || "").toLowerCase();
    const now = new Date();
    const lat = this.lat;
    const lon = this.lon;

    // Calculate live coordinates and separation
    const list = STARS_CATALOG.map(star => {
      const hor = AstroCalc.raDecToAltAz(star.ra, star.dec, now, lat, lon);
      let separation = null;
      if (starNumber === 2 && this.state.star1) {
        separation = AstroCalc.angularDistance(this.state.star1.ra, this.state.star1.dec, star.ra, star.dec);
      }
      return {
        ...star,
        alt: hor.altitude,
        az: hor.azimuth,
        isVisible: hor.isVisible,
        separation
      };
    }).filter(star => {
      // Magnitudine limit (4.0)
      if (star.mag > this.state.maxMag) return false;
      // Visibility filter
      if (this.state.visibleOnly && !star.isVisible) return false;
      // Search term
      if (query) {
        const mName = star.name.toLowerCase().includes(query);
        const mCon = (star.con || "").toLowerCase().includes(query);
        const mId = star.id.toLowerCase().includes(query);
        if (!mName && !mCon && !mId) return false;
      }
      // For Star 2, exclude Star 1
      if (starNumber === 2 && this.state.star1 && star.id === this.state.star1.id) {
        return false;
      }
      return true;
    });

    // Sort: for Star 2, prioritize stars with 30° to 90° separation and altitude >= 15°
    if (starNumber === 2 && this.state.star1) {
      list.sort((a, b) => {
        const aGood = a.separation >= 30 && a.separation <= 100;
        const bGood = b.separation >= 30 && b.separation <= 100;
        if (aGood && !bGood) return -1;
        if (!aGood && bGood) return 1;
        return a.mag - b.mag;
      });
    } else {
      // Sort bright first
      list.sort((a, b) => a.mag - b.mag);
    }

    if (list.length === 0) {
      return `
        <div class="config-card" style="text-align: center; color: var(--text-dim); padding: 24px;">
          <em>Nessuna stella trovata con i filtri attuali.</em>
        </div>
      `;
    }

    return list.map(star => {
      const hms = decimalHoursToHms(star.ra);
      const dms = decimalDegToDms(star.dec);
      const decSign = dms.isNegative ? "-" : "+";
      const pad = (n) => String(n).padStart(2, "0");

      let sepBadge = "";
      if (star.separation !== null) {
        const sepVal = star.separation.toFixed(1);
        const isOptimal = star.separation >= 30 && star.separation <= 110;
        const color = isOptimal ? "#2ecc71" : "#e67e22";
        sepBadge = `
          <span style="font-size: 11px; font-weight: 700; color: ${color}; background: rgba(0,0,0,0.4); border: 1px solid ${color}; padding: 2px 6px; border-radius: 4px;">
            Sep: ${sepVal}° ${isOptimal ? '★ Consigliata' : ''}
          </span>
        `;
      }

      return `
        <div class="config-card star-calib-row" data-id="${star.id}" style="padding: 10px 14px; margin-bottom: 0; cursor: pointer; transition: all 0.2s; border-color: rgba(168,85,247,0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong style="color: var(--gold-highlight); font-size: 15px;">${star.name}</strong>
                ${star.isVisible ? `
                  <span style="font-size: 10px; font-weight: 700; color: #2ecc71; background: rgba(46,204,113,0.15); border: 1px solid rgba(46,204,113,0.5); padding: 1px 5px; border-radius: 3px;">
                    ✓ Visible
                  </span>
                ` : ""}
              </div>
              <div style="font-size: 11px; color: var(--gold-text); margin-top: 2px;">
                • Mag: <strong>${star.mag}</strong> | Costellazione: <strong>${star.con}</strong>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: ui-monospace, monospace; margin-top: 1px;">
                • RA: ${hms.h}h ${pad(hms.m)}m | Dec: ${decSign}${dms.deg}° ${pad(dms.min)}' | Alt: ${star.alt.toFixed(1)}°
              </div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
              ${sepBadge}
              <button class="btn-sm" style="padding: 4px 10px; font-size: 12px; color: var(--gold-highlight); border-color: var(--gold-primary);">
                Scegli ➔
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  bindStarRowClicks(el, starNumber) {
    el.querySelectorAll(".star-calib-row").forEach(row => {
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-id");
        const star = STARS_CATALOG.find(s => s.id === id);
        if (!star) return;

        if (starNumber === 1) {
          this.state.star1 = star;
          this.state.step = "center1";
          this.render();
        } else {
          this.state.star2 = star;
          // Step 4 -> 5: Prompt says "scelta della seconda stella: il telescopio ci va da solo"
          this.startSlewToStar2();
        }
      });
    });
  }

  // 3. CENTERING STEP (Star 1 or Star 2 fine centering)
  renderCenterStar(el, starNumber) {
    const is2Star = this.mode === "2star";
    const star = starNumber === 1 ? this.state.star1 : this.state.star2;
    const title = starNumber === 1 
      ? `Align to ${star.id}`
      : `Fine Center ${star.id}`;

    const hms = decimalHoursToHms(star.ra);
    const dms = decimalDegToDms(star.dec);
    const decSign = dms.isNegative ? "-" : "+";
    const pad = (n) => String(n).padStart(2, "0");

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-back-center">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">${title}</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Star Card -->
      <div class="config-card" style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <strong style="color: var(--gold-highlight); font-size: 16px;">${star.name}</strong>
          <span style="font-size: 12px; color: var(--gold-text);">Mag <strong>${star.mag}</strong></span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); font-family: ui-monospace, monospace; margin-top: 4px;">
          RA: ${hms.h}h ${pad(hms.m)}m ${pad(hms.s)}s &nbsp;|&nbsp; DEC: ${decSign}${dms.deg}° ${pad(dms.min)}' ${pad(dms.sec)}"
        </div>
      </div>

      <!-- Instructions & Centering Methods -->
      <div class="config-card" style="margin-bottom: 14px; background: rgba(168,85,247,0.06);">
        <strong style="color: var(--gold-primary); font-size: 13px; display: block; margin-bottom: 4px;">
          ${starNumber === 1 ? '🎯 Centratura manuale' : '🎯 Centratura fine'}
        </strong>
        <p style="font-size: 12px; color: var(--text-dim); line-height: 1.4; margin: 0 0 10px 0;">
          ${starNumber === 1 
            ? 'Muovi manualmente il telescopio fino a puntare la stella, poi centrala precisamente nel reticolo dell\'oculare.' 
            : 'Il telescopio ha puntato la stella. Correggi ora la centratura fine nell\'oculare se non è perfettamente al centro.'}
        </p>

        <!-- Centering Shortcuts -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button class="btn-sm" data-route="free-analog-joystick" style="padding: 8px 10px; font-size: 12px;">
            🕹️ Scope Joystick
          </button>
          <button class="btn-sm" data-route="free-app-joystick" style="padding: 8px 10px; font-size: 12px;">
            📱 App Joystick
          </button>
        </div>
      </div>

      <!-- Integrated Mini Virtual Pad for Direct Centering -->
      <div class="config-card" style="margin-bottom: 14px; text-align: center;">
        <div class="card-title" style="margin-bottom: 8px;">
          <span style="font-size: 12px;">Controllo Rapido Motori</span>
          <span style="font-size: 11px; color: var(--gold-highlight);" id="lbl-mini-spd">Velocità: 3</span>
        </div>

        <!-- 8-way directional pad -->
        <div class="mini-joy-grid" style="display: grid; grid-template-columns: repeat(3, 56px); gap: 6px; justify-content: center; margin: 10px auto;">
          <button class="mini-pad-btn" data-dir="ULEFT">↖</button>
          <button class="mini-pad-btn" data-dir="UP">▲</button>
          <button class="mini-pad-btn" data-dir="URIGHT">↗</button>
          <button class="mini-pad-btn" data-dir="LEFT">◀</button>
          <button class="mini-pad-btn mini-pad-center" data-dir="STOP" style="background: rgba(168,85,247,0.22); border-color: var(--gold-primary); font-size: 10px;">STOP</button>
          <button class="mini-pad-btn" data-dir="RIGHT">▶</button>
          <button class="mini-pad-btn" data-dir="DLEFT">↙</button>
          <button class="mini-pad-btn" data-dir="DOWN">▼</button>
          <button class="mini-pad-btn" data-dir="DRIGHT">↘</button>
        </div>

        <input type="range" id="slider-mini-speed" min="1" max="10" step="1" value="${this.state.joySpeed}" class="gold-slider" style="margin-top: 6px;" />
      </div>

      <!-- Completion Button -->
      <div style="margin-top: auto; padding-top: 10px; margin-bottom: 20px;">
        ${starNumber === 1 && is2Star ? `
          <button class="btn-gold btn-block" id="btn-finish-first-star" style="min-height: 52px; font-size: 16px;">
            Finish First Star ➔
          </button>
        ` : `
          <button class="btn-gold btn-block" id="btn-finish-calib" style="min-height: 52px; font-size: 16px;">
            Finish Calibration ✓
          </button>
        `}
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    // Back button
    el.querySelector("#btn-back-center").addEventListener("click", () => {
      this.state.step = starNumber === 1 ? "select1" : "select2";
      this.render();
    });

    // Speed slider
    const speedSlider = el.querySelector("#slider-mini-speed");
    const lblSpeed = el.querySelector("#lbl-mini-spd");
    speedSlider.addEventListener("input", (e) => {
      const sp = parseInt(e.target.value, 10);
      this.state.joySpeed = sp;
      lblSpeed.textContent = `Velocità: ${sp}`;
      if (this.queue.transport.connected) {
        this.queue.sendPriority(ProtocolCommands.appSpeed(sp));
      }
    });

    // Mini pad hold-to-move
    el.querySelectorAll(".mini-pad-btn[data-dir]").forEach(btn => {
      const dir = btn.getAttribute("data-dir");
      const startMove = (e) => {
        e.preventDefault();
        btn.classList.add("active");
        if (this.queue.transport.connected) {
          this.queue.sendPriority(ProtocolCommands.appDir(dir));
        }
      };
      const stopMove = (e) => {
        e.preventDefault();
        btn.classList.remove("active");
        if (dir !== "STOP" && this.queue.transport.connected) {
          this.queue.sendPriority(ProtocolCommands.appDir("STOP"));
        }
      };

      btn.addEventListener("mousedown", startMove);
      btn.addEventListener("mouseup", stopMove);
      btn.addEventListener("mouseleave", stopMove);
      btn.addEventListener("touchstart", startMove, { passive: false });
      btn.addEventListener("touchend", stopMove, { passive: false });
    });

    // Action button
    if (starNumber === 1 && is2Star) {
      el.querySelector("#btn-finish-first-star").addEventListener("click", async () => {
        await this.handleFinishFirstStar();
      });
    } else {
      el.querySelector("#btn-finish-calib").addEventListener("click", async () => {
        await this.handleFinishCalibration(starNumber);
      });
    }
  }

  // 4. SLEWING STEP (Star 2 Auto GoTo)
  renderSlewing(el) {
    const star = this.state.star2;
    el.innerHTML = `
      <div class="screen-header">
        <h2 class="screen-title">Puntamento Stella 2</h2>
      </div>
      <div class="screen-divider"></div>

      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
        <div class="slew-animation-circle" style="width: 100px; height: 100px; border-radius: 50%; border: 3px dashed var(--gold-primary); animation: spin 4s linear infinite; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <span style="font-size: 32px;">🔭</span>
        </div>

        <h3 style="font-family: var(--font-title); color: var(--gold-highlight); font-size: 20px; margin: 0 0 8px 0;">
          Puntamento in corso verso ${star.id}...
        </h3>
        <p style="font-size: 13px; color: var(--text-dim); line-height: 1.5; max-width: 320px; margin: 0 0 20px 0;">
          Il telescopio si sta orientando automaticamente verso <strong>${star.name}</strong>. Attendi l'arresto dei motori.
        </p>

        <div style="font-size: 12px; color: var(--gold-text); font-family: ui-monospace, monospace; background: rgba(0,0,0,0.4); padding: 8px 16px; border-radius: 6px; border: 1px solid var(--gold-dim);">
          Stato motori: IN MOVIMENTO (BUSY)
        </div>
      </div>
    `;
  }

  async startSlewToStar2() {
    this.state.step = "slewing2";
    this.render();

    try {
      const star = this.state.star2;
      // Precess coordinates to Equator of Date
      const pre = AstroCalc.precessJ2000ToDate(star.ra, star.dec, new Date(), this.lat, this.lon);
      const hms = decimalHoursToHms(pre.raHours);
      const dms = decimalDegToDms(pre.decDeg);
      const formattedDec = formatDecParts(dms.deg, dms.min, dms.sec, dms.isNegative);

      // Send CMD NEXT rh rm rs dd dm ds
      const cmd = ProtocolCommands.nextStar(hms.h, hms.m, hms.s, formattedDec);
      await this.queue.send(cmd);

      // Slew complete -> proceed to fine centering
      this.state.step = "center2";
      this.render();
    } catch (err) {
      alert(`Errore puntamento stella 2: ${err.message}`);
      this.state.step = "select2";
      this.render();
    }
  }

  async handleFinishFirstStar() {
    try {
      const star = this.state.star1;
      const pre = AstroCalc.precessJ2000ToDate(star.ra, star.dec, new Date(), this.lat, this.lon);
      const hms = decimalHoursToHms(pre.raHours);
      const dms = decimalDegToDms(pre.decDeg);
      const formattedDec = formatDecParts(dms.deg, dms.min, dms.sec, dms.isNegative);

      // Send CMD STAR_2_CALIB rh rm rs dd dm ds
      const cmd = ProtocolCommands.star2Calib(hms.h, hms.m, hms.s, formattedDec);
      await this.queue.send(cmd);

      // Proceed to star 2 selection
      this.state.step = "select2";
      this.render();
    } catch (err) {
      alert(`Errore invio prima stella: ${err.message}`);
    }
  }

  async handleFinishCalibration(starNumber) {
    try {
      if (this.mode === "1star") {
        const star = this.state.star1;
        const pre = AstroCalc.precessJ2000ToDate(star.ra, star.dec, new Date(), this.lat, this.lon);
        const hms = decimalHoursToHms(pre.raHours);
        const dms = decimalDegToDms(pre.decDeg);
        const formattedDec = formatDecParts(dms.deg, dms.min, dms.sec, dms.isNegative);

        // Send CMD STAR_1_CALIB rh rm rs dd dm ds
        const cmd = ProtocolCommands.star1Calib(hms.h, hms.m, hms.s, formattedDec);
        await this.queue.send(cmd);
      } else {
        // 2-Star completion: CMD FINISH_2_STAR_CALIB
        await this.queue.send(ProtocolCommands.finish2StarCalib());
      }

      // Mark aligned
      appState.aligned = true;
      AlignmentView.clearSavedState();
      this.state.step = "success";
      this.render();
    } catch (err) {
      alert(`Errore completamento calibrazione: ${err.message}`);
    }
  }

  // 5. SUCCESS STEP
  renderSuccess(el) {
    const is2Star = this.mode === "2star";

    el.innerHTML = `
      <div class="screen-header">
        <h2 class="screen-title">Allineamento Riuscito</h2>
      </div>
      <div class="screen-divider"></div>

      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;">
        <div style="width: 76px; height: 76px; border-radius: 50%; background: rgba(46,204,113,0.15); border: 2px solid #2ecc71; display: flex; align-items: center; justify-content: center; font-size: 38px; margin-bottom: 20px; color: #2ecc71;">
          ✓
        </div>

        <h3 style="font-family: var(--font-title); color: var(--gold-highlight); font-size: 22px; margin: 0 0 10px 0;">
          ${is2Star ? 'Allineamento 2-Stelle Concluso!' : 'Allineamento 1-Stella Concluso!'}
        </h3>
        <p style="font-size: 14px; color: var(--text-dim); line-height: 1.5; max-width: 320px; margin: 0 0 24px 0;">
          Il telescopio è ora perfettamente allineato con il cielo. La barra di stato indica lo stato <strong>ALIGN attivo</strong> e il GoTo è pronto all'uso.
        </p>

        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 280px;">
          <button class="btn-gold btn-block" data-route="catalog" style="min-height: 48px;">
            Esplora il Catalogo 🚀
          </button>
          <button class="btn-sm btn-block" data-route="calib-menu" style="min-height: 44px;">
            Torna a Calib
          </button>
        </div>
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" data-action="home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;
  }
}
