import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { data } = await req.json();

    const prompt = `
      You are an AI Business Intelligence Analyst for a pharmaceutical company.
      Analyze the following dashboard data and provide 3 key actionable insights.
      Focus on anomalies, trends, or critical alerts (e.g., low inventory).
      
      Data:
      ${JSON.stringify(data)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "A short, catchy title for the insight.",
              },
              description: {
                type: Type.STRING,
                description: "A detailed description of the insight and recommended action.",
              },
            },
            required: ["title", "description"],
          },
        },
      }
    });

    const insights = JSON.parse(response.text || '[]');
    return NextResponse.json({ insights });
  } catch (error) {
    console.error('AI Insights Error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
