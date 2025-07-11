'use client'

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
import DashboardLayout from '@/components/DashboardLayout'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import DraggableOrder from '@/components/Dispatcher/DraggableOrder'

moment.tz.setDefault('Asia/Manila')
const localizer = momentLocalizer(moment)
const DnDCalendar = withDragAndDrop<DriverEvent, object>(Calendar)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN


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

const OrderDetailsModal = ({
  order,
  onClose,
}: {
  order: Order
  onClose: () => void
}) => {
  const [client, setClient] = useState<Client | null>(null)
  const [dropoffs, setDropoffs] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    const fetchClient = async () => {
      if (!order.client_id) return
      const { data, error } = await supabase
        .from('clients')
        .select(
          'tracking_id, business_name, contact_person, contact_number, email, pickup_address, landmark, pickup_area, pickup_latitude, pickup_longitude'
        )
        .eq('id', order.client_id)
        .single()

      if (error) console.error('❌ Failed to fetch client:', error)
      else setClient(data)
    }

    const fetchDropoffs = async () => {
      const { data, error } = await supabase
        .from('order_dropoffs')
        .select('dropoff_name, dropoff_address, dropoff_contact, dropoff_phone, sequence')
        .eq('order_id', order.id)
        .order('sequence', { ascending: true })

      if (error) console.error('❌ Failed to fetch dropoffs:', error)
      else setDropoffs(data || [])
    }

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('order_products')
        .select('quantity, products(name)')
        .eq('order_id', order.id)

      if (error) console.error('❌ Failed to fetch products:', error)
      else setProducts(data || [])
    }

    fetchClient()
    fetchDropoffs()
    fetchProducts()
  }, [order.id, order.client_id])

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/20 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-xl space-y-4 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">
            📝 Order <span className="break-all">#{order.id}</span>
          </h2>
          <button onClick={onClose} className="text-red-500 text-xl font-bold">✖</button>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>📅 Pickup Date:</strong> {order.pickup_date}</p>
          <p><strong>⏰ Pickup Time:</strong> {order.pickup_time || 'N/A'}</p>
          <p><strong>📦 Delivery Window:</strong> {order.delivery_window_start || 'N/A'} – {order.delivery_window_end || 'N/A'}</p>
          <p><strong>🗒️ Instructions:</strong> {order.special_instructions || 'None'}</p>
        </div>

        {/* Client Details */}
        {client ? (
          <div className="pt-2 border-t space-y-2 text-sm text-gray-800">
            <h3 className="text-md font-semibold">👤 Client Details</h3>
            <p><strong>Tracking ID:</strong> {client.tracking_id}</p>
            <p><strong>Business Name:</strong> {client.business_name}</p>
            <p><strong>Contact Person:</strong> {client.contact_person}</p>
            <p><strong>Contact Number:</strong> {client.contact_number}</p>
            <p><strong>Email:</strong> {client.email || 'N/A'}</p>
            <p><strong>Pickup Address:</strong> {client.pickup_address}</p>
            <p><strong>Landmark:</strong> {client.landmark || 'N/A'}</p>
            <p><strong>Pickup Area:</strong> {client.pickup_area || 'N/A'}</p>

            {MAPBOX_TOKEN && client.pickup_latitude && client.pickup_longitude && (
              <img
                className="rounded-md mt-2 border"
                alt={`Map of ${client.pickup_address}`}
                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${client.pickup_longitude},${client.pickup_latitude})/${client.pickup_longitude},${client.pickup_latitude},15/500x250?access_token=${MAPBOX_TOKEN}`}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Loading client info...</p>
        )}

        {/* Products */}
        {products.length > 0 && (
          <div className="pt-2 border-t space-y-2 text-sm text-gray-800">
            <h3 className="text-md font-semibold">📋 Products</h3>
            <ul className="list-disc list-inside">
              {products.map((p, idx) => (
                <li key={idx}>
                  {p.products?.name || 'Unknown Product'} — Qty: {p.quantity}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dropoffs */}
        {dropoffs.length > 0 && (
          <div className="pt-2 border-t space-y-2 text-sm text-gray-800">
            <h3 className="text-md font-semibold">📍 Drop-off Points</h3>
            <ul className="space-y-1">
              {dropoffs.map((d, idx) => (
                <li key={idx} className="border p-2 rounded-md">
                  <p><strong>🔢 Seq:</strong> {d.sequence}</p>
                  <p><strong>👤 Name:</strong> {d.dropoff_name}</p>
                  <p><strong>📍 Address:</strong> {d.dropoff_address}</p>
                  <p><strong>📞 Contact:</strong> {d.dropoff_contact}</p>
                  <p><strong>📱 Phone:</strong> {d.dropoff_phone}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded-md mt-4"
        >
          Close
        </button>
      </div>
    </div>
  )
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
        .select(
          'id, pickup_date, pickup_time, delivery_window_start, delivery_window_end, special_instructions, client_id, status'
        )

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
      setOrders(orderData?.filter((o) => o.status === 'order_placed') || [])
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
      <DashboardLayout role="dispatcher" userName="Dispatcher">
        <p className="p-6">Loading calendar...</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="dispatcher" userName="Dispatcher">
      <DndProvider backend={HTML5Backend}>
        <main className="flex bg-gray-50 text-gray-800 h-[calc(100vh-4rem)] px-4 py-4 gap-4 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-1/5 bg-white p-4 overflow-y-auto rounded-xl shadow-sm h-full border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">📦 Unassigned Orders</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">All orders are assigned!</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
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
          <section className="w-4/5 flex flex-col h-full">
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

            <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
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
            </div>
          </section>
        </main>
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </DndProvider>
    </DashboardLayout>
  )
}