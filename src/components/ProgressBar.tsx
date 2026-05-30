interface Props {
  answered: number
  total: number
}

export default function ProgressBar({ answered, total }: Props) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm text-gray-500 whitespace-nowrap">
        已答 <strong>{answered}</strong> / 共 {total} 题
      </span>
    </div>
  )
}
