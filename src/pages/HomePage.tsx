import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiDelete, apiPut } from '../api/client'
import type { Bank, DashboardData } from '../types'
import ConfirmModal from '../components/ConfirmModal'

export default function HomePage() {
  const [banks, setBanks] = useState<Bank[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Bank | null>(null)
  const [editingBank, setEditingBank] = useState<Bank | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const navigate = useNavigate()

  const loadBanks = async () => {
    const data = await apiGet<Bank[]>('/banks')
    setBanks(data)
  }

  const loadDashboard = async () => {
    try {
      const data = await apiGet<DashboardData>('/dashboard')
      setDashboard(data)
    } catch {
      // dashboard is optional, don't block on failure
    }
  }

  useEffect(() => {
    loadBanks()
    loadDashboard()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    await apiPost('/banks', { name: newName.trim(), description: newDesc.trim() })
    setNewName('')
    setNewDesc('')
    setShowCreate(false)
    loadBanks()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await apiDelete(`/banks/${deleteTarget.id}`)
    setDeleteTarget(null)
    loadBanks()
    loadDashboard()
  }

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank)
    setEditName(bank.name)
    setEditDesc(bank.description || '')
  }

  const handleSaveEdit = async () => {
    if (!editingBank || !editName.trim()) return
    await apiPut(`/banks/${editingBank.id}`, { name: editName.trim(), description: editDesc.trim() })
    setEditingBank(null)
    loadBanks()
  }

  const handleExport = async (bank: Bank) => {
    try {
      const data = await apiGet<{ bankName: string; description: string; questions: unknown[] }>(`/banks/${bank.id}/export`)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bank.name}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('导出失败，请重试')
    }
  }

  const todayWrongPerBank = dashboard?.today_wrong_per_bank || []
  const getTodayWrongCount = (bankId: number) => {
    const found = todayWrongPerBank.find((b) => b.bank_id === bankId)
    return found ? found.count : 0
  }

  return (
    <div>
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{dashboard?.today_practice_count ?? 0}</p>
          <p className="text-sm text-gray-500">今日练习</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {dashboard ? Math.round(dashboard.today_accuracy * 100) + '%' : '—'}
          </p>
          <p className="text-sm text-gray-500">今日正确率</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{dashboard?.today_new_wrong ?? 0}</p>
          <p className="text-sm text-gray-500">今日新增错题</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">题库列表</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => setShowCreate(true)}
          >
            新建题库
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            onClick={() => navigate('/import')}
          >
            导入题库
          </button>
        </div>
      </div>

      {/* Edit Bank Panel */}
      {editingBank && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold mb-4">编辑题库 — {editingBank.name}</h3>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
            placeholder="题库名称"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            placeholder="题库描述（选填）"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => setEditingBank(null)}
            >
              取消
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={handleSaveEdit}
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* Create Bank Panel */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold mb-4">新建题库</h3>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
            placeholder="题库名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            placeholder="题库描述（选填）"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}
            >
              取消
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={handleCreate}
            >
              创建
            </button>
          </div>
        </div>
      )}

      {banks.length === 0 ? (
        <p className="text-gray-500 text-center py-12">暂无题库，请先创建或导入题库。</p>
      ) : (
        <div className="grid gap-4">
          {banks.map((bank) => {
            const todayWrong = getTodayWrongCount(bank.id)
            return (
              <div
                key={bank.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/bank/${bank.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">{bank.name}</h3>
                      {todayWrong > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                          今日 {todayWrong} 道错题
                        </span>
                      )}
                    </div>
                    {bank.description && (
                      <p className="text-sm text-gray-500 mt-1">{bank.description}</p>
                    )}
                    <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      <span>共 {bank.question_count} 题</span>
                      <span>单选 {bank.single_count}</span>
                      <span>多选 {bank.multiple_count}</span>
                      <span>判断 {bank.truefalse_count}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      onClick={() => navigate(`/practice/${bank.id}`)}
                    >
                      练习
                    </button>
                    <button
                      className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
                      onClick={() => navigate(`/wrongbook/${bank.id}`)}
                    >
                      错题本
                    </button>
                    <button
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100"
                      onClick={() => handleEdit(bank)}
                    >
                      编辑
                    </button>
                    <button
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100"
                      onClick={() => handleExport(bank)}
                    >
                      导出
                    </button>
                    <button
                      className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
                      onClick={() => setDeleteTarget(bank)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="删除题库"
        message={`确定要删除「${deleteTarget?.name}」吗？该操作不可撤销，题库内所有题目和错题记录将被删除。`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
