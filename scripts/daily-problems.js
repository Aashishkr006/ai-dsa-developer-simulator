
require("dotenv").config();

const { Client } = require("@notionhq/client");

const { Octokit } = require("@octokit/rest");


// ========================================
// CLIENTS
// ========================================

const notion = new Client({
    auth: process.env.NOTION_TOKEN
});

const {
    generateProblemWithFallback
} = require("./ai-manager");

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});


// ========================================
// GET ALL QUESTIONS FROM NOTION
// ========================================

async function getAllQuestions() {

    let allQuestions = [];
    let cursor = undefined;

    do {

        const response = await notion.dataSources.query({
            data_source_id: process.env.NOTION_DATABASE_ID,
            start_cursor: cursor
        });

        allQuestions.push(...response.results);

        cursor = response.has_more
            ? response.next_cursor
            : undefined;

    } while (cursor);

    return allQuestions;
}


// ========================================
// CONVERT NOTION ROW
// ========================================

function getQuestionData(row) {

    return {

        id: row.id,

        problem:
            row.properties["Problem"]?.title?.[0]?.plain_text || null,

        difficulty:
            row.properties["Difficulty"]?.select?.name || null,

        status:
            row.properties["Status"]?.select?.name || null

    };
}


// ========================================
// SELECT TWO DAILY QUESTIONS
// ========================================

function selectDailyQuestions(questions) {

    const available = questions.filter(
        question =>
            question.problem &&
            question.status === "Not Started"
    );


    const easy = available.filter(
        question => question.difficulty === "Easy"
    );

    const medium = available.filter(
        question => question.difficulty === "Medium"
    );

    const hard = available.filter(
        question => question.difficulty === "Hard"
    );


    // Rule 1: Easy + Medium

    if (easy.length >= 1 && medium.length >= 1) {

        return [
            easy[0],
            medium[0]
        ];
    }


    // Rule 2: Medium + Medium

    if (medium.length >= 2) {

        return [
            medium[0],
            medium[1]
        ];
    }


    // Rule 3: Hard + Easy

    if (hard.length >= 1 && easy.length >= 1) {

        return [
            hard[0],
            easy[0]
        ];
    }


    return null;
}


// ========================================
// GEMINI OUTPUT SCHEMA
// ========================================

const problemSchema = {

    type: "object",

    properties: {

        problemName: {
            type: "string"
        },

        difficulty: {
            type: "string",
            enum: [
                "Easy",
                "Medium",
                "Hard"
            ]
        },

        description: {
            type: "string"
        },

        constraints: {

            type: "array",

            items: {
                type: "string"
            }
        },

        examples: {

            type: "array",

            items: {

                type: "object",

                properties: {

                    input: {
                        type: "string"
                    },

                    output: {
                        type: "string"
                    },

                    explanation: {
                        type: "string"
                    }

                },

                additionalProperties: false,

                required: [
                    "input",
                    "output",
                    "explanation"
                ]
            }
        },

        expectedTimeComplexity: {
            type: "string"
        },

        expectedSpaceComplexity: {
            type: "string"
        },

        edgeCases: {

            type: "array",

            items: {
                type: "string"
            }
        },

        additionalInstructions: {

            type: "array",

            items: {
                type: "string"
            }
        }

    },

    required: [

        "problemName",

        "difficulty",

        "description",

        "constraints",

        "examples",

        "expectedTimeComplexity",

        "expectedSpaceComplexity",

        "edgeCases",

        "additionalInstructions"

    ],
    additionalProperties: false
};


// ========================================
// GENERATE PROBLEM WITH GEMINI
// ========================================

async function generateProblem(question) {

    const prompt = `
Create an original programming problem based on the following information.

Problem name: ${question.problem}
Difficulty: ${question.difficulty}

IMPORTANT RULES:

1. problemName MUST be exactly "${question.problem}".

2. difficulty MUST be exactly "${question.difficulty}".

3. Do NOT rename the problem.

4. Do NOT change the difficulty.

5. Create original wording.

6. You may create a realistic scenario around the
underlying DSA concept.

7. Do NOT copy wording from LeetCode,
GeeksforGeeks, HackerRank, or other platforms.

8. Do NOT provide solution code.

9. Include:
- clear problem description
- constraints
- 2 or 3 examples
- expected time complexity
- expected space complexity
- edge cases
- additional instructions

10. Keep the problem appropriate for the given difficulty.

Return ONLY the JSON object matching the provided schema.
` ;

    return await generateProblemWithFallback(
        prompt,
        problemSchema
    );
}


