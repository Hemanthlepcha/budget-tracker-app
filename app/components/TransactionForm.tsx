'use client'

import React, { useState } from 'react'
import { supabase, Category } from '../../lib/supabase'
import { useSupabase } from './SupabaseProvider'
import { X } from 'lucide-react'
import { format } from 'date-fns'

interface TransactionFormProps {
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}

export function TransactionForm({ categories, onClose, onSuccess }: TransactionFormProps) {
  const { user } = useSupabase()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const filteredCategories = categories.filter(cat => cat.type === type)

  // Debug logging
  console.log('All categories:', categories)
  console.log('Selected type:', type)
  console.log('Filtered categories:', filteredCategories)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !amount || !category) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          category,
          type,
          date,
          notes: notes || null,
        })

      if (error) throw error
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Add Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3">Transaction Type</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`radio-label ${type === 'income' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="income"
                  checked={type === 'income'}
                  onChange={(e) => setType(e.target.value as 'income')}
                  className="custom-radio"
                />
                <span className="font-medium">Income</span>
              </label>
              <label className={`radio-label ${type === 'expense' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="expense"
                  checked={type === 'expense'}
                  onChange={(e) => setType(e.target.value as 'expense')}
                  className="custom-radio"
                />
                <span className="font-medium">Expense</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Category</label>
              <button
                type="button"
                onClick={onSuccess}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Refresh Categories
              </button>
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mobile-select w-full"
              required
            >
              <option value="">Select a category</option>
              {filteredCategories.length === 0 ? (
                <option value="" disabled>No {type} categories found</option>
              ) : (
                filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))
              )}
            </select>
            {filteredCategories.length === 0 && (
              <p className="text-sm text-red-600 mt-1">
                No {type} categories available. Please add some categories first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mobile-select w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="Add any notes..."
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}