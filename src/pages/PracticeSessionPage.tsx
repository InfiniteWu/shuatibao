import { useEffect, useCallback, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePracticeStore } from '../store/practiceStore'
import { apiPost } from '../api/client'
import type { Question, SubmitResponse } from '../types'
import OptionSingle from '../components/OptionSingle'
import OptionMultiple from '../components/OptionMultiple'
import OptionTrueFalse from '../components/OptionTrueFalse'
import AnswerCard from '../components/AnswerCard'
import SettingsPanel from '../components/SettingsPanel'
import ProgressBar from '../components/ProgressBar'
import ConfirmModal from '../components/ConfirmModal'

export default function PracticeSessionPage() {
  const { bankId } = useParams<{ bankId: string }>()
  const navigate = useNavigate()
  const store = usePracticeStore()
  const [ready, setReady] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const initRef = useRef(false)

  const bid = Number(bankId)

  // Initialize: check localStorage resume first, then sessionStorage
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    // Check for saved session first (resume flow)
    const saved = store.loadFromLocalStorage()
    if (saved && saved.bankId === bid && saved.questions.length > 0) {
      setShowResume(true)
      return
    }

    // Load fresh from sessionStorage
    try {
      const raw = sessionStorage.getItem('practiceQuestions')
      if (!raw) {
        navigate('/', { replace: true })
        return
      }
      const questions: Question[] = JSON.parse(raw)
      if (!Array.isArray(questions) || questions.length === 0) {
        navigate('/', { replace: true })
        return
      }
      store.initSession(bid, questions)
      setReady(true)
    } catch {
      navigate('/', { replace: true })
    }
  }, [navigate])

  const handleResume = () => {
    const saved = store.loadFromLocalStorage()
    if (!saved) {
      // Fallback: load from sessionStorage
      try {
        const raw = sessionStorage.getItem('practiceQuestions')
        if (!raw) { navigate('/', { replace: true }); return }
        const questions: Question[] = JSON.parse(raw)
        store.initSession(bid, questions)
        setReady(true)
      } catch { navigate('/', { replace: true }) }
      return
    }
    set({
      bankId: saved.bankId,
      questions: saved.questions,
      currentIndex: saved.currentIndex,
      answerMap: saved.answerMap,
      reviewMode: saved.reviewMode,
    } as Parameters<typeof set>[0])
    setShowResume(false)
    setReady(true)
  }

  const handleRestart = () => {
    store.clearLocalStorage()
    setShowResume(false)
    try {
      const raw = sessionStorage.getItem('practiceQuestions')
      if (!raw) { navigate('/', { replace: true }); return }
      const questions: Question[] = JSON.parse(raw)
      store.initSession(bid, questions)
      setReady(true)
    } catch { navigate('/', { replace: true }) }
  }

  // Helper to set store state (for resume)
  const set = usePracticeStore.setState

  const questions = store.questions
  const { currentIndex, answerMap, reviewMode } = store

  const recordAnswer = useCallback(
    async (questionId: number, isCorrect: boolean) => {
      apiPost('/records', { question_id: questionId, bank_id: bid, is_correct: isCorrect }).catch(() => {})
    },
    [bid]
  )

  const addToWrongBook = useCallback(
    async (questionId: number) => {
      apiPost('/wrongbook', { question_id: questionId, bank_id: bid }).catch(() => {})
    },
    [bid]
  )

  const markAnswer = useCallback(
    (questionId: number, selected: number | number[] | null, isCorrectResult: boolean) => {
      store.setAnswer(questionId, { selected, isCorrect: isCorrectResult })
      recordAnswer(questionId, isCorrectResult)
      if (!isCorrectResult) {
        addToWrongBook(questionId)
      }
    },
    [recordAnswer, addToWrongBook, store]
  )

  const handleSingle = useCallback(
    (questionId: number, selectedIndex: number, correctAnswer: number) => {
      const ok = selectedIndex === correctAnswer
      markAnswer(questionId, selectedIndex, ok)
      if (ok && currentIndex < questions.length - 1) {
        setTimeout(() => store.setCurrentIndex(currentIndex + 1), 600)
      }
    },
    [markAnswer, currentIndex, questions.length, store]
  )

  const handleMultiple = useCallback(
    (questionId: number, selectedIndices: number[], correctAnswer: number[]) => {
      const sorted = [...selectedIndices].sort((a, b) => a - b)
      const correctSorted = [...correctAnswer].sort((a, b) => a - b)
      const ok = sorted.length === correctSorted.length && sorted.every((v, i) => v === correctSorted[i])
      markAnswer(questionId, selectedIndices, ok)
      if (ok && currentIndex < questions.length - 1) {
        setTimeout(() => store.setCurrentIndex(currentIndex + 1), 600)
      }
    },
    [markAnswer, currentIndex, questions.length, store]
  )

  const handleTrueFalse = useCallback(
    (questionId: number, selectedIndex: number, correctAnswer: number) => {
      const ok = selectedIndex === correctAnswer
      markAnswer(questionId, selectedIndex, ok)
      if (ok && currentIndex < questions.length - 1) {
        setTimeout(() => store.setCurrentIndex(currentIndex + 1), 600)
      }
    },
    [markAnswer, currentIndex, questions.length, store]
  )

  const handleDontKnow = useCallback(
    (questionId: number) => {
      store.setAnswer(questionId, { selected: null, isCorrect: false })
      addToWrongBook(questionId)
      recordAnswer(questionId, false)
    },
    [addToWrongBook, recordAnswer, store]
  )

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')

    // Build answers payload
    const answers: Record<string, { selected: number | number[] | null; is_correct: boolean }> = {}
    for (const q of questions) {
      const state = answerMap[q.id]
      if (state) {
        answers[String(q.id)] = { selected: state.selected, is_correct: state.isCorrect === true }
      } else {
        answers[String(q.id)] = { selected: null, is_correct: false }
      }
    }

    try {
      const data = await apiPost<SubmitResponse>('/practice/submit', {
        bank_id: bid,
        mode: 'random',
        total_count: questions.length,
        answers,
      })
      store.clearLocalStorage()
      navigate(`/result/${data.session_id}`, { replace: true })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '交卷失败，请重试')
    } finally {
      setSubmitting(false)
      setShowSubmit(false)
    }
  }

  // Show resume overlay
  if (showResume) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-700 mb-2">检测到未完成的练习</p>
        <p className="text-sm text-gray-500 mb-6">是否继续上次的练习？</p>
        <div className="flex justify-center gap-4">
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={handleResume}
          >
            继续练习
          </button>
          <button
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            onClick={handleRestart}
          >
            重新开始
          </button>
        </div>
      </div>
    )
  }

  if (!ready || questions.length === 0) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>
  }

  const question = questions[currentIndex]
  const answerState = answerMap[question.id]
  const hasAnswered = answerState !== undefined
  const isCorrect = hasAnswered && answerState.isCorrect === true
  const isWrong = hasAnswered && answerState.isCorrect === false

  const answeredCount = Object.keys(answerMap).length
  const unansweredCount = questions.length - answeredCount

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => { store.reset(); navigate('/') }}
          >
            &larr; 返回首页
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            onClick={() => setShowSubmit(true)}
            disabled={submitting}
          >
            交卷
          </button>
        </div>

        <div className="mb-4">
          <ProgressBar answered={answeredCount} total={questions.length} />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            question.type === 'single' ? 'bg-blue-100 text-blue-700' :
            question.type === 'multiple' ? 'bg-purple-100 text-purple-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {question.type === 'single' ? '单选题' : question.type === 'multiple' ? '多选题' : '判断题'}
          </span>
          <span className="text-sm text-gray-400">{currentIndex + 1} / {questions.length}</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <p className="text-lg text-gray-800 leading-relaxed">{question.stem}</p>
        </div>

        {question.type === 'single' && (
          <OptionSingle
            options={question.options}
            answer={question.answer as number}
            questionId={question.id}
            disabled={reviewMode}
            onAnswer={handleSingle}
          />
        )}
        {question.type === 'multiple' && (
          <OptionMultiple
            options={question.options}
            answer={question.answer as number[]}
            questionId={question.id}
            disabled={reviewMode}
            onAnswer={handleMultiple}
          />
        )}
        {question.type === 'truefalse' && (
          <OptionTrueFalse
            answer={question.answer as number}
            questionId={question.id}
            disabled={reviewMode}
            onAnswer={handleTrueFalse}
          />
        )}

        {(isCorrect || isWrong) && (
          <div className={`mt-4 p-4 rounded-lg ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p className="font-medium">{isCorrect ? '回答正确！' : '回答错误'}</p>
            <p className="text-sm mt-1">
              正确答案：{Array.isArray(question.answer)
                ? question.answer.map((a: number) => String.fromCharCode(65 + a) + '. ' + question.options[a]).join('、')
                : question.options[question.answer as number]}
            </p>
            {question.explanation && (
              <p className="text-sm mt-1 opacity-80">解析：{question.explanation}</p>
            )}
          </div>
        )}

        {reviewMode && !hasAnswered && (
          <div className="mt-4 p-4 rounded-lg bg-blue-50 text-blue-700">
            <p className="text-sm">
              正确答案：{Array.isArray(question.answer)
                ? question.answer.map((a: number) => String.fromCharCode(65 + a) + '. ' + question.options[a]).join('、')
                : question.options[question.answer as number]}
            </p>
            {question.explanation && (
              <p className="text-sm mt-1 opacity-80">解析：{question.explanation}</p>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-30"
            disabled={currentIndex === 0}
            onClick={() => store.setCurrentIndex(currentIndex - 1)}
          >
            上一题
          </button>
          <button
            className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-30"
            disabled={isCorrect || reviewMode}
            onClick={() => handleDontKnow(question.id)}
          >
            我不会
          </button>
          <button
            className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-30"
            disabled={currentIndex === questions.length - 1}
            onClick={() => store.setCurrentIndex(currentIndex + 1)}
          >
            下一题
          </button>
        </div>
      </div>

      <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
        <AnswerCard
          questionIds={questions.map((q) => q.id)}
          currentIndex={currentIndex}
          answerMap={answerMap}
          onJump={(i) => store.setCurrentIndex(i)}
        />
        <SettingsPanel
          reviewMode={reviewMode}
          onToggle={(on) => store.setReviewMode(on)}
        />
      </div>

      {/* Submit confirm modal */}
      <ConfirmModal
        open={showSubmit}
        title="确认交卷"
        message={
          submitError
            ? submitError
            : unansweredCount > 0
              ? `还有 ${unansweredCount} 题未作答，确定要交卷吗？`
              : '确定要交卷吗？'
        }
        confirmLabel={submitError ? undefined : submitting ? '提交中...' : '确定交卷'}
        onConfirm={submitError ? () => { setShowSubmit(false); setSubmitError('') } : handleSubmit}
        onCancel={() => { setShowSubmit(false); setSubmitError('') }}
      />
    </div>
  )
}
