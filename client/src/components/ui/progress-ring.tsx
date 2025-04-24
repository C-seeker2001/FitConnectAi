interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
}

export function ProgressRing({ progress, size, strokeWidth }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <svg className="progress-ring" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke="hsl(var(--accent))"
        strokeWidth={strokeWidth}
        fill="transparent"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.35s' }}
      />
    </svg>
  );
}
