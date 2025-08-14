'use client'

import React, { useState } from 'react'
import { Category, supabase } from '../../lib/supabase'
import { useSupabase } from './SupabaseProvider'
import { X, Plus, Trash2 } from 'lucide-react'

interface CategoryManagerProps {
  categories: Category[]
  onClose: () => void
  onUpdate: () => void
}

const DEFAULT_CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Other Income'],
  expense: ['Food', 'Transportation', 'Entertainment', 'Utilities', 'Shopping', 'Healthcare', 'Other']
}

export function CategoryManager({ categories, onClose, onUpdate }: CategoryManagerProps) {
  const { user } = useSupabase()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense')
  const [loading, setLoading] = useState(false)

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newCategoryName.trim()) return

    setLoading(true)
    try {
      const maxOrder = Math.max(...categories.filter(c => c.type === newCategoryType).map(c => c.order), 0)
      
      const { error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
          type: newCategoryType,
          color: '#3b82f6',
          order: maxOrder + 1,
        })

      if (error) throw error
      
      setNewCategoryName('')
      onUpdate()
    } catch (error) {
      console.error('Error adding category:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  const initializeDefaultCategories = async () => {
    if (!user) return

    setLoading(true)
    try {
      const categoriesToAdd = [
        ...DEFAULT_CATEGORIES.income.map((name, index) => ({
          user_id: user.id,
          name,
          type: 'income' as const,
          color: '#10b981',
          order: index,
        })),
        ...DEFAULT_CATEGORIES.expense.map((name, index) => ({
          user_id: user.id,
          name,
          type: 'expense' as const,
          color: '#ef4444',
          order: index,
        })),
      ]

      const { error } = await supabase
        .from('categories')
        .insert(categoriesToAdd)

      if (error) throw error
      onUpdate()
    } catch (error) {
      console.error('Error initializing categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Manage Categories</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-8 mb-6">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No categories found. Initialize with default categories?
            </p>
            <button
              onClick={initializeDefaultCategories}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Initializing...' : 'Add Default Categories'}
            </button>
          </div>
        )}

        {/* Add New Category Form */}
        <form onSubmit={handleAddCategory} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-4">Add New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="input"
              required
            />
            <select
              value={newCategoryType}
              onChange={(e) => setNewCategoryType(e.target.value as 'income' | 'expense')}
              className="input"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Categories List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Categories */}
          <div>
            <h3 className="font-medium mb-3 text-green-600">Income Categories</h3>
            <div className="space-y-2">
              {incomeCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                >
                  <span>{category.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Categories */}
          <div>
            <h3 className="font-medium mb-3 text-red-600">Expense Categories</h3>
            <div className="space-y-2">
              {expenseCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                >
                  <span>{category.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}