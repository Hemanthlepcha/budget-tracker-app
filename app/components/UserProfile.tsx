'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase, type UserProfile } from '../../lib/supabase'
import { useSupabase } from './SupabaseProvider'
import { useTheme } from './ThemeProvider'
import { WhatsAppIntegration } from './WhatsAppIntegration'
import { Settings, LogOut, Camera, Palette, FolderOpen, Sun, Moon } from 'lucide-react'

interface UserProfileProps {
  onSignOut: () => void
  onShowCategoryManager: () => void
}

export function UserProfile({ onSignOut, onShowCategoryManager }: UserProfileProps) {
  const { user } = useSupabase()
  const { theme, toggleTheme } = useTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
        return
      }

      if (data) {
        setProfile(data)
      } else {
        // Create profile if it doesn't exist (for existing users)
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            username: user.email?.split('@')[0] || 'user',
            full_name: user.email?.split('@')[0] || 'User',
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
        } else {
          setProfile(newProfile)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name
    if (profile?.username) return profile.username
    return user?.email?.split('@')[0] || 'User'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Avatar/Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={getDisplayName()}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {getInitials(getDisplayName())}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium">
          {getDisplayName()}
        </span>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 sm:w-64 custom-dropdown z-50">
          {/* Profile Header */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center space-x-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={getDisplayName()}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white text-lg font-medium">
                  {getInitials(getDisplayName())}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {getDisplayName()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{profile?.username || 'user'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setShowSettings(true)
                setShowDropdown(false)
              }}
              className="dropdown-item text-gray-700 dark:text-gray-300"
            >
              <Settings className="h-4 w-4" />
              <span>Account Settings</span>
            </button>

            {/* Divider */}
            <div className="dropdown-divider"></div>

            <button
              onClick={() => {
                onShowCategoryManager()
                setShowDropdown(false)
              }}
              className="dropdown-item text-gray-700 dark:text-gray-300"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Manage Categories</span>
            </button>

            <button
              onClick={() => {
                toggleTheme()
                setShowDropdown(false)
              }}
              className="dropdown-item text-gray-700 dark:text-gray-300"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="dropdown-divider"></div>

            <button
              onClick={() => {
                onSignOut()
                setShowDropdown(false)
              }}
              className="dropdown-item text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <ProfileSettings
          profile={profile}
          onClose={() => setShowSettings(false)}
          onUpdate={loadProfile}
        />
      )}
    </div>
  )
}

interface ProfileSettingsProps {
  profile: UserProfile | null
  onClose: () => void
  onUpdate: () => void
}

function ProfileSettings({ profile, onClose, onUpdate }: ProfileSettingsProps) {
  const { user } = useSupabase()
  const [username, setUsername] = useState(profile?.username || '')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setLoading(true)
    setMessage('')

    try {
      // Check if username is already taken (if changed)
      if (username.toLowerCase() !== profile.username) {
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', username.toLowerCase())
          .neq('user_id', user.id)
          .single()

        if (existingProfile) {
          throw new Error('Username is already taken')
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          username: username.toLowerCase(),
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error

      setMessage('Profile updated successfully!')
      // Update profile data without closing modal
      onUpdate()
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !profile) return

    setLoading(true)
    try {
      // For now, we'll use a placeholder or initials
      // TODO: Implement actual file upload when storage bucket is set up
      setMessage('Avatar upload feature coming soon! Using initials for now.')

      // You can implement actual upload here once storage is configured:
      /*
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: data.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      setMessage('Avatar updated successfully!')
      setTimeout(() => {
        onUpdate()
      }, 1000)
      */
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Separate handler for WhatsApp updates that doesn't close the modal
  const handleWhatsAppUpdate = () => {
    onUpdate()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Account Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
          >
            ×
          </button>
        </div>

        {/* Profile Form Section */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="text-center">
            <div className="relative inline-block">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover mx-auto"
                />
              ) : (
                <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-medium mx-auto">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-primary-500 text-white p-2 rounded-full hover:bg-primary-600 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Click the camera icon to upload a profile picture
            </p>
          </div>

          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
              minLength={3}
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              maxLength={50}
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.includes('error') || message.includes('Error')
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              }`}>
              {message}
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>

        {/* WhatsApp Integration Section - Outside of form */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-6 mt-6">
          <WhatsAppIntegration profile={profile} onUpdate={handleWhatsAppUpdate} />
        </div>

        {/* Close Button */}
        <div className="flex justify-center pt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-8"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  )
}