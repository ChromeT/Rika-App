import AsyncStorage from '@react-native-async-storage/async-storage';

const RATE_LIMIT_KEY = '@rika_join_rate_limit';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 2 * 60 * 1000; // 2 Menit lockout
const ATTEMPT_WINDOW_MS = 3 * 60 * 1000; // 3 Menit window

/**
 * Sanitasi string input dasar untuk membersihkan karakter berbahaya atau tag HTML.
 */
export const sanitizeInput = (str, maxLength = 100) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[<>'"&;]/g, '') // Hapus karakter berisiko injection
    .trim()
    .slice(0, maxLength);
};

/**
 * Validasi format kode ruangan (tepat 6 karakter alfanumerik A-Z, 0-9).
 */
export const isValidRoomCode = (code) => {
  if (!code || typeof code !== 'string') return false;
  const cleanCode = code.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(cleanCode);
};

/**
 * Validasi nama pengguna.
 */
export const isValidUserName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const cleanName = name.trim();
  return cleanName.length >= 2 && cleanName.length <= 30;
};

/**
 * Memeriksa status rate limit untuk login / join room.
 * Mencegah bot melakukan brute-force enumeration pada kode ruangan 6 karakter.
 */
export const checkJoinRateLimit = async () => {
  try {
    const raw = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { allowed: true, remainingSeconds: 0 };

    const data = JSON.parse(raw);
    const now = Date.now();

    // Jika sedang dalam masa lockout
    if (data.lockedUntil && now < data.lockedUntil) {
      const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
      return { allowed: false, remainingSeconds };
    }

    // Jika window waktu sudah kadaluarsa, reset
    if (now - data.firstAttempt > ATTEMPT_WINDOW_MS) {
      await AsyncStorage.removeItem(RATE_LIMIT_KEY);
      return { allowed: true, remainingSeconds: 0 };
    }

    return { allowed: true, remainingSeconds: 0 };
  } catch (e) {
    console.error('Rate limit check error:', e);
    return { allowed: true, remainingSeconds: 0 };
  }
};

/**
 * Mencatat percobaan join yang gagal.
 */
export const recordFailedJoinAttempt = async () => {
  try {
    const now = Date.now();
    const raw = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    let data = raw ? JSON.parse(raw) : { count: 0, firstAttempt: now };

    // Reset jika window sudah lewat
    if (now - data.firstAttempt > ATTEMPT_WINDOW_MS) {
      data = { count: 1, firstAttempt: now };
    } else {
      data.count = (data.count || 0) + 1;
    }

    if (data.count >= MAX_ATTEMPTS) {
      data.lockedUntil = now + LOCKOUT_MS;
    }

    await AsyncStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    return data.count >= MAX_ATTEMPTS;
  } catch (e) {
    console.error('Record failed attempt error:', e);
    return false;
  }
};

/**
 * Reset rate limit setelah berhasil masuk / join.
 */
export const resetJoinRateLimit = async () => {
  try {
    await AsyncStorage.removeItem(RATE_LIMIT_KEY);
  } catch (e) {
    console.error('Reset rate limit error:', e);
  }
};
