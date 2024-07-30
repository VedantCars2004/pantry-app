// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getFirestore} from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDWL36Ei-mUL1obZTcD0jfOpVYQalSmqzg",
  authDomain: "pantry-app-b249c.firebaseapp.com",
  projectId: "pantry-app-b249c",
  storageBucket: "pantry-app-b249c.appspot.com",
  messagingSenderId: "559597934202",
  appId: "1:559597934202:web:c876f4fc20967b24118dc3",
  measurementId: "G-6BPFXFG347"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firestore = getFirestore(app);

export {app, firestore}