import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ENV ERROR] Missing Supabase credentials.')
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, pickup_date, pickup_time, delivery_window_start, delivery_window_end')
      .eq('status', 'order_placed')

    if (orderError) throw orderError

    const { data: availability, error: availError } = await supabase
      .from('driver_availability')
      .select('driver_id, start_time, end_time')

    if (availError) throw availError

    const driverAvailabilityMap: Record<string, { start: Date; end: Date }[]> = {}

    for (const slot of availability || []) {
      const dId = slot.driver_id
      const sTime = new Date(slot.start_time)
      const eTime = new Date(slot.end_time)

      if (!driverAvailabilityMap[dId]) driverAvailabilityMap[dId] = []
      driverAvailabilityMap[dId].push({ start: sTime, end: eTime })
    }

    const updates: { id: string; driver_id: string }[] = []

    for (const order of orders || []) {
      const pickupDate = order.pickup_date
      const pickupTime = order.delivery_window_start || order.pickup_time
      const endTime = order.delivery_window_end || pickupTime

      const orderStart = new Date(`${pickupDate}T${pickupTime}`)
      const orderEnd = new Date(`${pickupDate}T${endTime}`)

      const matchingDrivers = Object.entries(driverAvailabilityMap).filter(([, slots]) =>
        slots.some(slot => orderStart >= slot.start && orderEnd <= slot.end)
      )

      if (matchingDrivers.length === 0) continue

      matchingDrivers.sort((a, b) => a[1].length - b[1].length)

      const selectedDriverId = matchingDrivers[0][0]
      updates.push({ id: order.id, driver_id: selectedDriverId })
    }

    for (const update of updates) {
      await supabase
        .from('orders')
        .update({
          driver_id: update.driver_id,
          status: 'driver_assigned',
        })
        .eq('id', update.id)
    }

    return NextResponse.json({ message: `${updates.length} orders assigned.` }, { status: 200 })
  } catch (err: unknown) {
    const error = err as Error
    console.error('[AUTO ASSIGN ERROR]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
