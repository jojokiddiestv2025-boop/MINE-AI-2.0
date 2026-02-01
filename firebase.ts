
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6a0wfEU4CmiCLUzWNy-p9Pt1X22tuaP8",
  authDomain: "gen-lang-client-0149567529.firebaseapp.com",
  projectId: "gen-lang-client-0149567529",
  storageBucket: "gen-lang-client-0149567529.firebasestorage.app",
  messagingSenderId: "584319934143",
  appId: "1:584319934143:web:53b2073aabc1cb2cc0b00a",
  measurementId: "G-RLPQBFTB9M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
