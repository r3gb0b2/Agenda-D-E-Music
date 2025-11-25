import { GoogleGenAI } from "@google/genai";
import { Event, Band } from "../types";

// NOTE: In a real production app, never expose the key in frontend code.
// This is for demonstration purposes as requested by the prompt structure.
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch {
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const generateEventBrief = async (event: Event, bandName: string): Promise<string> => {
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
    return "Erro ao conectar com a IA. Verifique sua chave de API.";
  }
};