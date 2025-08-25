import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get all user profiles (including those without phone numbers for debugging)
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('user_id, username, phone_number, whatsapp_enabled')

    if (error) throw error

    return NextResponse.json({
      success: true,
      profiles: profiles,
      message: 'All user profiles in database',
      withPhone: profiles?.filter(p => p.phone_number) || [],
      withoutPhone: profiles?.filter(p => !p.phone_number) || []
    })
  } catch (error) {
    console.error('Debug phone error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch phone numbers'
    }, { status: 500 })
  }
}

// POST endpoint to manually register phone number for testing
export async function POST(request: NextRequest) {
  try {
    const { userId, phoneNumber } = await request.json()
    
    if (!userId || !phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'userId and phoneNumber are required'
      }, { status: 400 })
    }

    // Update user profile with phone number
    const { error } = await supabase
      .from('user_profiles')
      .update({
        phone_number: phoneNumber,
        whatsapp_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Phone number registered successfully'
    })
  } catch (error) {
    console.error('Error registering phone:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to register phone number'
    }, { status: 500 })
  }
}