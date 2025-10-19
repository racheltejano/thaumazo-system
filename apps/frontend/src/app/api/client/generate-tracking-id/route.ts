import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 🧩 1️⃣ Admin Dashboard — Generate New Tracking ID
export async function POST() {
  try {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const trackingId = `TXT_${random}`

    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('tracking_id', trackingId)
      .maybeSingle()

    if (checkError) {
      console.error('Database check error:', checkError)
      return NextResponse.json({ success: false, error: 'Database check failed' }, { status: 500 })
    }

    if (existingClient) {
      console.warn(`Duplicate tracking ID found (${trackingId}). Retrying...`)
      return await POST()
    }

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

    // Generate unique tracking ID
    let trackingId: string
    while (true) {
      const random = Math.random().toString(36).substring(2, 8).toUpperCase()
      trackingId = `TXT_${random}`

      const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('tracking_id', trackingId)
        .maybeSingle()

      if (!existing) break
    }

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
