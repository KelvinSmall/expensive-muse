import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-bg" />
  if (!session) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
