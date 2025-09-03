'use client'

import React, { useState, useEffect, useRef } from 'react'
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
import { format, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns'
import Image from 'next/image'

export function Dashboard() {
  const { user } = useSupabase()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal | null>(null)
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // Start of current month
    return date
  })
  const [toDate, setToDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [quickFilter, setQuickFilter] = useState<string | null>('thisMonth')
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user]) // Only reload when user changes, not when dates change

  const loadData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Load transactions for selected date range
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(fromDate, 'yyyy-MM-dd'))
        .lte('date', format(toDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false })
      console.log('Loaded transactions:', transactionsData)
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

  const applyQuickFilter = (filter: string) => {
    const today = new Date()
    let newFromDate = new Date()
    let newToDate = new Date()

    switch (filter) {
      case 'today':
        newFromDate = today
        newToDate = today
        break
      case 'yesterday':
        newFromDate = subDays(today, 1)
        newToDate = subDays(today, 1)
        break
      case 'thisWeek':
        newFromDate = subDays(today, today.getDay())
        newToDate = today
        break
      case 'lastWeek':
        newFromDate = subDays(today, today.getDay() + 7)
        newToDate = subDays(today, today.getDay() + 1)
        break
      case 'thisMonth':
        newFromDate = startOfMonth(today)
        newToDate = endOfMonth(today)
        break
      case 'lastMonth':
        const lastMonth = subMonths(today, 1)
        newFromDate = startOfMonth(lastMonth)
        newToDate = endOfMonth(lastMonth)
        break
      case 'last30Days':
        newFromDate = subDays(today, 30)
        newToDate = today
        break
      case 'last90Days':
        newFromDate = subDays(today, 90)
        newToDate = today
        break
      default:
        return
    }

    setFromDate(newFromDate)
    setToDate(newToDate)
    setQuickFilter(filter)
    // Don't close the modal here, let user apply manually
  }

  const formatDateRange = () => {
    const from = format(fromDate, 'MMM dd')
    const to = format(toDate, 'MMM dd')
    const fromYear = format(fromDate, 'yyyy')
    const toYear = format(toDate, 'yyyy')
    const currentYear = format(new Date(), 'yyyy')

    // Same day
    if (format(fromDate, 'yyyy-MM-dd') === format(toDate, 'yyyy-MM-dd')) {
      return fromYear === currentYear ? from : `${from}, ${fromYear}`
    }

    // Same year
    if (fromYear === toYear) {
      const yearDisplay = fromYear === currentYear ? '' : `, ${fromYear}`
      return `${from} - ${to}${yearDisplay}`
    }

    // Different years
    return `${from}, ${fromYear} - ${to}, ${toYear}`
  }

  const getQuickFilterLabel = () => {
    const labels = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'thisWeek': 'This Week',
      'lastWeek': 'Last Week',
      'thisMonth': 'This Month',
      'lastMonth': 'Last Month',
      'last30Days': 'Last 30 Days',
      'last90Days': 'Last 90 Days',
      'custom': 'Custom Range'
    }
    return labels[quickFilter as keyof typeof labels] || 'Custom Range'
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
            <div className="flex items-center">
              <Image
                src={"/icons/icon.png"}
                alt="Budget Tracker Logo"
                width={30}
                height={24}
                className="flex-shrink-0"
              />
              <h1 className="hidden sm:block text-sm sm:text-xl font-semibold ml-2 sm:ml-4">
                Budget Tracker
              </h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile-friendly date range selector */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="date-picker-btn text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] text-left flex items-center justify-between"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-xs opacity-75">{getQuickFilterLabel()}</span>
                    <span className="truncate text-sm">{formatDateRange()}</span>
                  </div>
                  <svg className="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>


              </div>

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

      {/* Full-Screen Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDatePicker(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-dark-700 modal-enter">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Select Date Range
                </h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Quick Filters */}
              <div>
                <h4 className="text-sm font-semibold mb-4 text-gray-800 dark:text-gray-200">Quick Filters</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'thisWeek', label: 'This Week' },
                    { key: 'lastWeek', label: 'Last Week' },
                    { key: 'thisMonth', label: 'This Month' },
                    { key: 'lastMonth', label: 'Last Month' },
                    { key: 'last30Days', label: 'Last 30 Days' },
                    { key: 'last90Days', label: 'Last 90 Days' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => applyQuickFilter(filter.key)}
                      className={`px-4 py-3 text-sm font-medium rounded-lg border transition-all duration-200 touch-manipulation min-h-[48px] flex items-center justify-center text-center ${quickFilter === filter.key
                        ? 'bg-primary-500 border-primary-500 text-white shadow-md scale-105'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 dark:bg-dark-700 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-600'
                        }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-dark-700"></div>

              {/* Custom Date Range */}
              <div>
                <h4 className="text-sm font-semibold mb-4 text-gray-800 dark:text-gray-200">Custom Range</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={format(fromDate, 'yyyy-MM-dd')}
                      onChange={(e) => setFromDate(new Date(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white text-base touch-manipulation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={format(toDate, 'yyyy-MM-dd')}
                      onChange={(e) => setToDate(new Date(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white text-base touch-manipulation"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 px-6 py-4 rounded-b-2xl">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setQuickFilter('thisMonth');
                    // Reset to current month
                    const today = new Date();
                    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1));
                    setToDate(new Date());
                    setShowDatePicker(false);
                    loadData(); // Reload data with reset dates
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-300 dark:border-dark-500 dark:hover:bg-dark-500 transition-colors touch-manipulation"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setShowDatePicker(false)
                    loadData() // Reload data with new date range
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary-500 border border-primary-500 rounded-lg hover:bg-primary-600 transition-colors touch-manipulation shadow-md"
                >
                  Apply Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}