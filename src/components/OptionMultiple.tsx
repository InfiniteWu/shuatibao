import { useState, useEffect } from 'react'
import { usePracticeStore } from '../store/practiceStore'

interface Props {
  options: string[]
  answer: number[]
  questionId: number
  disabled: boolean
  onAnswer: (questionId: number, selectedIndices: number[], correctAnswer: number[]) => void
}

export default function OptionMultiple({ options, answer, questionId, disabled, onAnswer }: Props) {
  const [selected, setSelected] = useState<number[]>([])
  const answerState = usePracticeStore((s) => s.answerMap[questionId])
  const hasConfirmed = answerState !== undefined

  // Reset selection when question changes
  useEffect(() => {
    setSelected([])
  }, [questionId])

  const toggle = (i: number) => {
    if (hasConfirmed || disabled) return
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b)
    )
  }

  const handleConfirm = () => {
    if (selected.length === 0 || hasConfirmed) return
    onAnswer(questionId, selected, answer)
  }

  return (
    <div className="space-y-3">
      {!hasConfirmed && !disabled && (
        <p className="text-xs text-purple-500 font-medium">可多选，选择后点击「确认答案」提交</p>
      )}
      {options.map((opt, i) => {
        let bg = 'bg-white border-gray-200 hover:border-purple-300 cursor-pointer'
        if (hasConfirmed) {
          if (answer.includes(i)) {
            bg = 'bg-green-50 border-green-400'
          } else if (selected.includes(i) && !answer.includes(i)) {
            bg = 'bg-red-50 border-red-400'
          } else {
            bg = 'bg-white border-gray-100 opacity-60'
          }
        } else if (selected.includes(i)) {
          bg = 'bg-blue-50 border-purple-400'
        }

        return (
          <div
            key={i}
            className={`border-2 rounded-xl px-5 py-4 transition-colors ${bg} ${disabled || hasConfirmed ? 'pointer-events-none' : ''}`}
            onClick={() => toggle(i)}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  selected.includes(i) && !hasConfirmed
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-50 text-gray-400'
                }`}
              >
                {selected.includes(i) && !hasConfirmed ? '✓' : String.fromCharCode(65 + i)}
              </span>
              <span className="text-gray-700">{opt}</span>
              {hasConfirmed && answer.includes(i) && (
                <span className="ml-auto text-green-600 text-sm font-medium">正确</span>
              )}
              {hasConfirmed && selected.includes(i) && !answer.includes(i) && (
                <span className="ml-auto text-red-500 text-sm font-medium">你的选择</span>
              )}
            </div>
          </div>
        )
      })}

      {!hasConfirmed && !disabled && (
        <button
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={selected.length === 0}
          onClick={handleConfirm}
        >
          确认答案
        </button>
      )}
    </div>
  )
}
