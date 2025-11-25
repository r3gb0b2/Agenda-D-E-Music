import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do Firebase
// Substitua os valores abaixo pelas credenciais do seu projeto no Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDsi6VpfhLQW8UWgAp5c4TRV7vqOkDyauU",
  authDomain: "stingressos-e0a5f.firebaseapp.com",
  projectId: "stingressos-e0a5f",
  storageBucket: "stingressos-e0a5f.firebasestorage.app",
  messagingSenderId: "424186734009",
  appId: "1:424186734009:web:385f6c645a3ace2f784268",
  measurementId: "G-JTEQ46VCRY"
}

// Inicializa o Firebase apenas se houver configuração, para não quebrar a demo
let app;
let dbFirestore;
let auth;

try {
  // Verifica se as chaves parecem válidas antes de inicializar para evitar erros no console da demo
  if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
    app = initializeApp(firebaseConfig);
    dbFirestore = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase inicializado com sucesso.");
  } else {
    console.log("Firebase aguardando configuração (Modo Demo Ativo).");
  }
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

export { dbFirestore, auth };
