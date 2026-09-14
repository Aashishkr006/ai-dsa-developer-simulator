require("dotenv").config();

const { Octokit } = require("@octokit/rest");
const { generateReviewWithFallback } = require("./ai-manager");

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
const pullNumber = Number(process.env.PR_NUMBER);

console.log(`Reviewing PR #${pullNumber}`);
console.log(`Repository: ${owner}/${repo}`);

async function getPullRequest() {
    const response = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
    });

    return response.data;
}

async function getPullRequestDiff() {
    const response = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
        mediaType: {
            format: "diff"
        }
    });

    return response.data;
}

async function getIssue(issueNumber) {
    const response = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber
    });

    return response.data;
}

async function postReviewComment(review) {
    await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: `## 🤖 AI Code Review\n\n${review}`
    });

    console.log("✓ AI review posted to GitHub PR");
}

async function main() {

    const pullRequest = await getPullRequest();

    console.log("PR title:", pullRequest.title);
    console.log("PR branch:", pullRequest.head.ref);
    console.log("Base branch:", pullRequest.base.ref);

    const issueMatches = pullRequest.body?.match(
        /(?:Closes|Fixes|Resolves)\s+#(\d+)/gi
    );

    if (!issueMatches) {
        throw new Error("No linked Issue found in PR description.");
    }

    const issueNumber = Number(
        issueMatches[0].match(/\d+/)[0]
    );

    const issue = await getIssue(issueNumber);
    const diff = await getPullRequestDiff();

    const reviewInstructions = `
You are a senior software engineer reviewing a Pull Request
for the AI DSA Developer Simulator.

The GitHub Issue is the primary specification.

Review the implementation against the Issue requirements.

Review priorities:

1. Correctness
2. Requirement compliance
3. Edge cases
4. Time complexity
5. Space complexity
6. Test coverage
7. Code quality
8. Readability and maintainability

Only report meaningful issues.

Classify findings as:

- BLOCKER
- MAJOR
- MINOR

For every finding explain:
- Severity
- Problem
- Why it matters
- Suggested fix

Do not request changes based only on personal style preferences.

Return the review using exactly this structure:

### Summary

### Findings

### Complexity

Actual time complexity:
Actual space complexity:
Required time complexity:
Required space complexity:

### Tests

### Verdict

The verdict must be either:
APPROVE
or
CHANGES_REQUESTED

Important project rule:

This project does NOT require JUnit tests for DSA tasks unless
the Pull Request explicitly adds or changes a test requirement.
Do not request tests merely because the original Issue contains
the old generic phrase "add appropriate JUnit tests".

Repository cleanup rule:

The repository previously contained placeholder JUnit test files
from earlier DSA tasks. Their deletion is intentional as part of
removing mandatory JUnit tests from the project.

Do not report deletion of old placeholder test files as a finding
unless the deletion breaks an actual requirement of the linked Issue.

Focus on the actual DSA implementation and the requirements of
the problem itself.
`;

    const prompt = `
${reviewInstructions}

====================
LINKED GITHUB ISSUE
====================

Issue #${issue.number}

Title:
${issue.title}

${issue.body}

====================
PULL REQUEST
====================

PR #${pullRequest.number}

Title:
${pullRequest.title}

Description:
${pullRequest.body}

====================
PR DIFF
====================

${diff}

====================
TASK
====================

Review this Pull Request against the linked GitHub Issue.

Do not assume requirements that are not present in the Issue.

Provide the final review in the exact format requested above.
`;

    console.log("\n--- AI REVIEW ---");

    const review = await generateReviewWithFallback(prompt);

    console.log(review);

    await postReviewComment(review);
}

main().catch(error => {
    console.error("Review script failed:", error);
    process.exit(1);
});