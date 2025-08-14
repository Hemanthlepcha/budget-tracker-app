'use client'

import { AuthForm } from './components/AuthForm'
import { Dashboard } from './components/Dashboard'
import { useSupabase } from './components/SupabaseProvider'

export default function Home() {
  return (
    <main className="min-h-screen">
      <AuthWrapper />
    </main>
  )
}

function AuthWrapper() {
  const { user, loading } = useSupabase()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return user ? <Dashboard /> : <AuthForm />
}