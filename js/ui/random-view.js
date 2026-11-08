/**
 * Dobson Pilot - Random Object View
 * Picks a random visible celestial target from fixed catalogs (Messier, Stars, Galaxies, Nebulae).
 * Features 'Next Object' cycling and 'Send to Telescope' GoTo execution.
 */

import { MESSIER_CATALOG } from "../data/messier-data.js";
import { STARS_CATALOG } from "../data/stars-data.js";
import { GALAXIES_CATALOG } from "../data/galaxies-data.js";
import { NEBULAE_CATALOG } from "../data/nebulae-data.js";
import { AstroCalc } from "../astro/astro-calc.js";
import { decimalHoursToHms, decimalDegToDms, formatDecParts, ProtocolCommands } from "../transport/protocol.js";
import { appState } from "../state.js";
import { GotoModal } from "./goto-modal.js";

export class RandomView {
  /**
   * @param {Object} options
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.gotoModal = new GotoModal(this.queue);
    this.currentItem = null;
    this.element = null;
  }

  getAllFixedItems() {
    return [
      ...MESSIER_CATALOG,
      ...STARS_CATALOG,
      ...GALAXIES_CATALOG,
      ...NEBULAE_CATALOG
    ];
  }

  pickRandomVisibleItem() {
    const lat = appState.telescopeSettings.location?.lat || 45.4642;
    const lon = appState.telescopeSettings.location?.lon || 9.1900;
    const now = new Date();

    const items = this.getAllFixedItems();
    // Filter visible items (alt >= 10 deg)
    const visibleItems = items.filter(item => {
      const hor = AstroCalc.raDecToAltAz(item.ra, item.dec, now, lat, lon);
      item._alt = hor.altitude;
      item._az = hor.azimuth;
      return hor.isVisible;
    });

    if (visibleItems.length === 0) {
      // Fallback to all if none above 10 deg (e.g. extreme location)
      return items[Math.floor(Math.random() * items.length)];
    }

    return visibleItems[Math.floor(Math.random() * visibleItems.length)];
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    if (!this.currentItem) {
      this.currentItem = this.pickRandomVisibleItem();
    }

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-random-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">Random Target</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Random Card -->
      <div id="random-card-mount">
        ${this.renderCardContent(this.currentItem)}
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
        <button class="btn-gold btn-block" id="btn-send-random-goto" style="min-height: 54px; font-size: 17px;">
          🚀 Send to Telescope
        </button>

        <button class="btn-sm btn-block" id="btn-next-random" style="min-height: 48px; font-size: 15px; border-color: var(--gold-border);">
          🎲 Next Object (Prossimo Bersaglio)
        </button>
      </div>

      <div class="screen-footer-home">
        <button class="btn-footer-home" id="btn-random-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindEvents(el);
    return el;
  }

  renderCardContent(item) {
    if (!item) return `<div class="config-card">Nessun oggetto disponibile</div>`;

    const hms = decimalHoursToHms(item.ra);
    const dms = decimalDegToDms(item.dec);
    const pad = (n) => String(n).padStart(2, "0");
    const sign = dms.isNegative ? "-" : "+";

    const raStr = `${hms.h}h ${pad(hms.m)}m ${pad(hms.s)}s`;
    const decStr = `${sign}${dms.deg}° ${pad(dms.min)}' ${pad(dms.sec)}"`;

    return `
      <div class="config-card" style="text-align: center; padding: 24px 18px;">
        <div style="font-size: 54px; margin-bottom: 10px;">✨</div>
        <div style="font-family: var(--font-title); font-size: 24px; color: var(--gold-primary); font-weight: 800; margin-bottom: 4px;">
          ${item.id}
        </div>
        <div style="font-size: 16px; color: var(--gold-highlight); font-weight: 600; margin-bottom: 8px;">
          ${item.name}
        </div>
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Tipo: <strong>${item.type}</strong> | Costellazione: <strong>${item.con}</strong> | Mag: <strong>${item.mag}</strong>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: rgba(0,0,0,0.5); border: 1px solid var(--gold-dim); border-radius: 10px; padding: 12px; margin-bottom: 16px;">
          <div>
            <span style="font-size: 11px; color: var(--text-muted); display: block;">Ascensione Retta</span>
            <strong style="color: #fff; font-family: ui-monospace, monospace; font-size: 13px;">${raStr}</strong>
          </div>
          <div>
            <span style="font-size: 11px; color: var(--text-muted); display: block;">Declinazione</span>
            <strong style="color: #fff; font-family: ui-monospace, monospace; font-size: 13px;">${decStr}</strong>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
          <span style="font-size: 12px; font-weight: 700; color: #2ecc71; background: rgba(46,204,113,0.15); border: 1px solid rgba(46,204,113,0.5); padding: 4px 12px; border-radius: 6px;">
            ✓ Visibile: Alt ${item._alt?.toFixed(1) || '--'}° | Az ${item._az?.toFixed(1) || '--'}°
          </span>
        </div>
      </div>
    `;
  }

  bindEvents(el) {
    el.querySelector("#btn-random-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });
    el.querySelector("#btn-random-home").addEventListener("click", () => {
      window.router?.home();
    });

    el.querySelector("#btn-next-random").addEventListener("click", () => {
      this.currentItem = this.pickRandomVisibleItem();
      const mount = el.querySelector("#random-card-mount");
      if (mount) {
        mount.innerHTML = this.renderCardContent(this.currentItem);
      }
    });

    el.querySelector("#btn-send-random-goto").addEventListener("click", () => {
      if (!this.currentItem) return;
      const lat = appState.telescopeSettings.location?.lat || 45.4642;
      const lon = appState.telescopeSettings.location?.lon || 9.1900;

      const pre = AstroCalc.precessJ2000ToDate(this.currentItem.ra, this.currentItem.dec, new Date(), lat, lon);
      const hms = decimalHoursToHms(pre.raHours);
      const dms = decimalDegToDms(pre.decDeg);

      const formattedDec = formatDecParts(dms.deg, dms.min, dms.sec, dms.isNegative);
      const cmd = ProtocolCommands.gotoAnyObject(hms.h, hms.m, hms.s, formattedDec);

      this.gotoModal.startGoto({
        targetName: `${this.currentItem.id} - ${this.currentItem.name}`,
        command: cmd,
        coordsInfo: `RA: ${hms.h}h ${hms.m}m ${hms.s}s | Dec: ${dms.isNegative ? '-' : '+'}${dms.deg}° ${dms.min}' ${dms.sec}"`
      });
    });
  }
}
