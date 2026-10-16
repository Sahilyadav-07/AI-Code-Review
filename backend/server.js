import "dotenv/config";
import express from "express";
import cors from "cors";
import { fetchRepoFiles } from "./services/github.js";
import { analyzeRepo } from "./services/analyzer.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/analyze", async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl is required" });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Server misconfigured: OPENROUTER_API_KEY not set" });
  }

  try {
    const { owner, repo, branch, files } = await fetchRepoFiles(repoUrl);
    const report = await analyzeRepo(files);

    res.json({
      owner,
      repo,
      branch,
      analyzedAt: new Date().toISOString(),
      ...report,
    });
  } catch (err) {
    console.error(err);
    const status = err.response?.status === 404 ? 404 : 500;
    res.status(status).json({ error: err.message || "Analysis failed" });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`AI Code Review backend running on http://localhost:${PORT}`));
