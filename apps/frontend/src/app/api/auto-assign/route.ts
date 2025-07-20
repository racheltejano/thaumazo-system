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

// Track assignments during this execution to prevent overlaps
type PendingAssignment = {
  driverId: string
  startTime: string
  endTime: string
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
    
    // Get unassigned orders that are NOT past today's date
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, pickup_timestamp, estimated_total_duration')
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
      return NextResponse.json({ message: 'No valid orders found (all orders are in the past).' }, { status: 200 })
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

    // Sort orders by pickup timestamp (earliest first) for fair assignment
    validOrders.sort((a, b) => new Date(a.pickup_timestamp).getTime() - new Date(b.pickup_timestamp).getTime())

    const assignments: Array<{
      orderId: string
      driverId: string
      startTime: string
      endTime: string
      availabilityBlockId: string
    }> = []

    // Track pending assignments to avoid overlaps within this execution
    const pendingAssignments: PendingAssignment[] = []

    // Process each order with round-robin driver assignment for better distribution
    let driverIndex = 0
    for (const order of validOrders) {
      if (!order.pickup_timestamp || !order.estimated_total_duration) {
        console.log(`Skipping order ${order.id}: missing pickup_timestamp or estimated_total_duration`)
        continue
      }

      // Try to find assignment starting from current driver index
      const assignment = await findBestDriverAssignment(
        supabase, 
        order, 
        drivers, 
        pendingAssignments,
        driverIndex
      )
      
      if (assignment) {
        assignments.push(assignment)
        
        // Add to pending assignments to prevent future overlaps
        pendingAssignments.push({
          driverId: assignment.driverId,
          startTime: assignment.startTime,
          endTime: assignment.endTime
        })
        
        // Move to next driver for better distribution
        driverIndex = (driverIndex + 1) % drivers.length
        
        console.log(`Assigned order ${order.id} to driver ${assignment.driverId}`)
      } else {
        console.log(`No available driver found for order ${order.id}`)
      }
    }

    // Execute all assignments
    let successCount = 0
    for (const assignment of assignments) {
      try {
        const startDateTime = new Date(assignment.startTime)
        const endDateTime = new Date(assignment.endTime)
        const durationMins = (endDateTime.getTime() - startDateTime.getTime()) / 60000

        // Update order
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
      } catch (err) {
        console.error(`Failed to assign order ${assignment.orderId}:`, err)
      }
    }

    return NextResponse.json({ 
      message: `Successfully assigned ${successCount} out of ${validOrders.length} valid orders.`,
      totalOrders: orders.length,
      validOrders: validOrders.length,
      successfulAssignments: successCount,
      skippedPastOrders: orders.length - validOrders.length
    }, { status: 200 })

  } catch (err: unknown) {
    const error = err as Error
    console.error('[AUTO ASSIGN ERROR]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper function to round up duration (matching drawer logic)
function roundUpDuration(minutes: number): number {
  return Math.ceil(minutes / ROUND_UP_TO_MINUTES) * ROUND_UP_TO_MINUTES
}

// Main function to find best driver assignment for an order with round-robin distribution
async function findBestDriverAssignment(
  supabase: any,
  order: Order,
  drivers: Driver[],
  pendingAssignments: PendingAssignment[],
  startDriverIndex: number = 0
): Promise<{
  orderId: string
  driverId: string
  startTime: string
  endTime: string
  availabilityBlockId: string
} | null> {
  
  // Convert UTC pickup timestamp to PH time
  const pickupUtc = new Date(order.pickup_timestamp)
  const pickupPH = utcToZonedTime(pickupUtc, TIMEZONE)
  const pickupDateStr = formatDate(pickupPH, 'yyyy-MM-dd')
  
  const dayStart = zonedTimeToUtc(`${pickupDateStr}T00:00:00`, TIMEZONE)
  const dayEnd = zonedTimeToUtc(`${pickupDateStr}T23:59:59`, TIMEZONE)

  // Try drivers starting from the specified index for better distribution
  for (let i = 0; i < drivers.length; i++) {
    const driverIndex = (startDriverIndex + i) % drivers.length
    const driver = drivers[driverIndex]
    
    const timeSlot = await findAvailableTimeSlot(
      supabase,
      driver.id,
      order,
      pickupPH,
      dayStart,
      dayEnd,
      pendingAssignments
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

// Find available time slot for a specific driver (matching drawer logic + pending assignments check)
async function findAvailableTimeSlot(
  supabase: any,
  driverId: string,
  order: Order,
  pickupDate: Date,
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

  // Get existing time slots for the driver on this day
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

  // Add pending assignments for this driver to existing slots to prevent overlaps
  const driverPendingAssignments = pendingAssignments.filter(pa => pa.driverId === driverId)
  const combinedExistingSlots = [
    ...existingTimeSlots,
    ...driverPendingAssignments.map((pa, index) => ({
      id: `pending_${index}`,
      driver_id: driverId,
      start_time: pa.startTime,
      end_time: pa.endTime,
      status: 'pending',
      order_id: null
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
  const timeSlotOptions = generateTimeSlotOptions(
    availableBlocks,
    combinedExistingSlots, // Use combined slots that include pending assignments
    pickupDate,
    order.estimated_total_duration,
    dayStart,
    dayEnd
  )

  // Return the first available slot (earliest time)
  return timeSlotOptions.length > 0 ? timeSlotOptions[0] : null
}

// Generate time slot options (matching drawer logic)
function generateTimeSlotOptions(
  availableBlocks: AvailabilityBlock[],
  existingTimeSlots: ExistingTimeSlot[],
  pickupDate: Date,
  estimatedDuration: number,
  dayStart: Date,
  dayEnd: Date
): TimeSlotOption[] {
  
  const pickupDateStr = formatDate(pickupDate, 'yyyy-MM-dd')
  const dayStartForDate = zonedTimeToUtc(`${pickupDateStr}T00:00:00`, TIMEZONE)
  const dayEndForDate = zonedTimeToUtc(`${pickupDateStr}T23:59:59`, TIMEZONE)
  
  // Round up the estimated duration
  const roundedDuration = roundUpDuration(estimatedDuration)
  const durationMs = roundedDuration * 60 * 1000
  const bufferMs = BUFFER_MINUTES * 60 * 1000

  const options: TimeSlotOption[] = []

  // Create buffered time slots from existing bookings
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
    const effectiveStart = new Date(Math.max(blockStart.getTime(), dayStartForDate.getTime()))
    const effectiveEnd = new Date(Math.min(blockEnd.getTime(), dayEndForDate.getTime()))
    
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
        // Check for conflicts with buffered existing time slots (including pending ones)
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