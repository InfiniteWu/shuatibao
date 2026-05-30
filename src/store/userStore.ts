import { create } from 'zustand'

interface UserState {
  userId: number | null
  displayName: string
  login: (id: number) => void
  logout: () => void
}

function getStoredUserId(): number | null {
  const raw = localStorage.getItem('userId')
  if (raw === null) return null
  const n = Number(raw)
  return Number.isNaN(n) ? null : n
}

export const useUserStore = create<UserState>((set) => ({
  userId: getStoredUserId(),
  displayName: localStorage.getItem('displayName') || '',
  login: (id: number) => {
    const name = `用户 ${id}`
    localStorage.setItem('userId', String(id))
    localStorage.setItem('displayName', name)
    set({ userId: id, displayName: name })
  },
  logout: () => {
    localStorage.removeItem('userId')
    localStorage.removeItem('displayName')
    set({ userId: null, displayName: '' })
  },
}))
