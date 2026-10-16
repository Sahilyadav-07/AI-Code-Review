import { useState } from "react";
import RepoInput from "./components/RepoInput.jsx";
import ReportView from "./components/ReportView.jsx";

export default function App() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAnalyze(repoUrl) {
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="app-header">
        <span className="prompt">$</span>
        <h1>AI Code Review</h1>
      </div>
      <p className="app-subtitle">
        Paste a public GitHub repo. Get security, bug, performance, and quality findings per file.
      </p>

      <RepoInput onAnalyze={handleAnalyze} loading={loading} />

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="loading-state">
          <span className="dots">Fetching files and running analysis</span>
        </div>
      )}

      {!loading && !error && !report && (
        <div className="empty-state">
          <span className="prompt">_</span>
          Enter a repo URL above to run a review.
        </div>
      )}

      {report && <ReportView report={report} />}
    </div>
  );
}
