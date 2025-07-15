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


export default function DispatcherCalendarPage() {
  const [events, setEvents] = useState<DriverEvent[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null)
  const [currentView, setCurrentView] = useState<View>('month')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const { data: availabilityData, error: availError } = await supabase
        .from('driver_availability')
        .select('title, start_time, end_time')

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
          tail_lift_required
        `)

      if (availError || orderError) {
        console.error('❌ Supabase error:', availError || orderError)
        return
      }

      const availEvents: DriverEvent[] = (availabilityData || []).map((e) => ({
        title: e.title || 'Driver Available',
        start: new Date(e.start_time + 'Z'),
        end: new Date(e.end_time + 'Z'),
        type: 'availability',
      }))

      const orderEvents: DriverEvent[] = (orderData || []).map((o) => ({
        id: o.id,
        title: `Order #${o.id}`,
        start: new Date(`${o.pickup_date}T${o.pickup_time}`),
        end: new Date(`${o.pickup_date}T${o.pickup_time}`),
        type: 'order',
        status: o.status === 'order_placed' ? 'unassigned' : 'assigned',
      }))

      setEvents([...availEvents, ...orderEvents])
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

  if (loading) {
    return (
      <p className="p-6">Loading calendar...</p>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="flex bg-gray-50 text-gray-800 h-[calc(100vh-4rem)] px-4 py-4 gap-4 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-1/5 bg-white p-4 overflow-y-auto rounded-xl shadow-sm h-full border border-gray-200">
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
        </aside>

        {/* Calendar */}
        <section className="flex-1 flex flex-col bg-white rounded-xl shadow p-6 border border-gray-200 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">🚛 Driver Availability Calendar</h1>
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

          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor={(event) => event.start}
            endAccessor={(event) => event.end}
            view={currentView}
            onView={(view) => setCurrentView(view)}
            style={{ height: '100%' }}
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
              setEvents((prev) => [...prev, newEvent])
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
            eventPropGetter={(event: DriverEvent) => {
              let backgroundColor = '#3182ce'
              if (event.type === 'order') {
                backgroundColor = event.status === 'assigned' ? '#38a169' : '#ed8936'
              }
              return { style: { backgroundColor, color: '#fff' } }
            }}
          />
        </section>
      </main>
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </DndProvider>
  )
}