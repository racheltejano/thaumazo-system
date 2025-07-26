import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Generate a unique tracking ID
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const trackingId = `CLI-${timestamp}-${random}`

    // Check if tracking ID already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('tracking_id', trackingId)
      .single()

    if (existingClient) {
      // If exists, generate a new one recursively
      return POST()
    }

    return NextResponse.json({ 
      success: true, 
      trackingId 
    })
  } catch (error) {
    console.error('Error generating tracking ID:', error)
    return NextResponse.json(
      { error: 'Failed to generate tracking ID' }, 
      { status: 500 }
    )
  }
} 