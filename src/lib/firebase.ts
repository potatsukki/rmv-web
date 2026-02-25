import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyD3tzi32Ocq6rj6NNcDWhV2hhOS3QI4i1Q',
  authDomain: 'rmv-system-9817c.firebaseapp.com',
  projectId: 'rmv-system-9817c',
  storageBucket: 'rmv-system-9817c.firebasestorage.app',
  messagingSenderId: '593289237222',
  appId: '1:593289237222:web:0063448d9d7f02aa512127',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
