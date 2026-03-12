/**
 * AI Insights API Route
 * 
 * This API endpoint generates actionable business insights from dashboard data
 * using Google Gemini AI. It analyzes sales, inventory, and KPI data to identify
 * trends, anomalies, and alerts.
 * 
 * @module InsightsAPI
 * @description POST endpoint for generating AI-powered business insights
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * @see https://ai.google.dev/docs
 */

// Import Google Gemini AI SDK types
import { GoogleGenAI, Type } from '@google/genai';

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
 * POST Handler for AI Insights Generation
 * 
 * Analyzes dashboard data (sales, inventory, KPIs) and generates 3 key
 * actionable insights focusing on anomalies, trends, and critical alerts.
 * 
 * The AI response is structured as a JSON array with insights containing
 * title and description fields.
 * 
 * @param {Request} req - The incoming HTTP request containing data to analyze
 * @returns {Promise<NextResponse>} JSON response with insights array or error
 */
export async function POST(req: Request) {
  try {
    // Parse the request body to extract data for analysis
    const { data } = await req.json();

    /**
     * AI Analysis Prompt
     * 
     * Instructs the AI to act as a Business Intelligence Analyst for a
     * pharmaceutical company. The analysis focuses on:
     * - Anomalies in the data
     * - Business trends
     * - Critical alerts (e.g., low inventory)
     * 
     * The AI is asked to provide exactly 3 actionable insights.
     */
    const prompt = `
      You are an AI Business Intelligence Analyst for a pharmaceutical company.
      Analyze the following dashboard data and provide 3 key actionable insights.
      Focus on anomalies, trends, or critical alerts (e.g., low inventory).
      
      Data:
      ${JSON.stringify(data)}
    `;

    // Generate AI response with structured JSON output
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        // Request JSON formatted response for easier parsing
        responseMimeType: "application/json",
        
        // Define the expected response schema
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              // Short, catchy title for the insight
              title: {
                type: Type.STRING,
                description: "A short, catchy title for the insight.",
              },
              // Detailed description and recommended action
              description: {
                type: Type.STRING,
                description: "A detailed description of the insight and recommended action.",
              },
            },
            // Both title and description are required fields
            required: ["title", "description"],
          },
        },
      }
    });

    // Parse the JSON response from AI
    const insights = JSON.parse(response.text || '[]');
    
    // Return the insights array in the response
    return NextResponse.json({ insights });
  } catch (error) {
    // Log error for debugging purposes
    console.error('AI Insights Error:', error);
    
    // Return error response with 500 status code
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
