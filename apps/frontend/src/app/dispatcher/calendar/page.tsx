'use client'

// Dispatcher Calendar Page - Need to add summarized cards!
import { useEffect, useState } from 'react'
import {
  Calendar,
  momentLocalizer,
  View,
} from 'react-big-calendar'
import moment from 'moment-timezone'
import { supabase } from '@/lib/supabase'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import DraggableOrder from '@/components/Dispatcher/DraggableOrder'
import { OrderDetailsModal } from '@/components/Dispatcher/OrderDetailsModal'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Set default timezone for moment
moment.tz.setDefault('Asia/Manila')
const localizer = momentLocalizer(moment)

type DriverEvent = {
  id?: string
  title: string
  start: Date
  end: Date
  type: 'availability' | 'order'
  status?: 'assigned' | 'unassigned'
  driverId?: string
  driverName?: string
  order?: Order
}

type Order = {
  id: string
  tracking_id: string
  pickup_date: string
  pickup_time: string
  pickup_timestamp?: string
  delivery_window_start: string | null
  delivery_window_end: string | null
  special_instructions: string
  client_id: string
  status: string
  vehicle_type: string | null 
  tail_lift_required: boolean | null
  tracking_id: string | null
  estimated_total_duration: number | null
  dropoff_count?: number
  driver_id?: string | null
  clients?: {
    tracking_id: string
    business_name: string | null
    contact_person: string
  } | null
  profiles?: {
    first_name: string
    last_name: string
  } | null
}

type Driver = {
  id: string
  first_name: string
  last_name: string
  color: string
}

type AvailabilityData = {
  id: string
  title: string
  start_time: string
  end_time: string
  driver_id: string
  profiles: {
    first_name: string
    last_name: string
  } | null
}

type OrderData = {
  id: string
  tracking_id: string
  pickup_date: string
  pickup_time: string
  pickup_timestamp?: string
  delivery_window_start: string | null
  delivery_window_end: string | null
  special_instructions: string
  client_id: string
  status: string
  vehicle_type: string | null 
  tail_lift_required: boolean | null
  driver_id: string | null
  tracking_id: string | null
  estimated_total_duration: number | null
  profiles: {
    first_name: string
    last_name: string
  } | null
  clients: {
    tracking_id: string
    business_name: string | null
    contact_person: string
  } | null
}

const ORDER_STATUSES = [
  { value: 'order_placed', label: 'Order Placed', color: '#ed8936' }, 
  { value: 'driver_assigned', label: 'Driver Assigned', color: '#3182ce' },
  { value: 'truck_left_warehouse', label: 'Truck Left Warehouse', color: '#d69e2e' },
  { value: 'arrived_at_pickup', label: 'Arrived at Pickup', color: '#ed8936' },
  { value: 'delivered', label: 'Delivered', color: '#38a169' },
  { value: 'cancelled', label: 'Cancelled', color: '#718096' }, 
]

