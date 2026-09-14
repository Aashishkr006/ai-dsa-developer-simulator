const Groq = require("groq-sdk");

async function generateWithGroq(prompt, problemSchema = null) {
    console.log("Trying Groq...");

    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured");
    }

    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });

    const request = {
        model: "openai/gpt-oss-20b",
        messages: [
            {
                role: "system",
                content: problemSchema
                    ? "You are an expert programming problem designer."
                    : "You are a senior software engineer performing GitHub Pull Request code reviews."
            },
            {
                role: "user",
                content: prompt
            }
        ]
    };

    if (problemSchema) {
        request.response_format = {
            type: "json_schema",
            json_schema: {
                name: "dsa_problem",
                strict: true,
                schema: problemSchema
            }
        };
    }

    const response = await groq.chat.completions.create(request);

    const text = response.choices[0].message.content;

    if (problemSchema) {
        return JSON.parse(text);
    }

    return text;
}

module.exports = {
    generateWithGroq
};