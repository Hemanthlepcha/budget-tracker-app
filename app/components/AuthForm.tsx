'use client'

import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ThemeToggle } from './ThemeToggle'
import { Eye, EyeOff } from 'lucide-react'

export function AuthForm() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
            } else {
                // Check if username is already taken
                const { data: existingProfile } = await supabase
                    .from('user_profiles')
                    .select('username')
                    .eq('username', username.toLowerCase())
                    .single()

                if (existingProfile) {
                    throw new Error('Username is already taken')
                }

                console.log('🔍 Attempting signup with:', { 
                    email, 
                    redirectTo: `${window.location.origin}/`,
                    origin: window.location.origin 
                })
                
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/`,
                        data: {
                            username: username.toLowerCase(),
                            full_name: username,
                        }
                    }
                })
                
                console.log('📧 Signup response:', { 
                    user: data.user, 
                    session: data.session,
                    error: error 
                })
                
                if (error) throw error

                // Create user profile after successful signup
                if (data.user) {
                    console.log('👤 Creating profile for user:', data.user.id)
                    console.log('📧 User email confirmed?', data.user.email_confirmed_at)
                    
                    const { error: profileError } = await supabase
                        .from('user_profiles')
                        .insert({
                            user_id: data.user.id,
                            username: username.toLowerCase(),
                            full_name: username,
                        })

                    if (profileError) {
                        console.error('❌ Error creating profile:', profileError)
                    } else {
                        console.log('✅ Profile created successfully')
                    }
                }

                // More detailed message based on response
                if (data.user && !data.user.email_confirmed_at) {
                    setMessage('✅ Account created! Check your email (including spam folder) for the confirmation link.')
                } else if (data.user && data.user.email_confirmed_at) {
                    setMessage('✅ Account created and automatically confirmed! You can now sign in.')
                } else {
                    setMessage('Account created. Please check your email for confirmation.')
                }
            }
        } catch (error: any) {
            setMessage(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="card w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Budget Tracker
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Track your expenses and reach your savings goals
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input"
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input"
                                placeholder="Choose a unique username"
                                required={!isLogin}
                                minLength={3}
                                maxLength={20}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full"
                    >
                        {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                {message && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('error') || message.includes('Error')
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}>
                        {message}
                    </div>
                )}

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    )
}