/**
 * Dobson Pilot - Abstract Transport Interface
 * Base class for Bluetooth LE and Mock/Simulator transports.
 */

export class Transport {
  constructor() {
    this.listeners = new Map();
    this.isConnected = false;
    this.deviceName = null;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in event listener for '${event}':`, err);
        }
      }
    }
  }

  /**
   * Connect to device or start simulator
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error("connect() must be implemented by subclass");
  }

  /**
   * Disconnect from device
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error("disconnect() must be implemented by subclass");
  }

  /**
   * Send a raw string or byte buffer to the device
   * @param {string|Uint8Array} data
   * @returns {Promise<void>}
   */
  async send(data) {
    throw new Error("send() must be implemented by subclass");
  }

  /**
   * Check if transport is currently connected
   */
  get connected() {
    return this.isConnected;
  }
}
