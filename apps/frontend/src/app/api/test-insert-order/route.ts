// apps/frontend/src/app/api/test-insert-order/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  // Debug: check what user (if any) is currently logged in
  const { data: userInfo, error: userError } = await supabase.auth.getUser()
  console.log('🔍 Supabase auth user:', userInfo)
  if (userError) console.log('⚠️ Supabase auth error:', userError)

  // Attempt insert
  const { data, error } = await supabase
    .from('orders')
    .insert({
      client_id: 'fa35912c-4654-42ec-9eec-2059e874706b',
      tracking_id: 'TXT_XZ9CDA',
      pickup_date: '2025-07-08',
      vehicle_type: 'van',
      tail_lift_required: false,
      estimated_cost: 2500,
      status: 'order_placed',
    })

  console.log('📝 Insert result:', { data, error })

  return NextResponse.json({ data, error, user: userInfo })
}
