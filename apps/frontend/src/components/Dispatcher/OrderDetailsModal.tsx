import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { OrderInfo } from './OrderInfo'
import { ClientInfo } from './ClientInfo'
import { DropoffInfo } from './DropoffInfo'
import { StatusUpdate } from './StatusUpdate'
import { CancellationModal } from './CancellationModal'
import { getCancellationEmailMessage, type CancellationReasonKey } from './cancellationConfig'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const TIMEZONE = 'Asia/Manila'
const SLOT_INTERVAL_MINUTES = 30
const BUFFER_MINUTES = 10
const ROUND_UP_TO_MINUTES = 10

type Order = {
  id: string
  tracking_id: string
  pickup_date: string
  pickup_time: string
  delivery_window_start: string | null
  delivery_window_end: string | null
  special_instructions: string
  client_id: string
  status: string
  vehicle_type: string | null
  tail_lift_required: boolean | null
  driver_id: string | null
}

type Client = {
  tracking_id: string
  business_name: string
  contact_person: string
  contact_number: string
  email: string | null
  pickup_address: string
  landmark: string | null
  pickup_area: string | null
  pickup_latitude: number | null
  pickup_longitude: number | null
}

type Dropoff = {
  id: string
  dropoff_name: string
  dropoff_address: string
  dropoff_contact: string
  dropoff_phone: string
  sequence: number
  latitude: number | null
  longitude: number | null
}

type Driver = {
  id: string
  first_name: string
  last_name: string
}

type TimeSlotOption = {
  id: string
  start_time: string
  end_time: string
  availabilityBlockId: string
}

type DriverWithSlots = Driver & {
  availableSlots: TimeSlotOption[]
  distance?: number
  workload: number
  lastDropoff?: {
    latitude: number
    longitude: number
    timestamp: string
  }
}

// Helper functions
function roundUpDuration(minutes: number): number {
  return Math.ceil(minutes / ROUND_UP_TO_MINUTES) * ROUND_UP_TO_MINUTES
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => x * Math.PI / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Add this after haversineDistance function and before OrderDetailsModal component
async function notifyDriverAssignment(
  supabase: any,
  driverId: string,
  orderId: string,
  orderTrackingId: string,
  pickupTime: string
) {
  try {
    const pickupPH = new Date(pickupTime)
    const formattedTime = pickupPH.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: TIMEZONE
    })
    
    console.log(`🔔 Creating notification for driver ${driverId}`)
    
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
      console.error('❌ Failed to create driver notification:', notificationError)
      return false
    }

    console.log(`✅ Notification sent to driver`)
    return true
  } catch (error) {
    console.error('❌ Error sending notification:', error)
    return false
  }
}

interface OrderDetailsModalProps {
  selectedOrder: Order
  onClose: () => void
  onOrderUpdate: () => void
}

