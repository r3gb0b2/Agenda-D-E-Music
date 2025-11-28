

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Event, Band } from "../types";

// NOTE: In a real production app, never expose the key in frontend code.
// This is for demonstration purposes as requested by the prompt structure.
const getApiKey = () => {
  try {
    // FIX: API key must be obtained from process.env.API_KEY
    return typeof process !== 'undefined' && process.env ? (process.env.API_KEY || '') : '';
  } catch {
    return '';
  }
};

let ai: GoogleGenAI | null = null;

try {
  const key = getApiKey();
  if (key) {
    // FIX: Always use new GoogleGenAI({apiKey: ...})
    ai = new GoogleGenAI({ apiKey: key });
  }
} catch (e) {
  console.warn("Could not initialize Gemini AI:", e);
}

export const generateEventBrief = async (event: Event, bandName: string): Promise<string> => {
  if (!ai) {
    return "Funcionalidade de IA indisponível (Chave API não encontrada ou erro de inicialização).";
  }

  try {
    const prompt = `
      Você é um assistente pessoal de uma banda. Crie um resumo curto, profissional e formatado para WhatsApp (com emojis) para enviar aos músicos sobre o seguinte evento.
      
      Banda: ${bandName}
      Evento: ${event.name}
      Data: ${new Date(event.date).toLocaleDateString('pt-BR')}
      Horário: ${event.time}
      Duração: ${event.durationHours} horas
      Local: ${event.venue}, ${event.city}
      Notas: ${event.notes}
      Status: ${event.status}
      
      Inclua informações logísticas importantes. Não inclua informações financeiras sensíveis (valor/comissão).
    `;

    // FIX: Use ai.models.generateContent and pass the prompt in the `contents` property.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // FIX: Use the .text property to get the text from the response.
    return response.text || "Não foi possível gerar o resumo.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a IA. Verifique sua chave de API e conexão.";
  }
};
