const { GoogleGenAI } = require("@google/genai");

async function generateWithGemini(prompt) {
    console.log("Trying Gemini...");

    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });

    const response = await ai.interactions.create({
        model: "gemini-3.8-flash",
        input: prompt
    });

    return response.output_text;
}

module.exports = {
    generateWithGemini
};