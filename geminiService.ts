import { GoogleGenAI } from "@google/genai";
import { Product, Sale } from "./types";

// Helper to initialize AI only when needed to prevent app crash on load if key is missing
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key não configurada. Verifique as variáveis de ambiente.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getStoreInsights = async (
  products: Product[], 
  sales: Sale[], 
  userQuery: string
): Promise<string> => {
  
  try {
    const ai = getAIClient();

    // Prepare context data
    const lowStock = products.filter(p => p.stock < 5).map(p => p.name).join(', ');
    const paidSales = sales.filter(s => s.paymentMethod !== 'pending');
    const pendingSales = sales.filter(s => s.paymentMethod === 'pending');
    
    const totalRevenue = paidSales.reduce((acc, curr) => acc + curr.total, 0);
    const totalPending = pendingSales.reduce((acc, curr) => acc + curr.total, 0);

    const contextPrompt = `
      You are an AI assistant for a candy store owner named "DoceGestão".
      
      Current Store Status:
      - Total Revenue (Received): R$ ${totalRevenue.toFixed(2)}
      - Pending Payments (To Receive/Fiado): R$ ${totalPending.toFixed(2)}
      - Products with Low Stock: ${lowStock || "None"}
      - Total Products registered: ${products.length}
      - Total Sales count: ${sales.length}

      User Question: "${userQuery}"

      Please provide a helpful, concise, and friendly answer in Portuguese (Brazil). 
      If asking about sales trends, analyze the data provided. 
      If asking for marketing ideas, suggest candy-themed promotions.
      When mentioning revenue, distinguish between money received and money pending (fiado).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contextPrompt,
    });
    return response.text || "Desculpe, não consegui analisar os dados no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Não foi possível conectar com a IA. Verifique se a chave de API está configurada corretamente no Vercel.";
  }
};