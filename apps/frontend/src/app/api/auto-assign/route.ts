import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { format as formatDate } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
  pickup_timestamp: string
  estimated_total_duration: number
  client_id: string // Added for proximity lookup
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

export async function POST() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[ENV ERROR] Missing Supabase credentials.')
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Get current time in PH timezone
    const nowPH = utcToZonedTime(new Date(), TIMEZONE)
    const todayPH = formatDate(nowPH, 'yyyy-MM-dd')
    
    console.log(`Processing auto-assignment for date: ${todayPH}`)

    // Get unassigned orders with client_id for proximity lookup
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, pickup_timestamp, estimated_total_duration, client_id')
      .eq('status', 'order_placed')

    if (orderError) throw orderError

    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: 'No unassigned orders found.' }, { status: 200 })
    }

    // Filter out orders that are in the past (before today)
    const validOrders = orders.filter(order => {
      if (!order.pickup_timestamp) return false
      
      const pickupUtc = new Date(order.pickup_timestamp)
      const pickupPH = utcToZonedTime(pickupUtc, TIMEZONE)
      const pickupDateStr = formatDate(pickupPH, 'yyyy-MM-dd')
      
      // Only include orders that are today or in the future
      return pickupDateStr >= todayPH
    })

    console.log(`Found ${orders.length} total orders, ${validOrders.length} are not in the past`)

    if (validOrders.length === 0) {
      return NextResponse.json({ 
        message: 'No valid orders found (all orders are in the past).',
        totalOrders: orders.length,
        validOrders: 0,
        successfulAssignments: 0,
        skippedPastOrders: orders.length
      }, { status: 200 })
    }

    // Get all drivers
    const { data: drivers, error: driverError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'driver')

    if (driverError) throw driverError

    if (!drivers || drivers.length === 0) {
      return NextResponse.json({ error: 'No drivers found.' }, { status: 400 })
    }

    // Group orders by date for better processing
    const ordersByDate = groupOrdersByDate(validOrders)
    console.log(`Orders grouped by ${Object.keys(ordersByDate).length} dates`)

    const assignments: Array<{
      orderId: string
      driverId: string
      startTime: string
      endTime: string
      availabilityBlockId: string
      driverName: string
    }> = []

    // Process each date separately to ensure proper distribution
    for (const [dateStr, dateOrders] of Object.entries(ordersByDate)) {
      console.log(`Processing ${dateOrders.length} orders for date: ${dateStr}`)
      
      const dateAssignments = await processOrdersForDate(
        supabase,
        dateOrders,
        drivers,
        dateStr
      )
      
      assignments.push(...dateAssignments)
    }

    // Execute all assignments in database
    let successCount = 0
    const failedAssignments: string[] = []

    for (const assignment of assignments) {
      try {
        const startDateTime = new Date(assignment.startTime)
        const endDateTime = new Date(assignment.endTime)
        const durationMins = (endDateTime.getTime() - startDateTime.getTime()) / 60000

        // Update order with assignment
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

        if (orderUpdateError) throw orderUpdateError

        // Create time slot entry
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

        if (timeSlotError) throw timeSlotError

        successCount++
        console.log(`✅ Assigned order ${assignment.orderId} to ${assignment.driverName}`)
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

    console.log('Final result:', response)
    return NextResponse.json(response, { status: 200 })

  } catch (err: unknown) {
    const error = err as Error
    console.error('[AUTO ASSIGN ERROR]', error.message)
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
async function getDriverLastDropoffs(
  supabase: any, 
  drivers: Driver[], 
  beforeTimestamp: string
): Promise<Record<string, { latitude: number; longitude: number; timestamp: string; distance?: number }>> {
  const driverIds = drivers.map(d => d.id)
  
  // Get the most recent completed order for each driver
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
    .eq('status', 'completed')
    .order('estimated_end_timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching driver last dropoffs:', error)
    return {}
  }

  const result: Record<string, { latitude: number; longitude: number; timestamp: string }> = {}
  
  for (const order of lastOrders || []) {
    if (!result[order.driver_id]) {
      // Get the last dropoff (highest sequence number)
      const lastDropoff = order.order_dropoffs
        ?.sort((a: any, b: any) => b.sequence - a.sequence)[0]
      
      if (lastDropoff) {
        result[order.driver_id] = {
          latitude: lastDropoff.latitude,
          longitude: lastDropoff.longitude,
          timestamp: order.estimated_end_timestamp
        }
      }
    }
  }
  
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
  
  // Distance component (0-100, lower is better)
  let distance = Infinity
  let distanceScore = 100
  
  if (lastDropoff) {
    distance = haversineDistance(
      lastDropoff.latitude,
      lastDropoff.longitude,
      pickupLat,
      pickupLng
    )
    // Normalize distance (assuming max 50km, adjust as needed)
    distanceScore = Math.min(distance * 2, 100)
  }
  
  // Workload component (0-100, lower is better)
  const maxWorkload = Math.max(...Object.values(driverWorkload))
  const workloadScore = maxWorkload > 0 ? (driverWorkload[driverId] / maxWorkload) * 30 : 0
  
  // Combined score: 70% distance, 30% workload
  const score = (distanceScore * 0.7) + (workloadScore * 0.3)
  
  return { score, distance }
}

// Group orders by their pickup date
function groupOrdersByDate(orders: Order[]): Record<string, Order[]> {
  return orders.reduce((acc, order) => {
    const pickupUtc = new Date(order.pickup_timestamp)
    const pickupPH = utcToZonedTime(pickupUtc, TIMEZONE)
    const dateStr = formatDate(pickupPH, 'yyyy-MM-dd')
    
    if (!acc[dateStr]) {
      acc[dateStr] = []
    }
    acc[dateStr].push(order)
    
    return acc
  }, {} as Record<string, Order[]>)
}

// Process all orders for a specific date with proximity-based assignment
async function processOrdersForDate(
  supabase: any,
  orders: Order[],
  drivers: Driver[],
  dateStr: string
): Promise<Array<{
  orderId: string
  driverId: string
  startTime: string
  endTime: string
  availabilityBlockId: string
  driverName: string
}>> {
  
  console.log(`Processing ${orders.length} orders for ${dateStr}`)
  
  // Sort orders by pickup time (earliest first) for chronological processing
  const sortedOrders = orders.sort((a, b) => 
    new Date(a.pickup_timestamp).getTime() - new Date(b.pickup_timestamp).getTime()
  )
  
  const assignments: Array<{
    orderId: string
    driverId: string
    startTime: string
    endTime: string
    availabilityBlockId: string
    driverName: string
  }> = []
  
  // Track assignments within this date to prevent conflicts
  const dateAssignments: PendingAssignment[] = []
  
  // Track workload per driver for fair distribution
  const driverWorkload: Record<string, number> = {}
  drivers.forEach(driver => {
    driverWorkload[driver.id] = 0
  })
  
  // Process each order
  for (const order of sortedOrders) {
    if (!order.pickup_timestamp || !order.estimated_total_duration) {
      console.log(`Skipping order ${order.id}: missing pickup_timestamp or estimated_total_duration`)
      continue
    }
    
    // Find best driver assignment with proximity and fair distribution
    const assignment = await findBestDriverAssignmentForDate(
      supabase,
      order,
      drivers,
      dateStr,
      dateAssignments,
      driverWorkload
    )
    
    if (assignment) {
      assignments.push({
        ...assignment,
        driverName: drivers.find(d => d.id === assignment.driverId)?.first_name + ' ' + 
                   drivers.find(d => d.id === assignment.driverId)?.last_name || 'Unknown'
      })
      
      // Add to pending assignments to prevent overlaps
      dateAssignments.push({
        driverId: assignment.driverId,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        orderId: assignment.orderId
      })
      
      // Update workload tracking
      const duration = (new Date(assignment.endTime).getTime() - new Date(assignment.startTime).getTime()) / 60000
      driverWorkload[assignment.driverId] += duration
      
      console.log(`📅 ${dateStr}: Assigned order ${order.id} (${duration}min) to driver ${assignment.driverId}`)
    } else {
      console.log(`❌ ${dateStr}: No available driver found for order ${order.id}`)
    }
  }
  
  // Log workload distribution
  console.log(`📊 ${dateStr} - Driver workload distribution:`)
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
  
  const dayStart = zonedTimeToUtc(`${dateStr}T00:00:00`, TIMEZONE)
  const dayEnd = zonedTimeToUtc(`${dateStr}T23:59:59`, TIMEZONE)
  
  // Get pickup location for the current order
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('pickup_latitude, pickup_longitude')
    .eq('id', order.client_id)
    .single()

  if (clientError || !client || !client.pickup_latitude || !client.pickup_longitude) {
    console.log(`Could not get pickup location for order ${order.id}, falling back to workload-based assignment`)
    // Fallback to workload-based assignment
    return findBestDriverByWorkload(supabase, order, drivers, dayStart, dayEnd, existingAssignments, driverWorkload)
  }

  // Get last drop-off locations for each driver
  const driverLastDropoffs = await getDriverLastDropoffs(supabase, drivers, order.pickup_timestamp)
  
  // Score each available driver
  const driverScores: DriverScore[] = []
  
  for (const driver of drivers) {
    const timeSlot = await findAvailableTimeSlotForDriver(
      supabase,
      driver.id,
      order,
      dayStart,
      dayEnd,
      existingAssignments
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
    }
  }
  
  // Sort by score (lowest is best)
  driverScores.sort((a, b) => a.score - b.score)
  
  if (driverScores.length > 0) {
    const best = driverScores[0]
    console.log(`🎯 Best driver for order ${order.id}: ${best.driver.first_name} ${best.driver.last_name} (distance: ${best.distance === Infinity ? 'N/A' : best.distance.toFixed(2) + 'km'}, score: ${best.score.toFixed(2)})`)
    
    return {
      orderId: order.id,
      driverId: best.driver.id,
      startTime: best.timeSlot.start_time,
      endTime: best.timeSlot.end_time,
      availabilityBlockId: best.timeSlot.availabilityBlockId
    }
  }
  
  return null
}

// Fallback to workload-based assignment when location data is unavailable
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
  
  // Sort drivers by current workload (least busy first) for fair distribution
  const sortedDrivers = [...drivers].sort((a, b) => 
    driverWorkload[a.id] - driverWorkload[b.id]
  )
  
  // Try each driver starting with least busy
  for (const driver of sortedDrivers) {
    const timeSlot = await findAvailableTimeSlotForDriver(
      supabase,
      driver.id,
      order,
      dayStart,
      dayEnd,
      existingAssignments
    )
    
    if (timeSlot) {
      return {
        orderId: order.id,
        driverId: driver.id,
        startTime: timeSlot.start_time,
        endTime: timeSlot.end_time,
        availabilityBlockId: timeSlot.availabilityBlockId
      }
    }
  }
  
  return null
}

