import { usePracticeStore } from '../store/practiceStore'

interface Props {
  options: string[]
  answer: number
  questionId: number
  disabled: boolean
  onAnswer: (questionId: number, selectedIndex: number, correctAnswer: number) => void
}

export default function OptionSingle({ options, answer, questionId, disabled, onAnswer }: Props) {
  const answerState = usePracticeStore((s) => s.answerMap[questionId])
  const hasAnswered = answerState !== undefined
  const selectedIndex = hasAnswered ? (answerState.selected as number) : null

  return (
    <div className="space-y-3">
      {options.map((opt, i) => {
        let bg = 'bg-white border-gray-200 hover:border-blue-300 cursor-pointer'
        if (hasAnswered) {
          if (i === answer) {
            bg = 'bg-green-50 border-green-400'
          } else if (i === selectedIndex && i !== answer) {
            bg = 'bg-red-50 border-red-400'
          } else {
            bg = 'bg-white border-gray-100 opacity-60'
          }
        }

        return (
          <div
            key={i}
            className={`border-2 rounded-xl px-5 py-4 transition-colors ${bg} ${disabled || hasAnswered ? 'pointer-events-none' : ''}`}
            onClick={() => {
              if (hasAnswered || disabled) return
              onAnswer(questionId, i, answer)
            }}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-gray-700">{opt}</span>
              {hasAnswered && i === answer && (
                <span className="ml-auto text-green-600 text-sm font-medium">正确</span>
              )}
              {hasAnswered && i === selectedIndex && i !== answer && (
                <span className="ml-auto text-red-500 text-sm font-medium">你的选择</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
