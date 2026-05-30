import { usePracticeStore } from '../store/practiceStore'

interface Props {
  answer: number
  questionId: number
  disabled: boolean
  onAnswer: (questionId: number, selectedIndex: number, correctAnswer: number) => void
}

export default function OptionTrueFalse({ answer, questionId, disabled, onAnswer }: Props) {
  const answerState = usePracticeStore((s) => s.answerMap[questionId])
  const hasAnswered = answerState !== undefined
  const selectedIndex = hasAnswered ? (answerState.selected as number) : null

  const labels = ['对', '错']

  return (
    <div className="flex gap-4 sm:gap-6 justify-center">
      {labels.map((label, i) => {
        let bg = 'bg-white border-gray-200 hover:border-blue-300'
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
          <button
            key={i}
            className={`border-2 rounded-xl px-6 sm:px-10 py-4 sm:py-6 text-xl sm:text-2xl font-bold transition-colors ${bg} ${disabled || hasAnswered ? 'pointer-events-none' : ''}`}
            onClick={() => {
              if (hasAnswered || disabled) return
              onAnswer(questionId, i, answer)
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
