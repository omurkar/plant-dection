/* src/firebase.js */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCxlbwjm-TuEOmwqXVAXWyRcBOAX7iimko",
  authDomain: "plant-2ab33.firebaseapp.com",
  databaseURL: "https://plant-2ab33-default-rtdb.firebaseio.com",
  projectId: "plant-2ab33",
  storageBucket: "plant-2ab33.firebasestorage.app",
  messagingSenderId: "576536006118",
  appId: "1:576536006118:web:6f342da4157e90f6279a27",
  measurementId: "G-WE9PF78MMY"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();