import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/userStore'

export default function Layout() {
  const navigate = useNavigate()
  const userId = useUserStore((s) => s.userId)

  useEffect(() => {
    if (userId === null) {
      navigate('/login', { replace: true })
    }
  }, [userId, navigate])

  if (userId === null) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">刷题宝</h1>
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          当前用户：用户 {userId}
        </button>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
