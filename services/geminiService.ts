import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

// Initialize Gemini Client
// Note: In a real production app, API calls should go through a backend proxy to hide the key.
// For this demo, we use the environment variable directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSubtasks = async (taskTitle: string, taskDescription: string = ""): Promise<string[]> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      I have a task: "${taskTitle}".
      Description: "${taskDescription}".
      
      Please suggest 3-5 concrete, actionable subtasks to help complete this task.
      Return ONLY a JSON array of strings. Do not include markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return ["Failed to generate subtasks. Please check API key."];
  }
};

export const prioritizeTasks = async (tasks: Task[]): Promise<string> => {
  try {
    const taskList = tasks.map(t => `- ${t.title} (${t.status})`).join('\n');
    const prompt = `
      Here is my current task list:
      ${taskList}

      Analyze these tasks and provide a short, encouraging summary (max 100 words) on what I should focus on first and why. Be a helpful productivity assistant.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Could not analyze tasks.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "AI is currently unavailable.";
  }
};