export function OrderDetailsModal({ selectedOrder, onClose, onOrderUpdate }: OrderDetailsModalProps) {
  const [client, setClient] = useState<Client | null>(null)
  const [dropoffs, setDropoffs] = useState<Dropoff[]>([])
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [updatedOrder, setUpdatedOrder] = useState<Order>(selectedOrder)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [availableDrivers, setAvailableDrivers] = useState<DriverWithSlots[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [noDriversFound, setNoDriversFound] = useState(false)

  useEffect(() => {
    setUpdatedOrder(selectedOrder)
    fetchOrderDetails(selectedOrder)
  }, [selectedOrder])

  useEffect(() => {
    if (client && dropoffs.length > 0) {
      fetchEstimatedTravelTime(client, dropoffs)
    }
  }, [client, dropoffs])


  const fetchOrderDetails = async (order: Order) => {
  try {
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('tracking_id', order.tracking_id)
      .single()

    setClient(clientData)
    
    // Set pickup location for driver assignment
    if (clientData?.pickup_latitude && clientData?.pickup_longitude) {
      setPickupLocation({
        latitude: clientData.pickup_latitude,
        longitude: clientData.pickup_longitude
      })
    }

    const { data: dropoffData } = await supabase
      .from('order_dropoffs')
      .select('*')
      .eq('order_id', order.id)
      .order('sequence', { ascending: true })

    setDropoffs(dropoffData || [])
    
    // ✨ NEW: Calculate accurate route duration
    if (clientData?.pickup_latitude && clientData?.pickup_longitude && dropoffData && dropoffData.length > 0) {
      await calculateRouteAndUpdateOrder(order.id, clientData, dropoffData)
    }
  } catch (err) {
    console.error('❌ Error fetching order details:', err)
  }
}

const calculateRouteAndUpdateOrder = async (
  orderId: string,
  clientData: Client,
  dropoffData: Dropoff[]
) => {
  if (!MAPBOX_TOKEN) return

  const filtered = dropoffData.filter(d => d.latitude && d.longitude)
  if (filtered.length === 0) return

  const coords = [
    `${clientData.pickup_longitude},${clientData.pickup_latitude}`,
    ...filtered.map(d => `${d.longitude},${d.latitude}`)
  ]

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords.join(';')}?access_token=${MAPBOX_TOKEN}&overview=false`

  try {
    const res = await fetch(url)
    const data = await res.json()
    
    if (data.routes?.[0]?.duration) {
      const durationMinutes = Math.round(data.routes[0].duration / 60)
      
      // Update the local state with accurate duration
      setUpdatedOrder(prev => ({
        ...prev,
        estimated_total_duration: durationMinutes
      }))
      
      console.log('✅ Route duration calculated:', durationMinutes, 'minutes (pickup → dropoffs)')
    }
  } catch (error) {
    console.error('❌ Error calculating route duration:', error)
  }
}

  const fetchEstimatedTravelTime = async (clientData: Client, dropoffData: Dropoff[]) => {
    if (
      !MAPBOX_TOKEN ||
      !clientData?.pickup_latitude ||
      !clientData?.pickup_longitude ||
      dropoffData.length === 0
    ) {
      setEstimatedTime('Unavailable')
      return
    }

    const filtered = dropoffData.filter(d => d.latitude && d.longitude)
    if (filtered.length === 0) {
      setEstimatedTime('Unavailable')
      return
    }

    const coords = [
      `${clientData.pickup_longitude},${clientData.pickup_latitude}`,
      ...filtered.map(d => `${d.longitude},${d.latitude}`)
    ]

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords.join(';')}?access_token=${MAPBOX_TOKEN}&overview=false`

    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.routes?.[0]?.duration) {
        const mins = Math.round(data.routes[0].duration / 60)
        const hrs = Math.floor(mins / 60)
        setEstimatedTime(hrs > 0 ? `${hrs} hrs ${mins % 60} mins` : `${mins} mins`)
      } else setEstimatedTime('Unavailable')
    } catch {
      setEstimatedTime('Unavailable')
    }
  }

  const fetchAvailableDrivers = async () => {
  setLoadingDrivers(true)
  
  try {
    const pickupTimestamp = updatedOrder.pickup_timestamp || 
      `${updatedOrder.pickup_date}T${updatedOrder.pickup_time}`
    
    const pickupDate = new Date(pickupTimestamp)
    const dateStr = pickupDate.toISOString().split('T')[0]
    const dayStart = new Date(`${dateStr}T00:00:00Z`)
    const dayEnd = new Date(`${dateStr}T23:59:59Z`)

    // Warehouse coordinates (from pricing config)
    const WAREHOUSE_COORDS = { lat: 14.8506156, lon: 120.8238576 }

    // Fetch all drivers
    const { data: drivers } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'driver')

    if (!drivers || drivers.length === 0) {
      setAvailableDrivers([])
      setLoadingDrivers(false)
      return
    }

    // Fetch driver availability
    const { data: availabilities } = await supabase
      .from('driver_availability')
      .select('id, driver_id, start_time, end_time')
      .lte('start_time', dayEnd.toISOString())
      .gte('end_time', dayStart.toISOString())

    // Fetch existing time slots for this day
    const { data: existingSlots } = await supabase
      .from('driver_time_slots')
      .select('driver_id, start_time, end_time, status, order_id')
      .lte('start_time', dayEnd.toISOString())
      .gte('end_time', dayStart.toISOString())
      .in('status', ['scheduled', 'completed'])

    // Fetch last dropoffs and workload for ALL previous orders (not just today)
    const driverIds = drivers.map(d => d.id)
    const { data: lastOrders } = await supabase
      .from('orders')
      .select(`
        driver_id,
        estimated_end_timestamp,
        estimated_total_duration,
        order_dropoffs (
          latitude,
          longitude,
          sequence
        )
      `)
      .in('driver_id', driverIds)
      .lt('estimated_end_timestamp', pickupTimestamp)
      .in('status', ['driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup', 'delivered'])
      .order('estimated_end_timestamp', { ascending: false })

    // Process last dropoffs and workload
const driverLastDropoffs: Record<string, any> = {}
const driverLastDropoffToday: Record<string, any> = {} // NEW: Track today's last dropoff specifically
const driverWorkload: Record<string, number> = {}

drivers.forEach(d => {
  driverWorkload[d.id] = 0
})

for (const order of lastOrders || []) {
  // Track overall last dropoff (for display purposes)
  if (!driverLastDropoffs[order.driver_id]) {
    const lastDropoff = order.order_dropoffs
      ?.sort((a: any, b: any) => b.sequence - a.sequence)[0]
    
    if (lastDropoff) {
      driverLastDropoffs[order.driver_id] = {
        latitude: lastDropoff.latitude,
        longitude: lastDropoff.longitude,
        timestamp: order.estimated_end_timestamp
      }
    }
  }
  
  // NEW: Track last dropoff specifically from TODAY's orders
  const orderEndDate = new Date(order.estimated_end_timestamp).toISOString().split('T')[0]
  if (orderEndDate === dateStr && !driverLastDropoffToday[order.driver_id]) {
    const lastDropoff = order.order_dropoffs
      ?.sort((a: any, b: any) => b.sequence - a.sequence)[0]
    
    if (lastDropoff) {
      driverLastDropoffToday[order.driver_id] = {
        latitude: lastDropoff.latitude,
        longitude: lastDropoff.longitude,
        timestamp: order.estimated_end_timestamp
      }
    }
  }
  
  if (order.estimated_total_duration) {
    driverWorkload[order.driver_id] += order.estimated_total_duration
  }
}

    // Process each driver
    const driversWithSlots: DriverWithSlots[] = []

    for (const driver of drivers) {
      const driverAvailabilities = availabilities?.filter(a => a.driver_id === driver.id) || []
      const driverExistingSlots = existingSlots?.filter(s => s.driver_id === driver.id) || []

      if (driverAvailabilities.length === 0) continue

      // Check if driver has any scheduled orders BEFORE this pickup on the same day
      const pickupTimestamp = updatedOrder.pickup_timestamp || 
        `${updatedOrder.pickup_date}T${updatedOrder.pickup_time}`
      const pickupTime = new Date(pickupTimestamp)

      const hasOrdersBeforeThisPickup = driverExistingSlots.some(slot => {
        const slotDate = new Date(slot.start_time).toISOString().split('T')[0]
        const slotEndTime = new Date(slot.end_time)
        return slotDate === dateStr && slotEndTime < pickupTime
      })

      let travelTimeToPickup = 0
      let travelDistanceToPickup = 0

      if (pickupLocation) {
        if (hasOrdersBeforeThisPickup && driverLastDropoffToday[driver.id]) {
          // Driver has orders TODAY that end before this pickup - calculate from today's last dropoff
          travelDistanceToPickup = haversineDistance(
            driverLastDropoffToday[driver.id].latitude,
            driverLastDropoffToday[driver.id].longitude,
            pickupLocation.latitude,
            pickupLocation.longitude
          )
        } else {
          // First order of the day OR no orders before this pickup - calculate from warehouse
          travelDistanceToPickup = haversineDistance(
            WAREHOUSE_COORDS.lat,
            WAREHOUSE_COORDS.lon,
            pickupLocation.latitude,
            pickupLocation.longitude
          )
        }
        
        // Estimate 40 km/h average speed in city traffic
        travelTimeToPickup = Math.ceil((travelDistanceToPickup / 40) * 60) // minutes
      }
     

      // Calculate total duration needed for time slot
      const orderDuration = updatedOrder.estimated_total_duration || 120
      const totalDurationNeeded = orderDuration + travelTimeToPickup

      const timeSlots = generateTimeSlotOptionsForDriver(
        driverAvailabilities,
        driverExistingSlots,
        totalDurationNeeded,
        dayStart,
        dayEnd,
        travelTimeToPickup // Pass travel time to show in UI
      )

      if (timeSlots.length > 0) {
        driversWithSlots.push({
          ...driver,
          availableSlots: timeSlots,
          distance: travelDistanceToPickup,
          workload: driverWorkload[driver.id] || 0,
          lastDropoff: driverLastDropoffs[driver.id]
        })
      }
    }

    // Sort by distance then workload
    driversWithSlots.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        if (Math.abs(a.distance - b.distance) > 5) {
          return a.distance - b.distance
        }
      }
      return a.workload - b.workload
    })

   
    
    setAvailableDrivers(driversWithSlots)

      // Auto-select first driver and slot
      if (driversWithSlots.length > 0) {
        setSelectedDriverId(driversWithSlots[0].id)
        setSelectedTimeSlot(driversWithSlots[0].availableSlots[0].id)
        setNoDriversFound(false)
      } else {
        setNoDriversFound(true)
      }
  } catch (error) {
    console.error('Error fetching available drivers:', error)
  } finally {
    setLoadingDrivers(false)
  }
}

  const generateTimeSlotOptionsForDriver = (
  availabilities: any[],
  existingSlots: any[],
  estimatedDuration: number,
  dayStart: Date,
  dayEnd: Date,
  travelTimeToPickup: number = 0
): TimeSlotOption[] => {
  const roundedDuration = roundUpDuration(estimatedDuration)
  const durationMs = roundedDuration * 60 * 1000
  const bufferMs = BUFFER_MINUTES * 60 * 1000

  const options: TimeSlotOption[] = []

  // Create buffered existing slots with 10-minute buffer on BOTH sides
  const bufferedExistingSlots = existingSlots.map(slot => {
    const existingStart = new Date(slot.start_time.endsWith('Z') ? slot.start_time : slot.start_time + 'Z')
    const existingEnd = new Date(slot.end_time.endsWith('Z') ? slot.end_time : slot.end_time + 'Z')
    
    return {
      bufferedStart: new Date(existingStart.getTime() - bufferMs),
      bufferedEnd: new Date(existingEnd.getTime() + bufferMs),
      originalStart: existingStart,
      originalEnd: existingEnd
    }
  })

  availabilities.forEach(block => {
    const blockStart = new Date(block.start_time.endsWith('Z') ? block.start_time : block.start_time + 'Z')
    const blockEnd = new Date(block.end_time.endsWith('Z') ? block.end_time : block.end_time + 'Z')
    
    const effectiveStart = new Date(Math.max(blockStart.getTime(), dayStart.getTime()))
    const effectiveEnd = new Date(Math.min(blockEnd.getTime(), dayEnd.getTime()))
    
    if (effectiveStart >= effectiveEnd) return

    let currentSlotStart = new Date(effectiveStart)
    
    // Round to nearest slot interval
    const startMinutes = currentSlotStart.getMinutes()
    const remainder = startMinutes % SLOT_INTERVAL_MINUTES
    if (remainder !== 0) {
      currentSlotStart.setMinutes(startMinutes + (SLOT_INTERVAL_MINUTES - remainder), 0, 0)
    }

    while (currentSlotStart < effectiveEnd) {
      const slotEnd = new Date(currentSlotStart.getTime() + durationMs)
      
      if (slotEnd <= effectiveEnd) {
        // Check for conflicts with 10-minute buffer
        const hasConflict = bufferedExistingSlots.some(existingSlot => {
          return currentSlotStart < existingSlot.bufferedEnd && existingSlot.bufferedStart < slotEnd
        })

        if (!hasConflict) {
          options.push({
            id: `${currentSlotStart.getTime()}_${slotEnd.getTime()}`,
            start_time: currentSlotStart.toISOString(),
            end_time: slotEnd.toISOString(),
            availabilityBlockId: block.id
          })
        }
      }
      
      currentSlotStart = new Date(currentSlotStart.getTime() + (SLOT_INTERVAL_MINUTES * 60 * 1000))
    }
  })

  options.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  
  return options
}

 const handleAssignDriver = async () => {
  if (!selectedDriverId || !selectedTimeSlot) {
    alert('Please select a driver and time slot')
    return
  }

  setAssigning(true)

  try {
    const driver = availableDrivers.find(d => d.id === selectedDriverId)
    const timeSlot = driver?.availableSlots.find(s => s.id === selectedTimeSlot)

    if (!driver || !timeSlot) {
      throw new Error('Invalid driver or time slot selection')
    }

    const startDateTime = new Date(timeSlot.start_time)
    const endDateTime = new Date(timeSlot.end_time)
    const durationMins = (endDateTime.getTime() - startDateTime.getTime()) / 60000

    console.log('📝 Updating order with driver assignment...')

    // Update order
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        driver_id: driver.id,
        pickup_timestamp: startDateTime.toISOString(),
        estimated_total_duration: durationMins,
        estimated_end_timestamp: endDateTime.toISOString(),
        status: 'driver_assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedOrder.id)

    if (orderUpdateError) throw orderUpdateError
    console.log('✅ Order updated successfully')

    // Check for existing time slot
    const { data: existingSlot } = await supabase
      .from('driver_time_slots')
      .select('id, status, order_id')
      .eq('driver_id', driver.id)
      .eq('start_time', startDateTime.toISOString())
      .eq('end_time', endDateTime.toISOString())
      .maybeSingle()

    if (existingSlot) {
      console.log('🔄 Updating existing time slot...')
      const { error: updateSlotError } = await supabase
        .from('driver_time_slots')
        .update({
          order_id: updatedOrder.id,
          status: 'scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSlot.id)

      if (updateSlotError) throw updateSlotError
      console.log('✅ Time slot updated')
    } else {
      console.log('✨ Creating new time slot...')
      const { error: timeSlotError } = await supabase
        .from('driver_time_slots')
        .insert({
          driver_id: driver.id,
          driver_availability_id: timeSlot.availabilityBlockId,
          order_id: updatedOrder.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'scheduled',
        })

      if (timeSlotError) throw timeSlotError
      console.log('✅ Time slot created')
    }

    // 🔔 NEW: Send notification to driver
    console.log('🔔 Sending notification to driver...')
    const notificationSent = await notifyDriverAssignment(
      supabase,
      driver.id,
      updatedOrder.id,
      updatedOrder.tracking_id,
      startDateTime.toISOString()
    )

    if (notificationSent) {
      console.log('✅ Driver notification sent successfully')
      alert(`✅ Successfully assigned order to ${driver.first_name} ${driver.last_name}\n🔔 Driver has been notified`)
    } else {
      console.warn('⚠️ Driver assignment successful but notification failed')
      alert(`✅ Order assigned to ${driver.first_name} ${driver.last_name}\n⚠️ But notification failed to send`)
    }

    onOrderUpdate()
    onClose()
  } catch (error) {
    console.error('❌ Error assigning driver:', error)
    alert(`Failed to assign driver: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    setAssigning(false)
  }
}

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: TIMEZONE
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const selectedDriver = availableDrivers.find(d => d.id === selectedDriverId)
  const selectedSlot = selectedDriver?.availableSlots.find(s => s.id === selectedTimeSlot)

  const googleMapsUrl = client && dropoffs.length > 0
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        client.pickup_address
      )}&destination=${encodeURIComponent(
        dropoffs[dropoffs.length - 1].dropoff_address
      )}&waypoints=${encodeURIComponent(
        dropoffs.slice(0, -1).map(d => d.dropoff_address).join('|')
      )}`
    : null

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col">

        {/* HEADER - Fixed at top */}
        
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">📝 Order Details</h3>
            <p className="text-sm text-gray-600 mt-1">
              Tracking ID: <span className="font-semibold text-blue-600">{updatedOrder.tracking_id}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Status: <span className="inline-block px-2 py-1 bg-gray-500 text-white rounded-full text-xs font-medium">
                {updatedOrder.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-3xl font-bold text-gray-400 hover:text-gray-600 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50"
          >
            ×
          </button>
        </div>

        {/* BODY - Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
  <OrderInfo order={updatedOrder} estimatedTime={estimatedTime} />
  
  {/* UPDATE STATUS Section */}
  {updatedOrder.status === 'order_placed' && (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-blue-900 mb-4 flex items-center gap-2">
        <span>📊</span>
        <span>Update Status</span>
      </h4>
      
      <div className="space-y-3">
      {!loadingDrivers && availableDrivers.length === 0 && !noDriversFound ? (
        <button
          onClick={fetchAvailableDrivers}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          <span>🚛</span>
          <span>Assign Driver</span>
        </button>
      ) : loadingDrivers ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-gray-500 mt-4">Finding available drivers...</p>
        </div>
      ) : availableDrivers.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">🚛 Assign Driver</h4>
            <button
              onClick={() => setAvailableDrivers([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Driver
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => {
                setSelectedDriverId(e.target.value)
                const driver = availableDrivers.find(d => d.id === e.target.value)
                if (driver && driver.availableSlots.length > 0) {
                  setSelectedTimeSlot(driver.availableSlots[0].id)
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableDrivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.first_name} {driver.last_name}
                  {driver.distance !== undefined && ` • ${driver.distance.toFixed(1)}km to pickup`}
                  {` • ${formatDuration(driver.workload)} workload • ${driver.availableSlots.length} slots`}
                </option>
              ))}
            </select>
          </div>

          {selectedDriver && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Time Slot ({selectedDriver.availableSlots.length} available)
              </label>
              <select
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {selectedDriver.availableSlots.map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedDriver && selectedSlot && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-900 mb-2">Assignment Summary</h5>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Driver:</strong> {selectedDriver.first_name} {selectedDriver.last_name}</p>
                
                {selectedDriver.distance !== undefined && (
                  <p><strong>Travel to pickup:</strong> {selectedDriver.distance.toFixed(1)} km 
                    {selectedDriver.lastDropoff ? ' from last dropoff' : ' from warehouse'}
                  </p>
                )}
                
                <p><strong>Current workload:</strong> {formatDuration(selectedDriver.workload)}</p>
                <p><strong>Scheduled time:</strong> {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}</p>
                
                {(() => {
                  if (pickupLocation && selectedDriver.distance) {
                    const travelTime = Math.ceil((selectedDriver.distance / 40) * 60)
                    const orderDuration = updatedOrder.estimated_total_duration || 120
                    
                    return (
                      <div className="mt-2 pt-2 border-t border-blue-300 space-y-1">
                        <p className="text-xs text-blue-700 font-semibold">Time Breakdown:</p>
                        <p className="text-xs text-blue-600">
                          🚗 Travel time: {travelTime} mins ({selectedDriver.distance.toFixed(1)} km)
                        </p>
                        <p className="text-xs text-blue-600">
                          📦 Order duration: {formatDuration(orderDuration)}
                        </p>
                        <p className="text-xs text-blue-600 font-semibold">
                          ⏱️ Total slot: {formatDuration(travelTime + orderDuration)}
                        </p>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>
          )}

          <button
            onClick={handleAssignDriver}
            disabled={assigning || !selectedDriverId || !selectedTimeSlot}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assigning ? 'Assigning...' : 'Assign Driver'}
          </button>
        </div>
      ) : noDriversFound ? (
        <div className="text-center py-6">
          <div className="mb-4">
            <p className="text-gray-600 mb-2">😔 No available drivers found</p>
            <p className="text-sm text-gray-500">All drivers are fully booked for this time slot.</p>
          </div>
          <button
            onClick={() => {
              // Component to be imported later
              console.log('Request reschedule clicked')
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <span>📅</span>
            <span>Request Reschedule to Client</span>
          </button>
          <button
            onClick={() => {
              setNoDriversFound(false)
              setAvailableDrivers([])
            }}
            className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg transition"
          >
            Back
          </button>
        </div>
      ) : null}
        
        {/* Cancel Order Button */}
        <button
          onClick={() => setShowCancelModal(true)}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg transition"
        >
          Cancel Order
        </button>
      </div>
    </div>
  )}

</div>
            <div className="space-y-6">
              {client && <ClientInfo client={client} mapboxToken={MAPBOX_TOKEN} />}
              {dropoffs.length > 0 && <DropoffInfo dropoffs={dropoffs} mapboxToken={MAPBOX_TOKEN} />}
            </div>
          </div>

        </div>  


        {/* FOOTER - Fixed at bottom */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          {googleMapsUrl && (
            <button
              onClick={() => window.open(googleMapsUrl, '_blank')}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <span>🚗</span>
              <span>View Route</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            Close
          </button>
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <CancellationModal
            orderId={updatedOrder.id}
            trackingId={updatedOrder.tracking_id}
            onClose={() => setShowCancelModal(false)}
            onConfirm={async (reason, customMessage) => {
              try {
                const { error: updateError } = await supabase
                  .from('orders')
                  .update({ status: 'cancelled' })
                  .eq('id', updatedOrder.id)

                if (updateError) throw updateError

                const emailMessage = getCancellationEmailMessage(reason, customMessage)

                const { error: logError } = await supabase
                  .from('order_status_logs')
                  .insert({
                    order_id: updatedOrder.id,
                    status: 'cancelled',
                    description: `Order cancelled by dispatcher. Reason: ${emailMessage}`,
                    timestamp: new Date().toISOString()
                  })

                if (logError) throw logError

                if (client?.email) {
                  await fetch('/api/send-dispatcher-cancellation-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: client.email,
                      trackingId: updatedOrder.tracking_id,
                      contactPerson: client.contact_person,
                      reason: emailMessage,
                      cancellationType: reason
                    })
                  })
                }

                alert('✅ Order cancelled successfully. Client has been notified via email.')
                setShowCancelModal(false)
                onOrderUpdate()
                onClose()
              } catch (err) {
                console.error('Error cancelling order:', err)
                alert('❌ Failed to cancel order. Please try again.')
              }
            }}
          />
        )}
      </div>
    </div>
  )
}