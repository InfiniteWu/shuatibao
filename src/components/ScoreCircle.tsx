interface Props {
  percentage: number
  size?: number
}

export default function ScoreCircle({ percentage, size = 120 }: Props) {
  const pct = Math.round(percentage * 100)
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  const color =
    pct >= 80 ? 'text-green-500' :
    pct >= 60 ? 'text-orange-500' :
    'text-red-500'

  const strokeColor =
    pct >= 80 ? '#22c55e' :
    pct >= 60 ? '#f97316' :
    '#ef4444'

  return (
    <div className="flex flex-col items-center gap-2" style={{ width: size }}>
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={`text-2xl font-bold ${color}`}>{pct}%</span>
    </div>
  )
}
