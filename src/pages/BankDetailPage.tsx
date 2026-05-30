import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPut, apiDelete } from '../api/client'
import type { Question, QuestionType } from '../types'
import QuestionEditor from '../components/QuestionEditor'
import ConfirmModal from '../components/ConfirmModal'

const TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选',
  multiple: '多选',
  truefalse: '判断',
}

const TYPE_COLORS: Record<QuestionType, string> = {
  single: 'bg-blue-100 text-blue-700',
  multiple: 'bg-purple-100 text-purple-700',
  truefalse: 'bg-amber-100 text-amber-700',
}

export default function BankDetailPage() {
  const { id } = useParams<{ id: string }>()
  const bankId = Number(id)
  const navigate = useNavigate()

  const [questions, setQuestions] = useState<Question[]>([])
  const [filterType, setFilterType] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)
  const [bankName, setBankName] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadQuestions = useCallback(async (search: string) => {
    const params = new URLSearchParams({ bank_id: String(bankId) })
    if (filterType) params.set('type', filterType)
    if (search) params.set('search', search)
    const data = await apiGet<Question[]>(`/questions?${params}`)
    setQuestions(data)
  }, [bankId, filterType])

  useEffect(() => { loadQuestions(searchText) }, [bankId, filterType])

  const handleSearchChange = (value: string) => {
    setSearchText(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      loadQuestions(value)
    }, 300)
  }

  const handleExport = async () => {
    try {
      const data = await apiGet<{ bankName: string; description: string; questions: unknown[] }>(`/banks/${bankId}/export`)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bankName || '题库'}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('导出失败，请重试')
    }
  }

  useEffect(() => {
    apiGet(`/banks`).then((banks: unknown) => {
      const found = (banks as { id: number; name: string }[]).find((b) => b.id === bankId)
      if (found) setBankName(found.name)
    })
  }, [bankId])

  const handleSave = async (data: Parameters<typeof apiPost>[1]) => {
    if (editingQuestion) {
      await apiPut(`/questions/${editingQuestion.id}`, data)
    } else {
      await apiPost('/questions', data)
    }
    setShowEditor(false)
    setEditingQuestion(null)
    loadQuestions(searchText)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await apiDelete(`/questions/${deleteTarget.id}`)
    setDeleteTarget(null)
    loadQuestions(searchText)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            className="text-sm text-blue-600 hover:underline mb-1"
            onClick={() => navigate('/')}
          >
            &larr; 返回题库列表
          </button>
          <h2 className="text-xl font-semibold">{bankName || `题库 #${bankId}`}</h2>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
            onClick={handleExport}
          >
            导出题库
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => { setEditingQuestion(null); setShowEditor(true) }}
          >
            添加题目
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
        <input
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full sm:w-48"
          placeholder="搜索题干..."
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <label className="text-sm text-gray-600">筛选类型：</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">全部</option>
          <option value="single">单选题</option>
          <option value="multiple">多选题</option>
          <option value="truefalse">判断题</option>
        </select>
        <span className="text-sm text-gray-400">{questions.length} 道题目</span>
      </div>

      {showEditor && (
        <div className="mb-6">
          <QuestionEditor
            bankId={bankId}
            question={editingQuestion}
            onSave={handleSave}
            onCancel={() => { setShowEditor(false); setEditingQuestion(null) }}
          />
        </div>
      )}

      {questions.length === 0 ? (
        <p className="text-gray-500 text-center py-12">暂无题目，请先添加或导入题目。</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[q.type]}`}>
                      {TYPE_LABELS[q.type]}
                    </span>
                    <span className="text-gray-800 font-medium truncate">{q.stem}</span>
                  </div>
                  <div className="text-sm text-gray-500 ml-1">
                    答案：{Array.isArray(q.answer)
                      ? q.answer.map((a) => q.options[a]).join('、')
                      : q.options[q.answer]}
                  </div>
                  {q.explanation && (
                    <div className="text-sm text-gray-400 mt-1 ml-1">解析：{q.explanation}</div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                    onClick={() => { setEditingQuestion(q); setShowEditor(true) }}
                  >
                    编辑
                  </button>
                  <button
                    className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                    onClick={() => setDeleteTarget(q)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="删除题目"
        message="确定要删除这道题目吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
