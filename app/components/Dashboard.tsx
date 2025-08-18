'use client'

import React, { useState, useEffect } from 'react'
import { supabase, Transaction, Category, SavingsGoal } from '../../lib/supabase'
import { useSupabase } from './SupabaseProvider'
import { TransactionForm } from './TransactionForm'
import { TransactionTable } from './TransactionTable'
import { CategoryManager } from './CategoryManager'
import { Charts } from './Charts'
import { SummaryCards } from './SummaryCards'
import { SavingsGoalCard } from './SavingsGoalCard'
import { UserProfile } from './UserProfile'
import { Plus, BarChart3 } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export function Dashboard() {
  const { user } = useSupabase()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, selectedMonth])

  const loadData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Load transactions for selected month
      const startDate = startOfMonth(selectedMonth)
      const endDate = endOfMonth(selectedMonth)

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false })

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('order')

      // Load savings goal
      const { data: savingsData } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('Loaded categories:', categoriesData)
      setTransactions(transactionsData || [])
      setCategories(categoriesData || [])
      setSavingsGoal(savingsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Header */}
      <header className="bg-white dark:bg-dark-800 shadow-sm border-b border-gray-200 dark:border-dark-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <BarChart3 className="h-5 w-5 sm:h-8 sm:w-8 text-primary-500" />
              <h1 className="text-sm sm:text-xl font-semibold">Budget Tracker</h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile-friendly month selector */}
              <select
                value={format(selectedMonth, 'yyyy-MM')}
                onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
                className="mobile-select text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date()
                  date.setMonth(date.getMonth() - i)
                  return (
                    <option key={i} value={format(date, 'yyyy-MM')}>
                      {format(date, 'MMM yyyy')}
                    </option>
                  )
                })}
              </select>

              <button
                onClick={() => setShowTransactionForm(true)}
                className="btn-primary flex items-center space-x-1 sm:space-x-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Transaction</span>
                <span className="sm:hidden">Add</span>
              </button>

              <UserProfile
                onSignOut={handleSignOut}
                onShowCategoryManager={() => setShowCategoryManager(true)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile/Tablet Layout: Summary Cards First */}
        <div className="block lg:hidden space-y-6">
          {/* 1. Summary Cards - Always First on Mobile/Tablet */}
          <SummaryCards transactions={transactions} />
          
          {/* 2. Savings Goal - Second on Mobile/Tablet */}
          <SavingsGoalCard
            savingsGoal={savingsGoal}
            transactions={transactions}
            onUpdate={loadData}
          />
          
          {/* 3. Charts - Third on Mobile/Tablet */}
          <Charts transactions={transactions} categories={categories} />
        </div>

        {/* Desktop Layout: Side-by-side */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-8">
          {/* Left Column - Summary and Charts */}
          <div className="lg:col-span-2 space-y-8">
            <SummaryCards transactions={transactions} />
            <Charts transactions={transactions} categories={categories} />
          </div>

          {/* Right Column - Savings Goal */}
          <div>
            <SavingsGoalCard
              savingsGoal={savingsGoal}
              transactions={transactions}
              onUpdate={loadData}
            />
          </div>
        </div>

        {/* Transactions Table - Always Last */}
        <div className="mt-6 lg:mt-8">
          <TransactionTable
            transactions={transactions}
            categories={categories}
            onUpdate={loadData}
          />
        </div>
      </main>

      {/* Modals */}
      {showTransactionForm && (
        <TransactionForm
          categories={categories}
          onClose={() => setShowTransactionForm(false)}
          onSuccess={loadData}
        />
      )}

      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onUpdate={loadData}
        />
      )}
    </div>
  )
}