importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDuXQF0MFebmXuOZxs9Z_1HMG6Tgtr3lXc",
  authDomain: "rika-app-ba746.firebaseapp.com",
  projectId: "rika-app-ba746",
  storageBucket: "rika-app-ba746.firebasestorage.app",
  messagingSenderId: "335307872266",
  appId: "1:335307872266:web:0df6a1171d9e2db4e467f3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || 'Rika App Notification';
  const notificationOptions = {
    body: payload.notification.body || 'Ada pesan baru untukmu.',
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
