'use client'

import React from 'react'
import { Transaction, Category } from '../../lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartsProps {
  transactions: Transaction[]
  categories: Category[]
}

const COLORS = ['#3457D5', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

export function Charts({ transactions, categories }: ChartsProps) {
  // Prepare data for pie chart (expenses by category)
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount
      return acc
    }, {} as Record<string, number>)

  const pieData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    name: category,
    value: amount,
  }))

  // Prepare data for bar chart (income vs expenses by category)
  const categoryTotals = categories.map(category => {
    const income = transactions
      .filter(t => t.type === 'income' && t.category === category.name)
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = transactions
      .filter(t => t.type === 'expense' && t.category === category.name)
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      category: category.name,
      income,
      expenses,
    }
  }).filter(item => item.income > 0 || item.expenses > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart - Expenses by Category */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`Nu.${value.toFixed(2)}`, 'Amount']} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No expense data available
          </div>
        )}
      </div>

      {/* Bar Chart - Income vs Expenses */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Income vs Expenses by Category</h3>
        {categoryTotals.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="category"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip formatter={(value: number) => `Nu.${value.toFixed(2)}`} />
              <Bar dataKey="income" fill="#10b981" name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}
      </div>
    </div>
  )
}