'use client'

import React, { useState } from 'react'
import { Transaction, Category, supabase } from '../../lib/supabase'
import { Edit2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface TransactionTableProps {
  transactions: Transaction[]
  categories: Category[]
  onUpdate: () => void
}

export function TransactionTable({ transactions, categories, onUpdate }: TransactionTableProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    setLoading(id)
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error deleting transaction:', error)
    } finally {
      setLoading(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          No transactions found for this month.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
      
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border border-gray-200 dark:border-dark-600"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-sm">
                  {format(new Date(transaction.date), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {transaction.category}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}Nu.{transaction.amount.toFixed(2)}
                </p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  transaction.type === 'income'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {transaction.type}
                </span>
              </div>
            </div>
            {transaction.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {transaction.notes}
              </p>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => handleDelete(transaction.id)}
                disabled={loading === transaction.id}
                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-dark-700">
              <th className="text-left py-3 px-4 font-medium">Date</th>
              <th className="text-left py-3 px-4 font-medium">Category</th>
              <th className="text-left py-3 px-4 font-medium">Amount</th>
              <th className="text-left py-3 px-4 font-medium">Type</th>
              <th className="text-left py-3 px-4 font-medium">Notes</th>
              <th className="text-left py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="border-b border-gray-100 dark:border-dark-800 hover:bg-gray-50 dark:hover:bg-dark-800"
              >
                <td className="py-3 px-4">
                  {format(new Date(transaction.date), 'MMM dd, yyyy')}
                </td>
                <td className="py-3 px-4">{transaction.category}</td>
                <td className={`py-3 px-4 font-medium ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}Nu.{transaction.amount.toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    transaction.type === 'income'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {transaction.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {transaction.notes || '-'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      disabled={loading === transaction.id}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}