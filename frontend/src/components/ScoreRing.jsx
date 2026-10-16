export default function ScoreRing({ score, size = 96 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = typeof score === "number" ? score : 0;
  const offset = circumference - (safeScore / 100) * circumference;

  const color =
    safeScore >= 80 ? "#4dd8c0" : safeScore >= 60 ? "#e3b341" : "#f4694b";

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2a313c"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="score-value">{typeof score === "number" ? score : "–"}</div>
    </div>
  );
}
