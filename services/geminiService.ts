import { GoogleGenAI, Type } from "@google/genai";
import type { RawReading } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        systolic: {
            type: Type.NUMBER,
            description: "The systolic blood pressure reading (top number)."
        },
        diastolic: {
            type: Type.NUMBER,
            description: "The diastolic blood pressure reading (bottom number)."
        },
        pulse: {
            type: Type.NUMBER,
            description: "The pulse or heart rate reading."
        }
    },
    required: ["systolic", "diastolic", "pulse"]
};


export async function extractReadingsFromImage(base64Image: string): Promise<RawReading> {
    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
            },
        };

        const textPart = {
            text: "Analyze the attached image of a blood pressure monitor. Identify and extract the Systolic (SYS), Diastolic (DIA), and Pulse (PUL) values. Ensure the numbers are accurate. Respond only with the JSON object that matches the provided schema."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const jsonText = response.text.trim();
        
        let data: Partial<RawReading>;
        try {
            data = JSON.parse(jsonText);
        } catch (parseError) {
            console.error("Error parsing JSON from API:", parseError);
            console.error("Received text:", jsonText);
            throw new Error("The AI model returned an unexpected response. Please try again.");
        }


        if (typeof data.systolic !== 'number' || typeof data.diastolic !== 'number' || typeof data.pulse !== 'number') {
            console.error("Invalid data structure received from API:", data);
            throw new Error("Could not identify all the readings (Systolic, Diastolic, Pulse). Please ensure the image is clear and well-lit.");
        }
        
        return data as RawReading;

    } catch (error) {
        console.error("Error analyzing image with Gemini API:", error);
        if (error instanceof Error && (error.message.includes("Could not identify") || error.message.includes("unexpected response"))) {
            // Re-throw our custom, user-friendly errors
            throw error;
        }
        // Generic catch-all for network issues or other API errors
        throw new Error("Could not connect to the analysis service. Please check your internet connection and try again.");
    }
}