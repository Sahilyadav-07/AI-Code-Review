import { useState } from "react";
import ScoreRing from "./ScoreRing.jsx";

const CATEGORY_COLORS = {
  security: "var(--high)",
  bug: "var(--medium)",
  performance: "var(--low)",
  quality: "var(--accent)",
};

function FileCard({ file }) {
  const [open, setOpen] = useState(file.issues.length > 0);

  return (
    <div className="file-card">
      <div className="file-card-header" onClick={() => setOpen(!open)}>
        <span className="file-path">{file.path}</span>
        <div className="file-header-right">
          {typeof file.qualityScore === "number" && (
            <span className="file-score">{file.qualityScore}/100</span>
          )}
          <span className={`chevron ${open ? "open" : ""}`}>▶</span>
        </div>
      </div>

      {open && (
        <>
          {file.summary && <p className="file-summary">{file.summary}</p>}
          {file.issues.length > 0 ? (
            <div className="issues-list">
              {file.issues.map((issue, i) => (
                <div className="issue-row" key={i}>
                  <span className={`severity-badge severity-${issue.severity}`}>
                    {issue.severity}
                  </span>
                  <div className="issue-body">
                    <div className="issue-meta">
                      <span
                        className="issue-category"
                        style={{ color: CATEGORY_COLORS[issue.category] || "var(--text-secondary)" }}
                      >
                        {issue.category}
                      </span>
                      {issue.line && <span>· line {issue.line}</span>}
                    </div>
                    <p className="issue-description">{issue.description}</p>
                    {issue.suggestion && (
                      <p className="issue-suggestion">{issue.suggestion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-issues">No issues found in this file.</p>
          )}
        </>
      )}
    </div>
  );
}

export default function ReportView({ report }) {
  const { owner, repo, branch, overallScore, filesAnalyzed, issueCounts, files } = report;

  return (
    <div className="report">
      <div className="report-summary">
        <ScoreRing score={overallScore} />
        <div>
          <p className="repo-name">
            {owner}/{repo}
          </p>
          <p className="repo-meta">
            {branch} · {filesAnalyzed} file{filesAnalyzed === 1 ? "" : "s"} analyzed
          </p>
          <div className="issue-tally">
            <span className="tally-item">
              <span className="dot" style={{ background: "var(--high)" }} />
              <span className="count">{issueCounts.security}</span>security
            </span>
            <span className="tally-item">
              <span className="dot" style={{ background: "var(--medium)" }} />
              <span className="count">{issueCounts.bug}</span>bugs
            </span>
            <span className="tally-item">
              <span className="dot" style={{ background: "var(--low)" }} />
              <span className="count">{issueCounts.performance}</span>performance
            </span>
            <span className="tally-item">
              <span className="dot" style={{ background: "var(--accent)" }} />
              <span className="count">{issueCounts.quality}</span>quality
            </span>
          </div>
        </div>
      </div>

      {files.map((file) => (
        <FileCard key={file.path} file={file} />
      ))}
    </div>
  );
}
