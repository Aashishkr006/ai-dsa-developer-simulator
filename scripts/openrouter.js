const { OpenRouter } = require("@openrouter/sdk");

async function generateWithOpenRouter(prompt) {
    console.log("Trying OpenRouter...");

    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const openRouter = new OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY
    });

    const response = await openRouter.chat.send({
        chatRequest: {
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
            ],
            stream: false
        }
    });

    return response.choices[0].message.content;
}

module.exports = {
    generateWithOpenRouter
};
