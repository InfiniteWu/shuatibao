import { create } from 'zustand'
import type { Question } from '../types'

const SAVED_SESSION_KEY = 'practiceSavedState'

export interface QuestionState {
  selected: number | number[] | null
  isCorrect: boolean | null
}

interface SavedSession {
  bankId: number
  questions: Question[]
  currentIndex: number
  answerMap: Record<number, QuestionState>
  reviewMode: boolean
  timestamp: number
}

interface PracticeState {
  bankId: number | null
  questions: Question[]
  currentIndex: number
  answerMap: Record<number, QuestionState>
  reviewMode: boolean

  initSession: (bankId: number, questions: Question[]) => void
  setCurrentIndex: (index: number) => void
  setAnswer: (questionId: number, state: QuestionState) => void
  setReviewMode: (on: boolean) => void
  reset: () => void

  saveToLocalStorage: () => void
  loadFromLocalStorage: () => SavedSession | null
  clearLocalStorage: () => void
  hasUnfinishedSession: (bankId: number) => boolean
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  bankId: null,
  questions: [],
  currentIndex: 0,
  answerMap: {},
  reviewMode: false,

  initSession: (bankId, questions) => {
    set({ bankId, questions, currentIndex: 0, answerMap: {}, reviewMode: false })
    get().saveToLocalStorage()
  },

  setCurrentIndex: (index) => set({ currentIndex: index }),

  setAnswer: (questionId, state) => {
    set((s) => ({
      answerMap: { ...s.answerMap, [questionId]: state },
    }))
    // Persist after state update (fire-and-forget)
    setTimeout(() => get().saveToLocalStorage(), 0)
  },

  setReviewMode: (on) => {
    set({ reviewMode: on })
    setTimeout(() => get().saveToLocalStorage(), 0)
  },

  reset: () => {
    get().clearLocalStorage()
    set({ bankId: null, questions: [], currentIndex: 0, answerMap: {}, reviewMode: false })
  },

  saveToLocalStorage: () => {
    const s = get()
    if (s.questions.length === 0) return
    const data: SavedSession = {
      bankId: s.bankId!,
      questions: s.questions,
      currentIndex: s.currentIndex,
      answerMap: s.answerMap,
      reviewMode: s.reviewMode,
      timestamp: Date.now(),
    }
    try {
      localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify(data))
    } catch {
      // localStorage full or unavailable
    }
  },

  loadFromLocalStorage: () => {
    try {
      const raw = localStorage.getItem(SAVED_SESSION_KEY)
      if (!raw) return null
      const data: SavedSession = JSON.parse(raw)
      // Expire after 24 hours
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(SAVED_SESSION_KEY)
        return null
      }
      return data
    } catch {
      return null
    }
  },

  clearLocalStorage: () => {
    try {
      localStorage.removeItem(SAVED_SESSION_KEY)
    } catch {
      // ignore
    }
  },

  hasUnfinishedSession: (bankId: number) => {
    const data = get().loadFromLocalStorage()
    return data !== null && data.bankId === bankId
  },
}))
