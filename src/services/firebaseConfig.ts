
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBuVKLsgZn3Q9DfIr_nZ3pQxzOXczmVcws",
  authDomain: "clinic-7b088.firebaseapp.com",
  projectId: "clinic-7b088",
  databaseURL: "https://clinic-7b088-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "clinic-7b088.firebasestorage.app",
  messagingSenderId: "819041724246",
  appId: "1:819041724246:web:6b21a13f4239e4319cd8f7",
  measurementId: "G-YKGNSVY12B"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);