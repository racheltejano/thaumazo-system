import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { format as formatDate } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY

// Constants matching your drawer
const TIMEZONE = 'Asia/Manila'
const SLOT_INTERVAL_MINUTES = 30
const BUFFER_MINUTES = 10
const ROUND_UP_TO_MINUTES = 10

type Driver = {
  id: string
  first_name: string
  last_name: string
}

type Order = {
  id: string
  tracking_id: string
  pickup_timestamp: string
  estimated_total_duration: number
  client_id: string
}

type AvailabilityBlock = {
  id: string
  driver_id: string
  start_time: string
  end_time: string
}

type ExistingTimeSlot = {
  id: string
  driver_id: string
  start_time: string
  end_time: string
  status: string
  order_id: string | null
}

type TimeSlotOption = {
  id: string
  driver_id: string
  start_time: string
  end_time: string
  availabilityBlockId: string
}

type PendingAssignment = {
  driverId: string
  startTime: string
  endTime: string
  orderId: string
}

type DriverScore = {
  driver: Driver
  timeSlot: TimeSlotOption
  score: number
  distance: number
}

// Add this AFTER your imports and BEFORE export async function POST()
async function notifyDriverAssignment(
  supabase: any,
  driverId: string,
  orderId: string,
  orderTrackingId: string,
  pickupTime: string
) {
  try {
    const pickupPH = utcToZonedTime(new Date(pickupTime), TIMEZONE)
    const formattedTime = formatDate(pickupPH, 'MMM dd, yyyy h:mm a')
    
    console.log(`  🔔 Creating notification for driver ${driverId}`)
    
    const notification = {
      user_id: driverId,
      order_id: orderId,
      title: 'New Order Assigned',
      message: `You have been assigned to order ${orderTrackingId}. Pickup scheduled for ${formattedTime}`,
      type: 'assignment',
      read: false,
      link: `/driver/calendar`,
    }

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([notification])

    if (notificationError) {
      console.error('  ❌ Failed to create driver notification:', notificationError)
      return false
    }

    console.log(`  ✅ Notification created successfully`)
    return true
  } catch (error) {
    console.error('  ❌ Error in notifyDriverAssignment:', error)
    return false
  }
}

