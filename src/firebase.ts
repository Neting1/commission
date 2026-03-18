import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBJKTS3Bv37vibkbirCdLe4LupMBrxfsno",
  authDomain: "commission-b0f06.firebaseapp.com",
  projectId: "commission-b0f06",
  storageBucket: "commission-b0f06.firebasestorage.app",
  messagingSenderId: "760114835576",
  appId: "1:760114835576:web:01cac5bd68b76ad3bffd8d",
  measurementId: "G-0F5QPT13KF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
