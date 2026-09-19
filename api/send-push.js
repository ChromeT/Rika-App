const admin = require('firebase-admin');

// Inisialisasi Firebase Admin jika service account tersedia
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }
  } catch (e) {
    console.error('Firebase Admin Init Error:', e.message);
  }
}

// Secret key untuk membatasi endpoint agar tidak bisa disalahgunakan bot publik
const EXPECTED_SECRET = process.env.INTERNAL_PUSH_SECRET || 'rika-internal-push-secret-2026';

// Whitelist domain yang diizinkan memanggil API Route ini
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/rikapp.*\.vercel\.app$/,
  /^https:\/\/rika-app.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // Request dari Android APK/Native sering kali tidak menyertakan origin
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
};

module.exports = async (req, res) => {
  const origin = req.headers.origin;

  // Set CORS headers
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://rikapp.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-app-secret');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verifikasi Secret Authorization Header
  const clientSecret = req.headers['x-app-secret'] || (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));
  if (clientSecret !== EXPECTED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized request' });
  }

  const { token, title, body, data } = req.body || {};

  // Validasi Input
  if (!token || typeof token !== 'string' || token.trim().length === 0 || token.length > 500) {
    return res.status(400).json({ error: 'Invalid or missing token' });
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
    return res.status(400).json({ error: 'Invalid or missing title (max 120 chars)' });
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0 || body.length > 500) {
    return res.status(400).json({ error: 'Invalid or missing body (max 500 chars)' });
  }

  const safeTitle = title.trim();
  const safeBody = body.trim();
  const safeData = (typeof data === 'object' && data !== null) ? data : {};

  // DETEKSI JALUR: Expo (Native APK) atau Firebase (Web PWA)
  if (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title: safeTitle,
          body: safeBody,
          data: safeData,
        }),
      });
      const result = await response.json();
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Expo Push Error:', error);
      // Trim error: jangan expose internal server details ke client
      return res.status(500).json({ error: 'Notification delivery failed' });
    }
  }

  // Jalur Firebase (Web PWA)
  if (!admin.apps.length) {
    return res.status(503).json({ error: 'Push service unavailable' });
  }

  try {
    const message = {
      token: token,
      notification: {
        title: safeTitle,
        body: safeBody,
      },
      data: safeData,
      webpush: {
        notification: {
          icon: 'https://rikapp.vercel.app/assets/favicon.png',
          badge: 'https://rikapp.vercel.app/assets/favicon.png',
        }
      }
    };

    await admin.messaging().send(message);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('FCM Admin Error:', error);
    return res.status(500).json({ error: 'Notification delivery failed' });
  }
};
