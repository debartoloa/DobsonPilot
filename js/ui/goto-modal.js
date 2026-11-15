/**
 * Dobson Pilot - GoTo Progress Modal & Controller
 * Manages active GoTo slew dialog, 'Stop GoTo' execution,
 * altitude limit warning ('OBJECT_VISIBLE 0'), and completion notifications.
 */

import { ProtocolCommands } from "../transport/protocol.js";
import { appState } from "../state.js";

export class GotoModal {
  /**
   * @param {import('../transport/command-queue.js').CommandQueue} commandQueue
   */
  constructor(commandQueue) {
    this.queue = commandQueue;
    this.modalEl = null;
    this.activeSlew = false;
    this.packetUnsub = null;
  }

  /**
   * Start and display a GoTo slew operation
   * @param {Object} options
   * @param {string} options.targetName - E.g. 'M42 Orion Nebula' or 'Jupiter'
   * @param {string} options.command - Formatted command, e.g. 'CMD GOTO_ANY_OBJECT ...'
   * @param {string} [options.coordsInfo] - E.g. 'RA 5h 35m 17s | Dec -5° 23' 28"'
   */
  async startGoto(options) {
    if (!this.queue.transport.connected) {
      alert("Telescopio non connesso! Connettiti via Bluetooth o attiva la modalità Mock.");
      return;
    }

    this.activeSlew = true;
    this.createModal(options);

    // Listen for firmware notifications
    this.packetUnsub = this.queue.transport.on("packet", (packet) => {
      this.handlePacket(packet);
    });

    try {
      await this.queue.send(options.command);
      this.onSlewComplete();
    } catch (err) {
      this.onSlewError(err.message);
    }
  }

  createModal(options) {
    // Remove any existing modal
    if (this.modalEl) this.modalEl.remove();

    const showStopBtn = appState.settings.enableStopGoto !== false;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "goto-progress-modal";

    overlay.innerHTML = `
      <div class="modal-content" style="text-align: center; max-width: 420px; border-color: var(--gold-primary);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-family: var(--font-title); color: var(--gold-primary); font-size: 18px; margin: 0;">
            Puntamento in Corso...
          </h3>
          <button class="btn-sm" id="btn-close-goto-modal" style="padding: 2px 8px;" title="Chiudi (il telescopio continuerà a muoversi)">
            ✕
          </button>
        </div>

        <div style="font-size: 40px; margin: 12px 0; animation: spin-slow 8s linear infinite;">
          🔭
        </div>

        <div style="font-size: 17px; font-weight: 700; color: var(--gold-highlight); margin-bottom: 4px;">
          ${options.targetName}
        </div>

        ${options.coordsInfo ? `
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
            ${options.coordsInfo}
          </div>
        ` : ""}

        <div class="goto-progress-bar" style="height: 6px; background: rgba(0,0,0,0.6); border-radius: 3px; overflow: hidden; margin-bottom: 16px; border: 1px solid var(--gold-dim);">
          <div class="goto-progress-fill" style="width: 100%; height: 100%; background: linear-gradient(90deg, var(--gold-primary), var(--gold-highlight)); animation: pulse-glow 1.5s ease-in-out infinite;"></div>
        </div>

        <div id="goto-modal-status-msg" style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px; min-height: 20px;">
          I motori si stanno muovendo verso il bersaglio...
        </div>

        ${showStopBtn ? `
          <button class="btn-gold btn-block" id="btn-stop-goto" style="border-color: var(--danger-color); color: #ff7675; min-height: 50px; font-size: 15px;">
            🛑 STOP GoTo (Arresta Movimento)
          </button>
        ` : ""}

        <div style="font-size: 11px; color: var(--text-dim); margin-top: 12px;">
          Nota: La chiusura del popup NON interrompe il moto del telescopio.
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.modalEl = overlay;

    // Close button (does not stop motion)
    overlay.querySelector("#btn-close-goto-modal").addEventListener("click", () => {
      this.closeModal(false);
    });

    // Stop GoTo button (sends immediate CMD STOP GOTO)
    const btnStop = overlay.querySelector("#btn-stop-goto");
    if (btnStop) {
      btnStop.addEventListener("click", async () => {
        btnStop.disabled = true;
        btnStop.textContent = "Arresto in corso...";
        try {
          await this.queue.send(ProtocolCommands.stopGoto());
          this.onSlewStopped();
        } catch (e) {
          console.warn("Stop GoTo error:", e);
        }
      });
    }
  }

  handlePacket(packet) {
    if (!this.modalEl) return;
    const msgEl = this.modalEl.querySelector("#goto-modal-status-msg");

    if (packet.type === "OBJECT_VISIBLE" && !packet.visible) {
      if (msgEl) {
        msgEl.style.color = "#ff7675";
        msgEl.innerHTML = "⚠️ <strong>Oggetto sotto i 10° di altezza!</strong><br>Il firmware rifiuta il puntamento per motivi di sicurezza.";
      }
    }
  }

  onSlewComplete() {
    this.activeSlew = false;
    if (this.packetUnsub) {
      this.packetUnsub();
      this.packetUnsub = null;
    }

    if (this.modalEl) {
      const msgEl = this.modalEl.querySelector("#goto-modal-status-msg");
      const titleEl = this.modalEl.querySelector("h3");
      const fillEl = this.modalEl.querySelector(".goto-progress-fill");

      if (titleEl) titleEl.textContent = "Puntamento Completato!";
      if (fillEl) fillEl.style.background = "#2ecc71";
      if (msgEl) {
        msgEl.style.color = "#2ecc71";
        msgEl.innerHTML = "✓ Bersaglio inquadrato. Telescopio pronto!";
      }

      setTimeout(() => this.closeModal(true), 1600);
    }
  }

  onSlewStopped() {
    this.activeSlew = false;
    if (this.packetUnsub) {
      this.packetUnsub();
      this.packetUnsub = null;
    }

    if (this.modalEl) {
      const msgEl = this.modalEl.querySelector("#goto-modal-status-msg");
      if (msgEl) {
        msgEl.style.color = "#f1c40f";
        msgEl.textContent = "🛑 Movimento GoTo interrotto con successo.";
      }
      setTimeout(() => this.closeModal(true), 1200);
    }
  }

  onSlewError(errMsg) {
    this.activeSlew = false;
    if (this.packetUnsub) {
      this.packetUnsub();
      this.packetUnsub = null;
    }

    if (this.modalEl) {
      const msgEl = this.modalEl.querySelector("#goto-modal-status-msg");
      if (msgEl) {
        msgEl.style.color = "#ff7675";
        msgEl.textContent = `Errore GoTo: ${errMsg}`;
      }
      setTimeout(() => this.closeModal(true), 2500);
    }
  }

  closeModal(force = true) {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
    if (force && this.packetUnsub) {
      this.packetUnsub();
      this.packetUnsub = null;
    }
  }
}
