'use client'
import RoleGuard from '@/components/auth/RoleGuard'
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
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import DraggableOrder from '@/components/Dispatcher/DraggableOrder'
import OrderDetailsModal from '@/components/Dispatcher/OrderDetailsModal'
import 'react-big-calendar/lib/css/react-big-calendar.css'

moment.tz.setDefault('Asia/Manila')
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop<DriverEvent, object>(Calendar)

type DriverEvent = {
  id?: string
  title: string
  start: Date
  end: Date
  type: 'availability' | 'order'
  status?: 'assigned' | 'unassigned'
  driverId?: string
  driverName?: string
}

type Order = {
  id: string
  pickup_date: string
  pickup_time: string
  delivery_window_start: string | null
  delivery_window_end: string | null
  special_instructions: string
  client_id: string
  status: string
  vehicle_type: string | null 
  tail_lift_required: boolean | null
}

type Driver = {
  id: string
  first_name: string
  last_name: string
  color: string
}

// Generate a consistent color for each driver
const generateDriverColor = (driverId: string): string => {
  const colors = [
    '#3182ce', '#38a169', '#d69e2e', '#9f7aea', '#e53e3e',
    '#00b5d8', '#dd6b20', '#319795', '#805ad5', '#c53030',
    '#2b6cb0', '#2f855a', '#b7791f', '#553c9a', '#c05621',
    '#0987a0', '#9c4221', '#285e61', '#44337a', '#9b2c2c'
  ]
  
  // Create a simple hash from the driver ID
  let hash = 0
  for (let i = 0; i < driverId.length; i++) {
    hash = ((hash << 5) - hash) + driverId.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export default function DispatcherCalendarPage() {
  const [availabilityEvents, setAvailabilityEvents] = useState<DriverEvent[]>([])
  const [orderEvents, setOrderEvents] = useState<DriverEvent[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null)
  const [currentView, setCurrentView] = useState<View>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
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

      // Create driver objects with colors
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
        `)

      // Fetch orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          pickup_date,
          pickup_time,
          delivery_window_start,
          delivery_window_end,
          special_instructions,
          client_id,
          status,
          vehicle_type,
          tail_lift_required,
          driver_id,
          profiles!driver_id (
            first_name,
            last_name
          )
        `)

      if (availError || orderError) {
        console.error('❌ Supabase error:', availError || orderError)
        return
      }

      // Process availability events
      const availEvents: DriverEvent[] = (availabilityData || []).map((e) => {
        const driver = driversWithColors.find(d => d.id === e.driver_id)
        const driverName = e.profiles 
          ? `${e.profiles.first_name} ${e.profiles.last_name}`
          : 'Unknown Driver'
        
        // Parse as local Manila time instead of UTC
        const startTime = moment.tz(e.start_time, 'Asia/Manila').toDate()
        const endTime = moment.tz(e.end_time, 'Asia/Manila').toDate()
        
        // Format times for display
        const startTimeStr = startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })
        const endTimeStr = endTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })
        
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
      const orderEventsData: DriverEvent[] = (orderData || []).map((o) => {
        const driver = driversWithColors.find(d => d.id === o.driver_id)
        let title = `Order #${o.id}`
        
        if (o.driver_id && o.profiles) {
          const driverName = `${o.profiles.first_name} ${o.profiles.last_name}`
          title = `${driverName} - Order #${o.id}`
        }

        return {
          id: o.id,
          title: title,
          start: new Date(`${o.pickup_date}T${o.pickup_time}`),
          end: new Date(`${o.pickup_date}T${o.pickup_time}`),
          type: 'order',
          status: o.status === 'order_placed' ? 'unassigned' : 'assigned',
          driverId: o.driver_id,
          driverName: o.profiles ? `${o.profiles.first_name} ${o.profiles.last_name}` : undefined
        }
      })

      setAvailabilityEvents(availEvents)
      setOrderEvents(orderEventsData)
      setOrders(orderData || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const handleAutoAssign = async () => {
    setAssigning(true)
    try {
      const res = await fetch('/api/auto-assign', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Auto-assign failed')
      alert(`✅ ${data.message}`)
      window.location.reload()
    } catch (err: unknown) {
      const error = err as Error
      console.error('Auto-assign failed:', error)
      alert(`❌ ${error.message}`)
    } finally {
      setAssigning(false)
    }
  }

  const getEventColor = (event: DriverEvent) => {
    if (event.type === 'availability') {
      const driver = drivers.find(d => d.id === event.driverId)
      return driver?.color || '#3182ce'
    } else {
      // Order events
      if (event.status === 'unassigned') return '#ed8936'
      if (event.driverId) {
        const driver = drivers.find(d => d.id === event.driverId)
        return driver?.color || '#38a169'
      }
      return '#38a169'
    }
  }

  // Custom styles for better monthly view
  const calendarStyle = {
    height: currentView === 'month' ? '600px' : '400px', // Taller for month view
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
          title={event.title} // Tooltip for full text
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
          title={event.title} // Tooltip for full text
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
          title={event.title} // Tooltip for full text
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
          title={event.title} // Tooltip for full text
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
          <aside className="w-1/5 bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-4 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">📦 Unassigned Orders</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">All orders are assigned!</p>
            ) : (
              <div className="space-y-3">
                {orders
                  .filter((o) => o.status === 'order_placed')
                  .map((order) => (
                    <DraggableOrder
                      key={order.id}
                      order={order}
                      onClick={() => setSelectedOrder(order)}
                    />
                ))}
                <button
                  onClick={handleAutoAssign}
                  disabled={assigning}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm py-2 rounded-md transition disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Auto-Assign Orders'}
                </button>
              </div>
            )}

            {/* Driver Legend */}
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">👥 Driver Colors</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: driver.color }}
                    />
                    <span className="text-xs text-gray-700">
                      {driver.first_name} {driver.last_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Calendar Area */}
          <section className="flex-1 space-y-4">
            {/* Driver Availability Calendar */}
            <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">🚛 Driver Availability</h1>
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
                  events={availabilityEvents}
                  startAccessor={(event) => event.start}
                  endAccessor={(event) => event.end}
                  view={currentView}
                  date={currentDate}
                  onView={(view) => setCurrentView(view)}
                  onNavigate={(date) => setCurrentDate(date)}
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

            {/* Orders Calendar */}
            <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">📦 Orders Schedule</h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-sm">Unassigned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm">Assigned</span>
                  </div>
                </div>
              </div>

              <div className="overflow-auto">
                <DnDCalendar
                  localizer={localizer}
                  events={orderEvents}
                  startAccessor={(event) => event.start}
                  endAccessor={(event) => event.end}
                  view={currentView}
                  date={currentDate}
                  onView={(view) => setCurrentView(view)}
                  onNavigate={(date) => setCurrentDate(date)}
                  style={calendarStyle}
                  components={customComponents}
                  onDropFromOutside={({ start }) => {
                    if (!draggedOrder) return
                    const newEvent: DriverEvent = {
                      id: draggedOrder.id,
                      title: `Order #${draggedOrder.id}`,
                      start: start as Date,
                      end: start as Date,
                      type: 'order',
                      status: 'assigned',
                    }
                    setOrderEvents((prev) => [...prev, newEvent])
                    setOrders((prev) => prev.filter((o) => o.id !== draggedOrder.id))
                    setDraggedOrder(null)
                  }}
                  handleDragStart={(event: DriverEvent) => {
                    if (event.type === 'order') {
                      const matchingOrder = orders.find((o) => o.id === event.id)
                      if (matchingOrder) setDraggedOrder(matchingOrder)
                    }
                  }}
                  draggableAccessor={(event: DriverEvent) => event.type === 'order'}
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
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </DndProvider>
  )
}