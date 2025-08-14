'use client'

import React from 'react'
import { Transaction } from '../../lib/supabase'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface SummaryCardsProps {
  transactions: Transaction[]
}

export function SummaryCards({ transactions }: SummaryCardsProps) {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netIncome = totalIncome - totalExpenses

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Income
            </p>
            <p className="text-2xl font-bold text-green-600">
              Nu.{totalIncome.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Expenses
            </p>
            <p className="text-2xl font-bold text-red-600">
              Nu.{totalExpenses.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Net Income
            </p>
            <p className={`text-2xl font-bold ${
              netIncome >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Nu.{netIncome.toFixed(2)}
            </p>
          </div>
          <div className={`p-3 rounded-full ${
            netIncome >= 0 
              ? 'bg-green-100 dark:bg-green-900' 
              : 'bg-red-100 dark:bg-red-900'
          }`}>
            <DollarSign className={`h-6 w-6 ${
              netIncome >= 0 ? 'text-green-600' : 'text-red-600'
            }`} />
          </div>
        </div>
      </div>
    </div>
  )
}