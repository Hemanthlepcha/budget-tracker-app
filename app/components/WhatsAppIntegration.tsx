'use client'

import React, { useState } from 'react'
import { supabase, type UserProfile } from '../../lib/supabase'
import { useSupabase } from './SupabaseProvider'
import { MessageCircle, Smartphone, CheckCircle, AlertCircle, Copy } from 'lucide-react'

interface WhatsAppIntegrationProps {
    profile: UserProfile | null
    onUpdate: () => void
}

export function WhatsAppIntegration({ profile, onUpdate }: WhatsAppIntegrationProps) {
    const { user } = useSupabase()
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [copyMessage, setCopyMessage] = useState('')
    const [showInstructions, setShowInstructions] = useState(false)

    const whatsappBotNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '+15551847923'

    const formatPhoneNumber = (phone: string): string => {
        // Remove all non-digit characters
        const cleanPhone = phone.replace(/\D/g, '')

        // Handle different input formats
        if (cleanPhone.startsWith('975')) {
            // Already has Bhutan country code
            return `+${cleanPhone}`
        } else if (cleanPhone.startsWith('17') || cleanPhone.startsWith('77')) {
            // Bhutan mobile numbers typically start with 17 or 77
            return `+975${cleanPhone}`
        } else if (cleanPhone.length === 8) {
            // 8-digit local Bhutan number
            return `+975${cleanPhone}`
        } else if (cleanPhone.length >= 10) {
            // International format, add + if not present
            return `+${cleanPhone}`
        }

        return phone // Return original if can't format
    }

    const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
        const cleanPhone = phone.replace(/\D/g, '')

        if (!cleanPhone) {
            return { isValid: false, error: 'Phone number is required' }
        }

        if (cleanPhone.length < 8) {
            return { isValid: false, error: 'Phone number too short' }
        }

        // Check for Bhutan numbers specifically
        if (cleanPhone.startsWith('975')) {
            if (cleanPhone.length !== 11) { // +975 + 8 digits
                return { isValid: false, error: 'Bhutan phone numbers should be 8 digits after +975' }
            }
        } else if (cleanPhone.length === 8) {
            // Local Bhutan number
            if (!cleanPhone.startsWith('17') && !cleanPhone.startsWith('77')) {
                return { isValid: false, error: 'Bhutan mobile numbers should start with 17 or 77' }
            }
        } else if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            return { isValid: false, error: 'International phone numbers should be 10-15 digits' }
        }

        return { isValid: true }
    }

    const handleSavePhoneNumber = async () => {
        if (!user || !phoneNumber.trim()) return

        setLoading(true)
        setMessage('')

        try {
            // Validate phone number
            const validation = validatePhoneNumber(phoneNumber)
            if (!validation.isValid) {
                throw new Error(validation.error)
            }

            // Format phone number
            const formattedPhone = formatPhoneNumber(phoneNumber)

            // Check if phone number is already registered by another user
            const { data: existingUser, error: checkError } = await supabase
                .from('user_profiles')
                .select('user_id, phone_number')
                .eq('phone_number', formattedPhone)
                .neq('user_id', user.id)
                .maybeSingle()

            if (checkError && checkError.code !== 'PGRST116') {
                throw new Error('Error validating phone number')
            }

            if (existingUser) {
                throw new Error('This phone number is already registered by another user')
            }

            // Save the phone number
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    phone_number: formattedPhone,
                    whatsapp_enabled: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)

            if (error) {
                throw new Error('Failed to save phone number: ' + error.message)
            }

            setMessage(`WhatsApp automation enabled successfully for ${formattedPhone}`)
            setPhoneNumber(formattedPhone)
            // Don't call onUpdate() immediately to prevent modal closing
        } catch (error: any) {
            setMessage(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDisableWhatsApp = async () => {
        if (!user) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    whatsapp_enabled: false,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)

            if (error) throw error

            setMessage('WhatsApp automation disabled successfully.')
            // Don't call onUpdate() immediately to prevent modal closing
        } catch (error: any) {
            setMessage(error.message)
        } finally {
            setLoading(false)
        }
    }

    const copyBotNumber = () => {
        navigator.clipboard.writeText(whatsappBotNumber)
        setCopyMessage('Bot number copied to clipboard!')
        setTimeout(() => setCopyMessage(''), 3000)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">WhatsApp Automation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically add transactions by sending screenshots via WhatsApp
                    </p>
                </div>
            </div>

            {/* Status */}
            <div className={`p-4 rounded-lg border ${profile?.whatsapp_enabled
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                <div className="flex items-center space-x-2">
                    {profile?.whatsapp_enabled ? (
                        <>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-700 dark:text-green-300">
                                WhatsApp Automation Enabled
                            </span>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="h-5 w-5 text-gray-600" />
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                WhatsApp Automation Disabled
                            </span>
                        </>
                    )}
                </div>
                {profile?.phone_number && (
                    <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Registered number: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{profile.phone_number}</code>
                        </p>
                    </div>
                )}
            </div>

            {/* Phone Number Setup */}
            {!profile?.whatsapp_enabled && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            WhatsApp Phone Number
                        </label>
                        <div className="space-y-2">
                            <div className="flex space-x-2">
                                <div className="relative flex-1">
                                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="input pl-10"
                                        placeholder="+975 17123456 or 17123456"
                                    />
                                </div>
                                <button
                                    onClick={handleSavePhoneNumber}
                                    disabled={loading || !phoneNumber.trim()}
                                    className="btn-primary"
                                >
                                    {loading ? 'Enabling...' : 'Enable'}
                                </button>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <p>✅ Bhutan: +975 17123456 or just 17123456</p>
                                <p>✅ International: +1234567890</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bot Information */}
            {profile?.whatsapp_enabled && (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                            Budget Tracker Bot
                        </h4>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-sm text-blue-700 dark:text-blue-300">
                                {whatsappBotNumber}
                            </span>
                            <button
                                onClick={copyBotNumber}
                                className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                        {showInstructions ? 'Hide' : 'Show'} usage instructions
                    </button>

                    {showInstructions && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                            <h4 className="font-medium">How to use WhatsApp Automation:</h4>
                            <ol className="text-sm space-y-2 list-decimal list-inside text-gray-600 dark:text-gray-400">
                                <li>Save the bot number ({whatsappBotNumber}) to your contacts</li>
                                <li>When you make a purchase, take a screenshot of the transaction from your banking app</li>
                                <li>Send the screenshot to the bot via WhatsApp</li>
                                <li>The bot will automatically extract transaction details and add it to your budget tracker</li>
                                <li>You'll receive a confirmation message with the transaction details</li>
                            </ol>
                            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700/50">
                                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                    💡 <strong>Tip:</strong> Make sure your screenshots clearly show the amount, merchant name, and date for best results.
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleDisableWhatsApp}
                        disabled={loading}
                        className="text-sm px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 rounded"
                    >
                        {loading ? 'Disabling...' : 'Disable WhatsApp'}
                    </button>

                    <button
                        onClick={() => {
                            onUpdate()
                            setMessage('Profile refreshed!')
                        }}
                        className="text-sm px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 rounded"
                    >
                        Refresh Status
                    </button>
                </div>
            )}

            {/* Messages */}
            {copyMessage && (
                <div className="p-3 rounded-lg text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {copyMessage}
                </div>
            )}

            {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('success') || message.includes('enabled')
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : message.includes('Error') || message.includes('error')
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                    {message}
                </div>
            )}
        </div>
    )
}