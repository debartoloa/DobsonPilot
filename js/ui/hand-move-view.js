/**
 * Dobson Pilot - Hand Move View Component
 * Allows free manual movement of the telescope tube by disabling the stepper holding torque.
 * Accurately models firmware behavior: 'CMD RELEASE_STEPPERS' disengages motors,
 * revokes alignment (status bit cleared), and requires re-alignment afterwards.
 */

import { appState } from "../state.js";
import { ProtocolCommands } from "../transport/protocol.js";

export class HandMoveView {
  /**
   * @param {Object} options
   * @param {import('../transport/command-queue.js').CommandQueue} options.commandQueue
   * @param {Function} options.onBack
   */
  constructor(options) {
    this.queue = options.commandQueue;
    this.onBack = options.onBack;
    this.steppersReleased = false;
    this.element = null;
  }

  render() {
    const el = document.createElement("div");
    el.className = "screen-container";
    this.element = el;

    el.innerHTML = `
      <div class="screen-header">
        <button class="btn-header-back" id="btn-hand-back">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> <span>Indietro</span>
        </button>
        <h2 class="screen-title">Hand Move</h2>
      </div>
      <div class="screen-divider"></div>

      <div class="config-card" style="text-align: center; padding: 24px 16px;">
        <div style="font-size: 48px; margin-bottom: 12px;">✋</div>
        <div class="card-title" style="justify-content: center; font-size: 18px;">
          Movimento Manuale a Tubo Libero
        </div>
        <div class="card-description">
          Disattivando la coppia di tenuta dei motori NEMA17 puoi puntare il telescopio a mano liberamente.
        </div>

        <div style="margin: 24px 0;">
          <button class="btn-gold btn-block ${this.steppersReleased ? 'active-release' : ''}" id="btn-toggle-steppers" style="min-height: 58px; font-size: 17px;">
            ${this.steppersReleased ? 'Press to Enable (Blocca Motori)' : 'Press to Disable (Rilascia Motori)'}
          </button>
        </div>

        <div class="stepper-status-badge ${this.steppersReleased ? 'released' : 'holding'}" id="lbl-stepper-status">
          Stato: <strong>${this.steppersReleased ? 'MOTORI LIBERI (FOLLE)' : 'MOTORI IN PRESA'}</strong>
        </div>
      </div>

      <!-- Critical Warning Box -->
      <div class="config-card warning-card">
        <div class="card-title" style="color: var(--danger-color);">
          <span>⚠️ Allineamento e Sicurezza</span>
        </div>
        <div class="card-description" style="margin-bottom: 0;">
          • <strong>Perdita Allineamento:</strong> Il rilascio dei motori invalida completamente il modello celeste. L'allineamento verrà segnato come perso e dovrà essere rieseguito.<br><br>
          • <strong>Frizione e Bilanciamento:</strong> Assicurarsi che il telescopio sia ben bilanciato prima di rilasciare i motori per evitare movimenti bruschi o cadute verso il basso.
        </div>
      </div>

      <!-- Footer Home -->
      <div class="screen-footer-home">
        <button class="btn-footer-home" id="btn-hand-home" title="Torna alla Home">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>
    `;

    this.bindEvents(el);
    return el;
  }

  bindEvents(el) {
    // Back & Home
    el.querySelector("#btn-hand-back").addEventListener("click", () => {
      if (this.onBack) this.onBack();
    });

    el.querySelector("#btn-hand-home").addEventListener("click", () => {
      window.router?.home();
    });

    // Toggle steppers
    const btnToggle = el.querySelector("#btn-toggle-steppers");
    const lblStatus = el.querySelector("#lbl-stepper-status");

    btnToggle.addEventListener("click", async () => {
      this.steppersReleased = !this.steppersReleased;

      if (this.steppersReleased) {
        // Send RELEASE_STEPPERS
        try {
          await this.queue.send(ProtocolCommands.releaseSteppers());
          // App marks alignment as lost
          appState.aligned = false;
          appState.emit("status_changed", appState.getStatusSummary());
        } catch (err) {
          alert(`Errore rilascio motori: ${err.message}`);
          this.steppersReleased = false;
        }
      } else {
        // Re-enable steppers by sending CMD NONE
        try {
          await this.queue.send(ProtocolCommands.none());
        } catch (err) {
          console.warn("Error re-enabling steppers:", err);
        }
      }

      // Update button & status UI
      btnToggle.textContent = this.steppersReleased 
        ? "Press to Enable (Blocca Motori)" 
        : "Press to Disable (Rilascia Motori)";
      btnToggle.classList.toggle("active-release", this.steppersReleased);

      lblStatus.innerHTML = `Stato: <strong>${this.steppersReleased ? 'MOTORI LIBERI (FOLLE)' : 'MOTORI IN PRESA'}</strong>`;
      lblStatus.className = `stepper-status-badge ${this.steppersReleased ? 'released' : 'holding'}`;
    });
  }
}
