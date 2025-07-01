import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const trackingId = searchParams.get('trackingId')

  if (!trackingId) {
    return NextResponse.json({ error: 'Missing tracking ID' }, { status: 400 })
  }

  // Step 1: Get client by tracking ID
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('tracking_id', trackingId)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ exists: false }) // Not a valid tracking ID
  }

  // Step 2: Check if an order exists for the client
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('client_id', client.id)
    .maybeSingle()

  if (orderError) {
    console.error(orderError)
    return NextResponse.json({ error: 'Error checking order' }, { status: 500 })
  }

  return NextResponse.json({
    exists: true,
    hasOrder: !!order,
  })
}
