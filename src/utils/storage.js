/* ═══════════════════════════════════════════════════════
   Storage — localStorage wrapper with versioning
   ═══════════════════════════════════════════════════════ */

const PREFIX = 'shadowcaster_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Storage] Write failed:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  clear() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  },
};

export default storage;
