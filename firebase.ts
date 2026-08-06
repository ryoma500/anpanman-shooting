import { initializeApp } from "firebase/app";
import { 
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCuduKA7QPKL7NLbhyRenyhz9h5vBVkXc0",
  authDomain: "shooting-game-ranking.firebaseapp.com",
  projectId: "shooting-game-ranking",
  storageBucket: "shooting-game-ranking.firebasestorage.app",
  messagingSenderId: "847676991601",
  appId: "1:847676991601:web:6bf8c26358afff278013d0",
  measurementId: "G-DTSS0R2EZB"
};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs
};