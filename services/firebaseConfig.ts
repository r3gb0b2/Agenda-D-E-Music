import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- CONFIGURAÇÃO DO FIREBASE ---
// 1. Vá ao Console do Firebase (console.firebase.google.com)
// 2. Crie um projeto ou selecione um existente
// 3. Vá em Configurações do Projeto -> Geral -> Apps da Web
// 4. Copie as chaves e cole abaixo

const firebaseConfig = {
  // Substitua estas strings vazias ou de exemplo pelas suas chaves reais
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

let app;
let dbFirestore;
let auth;

try {
  // Verifica se a API Key foi configurada (diferente do placeholder)
  const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI";

  if (isConfigured) {
    app = initializeApp(firebaseConfig);
    dbFirestore = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase conectado com sucesso.");
  } else {
    console.warn("Firebase não configurado. O App rodará em MODO DEMO (apenas local).");
    console.warn("Para ativar o Firebase, edite o arquivo services/firebaseConfig.ts");
  }
} catch (error) {
  console.error("Erro crítico ao inicializar Firebase:", error);
}

export { dbFirestore, auth };
