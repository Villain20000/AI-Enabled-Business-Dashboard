/**
 * AI Chat API Route
 * 
 * This API endpoint handles natural language queries about business data.
 * It uses Google Gemini AI to generate responses based on the provided context.
 * 
 * @module ChatAPI
 * @description POST endpoint for natural language queries to AI assistant
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * @see https://ai.google.dev/docs
 */

// Import Google Gemini AI SDK
import { GoogleGenAI } from '@google/genai';

// Import Next.js response helper
import { NextResponse } from 'next/server';

/**
 * Initialize Google Gemini AI Client
 * 
 * Creates an instance of the Gemini AI client using the API key
 * from environment variables. The key should be set in NEXT_PUBLIC_GEMINI_API_KEY.
 */
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

/**
 * POST Handler for AI Chat
 * 
 * Processes user messages and generates AI responses based on the provided
 * business data context. The AI acts as a Business Intelligence Assistant
 * for a pharmaceutical company.
 * 
 * @param {Request} req - The incoming HTTP request containing message and context data
 * @returns {Promise<NextResponse>} JSON response with AI-generated text or error
 */
export async function POST(req: Request) {
  try {
    // Parse the request body to extract message and context data
    const { message, contextData } = await req.json();

    /**
     * AI System Prompt
     * 
     * Defines the AI's role and behavior:
     * - Acts as a BI Assistant for a pharmaceutical company (like Pfizer)
     * - Answers questions based ONLY on provided data
     * - Can generate simulated SQL queries when requested
     * - Returns responses in Markdown format
     */
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

    // Generate AI response using Gemini model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Return the AI-generated text in the response
    return NextResponse.json({ text: response.text });
  } catch (error) {
    // Log error for debugging purposes
    console.error('AI Chat Error:', error);
    
    // Return error response with 500 status code
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
