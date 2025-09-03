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
  const [isCustomCategory, setIsCustomCategory] = useState(false)

  const filteredCategories = categories.filter(cat => cat.type === type)

  // Debug logging
  console.log('All categories:', categories)
  console.log('Selected type:', type)
  console.log('Filtered categories:', filteredCategories)

  const createCategoryIfNeeded = async (categoryName: string) => {
    if (!user || !categoryName.trim()) return false

    // Check if category already exists
    const existingCategory = categories.find(
      cat => cat.name.toLowerCase() === categoryName.toLowerCase() && cat.type === type
    )

    if (existingCategory) return true // Category exists, no need to create

    try {
      const maxOrder = Math.max(...categories.filter(c => c.type === type).map(c => c.order), 0)

      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: categoryName.trim(),
          type: type,
          color: type === 'income' ? '#10b981' : '#ef4444',
          order: maxOrder + 1,
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error creating category:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !amount || !category) return

    setLoading(true)
    try {
      // First, create category if it doesn't exist
      const categoryCreated = await createCategoryIfNeeded(category)
      if (!categoryCreated) {
        throw new Error('Failed to create category')
      }

      // Then create the transaction
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          category: category.trim(),
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
            <label className="block text-sm font-medium mb-2">Category</label>

            {/* Show dropdown if categories exist, otherwise show input */}
            {filteredCategories.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true)
                      setCategory('')
                    } else {
                      setIsCustomCategory(false)
                      setCategory(e.target.value)
                    }
                  }}
                  className="mobile-select w-full"
                  required={!isCustomCategory}
                >
                  <option value="">Select existing category</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="__custom__" className="text-primary-600 font-medium">
                    ✏️ Type new category
                  </option>
                </select>

                {/* Custom category input when user selects "Type new category" */}
                {isCustomCategory && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input w-full"
                      placeholder={`Enter new ${type} category name`}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(false)
                        setCategory('')
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      ← Back to existing categories
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* No categories exist - show input directly */
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input w-full"
                placeholder={`Enter ${type} category name`}
                required
              />
            )}

            {/* Helpful messages */}
            {filteredCategories.length === 0 && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-primary-900/20 rounded-lg border border-blue-200 dark:border-primary-700/50">
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  💡 No {type} categories yet. Type a category name and it will be created automatically!
                </p>
              </div>
            )}

            {/* Show "new category will be created" message */}
            {category &&
              (isCustomCategory || filteredCategories.length === 0) &&
              !filteredCategories.some(cat => cat.name.toLowerCase() === category.toLowerCase()) && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/50">
                  <p className="text-xs text-green-700 dark:text-green-300">
                    ✨ New category "{category}" will be created
                  </p>
                </div>
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
              {loading ? 'Adding...' : 'Add '}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}