// Generate a consistent color for each driver
const generateDriverColor = (driverId: string): string => {
  const colors = [
    '#3182ce', '#38a169', '#d69e2e', '#9f7aea', '#e53e3e',
    '#00b5d8', '#dd6b20', '#319795', '#805ad5', '#c53030',
    '#2b6cb0', '#2f855a', '#b7791f', '#553c9a', '#c05621',
    '#0987a0', '#9c4221', '#285e61', '#44337a', '#9b2c2c'
  ]
  
  let hash = 0
  for (let i = 0; i < driverId.length; i++) {
    hash = ((hash << 5) - hash) + driverId.charCodeAt(i)
    hash = hash & hash
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export default function DispatcherCalendarPage() {
  const [availabilityEvents, setAvailabilityEvents] = useState<DriverEvent[]>([])
  const [orderEvents, setOrderEvents] = useState<DriverEvent[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [currentView, setCurrentView] = useState<View>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [calendarType, setCalendarType] = useState<'availability' | 'orders'>('availability')
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all')

  const fetchData = async () => {
    setLoading(true)

    // Fetch drivers first to get names and create colors
    const { data: driversData, error: driversError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'driver')

    if (driversError) {
      console.error('❌ Error fetching drivers:', driversError)
      return
    }

    const driversWithColors: Driver[] = (driversData || []).map(driver => ({
      id: driver.id,
      first_name: driver.first_name,
      last_name: driver.last_name,
      color: generateDriverColor(driver.id)
    }))

    setDrivers(driversWithColors)

    // Fetch availability data with driver info
    const { data: availabilityData, error: availError } = await supabase
      .from('driver_availability')
      .select(`
        id,
        title,
        start_time,
        end_time,
        driver_id,
        profiles!driver_id (
          first_name,
          last_name
        )
      `) as { data: AvailabilityData[] | null, error: Error | null }

    // Fetch orders with all necessary fields
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        tracking_id,
        pickup_date,
        pickup_time,
        pickup_timestamp,
        delivery_window_start,
        delivery_window_end,
        special_instructions,
        client_id,
        status,
        vehicle_type,
        tail_lift_required,
        driver_id,
        estimated_total_duration,
        profiles!driver_id (
          first_name,
          last_name
        ),
        clients!client_id (
          tracking_id,
          business_name,
          contact_person
        )
      `)
      .order('status', { ascending: true })

    // Fetch dropoff counts for each order
    const { data: dropoffData, error: dropoffError } = await supabase
      .from('order_dropoffs')
      .select('order_id')

    if (availError || orderError || dropoffError) {
      console.error('❌ Supabase error:', availError || orderError || dropoffError)
      return
    }

    // Count dropoffs per order
    const dropoffCounts = (dropoffData || []).reduce((acc, dropoff) => {
      acc[dropoff.order_id] = (acc[dropoff.order_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Process availability events
    const availEvents: DriverEvent[] = (availabilityData || []).map((e) => {
      const driverName = e.profiles 
        ? `${e.profiles.first_name} ${e.profiles.last_name}`
        : 'Unknown Driver'
      
      const startTime = moment.utc(e.start_time).tz('Asia/Manila').toDate()
      const endTime = moment.utc(e.end_time).tz('Asia/Manila').toDate()
      
      const startTimeStr = moment.tz(startTime, 'Asia/Manila').format('h:mm A')
      const endTimeStr = moment.tz(endTime, 'Asia/Manila').format('h:mm A')
      
      return {
        id: e.id,
        title: `${driverName} - ${startTimeStr} - ${endTimeStr}`,
        start: startTime,
        end: endTime,
        type: 'availability',
        driverId: e.driver_id,
        driverName: driverName
      }
    })

    // Process order events
    const statusOrder = ['order_placed', 'driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup', 'delivered', 'cancelled']
    
    const sortedOrderData = (orderData || []).sort((a, b) => {
      const aStatusIndex = statusOrder.indexOf(a.status)
      const bStatusIndex = statusOrder.indexOf(b.status)
      
      if (aStatusIndex !== bStatusIndex) {
        return aStatusIndex - bStatusIndex
      }
      
      const aDateTime = `${a.pickup_date} ${a.pickup_time}`
      const bDateTime = `${b.pickup_date} ${b.pickup_time}`
      return aDateTime.localeCompare(bDateTime)
    })

    const orderEventsData: DriverEvent[] = sortedOrderData.map((o) => {
      const clientTrackingId = o.clients?.tracking_id || o.tracking_id || 'N/A'
      let title = `Tracking #${clientTrackingId}`

      if (o.driver_id && o.profiles) {
        const driverName = `${o.profiles.first_name} ${o.profiles.last_name}`
        title = `${driverName} - ${clientTrackingId}`
      } else if (o.driver_id) {
        title += ' (Assigned)'
      } else {
        title += ' (Unassigned)'
      }

      // Use pickup_timestamp if available, otherwise construct from date and time
      let pickupMoment
      if (o.pickup_timestamp) {
        pickupMoment = moment.utc(o.pickup_timestamp).tz('Asia/Manila')
      } else {
        pickupMoment = moment.utc(`${o.pickup_date}T${o.pickup_time}`).tz('Asia/Manila')
      }
      
      let endMoment
      if (o.delivery_window_end) {
        endMoment = moment.utc(`${o.pickup_date}T${o.delivery_window_end}`).tz('Asia/Manila')
      } else {
        const durationHours = o.estimated_total_duration 
          ? Math.ceil(o.estimated_total_duration / 60)
          : 2
        endMoment = pickupMoment.clone().add(durationHours, 'hours')
      }

      return {
        id: o.id,
        title,
        start: pickupMoment.toDate(),
        end: endMoment.toDate(),
        type: 'order',
        status: o.status === 'order_placed' ? 'unassigned' : 'assigned',
        driverId: o.driver_id || undefined,
        driverName: o.profiles ? `${o.profiles.first_name} ${o.profiles.last_name}` : undefined,
        order: {
          ...o,
          dropoff_count: dropoffCounts[o.id] || 0
        }
      }
    })

    const enhancedOrders = sortedOrderData.map(order => ({
      ...order,
      dropoff_count: dropoffCounts[order.id] || 0
    }))

    setAvailabilityEvents(availEvents)
    setOrderEvents(orderEventsData)
    setOrders(enhancedOrders)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const autoAssignOrders = async () => {
    console.log('🤖 Starting auto-assignment process...')
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) {
        alert('You must be logged in to auto-assign orders.')
        return
      }

      const { data: unassignedOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, tracking_id, pickup_date, pickup_time, status')
        .eq('status', 'order_placed')
        .is('driver_id', null)
        .order('pickup_date', { ascending: true })
        .order('pickup_time', { ascending: true })

      if (ordersError) {
        console.error('❌ Error fetching unassigned orders:', ordersError)
        alert('Failed to fetch unassigned orders.')
        return
      }

      if (!unassignedOrders || unassignedOrders.length === 0) {
        alert('No unassigned orders found to auto-assign.')
        return
      }

      console.log(`📋 Found ${unassignedOrders.length} unassigned orders`)

      let driverAssignments: { [driverId: string]: number } = {}
      let totalAssigned = 0
      let totalFailed = 0

      for (const order of unassignedOrders) {
        try {
          let formattedTime = order.pickup_time
          const timeParts = order.pickup_time.split(':')
          if (timeParts.length === 2) {
            formattedTime = `${order.pickup_time}:00`
          }
          
          const pickupDateTime = `${order.pickup_date} ${formattedTime}`
          
          console.log(`🔍 Finding drivers for order ${order.tracking_id} at ${pickupDateTime}`)

          const { data: availabilities, error: availError } = await supabase
            .from('driver_availability')
            .select('driver_id, start_time, end_time')
            .lte('start_time', pickupDateTime)
            .gte('end_time', pickupDateTime)

          if (availError || !availabilities || availabilities.length === 0) {
            console.log(`❌ No drivers available for order ${order.tracking_id}`)
            totalFailed++
            continue
          }

          const availableDriverIds = [...new Set(availabilities.map(av => av.driver_id).filter(Boolean))]
          
          if (availableDriverIds.length === 0) {
            console.log(`❌ No valid driver IDs for order ${order.tracking_id}`)
            totalFailed++
            continue
          }

          const sortedDriverIds = availableDriverIds.sort((a, b) => {
            const aCount = driverAssignments[a] || 0
            const bCount = driverAssignments[b] || 0
            return aCount - bCount
          })

          const selectedDriverId = sortedDriverIds[0]

          const { data: updateData, error: updateError } = await supabase
            .from('orders')
            .update({ 
              status: 'driver_assigned',
              driver_id: selectedDriverId,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id)
            .select(`
              *,
              profiles!orders_driver_id_fkey (
                first_name,
                last_name,
                email
              )
            `)

          if (updateError) {
            console.error(`❌ Failed to assign order ${order.tracking_id}:`, updateError)
            totalFailed++
            continue
          }

          driverAssignments[selectedDriverId] = (driverAssignments[selectedDriverId] || 0) + 1
          totalAssigned++

          const driverName = updateData[0]?.profiles 
            ? `${updateData[0].profiles.first_name || ''} ${updateData[0].profiles.last_name || ''}`.trim()
            : 'Driver'

          console.log(`✅ Assigned order ${order.tracking_id} to ${driverName}`)

        } catch (error) {
          console.error(`❌ Error processing order ${order.tracking_id}:`, error)
          totalFailed++
        }
      }

      const message = `Auto-assignment completed!\n\n✅ Successfully assigned: ${totalAssigned} orders\n❌ Failed to assign: ${totalFailed} orders`
      
      if (totalAssigned > 0) {
        const distributionText = Object.entries(driverAssignments)
          .map(([driverId, count]) => `Driver ${driverId}: ${count} order${count > 1 ? 's' : ''}`)
          .join('\n')
        
        alert(`${message}\n\nDriver Distribution:\n${distributionText}`)
        await fetchData()
      } else {
        alert(message)
      }

    } catch (error) {
      console.error('❌ Error in auto-assignment:', error)
      alert('An error occurred during auto-assignment. Please try again.')
    }
  }

const handleAutoAssign = async () => {
  const confirmed = confirm(
    'This will automatically assign all unassigned orders to available drivers based on proximity and workload. Continue?'
  )
  
  if (!confirmed) return

  setAssigning(true)
  
  try {
    // Call the backend API instead of frontend logic
    const response = await fetch('/api/auto-assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to auto-assign orders')
    }

    // Show detailed results to user
    const message = [
      `Auto-assignment completed!`,
      ``,
      `📊 Results:`,
      `✅ Successfully assigned: ${result.successfulAssignments} orders`,
      `📦 Total orders processed: ${result.validOrders}`,
      result.skippedPastOrders > 0 ? `⏭️ Skipped past orders: ${result.skippedPastOrders}` : null,
      result.failedAssignments > 0 ? `❌ Failed to assign: ${result.failedAssignments} orders` : null,
    ].filter(Boolean).join('\n')

    alert(message)

    // Refresh the calendar data to show new assignments
    if (result.successfulAssignments > 0) {
      await fetchData()
    }

  } catch (error) {
    console.error('❌ Error in auto-assignment:', error)
    alert(`An error occurred during auto-assignment: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    setAssigning(false)
  }
}

  const handleEventClick = (event: DriverEvent) => {
    if (event.type === 'order' && event.order) {
      setSelectedOrder(event.order)
    }
  }

 const getEventColor = (event: DriverEvent) => {
  if (event.type === 'availability') {
    const driver = drivers.find(d => d.id === event.driverId)
    return driver?.color || '#3182ce'
  } else {
    // Use actual order status from the order object
    if (event.order?.status) {
      const statusConfig = ORDER_STATUSES.find(s => s.value === event.order.status)
      if (statusConfig) {
        return statusConfig.color
      }
    }
    
    // Fallback to old logic
    if (event.status === 'unassigned') return '#ed8936'
    if (event.driverId) {
      const driver = drivers.find(d => d.id === event.driverId)
      return driver?.color || '#38a169'
    }
    return '#38a169'
  }
}

  const calendarStyle = {
    height: currentView === 'month' ? '600px' : '400px',
  }

  const customComponents = {
    month: {
      event: ({ event }: { event: DriverEvent }) => (
        <div 
          className="text-xs p-1 mb-1 block" 
          style={{ 
            backgroundColor: getEventColor(event),
            color: '#fff',
            borderRadius: '3px',
            fontSize: '10px',
            lineHeight: '1.2',
            whiteSpace: 'normal',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            width: '100%',
            minHeight: '18px'
          }}
          title={event.title}
        >
          {event.title}
        </div>
      )
    },
    week: {
      event: ({ event }: { event: DriverEvent }) => (
        <div 
          className="text-xs p-1 block" 
          style={{ 
            backgroundColor: getEventColor(event),
            color: '#fff',
            borderRadius: '3px',
            fontSize: '11px',
            lineHeight: '1.2',
            whiteSpace: 'normal',
            overflow: 'hidden',
            display: 'block',
            width: '100%',
            height: '100%'
          }}
          title={event.title}
        >
          {event.title}
        </div>
      )
    },
    day: {
      event: ({ event }: { event: DriverEvent }) => (
        <div 
          className="text-xs p-1 block" 
          style={{ 
            backgroundColor: getEventColor(event),
            color: '#fff',
            borderRadius: '3px',
            fontSize: '11px',
            lineHeight: '1.2',
            whiteSpace: 'normal',
            overflow: 'hidden',
            display: 'block',
            width: '100%',
            height: '100%'
          }}
          title={event.title}
        >
          {event.title}
        </div>
      )
    },
    agenda: {
      event: ({ event }: { event: DriverEvent }) => (
        <div 
          className="text-sm p-2 block" 
          style={{ 
            backgroundColor: getEventColor(event),
            color: '#fff',
            borderRadius: '3px',
            fontSize: '12px',
            lineHeight: '1.3',
            whiteSpace: 'normal',
            overflow: 'hidden',
            display: 'block',
            width: '100%'
          }}
          title={event.title}
        >
          {event.title}
        </div>
      )
    }
  }

  if (loading) {
    return (
      <p className="p-6">Loading calendar...</p>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-gray-50 text-gray-800 min-h-screen">
        <div className="flex px-4 py-4 gap-4">
          {/* Sidebar */}
          <aside
            className="w-1/5 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col"
            style={{ height: 'calc(100vh - 120px)' }} // fixed screen-relative height
          >
            <h2 className="text-lg font-semibold mb-4">📦 Unassigned Orders</h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {orders
              .filter((o) => o.status === 'order_placed')
              .map((order) => (
                <DraggableOrder
                  key={order.id}
                  order={order}
                  onClick={() => setSelectedOrder(order)}
                />
              ))
            }
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleAutoAssign}
              disabled={assigning}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm py-2 rounded-md transition disabled:opacity-50"
            >
              {assigning ? 'Assigning...' : '🤖 Auto-Assign Orders'}
            </button>
          </div>
        </aside>

          {/* Main Calendar Area */}
          <section className="flex-1 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Total Orders Card */}
              <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{orders.length}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <span className="text-2xl">📦</span>
                  </div>
                </div>
              </div>

              {/* Unassigned Orders Card */}
              <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Unassigned</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                      {orders.filter(o => o.status === 'order_placed').length}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
              </div>

              {/* Assigned Orders Card */}
              <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Assigned</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {orders.filter(o => o.status !== 'order_placed' && o.driver_id).length}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
              </div>

              {/* Active Drivers Card */}
              <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Active Drivers</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{drivers.length}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <span className="text-2xl">🚛</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-bold">
                    {calendarType === 'availability' ? '🚛 Driver Availability' : '📦 Orders Schedule'}
                  </h1>
                  <select
                    value={calendarType}
                    onChange={(e) => setCalendarType(e.target.value as 'availability' | 'orders')}
                    className="border rounded-md px-3 py-1 text-sm"
                  >
                    <option value="availability">Driver Availability</option>
                    <option value="orders">Orders Schedule</option>
                  </select>
                </div>

                {calendarType === 'availability' && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Driver:</label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="border rounded-md px-3 py-1 text-sm"
                    >
                      <option value="all">All Drivers</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.first_name} {driver.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">View:</label>
                  <select
                    value={currentView}
                    onChange={(e) => setCurrentView(e.target.value as View)}
                    className="border rounded-md px-3 py-1 text-sm"
                  >
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                  </select>
                </div>
              </div>

              <div className="overflow-auto">
                <Calendar
                  localizer={localizer}
                  events={
                    calendarType === 'availability'
                      ? selectedDriverId === 'all'
                        ? availabilityEvents
                        : availabilityEvents.filter(event => event.driverId === selectedDriverId)
                      : orderEvents
                  }
                  startAccessor={(event) => event.start}
                  endAccessor={(event) => event.end}
                  view={currentView}
                  date={currentDate}
                  onView={(view) => setCurrentView(view)}
                  onNavigate={(date) => setCurrentDate(date)}
                  onSelectEvent={handleEventClick}
                  style={calendarStyle}
                  components={customComponents}
                  eventPropGetter={(event: DriverEvent) => ({
                    style: {
                      backgroundColor: getEventColor(event),
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px'
                    }
                  })}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          selectedOrder={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdate={fetchData}
        />
      )}
    </DndProvider>
  )
}