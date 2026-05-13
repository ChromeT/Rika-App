/**
 * Safe money formatter for React Native (Native/Android/iOS/Web)
 * Avoids Intl.NumberFormat which can cause crashes on some Android environments
 * @param {number|string} val 
 * @returns {string}
 */
export const formatMoney = (val) => {
  const num = Number(val) || 0;
  // Regex to add thousands separator (.)
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
