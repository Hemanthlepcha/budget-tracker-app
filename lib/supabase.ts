import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Transaction = {
  id: string
  user_id: string
  amount: number
  category: string
  type: 'income' | 'expense'
  date: string
  notes?: string
  created_at: string
}

export type Category = {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense'
  color: string
  order: number
  created_at: string
}

export type SavingsGoal = {
  id: string
  user_id: string
  monthly_goal: number
  created_at: string
  updated_at: string
}

export type UserProfile = {
  id: string
  user_id: string
  username: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}