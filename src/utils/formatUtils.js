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

/**
 * Format angka ke format Rupiah dengan prefix "Rp "
 * Dipakai di fitur Rencana (budget & cicilan)
 * @param {number|string} amount
 * @returns {string} contoh: "Rp 1.500.000"
 */
export const formatRupiah = (amount) => {
  return 'Rp ' + formatMoney(amount);
};
