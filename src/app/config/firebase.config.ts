// src/app/config/firebase.config.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { environment } from '../../environments/environment'; // นำเข้า environment

// ใช้ค่าจาก environment.firebase
const app = initializeApp(environment.firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('email');
googleProvider.addScope('profile');

isSupported().then(yes => yes && getAnalytics(app));

export default app;