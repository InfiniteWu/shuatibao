import { useRef, useEffect } from 'react'
import type { QuestionState } from '../store/practiceStore'

interface Props {
  questionIds: number[]
  answerMap: Record<number, QuestionState>
  currentIndex: number
  onJump: (index: number) => void
}

export default function AnswerCard({ questionIds, answerMap, currentIndex, onJump }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentIndex])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">答题卡</h3>
      <div ref={scrollRef} className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
        {questionIds.map((qId, i) => {
          const state = answerMap[qId]
          let bg = 'bg-gray-100 text-gray-500'
          if (state) {
            bg = state.isCorrect
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }
          if (i === currentIndex) {
            bg += ' ring-2 ring-inset ring-blue-400'
          }

          return (
            <button
              key={qId}
              ref={i === currentIndex ? activeRef : undefined}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${bg}`}
              onClick={() => onJump(i)}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
