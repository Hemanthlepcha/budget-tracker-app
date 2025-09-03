'use client'

import React, { useState } from 'react'
import { Transaction, Category, supabase } from '../../lib/supabase'
import { Edit2, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'

interface TransactionTableProps {
  transactions: Transaction[]
  categories: Category[]
  onUpdate: () => void
}

export function TransactionTable({ transactions, categories, onUpdate }: TransactionTableProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({
    amount: '',
    category: '',
    type: 'expense' as 'income' | 'expense',
    notes: '',
    customCategory: '',
    useCustomCategory: false
  })

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    const availableCategories = categories.filter(cat => cat.type === transaction.type)
    const categoryExists = availableCategories.some(cat => cat.name === transaction.category)

    setEditForm({
      amount: transaction.amount.toString(),
      category: categoryExists ? transaction.category : '',
      type: transaction.type,
      notes: transaction.notes || '',
      customCategory: categoryExists ? '' : transaction.category,
      useCustomCategory: !categoryExists
    })
  }

  const handleUpdate = async () => {
    if (!editingTransaction) return

    setLoading(editingTransaction.id)
    try {
      const categoryToUse = editForm.useCustomCategory ? editForm.customCategory : editForm.category

      const { error } = await supabase
        .from('transactions')
        .update({
          amount: parseFloat(editForm.amount),
          category: categoryToUse,
          type: editForm.type,
          notes: editForm.notes || null
        })
        .eq('id', editingTransaction.id)

      if (error) throw error

      setEditingTransaction(null)
      onUpdate()
    } catch (error) {
      console.error('Error updating transaction:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingTransaction(null)
    setEditForm({
      amount: '',
      category: '',
      type: 'expense',
      notes: '',
      customCategory: '',
      useCustomCategory: false
    })
  }

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
                <p className={`font-bold text-lg ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {transaction.type === 'income' ? '+' : '-'}Nu.{transaction.amount.toFixed(2)}
                </p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${transaction.type === 'income'
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
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => handleEdit(transaction)}
                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
              >
                <Edit2 className="h-4 w-4" />
              </button>
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
                <td className={`py-3 px-4 font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {transaction.type === 'income' ? '+' : '-'}Nu.{transaction.amount.toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${transaction.type === 'income'
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
                      onClick={() => handleEdit(transaction)}
                      className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
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

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancelEdit}
          />

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-dark-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Transaction
              </h3>
              <button
                onClick={handleCancelEdit}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (Nu.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={editForm.type}
                  onChange={(e) => {
                    const newType = e.target.value as 'income' | 'expense'
                    const availableCategories = categories.filter(cat => cat.type === newType)

                    setEditForm({
                      ...editForm,
                      type: newType,
                      category: '',
                      customCategory: '',
                      useCustomCategory: availableCategories.length === 0
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>

                {/* Category Type Toggle */}
                <div className="mb-3">
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="categoryType"
                        checked={!editForm.useCustomCategory}
                        onChange={() => setEditForm({ ...editForm, useCustomCategory: false, customCategory: '' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Select existing category</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="categoryType"
                        checked={editForm.useCustomCategory}
                        onChange={() => setEditForm({ ...editForm, useCustomCategory: true, category: '' })}
                        className="mr-2"
                      />
                      <span className="text-sm">Add custom category</span>
                    </label>
                  </div>
                </div>

                {/* Existing Categories Dropdown */}
                {!editForm.useCustomCategory && (
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                  >
                    <option value="">Select a category</option>
                    {categories
                      .filter(cat => cat.type === editForm.type)
                      .map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                )}

                {/* Custom Category Input */}
                {editForm.useCustomCategory && (
                  <input
                    type="text"
                    value={editForm.customCategory}
                    onChange={(e) => setEditForm({ ...editForm, customCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                    placeholder="Enter custom category name"
                  />
                )}

                {/* Show message if no categories exist */}
                {!editForm.useCustomCategory && categories.filter(cat => cat.type === editForm.type).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    No existing categories found for {editForm.type}. Please add a custom category.
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
                  rows={3}
                  placeholder="Add a note..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-dark-700">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-300 dark:border-dark-500 dark:hover:bg-dark-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={
                  loading === editingTransaction.id ||
                  !editForm.amount ||
                  (!editForm.useCustomCategory && !editForm.category) ||
                  (editForm.useCustomCategory && !editForm.customCategory)
                }
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-500 border border-primary-500 rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading === editingTransaction.id ? 'Updating...' : 'Update Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}