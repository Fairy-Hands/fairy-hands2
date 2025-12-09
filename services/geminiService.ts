import { GoogleGenAI } from "@google/genai";
import { Product, Sale } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getStoreInsights = async (
  products: Product[], 
  sales: Sale[], 
  userQuery: string
): Promise<string> => {
  
  // Prepare context data
  const lowStock = products.filter(p => p.stock < 5).map(p => p.name).join(', ');
  const recentSales = sales.slice(0, 20); // Last 20 sales for context
  
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contextPrompt,
    });
    return response.text || "Desculpe, não consegui analisar os dados no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ocorreu um erro ao conectar com a Inteligência Artificial.";
  }
};