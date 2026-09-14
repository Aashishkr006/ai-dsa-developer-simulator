const { GoogleGenAI } = require("@google/genai");

async function generateWithGemini(prompt, problemSchema = null) {
    console.log("Trying Gemini...");

    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });

    const request = {
        model: "gemini-3.8-flash",
        input: prompt
    };

    if (problemSchema) {
        request.response_format = {
            type: "text",
            mime_type: "application/json",
            schema: problemSchema
        };
    }

    const response = await ai.interactions.create(request);

    const text = response.output_text;

    if (problemSchema) {
        return JSON.parse(text);
    }

    return text;
}

module.exports = {
    generateWithGemini
};