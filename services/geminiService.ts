
import { GoogleGenAI, Type } from "@google/genai";
import { Metrics, AttackType, AIAnalysisResult } from "../types";

/**
 * Refactored to follow @google/genai guidelines.
 * Uses gemini-3-pro-preview for complex cybersecurity analysis.
 */
export const analyzeTraffic = async (
  metricsHistory: Metrics[],
  currentAttack: AttackType,
  defenses: string[]
): Promise<AIAnalysisResult> => {
  // Always use process.env.API_KEY directly in the named parameter as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const recentData = metricsHistory.slice(-10);
  const prompt = `
    Analyze the following synthetic server traffic data for potential DDoS activity.
    Current Scenario: ${currentAttack}
    Active Defenses: ${defenses.length > 0 ? defenses.join(', ') : 'None'}
    
    Recent Metrics History:
    ${JSON.stringify(recentData, null, 2)}
    
    Provide a detailed security analysis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class Cybersecurity Analyst. Analyze traffic patterns and provide structured JSON insights. Focus on risk scores, technical explanations of symptoms, and mitigation advice.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            threatDescription: { type: Type.STRING },
            mitigationSteps: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            confidence: { type: Type.NUMBER }
          },
          required: ['riskScore', 'threatDescription', 'mitigationSteps', 'confidence']
        }
      }
    });

    // Extracting text from the response property directly.
    const text = response.text || '{}';
    return JSON.parse(text) as AIAnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      riskScore: 'Medium',
      threatDescription: "Error connecting to AI analysis engine. Manual inspection required.",
      mitigationSteps: ["Check API connectivity", "Monitor system resources"],
      confidence: 0
    };
  }
};
