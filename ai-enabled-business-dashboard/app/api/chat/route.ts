import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message, contextData } = await req.json();

    const prompt = `
      You are an AI Business Intelligence Assistant for a pharmaceutical company (like Pfizer).
      The user is asking a question about their data.
      Here is the current data context (mocked database state):
      ${JSON.stringify(contextData)}
      
      User Question: "${message}"
      
      Provide a concise, professional answer based ONLY on the provided data. 
      If the user asks for a SQL query, provide a simulated PostgreSQL query that would fetch this data from a hypothetical Supabase database.
      Format your response in Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
