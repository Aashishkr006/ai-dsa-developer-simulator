const { OpenRouter } = require("@openrouter/sdk");

async function generateWithOpenRouter(prompt, problemSchema = null) {
    console.log("Trying OpenRouter...");

    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const openRouter = new OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY
    });

    const chatRequest = {
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
        ],
        stream: false
    };

    if (problemSchema) {
        chatRequest.responseFormat = {
            type: "json_schema",
            jsonSchema: {
                name: "dsa_problem",
                strict: true,
                schema: problemSchema
            }
        };
    }

    const response = await openRouter.chat.send({
        chatRequest
    });

    const text = response.choices[0].message.content;

    if (problemSchema) {
        return JSON.parse(text);
    }

    return text;
}

module.exports = {
    generateWithOpenRouter
};