export async function POST() {
  console.log('🚀 ===== AUTO-ASSIGNMENT STARTED =====')
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ENV ERROR] Missing Supabase credentials.')
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Get current time in PH timezone
    const nowPH = utcToZonedTime(new Date(), TIMEZONE)
    const todayPH = formatDate(nowPH, 'yyyy-MM-dd')
    
    console.log(`📅 Current PH time: ${formatDate(nowPH, 'yyyy-MM-dd HH:mm:ss')}`)
    console.log(`📅 Processing auto-assignment for date: ${todayPH}`)

    // Get unassigned orders with client_id for proximity lookup
    console.log('🔍 Fetching unassigned orders...')
    const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id, tracking_id, pickup_timestamp, estimated_total_duration, client_id')
    .eq('status', 'order_placed')

    if (orderError) {
      console.error('❌ Error fetching orders:', orderError)
      throw orderError
    }

    console.log(`📦 Found ${orders?.length || 0} orders with status 'order_placed'`)

    if (!orders || orders.length === 0) {
      console.log('✅ No unassigned orders found.')
      return NextResponse.json({ message: 'No unassigned orders found.' }, { status: 200 })
    }

    // Filter out orders that are in the past (before today)
    console.log('🔍 Filtering out past orders...')
    const validOrders = orders.filter(order => {
      if (!order.pickup_timestamp) {
        console.log(`⚠️  Order ${order.id}: No pickup_timestamp`)
        return false
      }
      
      const pickupUtc = new Date(order.pickup_timestamp)
      const pickupPH = utcToZonedTime(pickupUtc, TIMEZONE)
      const pickupDateStr = formatDate(pickupPH, 'yyyy-MM-dd')
      
      const isValid = pickupDateStr >= todayPH
      console.log(`  Order ${order.id}: pickup=${pickupDateStr}, valid=${isValid}`)
      
      return isValid
    })

    console.log(`✅ Found ${orders.length} total orders, ${validOrders.length} are not in the past`)

    if (validOrders.length === 0) {
      console.log('⚠️  No valid orders found (all orders are in the past).')
      return NextResponse.json({ 
        message: 'No valid orders found (all orders are in the past).',
        totalOrders: orders.length,
        validOrders: 0,
        successfulAssignments: 0,
        skippedPastOrders: orders.length
      }, { status: 200 })
    }

    // Get all drivers
    console.log('🔍 Fetching drivers...')
    const { data: drivers, error: driverError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'driver')

    if (driverError) {
      console.error('❌ Error fetching drivers:', driverError)
      throw driverError
    }

    console.log(`👥 Found ${drivers?.length || 0} drivers`)
    drivers?.forEach(d => console.log(`  - ${d.first_name} ${d.last_name} (${d.id})`))

    if (!drivers || drivers.length === 0) {
      console.error('❌ No drivers found.')
      return NextResponse.json({ error: 'No drivers found.' }, { status: 400 })
    }

    // Group orders by date for better processing
    const ordersByDate = groupOrdersByDate(validOrders)
    console.log(`📊 Orders grouped by ${Object.keys(ordersByDate).length} dates`)
    Object.entries(ordersByDate).forEach(([date, orders]) => {
      console.log(`  ${date}: ${orders.length} orders`)
    })

    const assignments: Array<{
      orderId: string
      orderTrackingId: string 
      driverId: string
      startTime: string
      endTime: string
      availabilityBlockId: string
      driverName: string
    }> = []

    // Process each date separately to ensure proper distribution
    for (const [dateStr, dateOrders] of Object.entries(ordersByDate)) {
      console.log(`\n🔄 ===== Processing date: ${dateStr} =====`)
      console.log(`📦 ${dateOrders.length} orders to assign`)
      
      const dateAssignments = await processOrdersForDate(
        supabase,
        dateOrders,
        drivers,
        dateStr
      )
      
      console.log(`✅ ${dateAssignments.length} assignments made for ${dateStr}`)
      assignments.push(...dateAssignments)
    }

    console.log(`\n💾 ===== SAVING ASSIGNMENTS TO DATABASE =====`)
    console.log(`Total assignments to save: ${assignments.length}`)

    // Execute all assignments in database
    let successCount = 0
    const failedAssignments: string[] = []

    for (const assignment of assignments) {
      console.log(`\n💾 Processing assignment for order ${assignment.orderId}`)
      console.log(`  Driver: ${assignment.driverName}`)
      console.log(`  Time: ${assignment.startTime} to ${assignment.endTime}`)
      
      try {
        const startDateTime = new Date(assignment.startTime)
        const endDateTime = new Date(assignment.endTime)
        const durationMins = (endDateTime.getTime() - startDateTime.getTime()) / 60000

        console.log(`  Duration: ${durationMins} minutes`)

        // Update order with assignment
        console.log(`  📝 Updating order...`)
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            driver_id: assignment.driverId,
            pickup_timestamp: startDateTime.toISOString(),
            estimated_total_duration: durationMins,
            estimated_end_timestamp: endDateTime.toISOString(),
            status: 'driver_assigned',
            updated_at: new Date().toISOString(),
          })
          .eq('id', assignment.orderId)

        if (orderUpdateError) {
          console.error(`  ❌ Error updating order:`, orderUpdateError)
          throw orderUpdateError
        }
        console.log(`  ✅ Order updated`)

        // Check if time slot already exists for this driver and time
        console.log(`  🔍 Checking for existing time slot...`)
        const { data: existingSlot, error: checkError } = await supabase
          .from('driver_time_slots')
          .select('id, status, order_id')
          .eq('driver_id', assignment.driverId)
          .eq('start_time', startDateTime.toISOString())
          .eq('end_time', endDateTime.toISOString())
          .maybeSingle()

        if (checkError) {
          console.error(`  ❌ Error checking existing slot:`, checkError)
          throw checkError
        }

        if (existingSlot) {
          console.log(`  🔄 Existing time slot found (ID: ${existingSlot.id}, status: ${existingSlot.status})`)
          console.log(`  📝 Updating existing time slot...`)
          
          const { error: updateSlotError } = await supabase
            .from('driver_time_slots')
            .update({
              order_id: assignment.orderId,
              status: 'scheduled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSlot.id)

          if (updateSlotError) {
            console.error(`  ❌ Error updating time slot:`, updateSlotError)
            throw updateSlotError
          }
          console.log(`  ✅ Time slot updated`)
        } else {
          console.log(`  ✨ No existing time slot - creating new one...`)
          
          const { error: timeSlotError } = await supabase
            .from('driver_time_slots')
            .insert({
              driver_id: assignment.driverId,
              driver_availability_id: assignment.availabilityBlockId,
              order_id: assignment.orderId,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              status: 'scheduled',
            })

          if (timeSlotError) {
            console.error(`  ❌ Error creating time slot:`, timeSlotError)
            throw timeSlotError
          }
          console.log(`  ✅ Time slot created`)
        }

        console.log(`  🔔 Sending notification to driver...`)
        const notificationSent = await notifyDriverAssignment(
          supabase,
          assignment.driverId,
          assignment.orderId,
          assignment.orderTrackingId,
          assignment.startTime
        )

        if (notificationSent) {
          console.log(`  ✅ Driver notified successfully`)
        }

        successCount++
        console.log(`✅ Successfully assigned order ${assignment.orderId} to ${assignment.driverName}`)
      } catch (err) {
        console.error(`❌ Failed to assign order ${assignment.orderId}:`, err)
        failedAssignments.push(assignment.orderId)
      }
    }

    const response = {
      message: `Successfully assigned ${successCount} out of ${validOrders.length} valid orders.`,
      totalOrders: orders.length,
      validOrders: validOrders.length,
      successfulAssignments: successCount,
      failedAssignments: failedAssignments.length,
      skippedPastOrders: orders.length - validOrders.length,
      failedOrderIds: failedAssignments
    }

    console.log('\n🎉 ===== AUTO-ASSIGNMENT COMPLETED =====')
    console.log('📊 Final result:', JSON.stringify(response, null, 2))
    return NextResponse.json(response, { status: 200 })

  } catch (err: unknown) {
    const error = err as Error
    console.error('\n💥 ===== AUTO ASSIGN ERROR =====')
    console.error('Error message:', error.message)
    console.error('Stack trace:', error.stack)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Haversine distance calculation for proximity
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => x * Math.PI / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}



