import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../api/client'
import { usePracticeStore } from '../store/practiceStore'
import type { Bank } from '../types'

export default function PracticeConfigPage() {
  const { bankId } = useParams<{ bankId: string }>()
  const navigate = useNavigate()
  const clearSaved = usePracticeStore((s) => s.clearLocalStorage)
  const [bank, setBank] = useState<Bank | null>(null)
  const [mode, setMode] = useState<'random' | 'sequential'>('random')
  const [singleCount, setSingleCount] = useState(0)
  const [multipleCount, setMultipleCount] = useState(0)
  const [truefalseCount, setTruefalseCount] = useState(0)
  const [shuffleOptions, setShuffleOptions] = useState(false)

  useEffect(() => {
    apiGet<Bank[]>('/banks').then((banks) => {
      const found = banks.find((b) => b.id === Number(bankId))
      if (found) setBank(found)
    })
  }, [bankId])

  if (!bank) return <div className="text-center py-12 text-gray-500">加载中...</div>

  const total = mode === 'random' ? singleCount + multipleCount + truefalseCount : bank.question_count

  const handleStart = async () => {
    const body = {
      bank_id: bank.id,
      mode,
      single_count: mode === 'random' ? singleCount : bank.single_count,
      multiple_count: mode === 'random' ? multipleCount : bank.multiple_count,
      truefalse_count: mode === 'random' ? truefalseCount : bank.truefalse_count,
      shuffle_options: shuffleOptions,
    }

    try {
      const data = await apiPost<{ questions: unknown[]; total: number }>('/practice/pick', body)

      if (!data.questions || data.questions.length === 0) {
        alert(`题库没有题目，请先导入或添加题目。`)
        return
      }

      // Clear any previous saved session and save new questions
      clearSaved()
      sessionStorage.setItem('practiceQuestions', JSON.stringify(data.questions))
      sessionStorage.setItem('practiceConfig', JSON.stringify({ bankId: bank.id, bankName: bank.name }))
      navigate(`/practice/${bankId}/session`)
    } catch (err) {
      alert(`练习启动失败：${err instanceof Error ? err.message : '请检查服务器是否正常运行'}`)
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
      <h2 className="text-xl font-semibold mb-6">练习配置 — {bank.name}</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">练习模式</label>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'random'}
                onChange={() => setMode('random')}
              />
              <span>随机抽题</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'sequential'}
                onChange={() => setMode('sequential')}
              />
              <span>顺序练习</span>
            </label>
          </div>
        </div>

        {mode === 'random' ? (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 block">抽取数量</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-500">单选题（共 {bank.single_count} 题）</span>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                  min={0}
                  max={bank.single_count}
                  value={singleCount}
                  onChange={(e) => setSingleCount(Math.max(0, Math.min(bank.single_count, Number(e.target.value) || 0)))}
                />
              </div>
              <div>
                <span className="text-sm text-gray-500">多选题（共 {bank.multiple_count} 题）</span>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                  min={0}
                  max={bank.multiple_count}
                  value={multipleCount}
                  onChange={(e) => setMultipleCount(Math.max(0, Math.min(bank.multiple_count, Number(e.target.value) || 0)))}
                />
              </div>
              <div>
                <span className="text-sm text-gray-500">判断题（共 {bank.truefalse_count} 题）</span>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1"
                  min={0}
                  max={bank.truefalse_count}
                  value={truefalseCount}
                  onChange={(e) => setTruefalseCount(Math.max(0, Math.min(bank.truefalse_count, Number(e.target.value) || 0)))}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            将按顺序练习全部题目：单选 {bank.single_count} 题、多选 {bank.multiple_count} 题、判断 {bank.truefalse_count} 题，共 {bank.question_count} 题。
          </div>
        )}

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">选项乱序</span>
          </label>
          <p className="text-xs text-gray-400 mt-1 ml-7">开启后，每道题的选项顺序将随机排列</p>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            onClick={handleStart}
            disabled={mode === 'random' && total === 0}
          >
            {mode === 'random' && total === 0 ? '请至少选择一道题' : `开始练习（${total} 题）`}
          </button>
        </div>
      </div>
    </div>
  )
}
