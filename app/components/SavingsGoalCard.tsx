'use client'

import React, { useState } from 'react'
import { Transaction, SavingsGoal, supabase } from '../../lib/supabase'
import { useSupabase } from './SupabaseProvider'
import { Target, Edit2 } from 'lucide-react'

interface SavingsGoalCardProps {
  savingsGoal: SavingsGoal | null
  transactions: Transaction[]
  onUpdate: () => void
}

export function SavingsGoalCard({ savingsGoal, transactions, onUpdate }: SavingsGoalCardProps) {
  const { user } = useSupabase()
  const [isEditing, setIsEditing] = useState(false)
  const [goalAmount, setGoalAmount] = useState(savingsGoal?.monthly_goal?.toString() || '')
  const [loading, setLoading] = useState(false)

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const currentSavings = totalIncome - totalExpenses
  const goal = savingsGoal?.monthly_goal || 0
  const progress = goal > 0 ? Math.min((currentSavings / goal) * 100, 100) : 0
  const remainingToSave = Math.max(goal - currentSavings, 0)
  const currentBalance = totalIncome // Assuming current balance is total income
  const percentageOfBalanceNeeded = currentBalance > 0 ? (remainingToSave / currentBalance) * 100 : 0

  const handleSaveGoal = async () => {
    if (!user || !goalAmount) return

    setLoading(true)
    try {
      if (savingsGoal) {
        const { error } = await supabase
          .from('savings_goals')
          .update({ monthly_goal: parseFloat(goalAmount) })
          .eq('id', savingsGoal.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('savings_goals')
          .insert({
            user_id: user.id,
            monthly_goal: parseFloat(goalAmount),
          })

        if (error) throw error
      }

      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Error saving goal:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold">Monthly Savings Goal</h3>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Monthly Goal (Nu.)</label>
            <input
              type="number"
              step="0.01"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="input"
              placeholder="Enter your monthly savings goal"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSaveGoal}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Saving...' : 'Save Goal'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {goal > 0 ? (
            <>
              <div className="flex justify-between text-sm">
                <span>Current: Nu.{currentSavings.toFixed(2)}</span>
                <span>Goal: Nu.{goal.toFixed(2)}</span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${progress >= 100 ? 'bg-green-500' : 'bg-primary-500'
                    }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>

              {/* Enhanced Balance Breakdown Visualization */}
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border border-gray-200 dark:border-dark-600 mt-4">
                <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Your Balance Breakdown
                </h4>

                {/* Visual Balance Bar */}
                <div className="relative w-full h-8 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden mb-3">
                  {/* Already Saved (Green) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${currentBalance > 0 ? (Math.min(currentSavings, goal) / currentBalance) * 100 : 0}%` }}
                  />
                  {/* Still Need to Save (Primary Blue) */}
                  <div
                    className="absolute top-0 h-full bg-primary-500 transition-all duration-500"
                    style={{
                      left: `${currentBalance > 0 ? (Math.min(currentSavings, goal) / currentBalance) * 100 : 0}%`,
                      width: `${currentBalance > 0 ? (remainingToSave / currentBalance) * 100 : 0}%`
                    }}
                  />
                  {/* Remaining Balance (Light Gray) */}
                  <div
                    className="absolute right-0 top-0 h-full bg-gray-300 dark:bg-gray-500"
                    style={{
                      width: `${currentBalance > 0 ? Math.max(0, (currentBalance - goal) / currentBalance) * 100 : 100}%`
                    }}
                  />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Saved</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-primary-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Need to Save</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-300 dark:bg-gray-500 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Available</span>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600 dark:text-green-400">✓ Already Saved:</span>
                    <span className="font-medium">Nu.{Math.min(currentSavings, goal).toFixed(2)}</span>
                  </div>
                  {remainingToSave > 0 && (
                    <div className="flex justify-between">
                      <span className="text-primary-600 dark:text-primary-400">→ Still Need:</span>
                      <span className="font-medium">Nu.{remainingToSave.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                    <span className="text-gray-600 dark:text-gray-400">Total Balance:</span>
                    <span className="font-bold">Nu.{currentBalance.toFixed(2)}</span>
                  </div>
                  {remainingToSave > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">% of Balance Needed:</span>
                      <span className="font-bold text-primary-600 dark:text-primary-400">
                        {percentageOfBalanceNeeded.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold">
                  {progress.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentSavings >= goal ? 'Goal achieved!' : `$${(goal - currentSavings).toFixed(2)} to go`}
                </p>
              </div>

              {/* Savings breakdown from current balance */}
              {remainingToSave > 0 && currentBalance > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-primary-900/20 rounded-lg border border-blue-200 dark:border-primary-700/50">
                  <h4 className="text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
                    Savings Breakdown
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Current Balance:</span>
                      <span className="font-medium">Nu.{currentBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Need to Save:</span>
                      <span className="font-medium text-primary-600 dark:text-primary-400">
                        Nu.{remainingToSave.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                      <span className="text-gray-600 dark:text-gray-400">% of Balance:</span>
                      <span className="font-bold text-primary-700 dark:text-primary-300">
                        {percentageOfBalanceNeeded.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                        style={{ width: `${Math.min(percentageOfBalanceNeeded, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                      {percentageOfBalanceNeeded > 100
                        ? 'Goal exceeds current balance'
                        : `${percentageOfBalanceNeeded.toFixed(1)}% of your balance needed`
                      }
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Set a monthly savings goal to track your progress
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary"
              >
                Set Goal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}