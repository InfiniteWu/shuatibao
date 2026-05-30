interface Props {
  reviewMode: boolean
  onToggle: (on: boolean) => void
}

export default function SettingsPanel({ reviewMode, onToggle }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">设置</h3>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={reviewMode}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-700">背题模式</span>
      </label>
      <p className="text-xs text-gray-400 mt-1 ml-7">开启后直接显示答案，选项不可点击</p>
    </div>
  )
}
