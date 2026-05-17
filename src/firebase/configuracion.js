import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reemplaza estos valores con los de TU proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZcvwGzmfr1wESjByQBTgrVTC3ogNBAiw",
  authDomain: "finanzasapp-4e17f.firebaseapp.com",
  projectId: "finanzasapp-4e17f",
  storageBucket: "finanzasapp-4e17f.firebasestorage.app",
  messagingSenderId: "160391468761",
  appId: "1:160391468761:web:afac1726575d491117d0c8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Auth con persistencia en AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Inicializar Firestore
export const db = getFirestore(app);

export default app;