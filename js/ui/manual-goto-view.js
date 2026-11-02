/**
 * Dobson Pilot - Manual GoTo View Component
 * Supports coordinate entry in both RA/Dec and Alt/Az with dynamic bi-directional sync,
 * J2000 -> Equator of date precession, real-time visibility check (alt >= 10°),
 * and shortcuts to Scope / App joystick for fine centering.
 */

import { AstroCalc } from "../astro/astro-calc.js";
import { formatDecParts, decimalDegToDms, decimalHoursToHms, ProtocolCommands } from "../transport/protocol.js";
import { appState } from "../state.js";
import { GotoModal } from "./goto-modal.js";

export class ManualGotoView {
  /**
   * @param {Object} options
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.gotoModal = new GotoModal(this.queue);
    this.activeCoordMode = "radec"; // 'radec' | 'altaz'
    this.element = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-manual-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">Manual GoTo</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Mode Selector (RA/Dec vs Alt/Az) -->
      <div class="debug-filters" style="justify-content: center; margin-bottom: 14px; background: transparent; border: none;">
        <button class="filter-chip ${this.activeCoordMode === 'radec' ? 'active' : ''}" id="chip-mode-radec" style="font-size: 13px; padding: 6px 16px;">
          Coordinate Celesti (RA / Dec)
        </button>
        <button class="filter-chip ${this.activeCoordMode === 'altaz' ? 'active' : ''}" id="chip-mode-altaz" style="font-size: 13px; padding: 6px 16px;">
          Coordinate Orizzontali (Alt / Az)
        </button>
      </div>

      <!-- Coordinate Input Card -->
      <div class="config-card">
        <!-- RA/DEC Input Fields -->
        <div id="section-input-radec" style="${this.activeCoordMode === 'radec' ? '' : 'display: none;'}">
          <div class="card-title">Ascensione Retta (RA - J2000 o Data)</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;">
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Ore (0-23)</label>
              <input type="number" id="in-ra-h" min="0" max="23" value="5" class="gold-input text-center" />
            </div>
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Minuti (0-59)</label>
              <input type="number" id="in-ra-m" min="0" max="59" value="35" class="gold-input text-center" />
            </div>
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Secondi (0-59)</label>
              <input type="number" id="in-ra-s" min="0" max="59" value="17" class="gold-input text-center" />
            </div>
          </div>

          <div class="card-title">Declinazione (DEC)</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Gradi (-90..+90)</label>
              <input type="text" id="in-dec-d" value="-5" class="gold-input text-center" placeholder="-5 o -0" />
            </div>
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Primi (0-59)</label>
              <input type="number" id="in-dec-m" min="0" max="59" value="23" class="gold-input text-center" />
            </div>
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Secondi (0-59)</label>
              <input type="number" id="in-dec-s" min="0" max="59" value="28" class="gold-input text-center" />
            </div>
          </div>
          <div style="font-size: 10px; color: var(--text-dim); margin-bottom: 8px;">
            Nota: Per valori come -0° 30', digita "-0" nei gradi.
          </div>
        </div>

        <!-- Alt/Az Input Fields -->
        <div id="section-input-altaz" style="${this.activeCoordMode === 'altaz' ? '' : 'display: none;'}">
          <div class="card-title">Altezza (Altitudine) & Azimuth</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Altezza (0°..90°)</label>
              <input type="number" step="0.1" id="in-alt-deg" min="0" max="90" value="45.0" class="gold-input text-center" />
            </div>
            <div>
              <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Azimuth (0°..360° N=0, E=90)</label>
              <input type="number" step="0.1" id="in-az-deg" min="0" max="360" value="180.0" class="gold-input text-center" />
            </div>
          </div>
        </div>

        <!-- Live Visibility Badge -->
        <div id="manual-vis-badge" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--gold-dim); margin-top: 6px;">
          <span style="font-size: 13px; font-weight: 600;" id="lbl-vis-status">Calcolo visibilità...</span>
          <span style="font-family: ui-monospace, monospace; font-size: 12px; color: var(--gold-highlight);" id="lbl-calculated-coords">--</span>
        </div>
      </div>

      <!-- Send GoTo Button -->
      <button class="btn-gold btn-block" id="btn-send-manual-goto" style="min-height: 54px; font-size: 17px; margin-bottom: 14px;">
        🚀 Send to Telescope (GoTo)
      </button>

      <!-- Joystick Navigation Shortcuts -->
      <div class="config-card">
        <div class="card-title" style="font-size: 13px; margin-bottom: 8px;">Centratura Fine Manuale</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button class="btn-sm" id="btn-goto-scope-joy" style="min-height: 42px;">
            🕹️ Scope Joystick
          </button>
          <button class="btn-sm" id="btn-goto-app-joy" style="min-height: 42px;">
            📱 App Joystick
          </button>
        </div>
      </div>

      <!-- Footer Home -->
      <div class="screen-footer-home">
        <button class="btn-footer-home" id="btn-manual-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindEvents(el);
    this.updateVisibility();

    return el;
  }

  bindEvents(el) {
    el.querySelector("#btn-manual-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-manual-home").addEventListener("click", () => {
      window.router?.home();
    });

    // Mode chips
    const chipRadec = el.querySelector("#chip-mode-radec");
    const chipAltaz = el.querySelector("#chip-mode-altaz");
    const secRadec = el.querySelector("#section-input-radec");
    const secAltaz = el.querySelector("#section-input-altaz");

    chipRadec.addEventListener("click", () => {
      this.activeCoordMode = "radec";
      chipRadec.classList.add("active");
      chipAltaz.classList.remove("active");
      secRadec.style.display = "block";
      secAltaz.style.display = "none";
      this.updateVisibility();
    });

    chipAltaz.addEventListener("click", () => {
      this.activeCoordMode = "altaz";
      chipAltaz.classList.add("active");
      chipRadec.classList.remove("active");
      secAltaz.style.display = "block";
      secRadec.style.display = "none";
      this.updateVisibility();
    });

    // Inputs change listeners
    ["#in-ra-h", "#in-ra-m", "#in-ra-s", "#in-dec-d", "#in-dec-m", "#in-dec-s", "#in-alt-deg", "#in-az-deg"].forEach(id => {
      const input = el.querySelector(id);
      if (input) {
        input.addEventListener("input", () => this.updateVisibility());
      }
    });

    // Shortcuts to joysticks
    el.querySelector("#btn-goto-scope-joy").addEventListener("click", () => {
      window.router?.navigate("free-analog-joystick");
    });
    el.querySelector("#btn-goto-app-joy").addEventListener("click", () => {
      window.router?.navigate("free-app-joystick");
    });

    // Send GoTo
    el.querySelector("#btn-send-manual-goto").addEventListener("click", () => {
      this.sendManualGoto();
    });
  }

  getObserverCoords() {
    return {
      lat: appState.telescopeSettings.location?.lat || 45.4642,
      lon: appState.telescopeSettings.location?.lon || 9.1900
    };
  }

  updateVisibility() {
    if (!this.element) return;
    const { lat, lon } = this.getObserverCoords();
    const lblStatus = this.element.querySelector("#lbl-vis-status");
    const lblCoords = this.element.querySelector("#lbl-calculated-coords");
    const badge = this.element.querySelector("#manual-vis-badge");

    if (this.activeCoordMode === "radec") {
      const rh = parseInt(this.element.querySelector("#in-ra-h").value, 10) || 0;
      const rm = parseInt(this.element.querySelector("#in-ra-m").value, 10) || 0;
      const rs = parseInt(this.element.querySelector("#in-ra-s").value, 10) || 0;

      const decStr = this.element.querySelector("#in-dec-d").value.trim();
      const isNeg = decStr.startsWith("-");
      const dd = parseInt(decStr.replace("-", ""), 10) || 0;
      const dm = parseInt(this.element.querySelector("#in-dec-m").value, 10) || 0;
      const ds = parseInt(this.element.querySelector("#in-dec-s").value, 10) || 0;

      const raHours = rh + rm / 60 + rs / 3600;
      const decDeg = (isNeg ? -1 : 1) * (dd + dm / 60 + ds / 3600);

      const hor = AstroCalc.raDecToAltAz(raHours, decDeg, new Date(), lat, lon);

      if (hor.isVisible) {
        badge.style.borderColor = "#2ecc71";
        lblStatus.innerHTML = "✓ <strong style='color: #2ecc71;'>Object is currently visible</strong>";
      } else {
        badge.style.borderColor = "var(--danger-color)";
        lblStatus.innerHTML = "⚠️ <strong style='color: #ff7675;'>Oggetto sotto i 10° (Non visibile)</strong>";
      }
      lblCoords.textContent = `Alt: ${hor.altitude.toFixed(1)}° | Az: ${hor.azimuth.toFixed(1)}°`;

    } else {
      const alt = parseFloat(this.element.querySelector("#in-alt-deg").value) || 0;
      const az = parseFloat(this.element.querySelector("#in-az-deg").value) || 0;

      const eq = AstroCalc.altAzToRaDec(alt, az, new Date(), lat, lon);
      const isVisible = alt >= 10.0;

      if (isVisible) {
        badge.style.borderColor = "#2ecc71";
        lblStatus.innerHTML = "✓ <strong style='color: #2ecc71;'>Object is currently visible</strong>";
      } else {
        badge.style.borderColor = "var(--danger-color)";
        lblStatus.innerHTML = "⚠️ <strong style='color: #ff7675;'>Oggetto sotto i 10° (Non visibile)</strong>";
      }

      const hms = decimalHoursToHms(eq.raHours);
      const dms = decimalDegToDms(eq.decDeg);
      const sign = dms.isNegative ? "-" : "+";
      lblCoords.textContent = `RA: ${hms.h}h ${hms.m}m | Dec: ${sign}${dms.deg}° ${dms.min}'`;
    }
  }

  sendManualGoto() {
    const { lat, lon } = this.getObserverCoords();
    let rh, rm, rs, dd, dm, ds, isNeg;

    if (this.activeCoordMode === "radec") {
      rh = parseInt(this.element.querySelector("#in-ra-h").value, 10) || 0;
      rm = parseInt(this.element.querySelector("#in-ra-m").value, 10) || 0;
      rs = parseInt(this.element.querySelector("#in-ra-s").value, 10) || 0;

      const decStr = this.element.querySelector("#in-dec-d").value.trim();
      isNeg = decStr.startsWith("-");
      dd = parseInt(decStr.replace("-", ""), 10) || 0;
      dm = parseInt(this.element.querySelector("#in-dec-m").value, 10) || 0;
      ds = parseInt(this.element.querySelector("#in-dec-s").value, 10) || 0;

    } else {
      const alt = parseFloat(this.element.querySelector("#in-alt-deg").value) || 0;
      const az = parseFloat(this.element.querySelector("#in-az-deg").value) || 0;
      const eq = AstroCalc.altAzToRaDec(alt, az, new Date(), lat, lon);
      const hms = decimalHoursToHms(eq.raHours);
      const dms = decimalDegToDms(eq.decDeg);

      rh = hms.h;
      rm = hms.m;
      rs = hms.s;
      dd = dms.deg;
      dm = dms.min;
      ds = dms.sec;
      isNeg = dms.isNegative;
    }

    // Format declination string according to firmware convention
    const formattedDec = formatDecParts(dd, dm, ds, isNeg);
    const cmd = ProtocolCommands.gotoAnyObject(rh, rm, rs, formattedDec);
    const sign = isNeg ? "-" : "+";

    this.gotoModal.startGoto({
      targetName: "Coordinate Manuali",
      command: cmd,
      coordsInfo: `RA: ${rh}h ${rm}m ${rs}s | DEC: ${sign}${dd}° ${dm}' ${ds}"`
    });
  }
}
