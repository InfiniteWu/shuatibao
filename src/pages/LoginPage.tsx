import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/userStore'

export default function LoginPage() {
  const [selected, setSelected] = useState<number | null>(null)
  const login = useUserStore((s) => s.login)
  const navigate = useNavigate()

  const handleEnter = () => {
    if (selected !== null) {
      login(selected)
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md mx-4 sm:mx-auto sm:w-96">
        <h1 className="text-2xl font-bold text-center mb-6">刷题宝</h1>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择用户
        </label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selected ?? ''}
          onChange={(e) => setSelected(Number(e.target.value))}
        >
          <option value="" disabled>请选择用户编号</option>
          {Array.from({ length: 100 }, (_, i) => (
            <option key={i} value={i}>用户 {i}</option>
          ))}
        </select>
        <button
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={selected === null}
          onClick={handleEnter}
        >
          进入
        </button>
      </div>
    </div>
  )
}
