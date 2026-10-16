import { useState } from "react";

export default function RepoInput({ onAnalyze, loading }) {
  const [url, setUrl] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    onAnalyze(url.trim());
  }

  return (
    <form className="repo-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://github.com/owner/repo"
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Scanning…" : "Review"}
      </button>
    </form>
  );
}
