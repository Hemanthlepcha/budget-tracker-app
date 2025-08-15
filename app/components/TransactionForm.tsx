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
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  const filteredCategories = categories.filter(cat => cat.type === type)

  // Debug logging
  console.log('All categories:', categories)
  console.log('Selected type:', type)
  console.log('Filtered categories:', filteredCategories)

  const handleAddCategory = async () => {
    if (!user || !newCategoryName.trim()) return

    setAddingCategory(true)
    try {
      const maxOrder = Math.max(...categories.filter(c => c.type === type).map(c => c.order), 0)
      
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
          type: type,
          color: type === 'income' ? '#10b981' : '#ef4444',
          order: maxOrder + 1,
        })

      if (error) throw error
      
      // Set the newly created category as selected
      setCategory(newCategoryName.trim())
      setNewCategoryName('')
      setShowAddCategory(false)
      
      // Refresh categories
      onSuccess()
    } catch (error) {
      console.error('Error adding category:', error)
    } finally {
      setAddingCategory(false)
    }
  }

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
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                {showAddCategory ? 'Cancel' : '+ Add New'}
              </button>
            </div>

            {showAddCategory ? (
              // Inline Add Category Form
              <div className="space-y-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                    New {type} category name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="input text-sm"
                    placeholder={`Enter ${type} category name`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCategory()
                      }
                    }}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim() || addingCategory}
                    className="btn-primary text-xs px-3 py-1 flex-1"
                  >
                    {addingCategory ? 'Adding...' : 'Add Category'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategory(false)
                      setNewCategoryName('')
                    }}
                    className="btn-secondary text-xs px-3 py-1 flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Regular Category Selection
              <>
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowAddCategory(true)
                    } else {
                      setCategory(e.target.value)
                    }
                  }}
                  className="mobile-select w-full"
                  required
                >
                  <option value="">Select a category</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="__add_new__" className="text-primary-600 font-medium">
                    + Add New {type} Category
                  </option>
                </select>
                
                {filteredCategories.length === 0 && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-primary-900/20 rounded-lg border border-blue-200 dark:border-primary-700/50">
                    <p className="text-sm text-primary-700 dark:text-primary-300">
                      No {type} categories yet. Click "+ Add New" to create your first {type} category!
                    </p>
                  </div>
                )}
              </>
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