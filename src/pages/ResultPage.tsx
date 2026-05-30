import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet } from '../api/client'
import type { PracticeSessionDetail } from '../types'
import ScoreCircle from '../components/ScoreCircle'

const TYPE_LABELS: Record<string, string> = {
  single: '单选',
  multiple: '多选',
  truefalse: '判断',
}

export default function ResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<PracticeSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  useEffect(() => {
    apiGet<PracticeSessionDetail>(`/practice/sessions/${sessionId}`)
      .then(setSession)
      .catch(() => setError('练习记录不存在或已被删除'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>
  }

  if (error || !session) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || '数据加载失败'}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => navigate('/')}
        >
          返回首页
        </button>
      </div>
    )
  }

  const wrongAndUnanswered = session.answers.filter(
    (a) => !a.is_correct || a.is_correct === null
  )

  const handleReviewWrong = () => {
    const questions = session.answers
      .filter((a) => !a.is_correct || a.is_correct === null)
      .map((a) => ({
        id: a.question_id,
        bank_id: session.bank_id,
        type: a.question_type,
        stem: a.stem,
        options: a.options,
        answer: a.correct_answer,
        explanation: a.explanation,
        created_at: '',
      }))

    if (questions.length === 0) {
      alert('没有需要复习的题目')
      return
    }

    sessionStorage.setItem('practiceQuestions', JSON.stringify(questions))
    navigate(`/practice/${session.bank_id}/session?source=result`)
  }

  const answerLabel = (a: PracticeSessionDetail['answers'][number]) => {
    if (a.selected_answer === null || a.selected_answer === undefined) {
      return <span className="text-gray-400">未作答</span>
    }
    if (Array.isArray(a.selected_answer)) {
      return a.selected_answer.map((i: number) => String.fromCharCode(65 + i) + '. ' + a.options[i]).join('、') || '无'
    }
    return a.options[a.selected_answer as number] ?? '无'
  }

  const correctLabel = (a: PracticeSessionDetail['answers'][number]) => {
    if (Array.isArray(a.correct_answer)) {
      return a.correct_answer.map((i: number) => String.fromCharCode(65 + i) + '. ' + a.options[i]).join('、')
    }
    return a.options[a.correct_answer as number]
  }

  return (
    <div>
      <button
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
        onClick={() => navigate('/')}
      >
        &larr; 返回首页
      </button>

      {/* Score Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-8 text-center mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          {session.bank_name} — 练习结果
        </h2>
        <div className="flex justify-center mb-4">
          <ScoreCircle percentage={session.accuracy} size={140} />
        </div>
        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{session.correct_count}</p>
            <p className="text-sm text-gray-500">正确</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{session.wrong_count}</p>
            <p className="text-sm text-gray-500">错误</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-400">{session.unanswered_count}</p>
            <p className="text-sm text-gray-500">未答</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          交卷时间：{session.submitted_at}
        </p>

        {wrongAndUnanswered.length > 0 && (
          <button
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            onClick={handleReviewWrong}
          >
            复习错题（{wrongAndUnanswered.length} 题）
          </button>
        )}
      </div>

      {/* Per-question results */}
      <h3 className="font-semibold text-gray-700 mb-3">每题详情</h3>
      <div className="space-y-2">
        {session.answers.map((a, i) => {
          const isExpanded = expandedIndex === i
          const resultIcon = a.is_correct === 1 ? '✓' : a.is_correct === 0 ? '✗' : '—'
          const resultColor = a.is_correct === 1 ? 'text-green-600' : a.is_correct === 0 ? 'text-red-500' : 'text-gray-400'

          return (
            <div
              key={a.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50"
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
              >
                <span className={`text-lg font-bold w-6 ${resultColor}`}>{resultIcon}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  {TYPE_LABELS[a.question_type] || a.question_type}
                </span>
                <span className="flex-1 truncate text-sm text-gray-700">{a.stem}</span>
                <span className="text-gray-300 text-sm">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">你的答案：</span>
                    <span className={a.is_correct === 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                      {answerLabel(a)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">正确答案：</span>
                    <span className="text-green-600 font-medium">{correctLabel(a)}</span>
                  </div>
                  {a.explanation && (
                    <div>
                      <span className="text-gray-400">解析：</span>
                      <span className="text-gray-600">{a.explanation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
