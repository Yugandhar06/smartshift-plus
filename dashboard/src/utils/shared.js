export const SS = {
  get: (key) => {
    const val = localStorage.getItem('smartshift_' + key);
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch (e) {
      return val;
    }
  },
  set: (key, val) => {
    const valueToStore = typeof val === 'object' ? JSON.stringify(val) : String(val);
    localStorage.setItem('smartshift_' + key, valueToStore);
  },
  clear: () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('smartshift_'))
      .forEach(k => localStorage.removeItem(k));
  }
};