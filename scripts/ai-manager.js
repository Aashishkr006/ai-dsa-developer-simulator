const { generateWithGemini } = require("./gemini");
const { generateWithGroq } = require("./groq");
const { generateWithOpenRouter } = require("./openrouter");

async function generateReviewWithFallback(prompt) {

    const providers = [
        {
            name: "Gemini",
            generate: () => generateWithGemini(prompt)
        },
        {
            name: "Groq",
            generate: () => generateWithGroq(prompt)
        },
        {
            name: "OpenRouter",
            generate: () => generateWithOpenRouter(prompt)
        }
    ];

    for (const provider of providers) {
        try {
            const result = await provider.generate();

            console.log(`✓ ${provider.name} succeeded`);

            return result;
        } catch (error) {
            console.log(
                `✗ ${provider.name} failed: ${error.message}`
            );

            console.log("Trying next provider...\n");
        }
    }

    throw new Error(
        "All AI providers failed. Unable to generate code review."
    );
}

module.exports = {
    generateReviewWithFallback
};