import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function verifyDocument(base64Image: string, expectedName: string, expectedCpf: string) {
  try {
    const prompt = `
      Analise esta imagem de um documento de identidade (RG ou CNH).
      Extraia o nome completo e o CPF.
      Compare com os seguintes dados esperados:
      Nome: ${expectedName}
      CPF: ${expectedCpf}

      Responda apenas em formato JSON:
      {
        "verified": boolean,
        "extractedName": string,
        "extractedCpf": string,
        "confidence": number (0-1),
        "reason": string (se não verificado)
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType: "image/jpeg"
              }
            }
          ]
        }
      ]
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    // Clean up potential markdown formatting
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("KYC Verification Error:", error);
    throw error;
  }
}
