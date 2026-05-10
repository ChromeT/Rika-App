const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.error('Firebase Admin Init Error:', e);
  }
}

module.exports = async (req, res) => {
  // Set CORS for preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, title, body, data } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields (token, title, body)' });
  }

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
          title: title,
          body: body,
          data: data || {},
        }),
      });
      const result = await response.json();
      return res.status(200).json({ success: true, result });
    } catch (error) {
      console.error('Expo Push Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // Jalur Firebase (Web PWA)
  try {
    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: 'https://rika-app.vercel.app/assets/favicon.png',
          badge: 'https://rika-app.vercel.app/assets/favicon.png',
        }
      }
    };

    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('FCM Admin Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
