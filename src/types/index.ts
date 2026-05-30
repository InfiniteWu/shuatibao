export interface Bank {
  id: number
  name: string
  description: string
  question_count: number
  single_count: number
  multiple_count: number
  truefalse_count: number
  created_at: string
}

export type QuestionType = 'single' | 'multiple' | 'truefalse'

export interface Question {
  id: number
  bank_id: number
  type: QuestionType
  stem: string
  options: string[]
  answer: number | number[]
  explanation: string
  created_at: string
}

export interface WrongBookEntry {
  id: number
  user_id: number
  question_id: number
  bank_id: number
  status: 'active' | 'removed'
  added_at: string
  removed_at: string | null
  stem?: string
  type?: string
  error_count?: number
}

export interface StudyRecord {
  id: number
  user_id: number
  question_id: number
  bank_id: number
  is_correct: number
  answered_at: string
}

export interface PracticeConfig {
  bank_id: number
  mode: 'sequential' | 'random'
  single_count: number
  multiple_count: number
  truefalse_count: number
  shuffle_options: boolean
}

export interface DashboardData {
  today_practice_count: number
  today_accuracy: number
  today_new_wrong: number
  today_wrong_per_bank: { bank_id: number; bank_name: string; count: number }[]
}

export interface PracticeSession {
  id: number
  bank_id: number
  bank_name: string
  mode: string
  total_count: number
  correct_count: number
  wrong_count: number
  unanswered_count: number
  accuracy: number
  submitted_at: string
}

export interface PracticeSessionAnswer {
  id: number
  session_id: number
  question_id: number
  selected_answer: number | number[] | null
  correct_answer: number | number[]
  is_correct: number | null
  question_type: string
  stem: string
  options: string[]
  explanation: string
}

export interface PracticeSessionDetail extends PracticeSession {
  started_at: string
  answers: PracticeSessionAnswer[]
}

export interface SubmitResponse {
  session_id: number
  total_count: number
  correct_count: number
  wrong_count: number
  unanswered_count: number
  accuracy: number
  submitted_at: string
}
