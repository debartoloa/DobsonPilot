/**
 * Dobson Pilot - Solar System GoTo View Component
 * Supports all 9 CosmoPilot firmware solar system bodies:
 * Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Moon, Sun.
 * Features 'Check visibility' hardware query (CMD SOLAR_OBJ_STATUS),
 * local ephemerides (altitude, magnitude), GoTo execution, and
 * a mandatory explicit safety confirmation before pointing at the Sun.
 */

import { AstroCalc } from "../astro/astro-calc.js";
import { ProtocolCommands } from "../transport/protocol.js";
import { appState } from "../state.js";
import { GotoModal } from "./goto-modal.js";

export class SolarSystemView {
  /**
   * @param {Object} options
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.gotoModal = new GotoModal(this.queue);
    this.bodies = [];
    this.hwVisibility = {};
    this.element = null;
    this.packetUnsub = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    this.updateLocalBodies();

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-solar-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">Solar System</h2>
      </div>
      <div class="screen-divider"></div>

      <!-- Check Visibility Action Bar -->
      <div class="config-card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; margin-bottom: 14px;">
        <div>
          <strong style="color: var(--gold-highlight); font-size: 14px;">Verifica Visibilità FW</strong>
          <div style="font-size: 11px; color: var(--text-muted);">Interroga l'ESP32 sullo stato dei pianeti</div>
        </div>
        <button class="btn-gold" id="btn-check-solar-vis" style="padding: 6px 14px; min-height: 38px; font-size: 12px;">
          📡 Check Visibility
        </button>
      </div>

      <!-- Solar System Bodies List -->
      <div id="solar-bodies-list" style="display: flex; flex-direction: column; gap: 10px;">
        ${this.renderBodiesList()}
      </div>

      <!-- Footer Home -->
      <div class="screen-footer-home">
        <button class="btn-footer-home" id="btn-solar-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindEvents(el);
    return el;
  }

  updateLocalBodies() {
    const lat = appState.telescopeSettings.location?.lat || 45.4642;
    const lon = appState.telescopeSettings.location?.lon || 9.1900;
    this.bodies = AstroCalc.getAllSolarSystemBodies(new Date(), lat, lon);
  }

  renderBodiesList() {
    const icons = {
      Mercury: "☿️",
      Venus: "♀️",
      Mars: "♂️",
      Jupiter: "♃",
      Saturn: "♄",
      Uranus: "♅",
      Neptune: "♆",
      Moon: "🌙",
      Sun: "☀️"
    };

    return this.bodies.map(b => {
      const isSun = b.name === "Sun";
      const hwVis = this.hwVisibility[b.name];
      const isVis = hwVis !== undefined ? hwVis : b.isVisible;

      return `
        <div class="config-card solar-body-card ${isSun ? 'sun-card' : ''}" data-body="${b.name}" style="cursor: pointer; transition: all 0.2s; padding: 14px 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 28px;">${icons[b.name] || '🪐'}</span>
              <div>
                <strong style="color: ${isSun ? '#ff7675' : 'var(--gold-highlight)'}; font-size: 16px;">
                  ${b.name === 'Sun' ? 'Sun (Sole) ⚠️' : b.name}
                </strong>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                  Mag: ${b.mag} | Alt: ${b.alt.toFixed(1)}° | Az: ${b.az.toFixed(1)}°
                </div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
              <span class="badge-${isVis ? 'visible' : 'hidden'}" style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; border: 1px solid ${isVis ? 'rgba(46,204,113,0.5)' : 'rgba(231,76,60,0.5)'}; color: ${isVis ? '#2ecc71' : '#ff7675'}; background: ${isVis ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)'};">
                ${isVis ? '✓ Visible' : 'Under 10°'}
              </span>
              <button class="btn-sm btn-body-goto" data-body="${b.name}" style="padding: 4px 10px; font-size: 11px;">
                GoTo 🚀
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  bindEvents(el) {
    el.querySelector("#btn-solar-back").addEventListener("click", () => {
      this.destroy();
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-solar-home").addEventListener("click", () => {
      this.destroy();
      window.router?.home();
    });

    // Check visibility button
    el.querySelector("#btn-check-solar-vis").addEventListener("click", async () => {
      if (!this.queue.transport.connected) {
        alert("Telescopio non connesso! Connettiti via Bluetooth o attiva la modalità Mock.");
        return;
      }
      const btn = el.querySelector("#btn-check-solar-vis");
      btn.disabled = true;
      btn.textContent = "Verifica...";
      try {
        await this.queue.send(ProtocolCommands.solarObjStatus());
      } catch (e) {
        alert(`Errore richiesta visibilità: ${e.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = "📡 Check Visibility";
      }
    });

    // Listen to SOLAR_OBJ_STATUS responses
    this.packetUnsub = this.queue.transport.on("packet", (p) => {
      if (p.type === "SOLAR_OBJ_STATUS") {
        this.hwVisibility = p.planets;
        const listEl = this.element?.querySelector("#solar-bodies-list");
        if (listEl) {
          listEl.innerHTML = this.renderBodiesList();
          this.attachBodyClickListeners();
        }
      }
    });

    this.attachBodyClickListeners();
  }

  attachBodyClickListeners() {
    this.element?.querySelectorAll(".solar-body-card, .btn-body-goto").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const bodyName = btn.getAttribute("data-body");
        if (bodyName) {
          this.triggerSolarGoto(bodyName);
        }
      });
    });
  }

  triggerSolarGoto(bodyName) {
    if (bodyName.toLowerCase() === "sun") {
      this.showSunSafetyDialog();
    } else {
      const cmd = ProtocolCommands.gotoSolarSystem(bodyName);
      this.gotoModal.startGoto({
        targetName: `Pianeta: ${bodyName}`,
        command: cmd
      });
    }
  }

  showSunSafetyDialog() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content" style="border-color: var(--danger-color); box-shadow: 0 0 35px rgba(231, 76, 60, 0.6); text-align: center;">
        <div style="font-size: 52px; margin-bottom: 8px;">⚠️☀️⚠️</div>
        <h3 style="font-family: var(--font-title); color: #ff7675; font-size: 20px; margin-bottom: 12px;">
          PERICOLO CRITICO — SICUREZZA SOLARE
        </h3>
        <div class="card-description" style="color: #ff9e9e; font-size: 13px; line-height: 1.6; text-align: left; background: rgba(45, 10, 10, 0.7); padding: 12px; border-radius: 8px; border: 1px solid rgba(231, 76, 60, 0.4); margin-bottom: 16px;">
          • <strong>RISCHIO CECITÀ ISTANTANEA E PERMANENTE:</strong> Non guardare mai il Sole attraverso il cercatore o l'oculare del telescopio senza un filtro solare certificato a tutta apertura saldamente applicato davanti all'apertura del tubo.<br><br>
          • <strong>RISCHIO INCENDIO:</strong> La luce concentrata dello specchio primario può incendiare istantaneamente l'oculare e la struttura del telescopio in pochi secondi.
        </div>

        <label style="display: flex; align-items: flex-start; gap: 10px; text-align: left; cursor: pointer; margin-bottom: 20px; font-size: 13px; font-weight: 600; color: #fff;">
          <input type="checkbox" id="chk-confirm-sun-filter" style="width: 20px; height: 20px; margin-top: 2px; accent-color: var(--danger-color);" />
          <span>Dichiaro sotto la mia responsabilità di aver installato saldamente un filtro solare a tutta apertura certificato.</span>
        </label>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button class="btn-sm" id="btn-cancel-sun" style="min-height: 48px; font-size: 14px;">
            Annulla
          </button>
          <button class="btn-gold" id="btn-confirm-sun" disabled style="min-height: 48px; font-size: 14px; border-color: var(--danger-color); color: #ff7675; opacity: 0.4;">
            Conferma GoTo Sole
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const chk = modal.querySelector("#chk-confirm-sun-filter");
    const btnConfirm = modal.querySelector("#btn-confirm-sun");
    const btnCancel = modal.querySelector("#btn-cancel-sun");

    chk.addEventListener("change", (e) => {
      btnConfirm.disabled = !e.target.checked;
      btnConfirm.style.opacity = e.target.checked ? "1" : "0.4";
    });

    btnCancel.addEventListener("click", () => {
      modal.remove();
    });

    btnConfirm.addEventListener("click", () => {
      modal.remove();
      const cmd = ProtocolCommands.gotoSolarSystem("Sun");
      this.gotoModal.startGoto({
        targetName: "Sole (Filtro Solare Attivo)",
        command: cmd
      });
    });
  }

  destroy() {
    if (this.packetUnsub) {
      this.packetUnsub();
      this.packetUnsub = null;
    }
  }
}
