import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api/client'
import type { PracticeSession } from '../types'

const PAGE_SIZE = 20

const MODE_LABELS: Record<string, string> = {
  random: '随机抽题',
  sequential: '顺序练习',
  wrongbook: '错题练习',
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const loadSessions = async (p: number) => {
    setLoading(true)
    setError('')
    try {
      const data = await apiGet<{ sessions: PracticeSession[]; total: number }>(
        `/practice/sessions?page=${p}&per_page=${PAGE_SIZE}`
      )
      setSessions(data.sessions)
      setTotal(data.total)
    } catch {
      setError('加载练习历史失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSessions(page) }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (loading && sessions.length === 0) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => loadSessions(page)}
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
        onClick={() => navigate('/')}
      >
        &larr; 返回首页
      </button>

      <h2 className="text-xl font-semibold mb-6">练习历史</h2>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">暂无练习记录</p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => navigate('/')}
          >
            去练习
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sessions.map((s) => {
              const pct = Math.round(s.accuracy * 100)
              const colorClass = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-orange-500' : 'text-red-500'

              return (
                <div
                  key={s.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => navigate(`/result/${s.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-gray-800">{s.bank_name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {MODE_LABELS[s.mode] || s.mode}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{s.submitted_at}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${colorClass}`}>{pct}%</p>
                      <p className="text-xs text-gray-400">
                        {s.correct_count}/{s.total_count} 正确
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
