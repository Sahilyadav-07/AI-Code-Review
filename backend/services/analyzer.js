import axios from "axios";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are a senior software engineer performing a code review.
You will be given a single source file. Analyze it for:
1. Security issues (injection, hardcoded secrets, unsafe deserialization, missing input validation, etc.)
2. Bugs (logic errors, null/undefined handling, off-by-one, race conditions, unhandled exceptions)
3. Performance issues (inefficient loops/algorithms, unnecessary re-computation, N+1 patterns, memory leaks)
4. Code quality (naming, duplication, missing error handling, poor separation of concerns)

Respond with ONLY valid JSON, no markdown fences, no preamble, matching exactly this shape:
{
  "qualityScore": <integer 0-100, overall quality of this file>,
  "summary": "<one or two sentence summary of the file's main issues>",
  "issues": [
    {
      "category": "security" | "bug" | "performance" | "quality",
      "severity": "high" | "medium" | "low",
      "line": <integer line number, best estimate, or null if not line-specific>,
      "description": "<what is wrong, in one or two sentences>",
      "suggestion": "<concrete fix, in one or two sentences>"
    }
  ]
}

If the file has no significant issues, return an empty issues array and a high qualityScore.
Be specific and reference actual code from the file. Do not invent issues that aren't present.`;

function buildUserPrompt(path, content) {
  return `File path: ${path}\n\n\`\`\`\n${content}\n\`\`\``;
}

function safeParseJSON(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Model returned an empty or invalid response");
  }

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse model output as JSON: ${err.message}`);
  }
}

/**
 * Calls OpenRouter's OpenAI-compatible /chat/completions endpoint.
 * OpenRouter routes the request to whatever model slug you configure
 * (Claude, GPT, Llama, Qwen, etc.) behind one API key.
 */
async function callOpenRouter(messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

  const { data } = await axios.post(
    OPENROUTER_URL,
    {
      model,
      messages,
      max_tokens: 1200,
      temperature: 0.2,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Optional but recommended by OpenRouter for attribution/rankings.
        "HTTP-Referer": "http://localhost:4000",
        "X-Title": "AI Code Review Platform",
      },
    }
  );

  const choice = data.choices?.[0];
  if (!choice) throw new Error("No response choices returned from OpenRouter");
  return choice.message.content;
}

/**
 * Sends one file to the model and returns its structured review.
 * Callers should handle failures per-file so one bad file doesn't
 * sink the whole repo analysis.
 */
export async function analyzeFile({ path, content }) {
  // Truncate defensively — the caller already caps file size, but this is a
  // second line of defense against unexpectedly large files.
  const trimmedContent = content.slice(0, 16_000);

  const startedAt = Date.now();

const text = await callOpenRouter([
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: buildUserPrompt(path, trimmedContent) },
]);

console.log(
  `[AI Review] ${path}: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
);

  const parsed = safeParseJSON(text);
  return {
    path,
    qualityScore: parsed.qualityScore,
    summary: parsed.summary,
    issues: parsed.issues || [],
  };
}

/**
 * Analyzes all files with limited concurrency to stay well under
 * API rate limits. Returns per-file results plus an aggregated report.
 */
export async function analyzeRepo(files, concurrency = 4) {
  const results = [];
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      try {
        const result = await analyzeFile(file);
        results.push(result);
      } catch (err) {
        const message = err.response?.data?.error?.message || err.message;
        results.push({
          path: file.path,
          qualityScore: null,
          summary: `Analysis failed: ${message}`,
          issues: [],
          error: true,
        });
      }
    }
  }

const startedAt = Date.now();

await Promise.all(
  Array.from({ length: concurrency }, worker)
);

const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

console.log(
  `[AI Review] Analyzed ${results.length} files in ${elapsedSeconds} seconds`
);

  const scored = results.filter((r) => typeof r.qualityScore === "number");
  const overallScore = scored.length
    ? Math.round(scored.reduce((sum, r) => sum + r.qualityScore, 0) / scored.length)
    : null;

  const issueCounts = { security: 0, bug: 0, performance: 0, quality: 0 };
  for (const r of results) {
    for (const issue of r.issues) {
      if (issueCounts[issue.category] !== undefined) issueCounts[issue.category]++;
    }
  }

  return {
    overallScore,
    filesAnalyzed: results.length,
    issueCounts,
    files: results,
  };
}