// Get last drop-off locations for each driver
async function getDriverLastDropoffToday(
  supabase: any,
  driverId: string,
  dateStr: string,
  beforeTimestamp: string
): Promise<{ latitude: number; longitude: number; timestamp: string } | null> {
  
  const dayStart = zonedTimeToUtc(`${dateStr}T00:00:00`, TIMEZONE)
  const dayEnd = zonedTimeToUtc(`${dateStr}T23:59:59`, TIMEZONE)
  
  const { data: lastOrders, error } = await supabase
    .from('orders')
    .select(`
      estimated_end_timestamp,
      order_dropoffs (
        latitude,
        longitude,
        sequence
      )
    `)
    .eq('driver_id', driverId)
    .gte('estimated_end_timestamp', dayStart.toISOString())
    .lt('estimated_end_timestamp', beforeTimestamp)
    .in('status', ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup', 'item_being_delivered','delivered'])
    .order('estimated_end_timestamp', { ascending: false })
    .limit(1)

  if (error || !lastOrders || lastOrders.length === 0) {
    return null
  }

  const lastDropoff = lastOrders[0].order_dropoffs
    ?.sort((a: any, b: any) => b.sequence - a.sequence)[0]
  
  if (lastDropoff) {
    return {
      latitude: lastDropoff.latitude,
      longitude: lastDropoff.longitude,
      timestamp: lastOrders[0].estimated_end_timestamp
    }
  }
  
  return null
}

// Get last drop-off locations for each driver (for scoring)
async function getDriverLastDropoffs(
  supabase: any, 
  drivers: Driver[], 
  beforeTimestamp: string
): Promise<Record<string, { latitude: number; longitude: number; timestamp: string }>> {
  console.log(`  🔍 Fetching last dropoffs for ${drivers.length} drivers before ${beforeTimestamp}`)
  
  const driverIds = drivers.map(d => d.id)
  
  const { data: lastOrders, error } = await supabase
    .from('orders')
    .select(`
      driver_id,
      estimated_end_timestamp,
      order_dropoffs (
        latitude,
        longitude,
        sequence
      )
    `)
    .in('driver_id', driverIds)
    .lt('estimated_end_timestamp', beforeTimestamp)
    .in('status', ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup', 'item_being_delivered', 'delivered'])
    .order('estimated_end_timestamp', { ascending: false })

  if (error) {
    console.error('  ❌ Error fetching driver last dropoffs:', error)
    return {}
  }

  console.log(`  📍 Found ${lastOrders?.length || 0} orders with dropoffs`)

  const result: Record<string, { latitude: number; longitude: number; timestamp: string }> = {}
  
  for (const order of lastOrders || []) {
    if (!result[order.driver_id]) {
      const lastDropoff = order.order_dropoffs
        ?.sort((a: any, b: any) => b.sequence - a.sequence)[0]
      
      if (lastDropoff) {
        result[order.driver_id] = {
          latitude: lastDropoff.latitude,
          longitude: lastDropoff.longitude,
          timestamp: order.estimated_end_timestamp
        }
        const driver = drivers.find(d => d.id === order.driver_id)
        console.log(`    📍 ${driver?.first_name}: Last at (${lastDropoff.latitude}, ${lastDropoff.longitude})`)
      }
    }
  }
  
  console.log(`  ✅ Found last dropoffs for ${Object.keys(result).length} drivers`)
  return result
}


// Calculate driver score based on distance and workload
function calculateDriverScore(
  driverId: string,
  lastDropoffs: Record<string, any>,
  pickupLat: number,
  pickupLng: number,
  driverWorkload: Record<string, number>
): { score: number; distance: number } {
  const lastDropoff = lastDropoffs[driverId]
  
  let distance = Infinity
  let distanceScore = 100
  
  if (lastDropoff) {
    distance = haversineDistance(
      lastDropoff.latitude,
      lastDropoff.longitude,
      pickupLat,
      pickupLng
    )
    distanceScore = Math.min(distance * 2, 100)
  }
  
  const maxWorkload = Math.max(...Object.values(driverWorkload))
  const workloadScore = maxWorkload > 0 ? (driverWorkload[driverId] / maxWorkload) * 30 : 0
  
  const score = (distanceScore * 0.7) + (workloadScore * 0.3)
  
  return { score, distance }
}

// Group orders by their pickup date
function groupOrdersByDate(orders: Order[]): Record<string, Order[]> {
  console.log('📊 Grouping orders by date...')
  
  const grouped = orders.reduce((acc, order) => {
    const pickupUtc = new Date(order.pickup_timestamp)
    const pickupPH = utcToZonedTime(pickupUtc, TIMEZONE)
    const dateStr = formatDate(pickupPH, 'yyyy-MM-dd')
    
    if (!acc[dateStr]) {
      acc[dateStr] = []
    }
    acc[dateStr].push(order)
    
    return acc
  }, {} as Record<string, Order[]>)
  
  return grouped
}

// Process all orders for a specific date with proximity-based assignment
async function processOrdersForDate(
  supabase: any,
  orders: Order[],
  drivers: Driver[],
  dateStr: string
): Promise<Array<{
  orderId: string
  orderTrackingId: string
  driverId: string
  startTime: string
  endTime: string
  availabilityBlockId: string
  driverName: string
}>> {
  
  console.log(`\n🔄 Processing ${orders.length} orders for ${dateStr}`)
  
  // Sort orders by pickup time (earliest first)
  const sortedOrders = orders.sort((a, b) => 
    new Date(a.pickup_timestamp).getTime() - new Date(b.pickup_timestamp).getTime()
  )
  
  console.log('📋 Order sequence:')
  sortedOrders.forEach((order, idx) => {
    const pickupPH = utcToZonedTime(new Date(order.pickup_timestamp), TIMEZONE)
    console.log(`  ${idx + 1}. Order ${order.id} - ${formatDate(pickupPH, 'HH:mm')} (${order.estimated_total_duration}min)`)
  })
  
  const assignments: Array<{
    orderId: string
    orderTrackingId: string
    driverId: string
    startTime: string
    endTime: string
    availabilityBlockId: string
    driverName: string
  }> = []
  
  const dateAssignments: PendingAssignment[] = []
  
  const driverWorkload: Record<string, number> = {}
  drivers.forEach(driver => {
    driverWorkload[driver.id] = 0
  })
  
  // Process each order
  for (const order of sortedOrders) {
    console.log(`\n🔍 Finding driver for order ${order.id}`)
    
    // if (!order.pickup_timestamp || !order.estimated_total_duration) {
    //   console.log(`  ⚠️  Skipping: missing pickup_timestamp or estimated_total_duration`)
    //   continue
    // }
    
    const assignment = await findBestDriverAssignmentForDate(
      supabase,
      order,
      drivers,
      dateStr,
      dateAssignments,
      driverWorkload
    )
    
    if (assignment) {
      const driverName = drivers.find(d => d.id === assignment.driverId)?.first_name + ' ' + 
                         drivers.find(d => d.id === assignment.driverId)?.last_name || 'Unknown'
      
      assignments.push({
        ...assignment,
         orderTrackingId: order.tracking_id,  
         driverName
      })
      
      dateAssignments.push({
        driverId: assignment.driverId,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        orderId: assignment.orderId
      })
      
      const duration = (new Date(assignment.endTime).getTime() - new Date(assignment.startTime).getTime()) / 60000
      driverWorkload[assignment.driverId] += duration
      
      console.log(`  ✅ Assigned to ${driverName} (${duration}min)`)
    } else {
      console.log(`  ❌ No available driver found`)
    }
  }
  
  console.log(`\n📊 Driver workload distribution for ${dateStr}:`)
  Object.entries(driverWorkload).forEach(([driverId, workload]) => {
    const driver = drivers.find(d => d.id === driverId)
    console.log(`  ${driver?.first_name} ${driver?.last_name}: ${workload} minutes`)
  })
  
  return assignments
}

// Enhanced driver assignment with proximity and workload scoring
async function findBestDriverAssignmentForDate(
  supabase: any,
  order: Order,
  drivers: Driver[],
  dateStr: string,
  existingAssignments: PendingAssignment[],
  driverWorkload: Record<string, number>
): Promise<{
  orderId: string
  driverId: string
  startTime: string
  endTime: string
  availabilityBlockId: string
} | null> {
  
  console.log(`  🔍 Finding best driver for order ${order.id}`)
  
  const dayStart = zonedTimeToUtc(`${dateStr}T00:00:00`, TIMEZONE)
  const dayEnd = zonedTimeToUtc(`${dateStr}T23:59:59`, TIMEZONE)
  
  console.log(`    Day range: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`)
  
  // Get pickup location
  console.log(`    🔍 Fetching client location (client_id: ${order.client_id})`)
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('pickup_latitude, pickup_longitude')
    .eq('id', order.client_id)
    .single()

  if (clientError || !client || !client.pickup_latitude || !client.pickup_longitude) {
    console.log(`    ⚠️  Could not get pickup location, using workload-based assignment`)
    return findBestDriverByWorkload(supabase, order, drivers, dayStart, dayEnd, existingAssignments, driverWorkload)
  }

  console.log(`    📍 Pickup location: (${client.pickup_latitude}, ${client.pickup_longitude})`)

  const driverLastDropoffs = await getDriverLastDropoffs(supabase, drivers, order.pickup_timestamp)
  
  const driverScores: DriverScore[] = []
  
  console.log(`    🎯 Scoring ${drivers.length} drivers...`)
  for (const driver of drivers) {
    const timeSlot = await findAvailableTimeSlotForDriver(
      supabase,
      driver.id,
      order,
      dayStart,
      dayEnd,
      existingAssignments,
      { latitude: client.pickup_latitude, longitude: client.pickup_longitude }
    )
    
    if (timeSlot) {
      const { score, distance } = calculateDriverScore(
        driver.id,
        driverLastDropoffs,
        client.pickup_latitude,
        client.pickup_longitude,
        driverWorkload
      )
      
      driverScores.push({
        driver,
        timeSlot,
        score,
        distance
      })
      
      console.log(`      ${driver.first_name}: score=${score.toFixed(2)}, distance=${distance === Infinity ? 'N/A' : distance.toFixed(2) + 'km'}, workload=${driverWorkload[driver.id]}min`)
    } else {
      console.log(`      ${driver.first_name}: No available time slot`)
    }
  }
  
  driverScores.sort((a, b) => a.score - b.score)
  
  if (driverScores.length > 0) {
    const best = driverScores[0]
    console.log(`    🎯 Best match: ${best.driver.first_name} ${best.driver.last_name}`)
    
    return {
      orderId: order.id,
      driverId: best.driver.id,
      startTime: best.timeSlot.start_time,
      endTime: best.timeSlot.end_time,
      availabilityBlockId: best.timeSlot.availabilityBlockId
    }
  }
  
  console.log(`    ❌ No drivers available`)
  return null
}

// Fallback to workload-based assignment
async function findBestDriverByWorkload(
  supabase: any,
  order: Order,
  drivers: Driver[],
  dayStart: Date,
  dayEnd: Date,
  existingAssignments: PendingAssignment[],
  driverWorkload: Record<string, number>
): Promise<{
  orderId: string
  driverId: string
  startTime: string
  endTime: string
  availabilityBlockId: string
} | null> {
  
  console.log(`    🔄 Using workload-based assignment`)
  
  const sortedDrivers = [...drivers].sort((a, b) => 
    driverWorkload[a.id] - driverWorkload[b.id]
  )
  
  console.log(`    📊 Drivers sorted by workload:`)
  sortedDrivers.forEach(d => {
    console.log(`      ${d.first_name}: ${driverWorkload[d.id]}min`)
  })
  
  for (const driver of sortedDrivers) {
    console.log(`    🔍 Checking ${driver.first_name}...`)
    const timeSlot = await findAvailableTimeSlotForDriver(
      supabase,
      driver.id,
      order,
      dayStart,
      dayEnd,
      existingAssignments,
      null
    )
    
    if (timeSlot) {
      console.log(`      ✅ Found available slot`)
      return {
        orderId: order.id,
        driverId: driver.id,
        startTime: timeSlot.start_time,
        endTime: timeSlot.end_time,
        availabilityBlockId: timeSlot.availabilityBlockId
      }
    } else {
      console.log(`      ❌ No available slot`)
    }
  }
  
  return null
}

// Find available time slot for specific driver
async function findAvailableTimeSlotForDriver(
  supabase: any,
  driverId: string,
  order: Order,
  dayStart: Date,
  dayEnd: Date,
  pendingAssignments: PendingAssignment[],
  pickupLocation: { latitude: number; longitude: number } | null
): Promise<TimeSlotOption | null> {
  
  console.log(`      🔍 Finding time slot for driver ${driverId}`)
  
  // Get driver availability
  const { data: availabilities, error: availError } = await supabase
    .from('driver_availability')
    .select('id, start_time, end_time')
    .eq('driver_id', driverId)
    .lte('start_time', dayEnd.toISOString())
    .gte('end_time', dayStart.toISOString())

  if (availError) {
    console.error(`      ❌ Error fetching availability:`, availError)
    return null
  }

  console.log(`      📅 Found ${availabilities?.length || 0} availability blocks`)

  if (!availabilities || availabilities.length === 0) {
    console.log(`      ⚠️  No availability blocks`)
    return null
  }

  // Get existing slots
  const { data: existingSlots, error: slotsError } = await supabase
    .from('driver_time_slots')
    .select('id, start_time, end_time, status, order_id')
    .eq('driver_id', driverId)
    .lte('start_time', dayEnd.toISOString())
    .gte('end_time', dayStart.toISOString())
    .in('status', ['scheduled', 'completed'])

  if (slotsError) {
    console.error(`      ❌ Error fetching existing slots:`, slotsError)
    return null
  }

  console.log(`      📋 Found ${existingSlots?.length || 0} existing time slots`)

  const existingTimeSlots: ExistingTimeSlot[] = existingSlots || []
  const driverPendingAssignments = pendingAssignments.filter(pa => pa.driverId === driverId)
  
  console.log(`      ⏳ ${driverPendingAssignments.length} pending assignments`)

  const allConflictingSlots = [
    ...existingTimeSlots,
    ...driverPendingAssignments.map((pa, index) => ({
      id: `pending_${index}`,
      driver_id: driverId,
      start_time: pa.startTime,
      end_time: pa.endTime,
      status: 'pending' as const,
      order_id: pa.orderId
    }))
  ]

  console.log(`      🚫 Total conflicting slots: ${allConflictingSlots.length}`)

  // Process availability blocks
  const availableBlocks: AvailabilityBlock[] = availabilities
    .map((block) => {
      const blockStartStr = block.start_time.endsWith('Z') ? block.start_time : block.start_time + 'Z'
      const blockEndStr = block.end_time.endsWith('Z') ? block.end_time : block.end_time + 'Z'
      const blockStart = new Date(blockStartStr)
      const blockEnd = new Date(blockEndStr)
      const effectiveStart = new Date(Math.max(blockStart.getTime(), dayStart.getTime()))
      const effectiveEnd = new Date(Math.min(blockEnd.getTime(), dayEnd.getTime()))
      
      if (effectiveStart < effectiveEnd) {
        return {
          id: block.id,
          driver_id: driverId,
          start_time: block.start_time,
          end_time: block.end_time,
        }
      }
      return null
    })
    .filter(Boolean) as AvailabilityBlock[]

  console.log(`      ✅ ${availableBlocks.length} valid availability blocks`)

  if (availableBlocks.length === 0) {
    return null
  }

  let travelTimeToPickup = 0
  const WAREHOUSE_COORDS = { lat: 14.8506156, lon: 120.8238576 }

  if (pickupLocation) {
    const pickupTime = new Date(order.pickup_timestamp)
    const dateStr = formatDate(utcToZonedTime(pickupTime, TIMEZONE), 'yyyy-MM-dd')

    const hasOrdersBeforeThisPickup = allConflictingSlots.some(slot => {
      const slotDate = formatDate(utcToZonedTime(new Date(slot.start_time), TIMEZONE), 'yyyy-MM-dd')
      const slotEndTime = new Date(slot.end_time)
      return slotDate === dateStr && slotEndTime < pickupTime && slot.status !== 'pending'
    })

    if (hasOrdersBeforeThisPickup) {
      const driverLastDropoffToday = await getDriverLastDropoffToday(supabase, driverId, dateStr, order.pickup_timestamp)
      if (driverLastDropoffToday) {
        const distance = haversineDistance(
          driverLastDropoffToday.latitude,
          driverLastDropoffToday.longitude,
          pickupLocation.latitude,
          pickupLocation.longitude
        )
        travelTimeToPickup = Math.ceil((distance / 40) * 60)
        console.log(`      🚗 Travel from last dropoff: ${distance.toFixed(2)}km = ${travelTimeToPickup}min`)
      }
    } else {
      const distance = haversineDistance(
        WAREHOUSE_COORDS.lat,
        WAREHOUSE_COORDS.lon,
        pickupLocation.latitude,
        pickupLocation.longitude
      )
      travelTimeToPickup = Math.ceil((distance / 40) * 60)
      console.log(`      🏭 Travel from warehouse: ${distance.toFixed(2)}km = ${travelTimeToPickup}min`)
    }
  }

  const totalDurationNeeded = order.estimated_total_duration + travelTimeToPickup
  console.log(`      ⏱️  Total duration: ${order.estimated_total_duration}min (order) + ${travelTimeToPickup}min (travel) = ${totalDurationNeeded}min`)

  const timeSlotOptions = generateTimeSlotOptionsForDriver(
    availableBlocks,
    allConflictingSlots,
    totalDurationNeeded,
    dayStart,
    dayEnd
  )

  console.log(`      🎰 Generated ${timeSlotOptions.length} possible time slots`)

  if (timeSlotOptions.length > 0) {
    const firstSlot = timeSlotOptions[0]
    const slotStartPH = utcToZonedTime(new Date(firstSlot.start_time), TIMEZONE)
    const slotEndPH = utcToZonedTime(new Date(firstSlot.end_time), TIMEZONE)
    console.log(`      ✅ Returning earliest slot: ${formatDate(slotStartPH, 'HH:mm')} - ${formatDate(slotEndPH, 'HH:mm')}`)
  }

  return timeSlotOptions.length > 0 ? timeSlotOptions[0] : null
}

// Generate time slot options for a driver (exact match to drawer logic)
function generateTimeSlotOptionsForDriver(
  availableBlocks: AvailabilityBlock[],
  existingTimeSlots: ExistingTimeSlot[],
  estimatedDuration: number,
  dayStart: Date,
  dayEnd: Date
): TimeSlotOption[] {
  
  // Round up the estimated duration
  const roundedDuration = roundUpDuration(estimatedDuration)
  const durationMs = roundedDuration * 60 * 1000
  const bufferMs = BUFFER_MINUTES * 60 * 1000

  const options: TimeSlotOption[] = []

  // Create buffered time slots from existing bookings (including pending ones)
  const bufferedExistingSlots = existingTimeSlots.map(slot => {
    const existingStartStr = slot.start_time.endsWith('Z') ? slot.start_time : slot.start_time + 'Z'
    const existingEndStr = slot.end_time.endsWith('Z') ? slot.end_time : slot.end_time + 'Z'
    
    const existingStart = new Date(existingStartStr)
    const existingEnd = new Date(existingEndStr)
    
    return {
      ...slot,
      bufferedStart: new Date(existingStart.getTime() - bufferMs),
      bufferedEnd: new Date(existingEnd.getTime() + bufferMs),
      originalStart: existingStart,
      originalEnd: existingEnd
    }
  })

  availableBlocks.forEach(block => {
  const blockStartStr = block.start_time.endsWith('Z') ? block.start_time : block.start_time + 'Z'
  const blockEndStr = block.end_time.endsWith('Z') ? block.end_time : block.end_time + 'Z'
  const blockStart = new Date(blockStartStr)
  const blockEnd = new Date(blockEndStr)
    
    // Calculate effective window for this day
    const effectiveStart = new Date(Math.max(blockStart.getTime(), dayStart.getTime()))
    const effectiveEnd = new Date(Math.min(blockEnd.getTime(), dayEnd.getTime()))
    
    if (effectiveStart >= effectiveEnd) return

    // Generate slots at SLOT_INTERVAL_MINUTES intervals
    let currentSlotStart = new Date(effectiveStart)
    
    // Round up to the nearest slot interval
    const startMinutes = currentSlotStart.getMinutes()
    const remainder = startMinutes % SLOT_INTERVAL_MINUTES
    if (remainder !== 0) {
      currentSlotStart.setMinutes(startMinutes + (SLOT_INTERVAL_MINUTES - remainder), 0, 0)
    }

    while (currentSlotStart < effectiveEnd) {
      const slotEnd = new Date(currentSlotStart.getTime() + durationMs)
      
      // Check if slot fits within the availability block
      if (slotEnd <= effectiveEnd) {
        // Check for conflicts with buffered existing time slots (including pending assignments)
        const hasConflict = bufferedExistingSlots.some(existingSlot => {
          return currentSlotStart < existingSlot.bufferedEnd && existingSlot.bufferedStart < slotEnd
        })

        if (!hasConflict) {
          options.push({
            id: `${currentSlotStart.getTime()}_${slotEnd.getTime()}`,
            driver_id: block.driver_id,
            start_time: currentSlotStart.toISOString(),
            end_time: slotEnd.toISOString(),
            availabilityBlockId: block.id
          })
        }
      }
      
      // Move to next slot interval
      currentSlotStart = new Date(currentSlotStart.getTime() + (SLOT_INTERVAL_MINUTES * 60 * 1000))
    }
  })

  // Sort options by start time (earliest first)
  options.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  
  return options
}

// Helper function to round up duration (matching drawer logic)
function roundUpDuration(minutes: number): number {
  return Math.ceil(minutes / ROUND_UP_TO_MINUTES) * ROUND_UP_TO_MINUTES
}