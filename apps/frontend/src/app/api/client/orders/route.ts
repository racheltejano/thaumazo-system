import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(req: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Get user from request headers (you'll need to pass this from the client)
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    // Extract user ID from the token (you'll need to implement proper JWT verification)
    // For now, we'll assume the user ID is passed in the header
    const userId = authHeader.replace('Bearer ', '')

    // Get client profile
    const { data: profile, error: profileError } = await supabase
      .from('client_profiles')
      .select('id, contact_number')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Get orders for this user using the new relationship
    // First get the client IDs for this user
    const { data: clientAccounts, error: clientAccountsError } = await supabase
      .from('client_accounts')
      .select('client_id')
      .eq('client_profile_id', profile.id)
      .eq('is_active', true)

    if (clientAccountsError) {
      return NextResponse.json({ error: 'Failed to load client accounts' }, { status: 500 })
    }

    const clientIds = clientAccounts?.map(ca => ca.client_id) || []

    if (clientIds.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    // Get orders for these clients
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        tracking_id,
        status,
        created_at,
        pickup_timestamp,
        vehicle_type,
        estimated_cost,
        driver_id,
        clients!inner (
          pickup_address
        ),
        profiles (
          first_name,
          last_name
        )
      `)
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })

    if (ordersError) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Get dropoff counts for each order
    const ordersWithDropoffs = await Promise.all(
      (orders || []).map(async (order) => {
        const { count: dropoffCount } = await supabase
          .from('order_dropoffs')
          .select('*', { count: 'exact', head: true })
          .eq('order_id', order.id)

        return {
          id: order.id,
          tracking_id: order.tracking_id || `ORD-${order.id.slice(-6)}`,
          status: order.status,
          pickup_address: (order.clients as any)?.pickup_address || 'N/A',
          created_at: order.created_at,
          pickup_timestamp: order.pickup_timestamp,
          vehicle_type: order.vehicle_type,
          estimated_cost: order.estimated_cost,
          dropoff_count: dropoffCount || 0,
          driver_name: order.profiles ? `${(order.profiles as any).first_name} ${(order.profiles as any).last_name}` : undefined,
        }
      })
    )

    return NextResponse.json({ 
      success: true, 
      orders: ordersWithDropoffs 
    })

  } catch (error) {
    console.error('Error fetching client orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' }, 
      { status: 500 }
    )
  }
} 