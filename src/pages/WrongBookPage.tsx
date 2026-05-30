import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPut } from '../api/client'
import type { Question } from '../types'

interface WrongBookItem {
  id: number
  user_id: number
  question_id: number
  bank_id: number
  status: 'active' | 'removed'
  added_at: string
  removed_at: string | null
  stem: string
  type: string
  error_count?: number
}

const TYPE_LABELS: Record<string, string> = {
  single: '单选',
  multiple: '多选',
  truefalse: '判断',
}

type TabKey = 'all' | 'today'

export default function WrongBookPage() {
  const { bankId } = useParams<{ bankId: string }>()
  const navigate = useNavigate()
  const [items, setItems] = useState<WrongBookItem[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabKey>('all')

  const loadItems = async () => {
    const endpoint = tab === 'today' ? `/wrongbook/today?bank_id=${bankId}` : `/wrongbook?bank_id=${bankId}`
    const data = await apiGet<WrongBookItem[]>(endpoint)
    setItems(data)
  }

  useEffect(() => { loadItems() }, [bankId, tab])

  const handleRemove = async (itemId: number) => {
    await apiPut(`/wrongbook/${itemId}/remove`)
    loadItems()
  }

  const handlePracticeWrong = async () => {
    if (items.length === 0) return
    setLoading(true)

    try {
      const questionIds = items.map((i) => i.question_id)
      const allQuestions = await apiGet<Question[]>(`/questions?bank_id=${bankId}`)
      const questions = allQuestions.filter((q) => questionIds.includes(q.id))

      sessionStorage.setItem('practiceQuestions', JSON.stringify(questions))
      sessionStorage.setItem('practiceConfig', JSON.stringify({ bankId: Number(bankId), bankName: '错题练习' }))
      navigate(`/practice/${bankId}/session?source=wrongbook`)
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
        onClick={() => navigate('/')}
      >
        &larr; 返回题库列表
      </button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">错题本</h2>
        {items.length > 0 && (
          <button
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            onClick={handlePracticeWrong}
            disabled={loading}
          >
            {loading ? '加载中...' : `练习错题（${items.length} 题）`}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('all')}
        >
          全部错题
        </button>
        <button
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'today' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setTab('today')}
        >
          今日错题
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          {tab === 'today' ? '今日无新增错题，继续加油！' : '暂无错题，继续加油！'}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    item.type === 'single' ? 'bg-blue-100 text-blue-700' :
                    item.type === 'multiple' ? 'bg-purple-100 text-purple-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                  <span className="text-gray-800 truncate">{item.stem}</span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-400">加入时间：{item.added_at}</p>
                  {item.error_count !== undefined && item.error_count > 0 && (
                    <span className="text-xs text-red-500 font-medium">
                      累计错误 {item.error_count} 次
                    </span>
                  )}
                </div>
              </div>
              <button
                className="px-3 py-1.5 text-sm text-green-600 border border-green-300 rounded-lg hover:bg-green-50 flex-shrink-0 ml-4"
                onClick={() => handleRemove(item.id)}
              >
                移出
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
