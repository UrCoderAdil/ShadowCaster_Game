/* ═══════════════════════════════════════════════════════
   Event Bus — Lightweight pub/sub for decoupling systems
   ═══════════════════════════════════════════════════════ */

class EventBus {
  constructor() {
    this._listeners = new Map();
    this._onceListeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event, but only fire once.
   */
  once(event, callback) {
    if (!this._onceListeners.has(event)) {
      this._onceListeners.set(event, new Set());
    }
    this._onceListeners.get(event).add(callback);
  }

  /**
   * Unsubscribe from an event.
   */
  off(event, callback) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(callback);
    }
    if (this._onceListeners.has(event)) {
      this._onceListeners.get(event).delete(callback);
    }
  }

  /**
   * Emit an event with optional data.
   */
  emit(event, data = {}) {
    if (this._listeners.has(event)) {
      for (const cb of this._listeners.get(event)) {
        try {
          cb(data);
        } catch (e) {
          console.error(`[EventBus] Error in listener for "${event}":`, e);
        }
      }
    }
    if (this._onceListeners.has(event)) {
      for (const cb of this._onceListeners.get(event)) {
        try {
          cb(data);
        } catch (e) {
          console.error(`[EventBus] Error in once-listener for "${event}":`, e);
        }
      }
      this._onceListeners.delete(event);
    }
  }

  /**
   * Remove all listeners.
   */
  clear() {
    this._listeners.clear();
    this._onceListeners.clear();
  }
}

// Singleton
export const events = new EventBus();
export default events;
