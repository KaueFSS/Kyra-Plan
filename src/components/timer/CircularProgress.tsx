interface CircularProgressProps {
  progress: number; // 0..1
  /** Diameter at 100% UI scale, in px; rendered in rem so it scales with the text inside. */
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export function CircularProgress({ progress, size = 220, strokeWidth = 10, children }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);
  const cssSize = `${size / 16}rem`;

  return (
    <div className="relative shrink-0" style={{ width: cssSize, height: cssSize }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="stroke-surface-2" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="url(#ff-timer-gradient)"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.3s linear" }}
        />
        <defs>
          <linearGradient id="ff-timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-400)" />
            <stop offset="100%" stopColor="var(--color-accent-600)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
