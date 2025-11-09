window.STRINGS = window.STRINGS || {};
window.STRINGS.en = Object.freeze({
  free_remaining: (n) => `Remaining free calls: ${n}`,
  free_maxed: (limit) => `You have used your ${limit} free API calls. Service will continue.`
});

// Export the global t function for ES6 modules
// The t function is defined in lang/en/en.js as window.t
export function t(key, params) {
  if (typeof window !== 'undefined' && typeof window.t === 'function') {
    return window.t(key, params);
  }
  // Fallback if window.t is not available
  return key;
}