// Find available time slot for specific driver on specific date
async function findAvailableTimeSlotForDriver(
  supabase: any,
  driverId: string,
  order: Order,
  dayStart: Date,
  dayEnd: Date,
  pendingAssignments: PendingAssignment[]
): Promise<TimeSlotOption | null> {
  
  // Get driver availability for the day
  const { data: availabilities, error: availError } = await supabase
    .from('driver_availability')
    .select('id, start_time, end_time')
    .eq('driver_id', driverId)
    .lte('start_time', dayEnd.toISOString())
    .gte('end_time', dayStart.toISOString())

  if (availError || !availabilities || availabilities.length === 0) {
    return null
  }

  // Get existing database time slots for this driver on this day
  const { data: existingSlots, error: slotsError } = await supabase
    .from('driver_time_slots')
    .select('id, start_time, end_time, status, order_id')
    .eq('driver_id', driverId)
    .lte('start_time', dayEnd.toISOString())
    .gte('end_time', dayStart.toISOString())
    .neq('status', 'cancelled')

  if (slotsError) {
    return null
  }

  const existingTimeSlots: ExistingTimeSlot[] = existingSlots || []

  // Combine existing database slots with pending assignments for this driver
  const driverPendingAssignments = pendingAssignments.filter(pa => pa.driverId === driverId)
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

  // Process availability blocks
  const availableBlocks: AvailabilityBlock[] = availabilities
    .map((block) => {
      const blockStart = new Date(block.start_time)
      const blockEnd = new Date(block.end_time)
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

  if (availableBlocks.length === 0) {
    return null
  }

  // Generate time slot options
  const timeSlotOptions = generateTimeSlotOptionsForDriver(
    availableBlocks,
    allConflictingSlots,
    order.estimated_total_duration,
    dayStart,
    dayEnd
  )

  // Return the first available slot (earliest time)
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
    const blockStart = new Date(block.start_time + 'Z')
    const blockEnd = new Date(block.end_time + 'Z')
    
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