// ========================================
// CREATE GITHUB ISSUE BODY
// ========================================

function createIssueBody(problem) {

    let body = `# Problem

${problem.description}

## Constraints

`;


    for (const constraint of problem.constraints) {

        body += `- ${constraint}\n`;

    }


    body += `

## Examples

`;


    problem.examples.forEach((example, index) => {

        body += `### Example ${index + 1}

**Input**

\`${example.input}\`

**Output**

\`${example.output}\`

**Explanation**

${example.explanation}

`;

    });


    body += `## Expected Complexity

- **Time:** ${problem.expectedTimeComplexity}
- **Space:** ${problem.expectedSpaceComplexity}

## Edge Cases

`;


    for (const edgeCase of problem.edgeCases) {

        body += `- ${edgeCase}\n`;

    }


    body += `

## Additional Instructions

`;


    for (const instruction of problem.additionalInstructions) {

        body += `- ${instruction}\n`;

    }


    body += `

---

**Difficulty:** ${problem.difficulty}

Solve this problem in Java.
`;


    return body;
}


// ========================================
// CREATE GITHUB ISSUE
// ========================================

async function createGitHubIssue(problem) {

    const response =
        await octokit.rest.issues.create({

            owner: process.env.GITHUB_OWNER,

            repo: process.env.GITHUB_REPO,

            title:
                `DSA Daily ΓÇö ${problem.problemName}`,

            body:
                createIssueBody(problem)

        });


    return response.data;
}


// ========================================
// UPDATE NOTION STATUS
// ========================================

async function updateNotionStatus(question) {

    await notion.pages.update({

        page_id: question.id,

        properties: {

            Status: {

                select: {
                    name: "Assigned"
                }

            }

        }

    });
}


// ========================================
// MAIN
// ========================================

async function main() {

    try {

        console.log("Getting today's questions...\n");


        // Get all Notion questions

        const rows =
            await getAllQuestions();


        console.log(
            `Total questions: ${rows.length}\n`
        );


        // Convert Notion rows

        const questions =
            rows.map(getQuestionData);


        // Select two questions

        const selected =
            selectDailyQuestions(questions);


        if (!selected) {

            console.log(
                "Could not find a valid pair of questions."
            );

            return;
        }


        console.log("Selected questions:");

        for (const question of selected) {

            console.log(
                `${question.problem} (${question.difficulty})`
            );

        }


        console.log(
            "\nGenerating problems with Gemini...\n"
        );


        // Process each question

        for (const question of selected) {

            console.log(
                `Generating: ${question.problem}`
            );


            // Generate problem

            const problem =
                await generateProblem(question);


            // Make sure Gemini didn't change
            // the original problem information.

            if (
                problem.problemName !== question.problem
            ) {

                throw new Error(
                    `Gemini changed problem name. Expected "${question.problem}" but received "${problem.problemName}".`
                );

            }


            if (
                problem.difficulty !== question.difficulty
            ) {

                throw new Error(
                    `Gemini changed difficulty. Expected "${question.difficulty}" but received "${problem.difficulty}".`
                );

            }


            console.log(
                `Creating GitHub Issue: ${problem.problemName}`
            );


            // Create GitHub Issue

            const issue =
                await createGitHubIssue(problem);


            console.log(
                `Issue created: #${issue.number}`
            );


            // Only update Notion AFTER
            // GitHub Issue creation succeeds.

            await updateNotionStatus(question);


            console.log(
                `${question.problem} ΓåÆ Assigned\n`
            );

        }


        console.log(
            "Daily DSA issues created successfully!"
        );


    } catch (error) {

        console.error(
            "\nSomething went wrong:"
        );

        console.error(error.message);

    }

}


main();


