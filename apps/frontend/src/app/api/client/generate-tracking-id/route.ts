import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Helper function to generate date-based tracking ID
async function generateDateBasedTrackingId(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const datePrefix = `${year}${month}${day}`
  
  // Get all tracking IDs created today
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  
  const { data: todayClients, error } = await supabase
    .from('clients')
    .select('tracking_id')
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', todayEnd.toISOString())
    .like('tracking_id', `TXT-${datePrefix}-%`)
    .order('tracking_id', { ascending: false })
  
  if (error) {
    console.error('Error fetching today\'s tracking IDs:', error)
    throw new Error('Failed to generate tracking ID')
  }
  
  // Calculate next sequence number
  let nextSequence = 1
  if (todayClients && todayClients.length > 0) {
    // Extract the sequence number from the last tracking ID
    const lastTrackingId = todayClients[0].tracking_id
    const lastSequence = parseInt(lastTrackingId.split('-')[2]) || 0
    nextSequence = lastSequence + 1
  }
  
  // Format: TXT-YYYYMMDD-NNN (e.g., TXT-20251021-001)
  const sequenceStr = String(nextSequence).padStart(3, '0')
  return `TXT-${datePrefix}-${sequenceStr}`
}

// 🧩 1️⃣ Admin Dashboard — Generate New Tracking ID
export async function POST() {
  try {
    const trackingId = await generateDateBasedTrackingId()

    const { error: insertError } = await supabase.from('clients').insert({
      tracking_id: trackingId,
      created_at: new Date().toISOString(),
      contact_person: 'Temporary Client',
      contact_number: '0000000000',
      pickup_address: 'Pending Address',
      email: 'placeholder@thaumazo.com',
    })

    if (insertError) {
      console.error('Insert failed:', insertError)
      return NextResponse.json({ success: false, error: 'Failed to insert client' }, { status: 500 })
    }

    return NextResponse.json({ success: true, trackingId }, { status: 200 })
  } catch (error) {
    console.error('Error generating tracking ID:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

// 🧩 2️⃣ Client Email Link — Verify Token & Create Client Record
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  // Helper: Simple HTML page for invalid/expired links
  const invalidTokenPage = (message: string) => {
    const html = `
      <html>
        <head>
          <title>Thaumazo — Invalid Link</title>
          <style>
            body {
              background-color: #fff;
              font-family: 'Inter', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: white;
              box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
              border-radius: 16px;
              padding: 40px;
              text-align: center;
              max-width: 420px;
              width: 90%;
            }
            h1 {
              font-size: 1.8rem;
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              margin-bottom: 20px;
            }
            a {
              display: inline-block;
              background-color: #f97316;
              color: white;
              padding: 10px 18px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              transition: background 0.2s ease;
            }
            a:hover {
              background-color: #ea580c;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Oops! One-Time Link Used</h1>
            <p>${message}</p>
            <a href="http://localhost:3000/home" target="_blank">Contact Thaumazo</a>
          </div>
        </body>
      </html>
    `
    return new NextResponse(html, {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  if (!token) {
    return invalidTokenPage('This link is invalid or missing a token.')
  }

  try {
    const { data: pending, error: fetchError } = await supabase
      .from('pending_client_emails')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (fetchError || !pending) {
      console.error('Token not found or DB error:', fetchError)
      return invalidTokenPage('This one-time order link is invalid or has already been used.')
    }

    const now = new Date()
    const expiresAt = new Date(pending.expires_at)
    if (now > expiresAt) {
      await supabase.from('pending_client_emails').delete().eq('token', token)
      return invalidTokenPage('This link has expired. Please request a new one from Thaumazo.')
    }

    // Generate date-based tracking ID
    const trackingId = await generateDateBasedTrackingId()

    // Create client record with placeholders
    const { error: insertError } = await supabase.from('clients').insert({
      email: pending.email,
      tracking_id: trackingId,
      created_at: new Date().toISOString(),
      contact_person: 'Pending Client',
      contact_number: '0000000000',
      pickup_address: 'Pending Address',
    })

    if (insertError) {
      console.error('Insert error:', insertError)
      return invalidTokenPage('An error occurred while creating your order. Please contact Thaumazo.')
    }

    await supabase.from('pending_client_emails').delete().eq('token', token)

    const redirectUrl = `http://localhost:3000/create-order/${trackingId}`
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Unexpected error in GET:', error)
    return invalidTokenPage('Something went wrong while processing your link. Please try again later.')
  }
}