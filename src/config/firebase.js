import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDuXQF0MFebmXuOZxs9Z_1HMG6Tgtr3lXc",
  authDomain: "rika-app-ba746.firebaseapp.com",
  projectId: "rika-app-ba746",
  storageBucket: "rika-app-ba746.firebasestorage.app",
  messagingSenderId: "335307872266",
  appId: "1:335307872266:web:0df6a1171d9e2db4e467f3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
