/**
 * Dobson Pilot - Command Queue & Handshake Manager
 * Enforces strict READY/BUSY handshake with CosmoPilot firmware.
 * Routes priority commands immediately (STOP GOTO, keepalive, directions)
 * and serializes top-level commands, awaiting 'READY' notification before proceeding.
 */

import { isPriorityCommand } from "./protocol.js";
import { BLE_CONFIG } from "../config.js";

export class CommandQueue {
  /**
   * @param {import('./transport.js').Transport} transport
   */
  constructor(transport) {
    this.transport = transport;
    this.queue = [];
    this.currentTask = null;
    this.isProcessing = false;
    this.isTelescopeReady = true;
    this.readyWaiters = [];

    // Listen to transport events
    this.transport.on("ready", () => this.onReadyReceived());
    this.transport.on("busy", () => this.onBusyReceived());
    this.transport.on("disconnected", () => this.onDisconnected());
  }

  setTransport(transport) {
    this.transport = transport;
    this.transport.on("ready", () => this.onReadyReceived());
    this.transport.on("busy", () => this.onBusyReceived());
    this.transport.on("disconnected", () => this.onDisconnected());
  }

  onReadyReceived() {
    this.isTelescopeReady = true;

    // Resolve any pending ready waiters
    while (this.readyWaiters.length > 0) {
      const waiter = this.readyWaiters.shift();
      waiter();
    }

    // If current task is waiting for READY, resolve it!
    if (this.currentTask && this.currentTask.waitingForReady) {
      this.finishCurrentTask(true);
    } else {
      this.processNext();
    }
  }

  onBusyReceived() {
    this.isTelescopeReady = false;
    if (this.currentTask) {
      this.currentTask.receivedBusy = true;
      // We do not reject immediately; we wait for the subsequent READY notification
    }
  }

  onDisconnected() {
    this.isTelescopeReady = false;
    this.clearQueue(new Error("Dispositivo disconnesso durante l'esecuzione del comando"));
  }

  /**
   * Wait until the controller signals READY
   * @param {number} timeoutMs
   * @returns {Promise<void>}
   */
  waitForReady(timeoutMs = BLE_CONFIG.handshakeTimeoutMs) {
    if (this.isTelescopeReady) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.readyWaiters.indexOf(resolve);
        if (idx >= 0) this.readyWaiters.splice(idx, 1);
        reject(new Error("Timeout in attesa di segnale READY dal telescopio"));
      }, timeoutMs);

      this.readyWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Send command. If priority (e.g. STOP GOTO, keepalive), bypass queue.
   * If normal CMD, enqueue and wait for READY before advancing.
   *
   * @param {string} cmd
   * @param {Object} [options]
   * @param {number} [options.timeoutMs]
   * @returns {Promise<void>}
   */
  async send(cmd, options = {}) {
    if (!this.transport.connected) {
      throw new Error("Impossibile inviare comando: telescopio non connesso.");
    }

    // 1. Priority commands bypass the queue completely
    if (isPriorityCommand(cmd)) {
      return this.transport.send(cmd);
    }

    // 2. Normal commands are queued
    const timeoutMs = options.timeoutMs || (
      cmd.startsWith("CMD GOTO_") ? BLE_CONFIG.gotoTimeoutMs : BLE_CONFIG.handshakeTimeoutMs
    );

    return new Promise((resolve, reject) => {
      this.queue.push({
        cmd,
        timeoutMs,
        resolve,
        reject,
        timer: null,
        waitingForReady: false,
        receivedBusy: false
      });

      this.processNext();
    });
  }

  async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.currentTask = this.queue.shift();

    try {
      // Ensure telescope is READY before transmitting top-level CMD
      if (!this.isTelescopeReady) {
        await this.waitForReady(this.currentTask.timeoutMs);
      }

      this.isTelescopeReady = false; // Will be set to true upon next READY notification
      this.currentTask.waitingForReady = true;

      // Start watchdog timer
      this.currentTask.timer = setTimeout(() => {
        if (this.currentTask) {
          const err = new Error(`Timeout attesa risposta READY per comando: "${this.currentTask.cmd}"`);
          this.finishCurrentTask(false, err);
        }
      }, this.currentTask.timeoutMs);

      // Transmit to hardware
      this.currentTask.sentAt = Date.now();
      await this.transport.send(this.currentTask.cmd);

    } catch (err) {
      this.finishCurrentTask(false, err);
    }
  }

  finishCurrentTask(success, error = null) {
    if (!this.currentTask) {
      this.isProcessing = false;
      return;
    }

    if (this.currentTask.timer) {
      clearTimeout(this.currentTask.timer);
      this.currentTask.timer = null;
    }

    const { resolve, reject } = this.currentTask;
    this.currentTask = null;
    this.isProcessing = false;

    if (success) {
      resolve();
    } else {
      reject(error || new Error("Comando fallito"));
    }

    // Continue with next queued command
    setTimeout(() => this.processNext(), 20);
  }

  clearQueue(error) {
    if (this.currentTask) {
      if (this.currentTask.timer) clearTimeout(this.currentTask.timer);
      this.currentTask.reject(error);
      this.currentTask = null;
    }
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      task.reject(error);
    }
    this.readyWaiters.forEach(waiter => waiter());
    this.readyWaiters = [];
    this.isProcessing = false;
  }
}
