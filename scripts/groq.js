const Groq = require("groq-sdk");

async function generateWithGroq(prompt) {
    console.log("Trying Groq...");

    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured");
    }

    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });

    const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
            {
                role: "system",
                content:
                    "You are a senior software engineer performing GitHub Pull Request code reviews."
            },
            {
                role: "user",
                content: prompt
            }
        ]
    });

    return response.choices[0].message.content;
}

module.exports = {
    generateWithGroq
};
