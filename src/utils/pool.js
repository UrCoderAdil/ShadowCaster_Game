/* ═══════════════════════════════════════════════════════
   Object Pool — Reusable object pool to avoid GC pressure
   ═══════════════════════════════════════════════════════ */

export class Pool {
  /**
   * @param {Function} factory - Creates a new object instance
   * @param {Function} reset - Resets an object for reuse: (obj) => void
   * @param {number} initialSize - Pre-allocated pool size
   */
  constructor(factory, reset, initialSize = 100) {
    this._factory = factory;
    this._reset = reset;
    this._pool = [];
    this._active = [];

    // Pre-allocate
    for (let i = 0; i < initialSize; i++) {
      this._pool.push(factory());
    }
  }

  /**
   * Acquire an object from the pool.
   * @returns {object}
   */
  acquire() {
    let obj;
    if (this._pool.length > 0) {
      obj = this._pool.pop();
    } else {
      obj = this._factory();
    }
    this._active.push(obj);
    return obj;
  }

  /**
   * Release an object back to the pool.
   */
  release(obj) {
    const idx = this._active.indexOf(obj);
    if (idx !== -1) {
      this._active.splice(idx, 1);
      this._reset(obj);
      this._pool.push(obj);
    }
  }

  /**
   * Iterate over active objects. Callback can return `false` to release the object.
   * @param {Function} fn - (obj, index) => boolean (return false to release)
   */
  forEach(fn) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const result = fn(this._active[i], i);
      if (result === false) {
        const obj = this._active.splice(i, 1)[0];
        this._reset(obj);
        this._pool.push(obj);
      }
    }
  }

  /** Number of active objects. */
  get activeCount() {
    return this._active.length;
  }

  /** Number of objects in reserve. */
  get poolCount() {
    return this._pool.length;
  }

  /** Get all active objects (read-only). */
  get active() {
    return this._active;
  }

  /** Release all active objects back to pool. */
  releaseAll() {
    while (this._active.length > 0) {
      const obj = this._active.pop();
      this._reset(obj);
      this._pool.push(obj);
    }
  }
}

export default Pool;
