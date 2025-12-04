import { GoogleGenAI } from "@google/genai";
import { Event, Band } from "../types";

// NOTE: The API key should be set as an environment variable `API_KEY`.
// This is for demonstration purposes as requested by the prompt structure.
let ai: GoogleGenAI | null = null;

try {
  // FIX: Directly use process.env.API_KEY as per the coding guidelines.
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey: apiKey });
  } else {
    console.warn("API_KEY environment variable not found. Gemini AI functionality will be disabled.");
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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar o resumo.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a IA. Verifique sua chave de API e conexão.";
  }
};