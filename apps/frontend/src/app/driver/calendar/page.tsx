'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  momentLocalizer,
  View,
} from 'react-big-calendar'
import moment from 'moment-timezone'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/DashboardLayout'
import 'react-big-calendar/lib/css/react-big-calendar.css'

moment.tz.setDefault('Asia/Manila')
const localizer = momentLocalizer(moment)

type DriverEvent = {
  id: string
  title: string
  start: Date
  end: Date
  type: 'order' | 'availability'
  order?: Order
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
  driver_id: string | null
}

export default function DriverCalendarPage() {
  const [events, setEvents] = useState<DriverEvent[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [currentView, setCurrentView] = useState<View>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDriverData()
  }, [])

  const fetchDriverData = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) {
        setError('You must be logged in to view your calendar.')
        setLoading(false)
        return
      }

      // Fetch driver's availability
      const { data: availabilityData, error: availError } = await supabase
        .from('driver_availability')
        .select('id, title, start_time, end_time')
        .eq('driver_id', user.id)

      // Fetch orders assigned to this driver
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
          driver_id
        `)
        .eq('driver_id', user.id)

      if (availError || orderError) {
        console.error('❌ Supabase error:', availError || orderError)
        setError('Failed to load calendar data.')
        setLoading(false)
        return
      }

      // Create availability events
      const availEvents: DriverEvent[] = (availabilityData || []).map((e) => ({
        id: e.id,
        title: e.title || 'Available',
        start: new Date(e.start_time + 'Z'),
        end: new Date(e.end_time + 'Z'),
        type: 'availability',
      }))

      // Create order events
      const orderEvents: DriverEvent[] = (orderData || []).map((o) => {
        const pickupDateTime = new Date(`${o.pickup_date}T${o.pickup_time}`)
        let endDateTime = new Date(pickupDateTime)
        
        // If delivery window is specified, use delivery end time, otherwise add 2 hours
        if (o.delivery_window_end) {
          endDateTime = new Date(`${o.pickup_date}T${o.delivery_window_end}`)
        } else {
          endDateTime.setHours(endDateTime.getHours() + 2)
        }

        return {
          id: o.id,
          title: `Order #${o.id}`,
          start: pickupDateTime,
          end: endDateTime,
          type: 'order',
          order: o,
        }
      })

      setEvents([...availEvents, ...orderEvents])
    } catch (err) {
      console.error('Error fetching driver data:', err)
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = (event: DriverEvent) => {
    if (event.type === 'order' && event.order) {
      setSelectedOrder(event.order)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      console.error('Error updating order status:', error)
      alert('Failed to update order status')
    } else {
      alert('Order status updated successfully!')
      fetchDriverData() // Refresh the data
      setSelectedOrder(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return '#3182ce' // Blue
      case 'in_progress':
        return '#ed8936' // Orange
      case 'completed':
        return '#38a169' // Green
      case 'cancelled':
        return '#e53e3e' // Red
      default:
        return '#718096' // Gray
    }
  }

  const getTotalHours = () => {
    return events
      .filter(e => e.type === 'availability' && !e.title.includes('Unavailable'))
      .reduce((total, event) => {
        const hours = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)
        return total + hours
      }, 0)
  }

  const getOrderCount = () => {
    return events.filter(e => e.type === 'order').length
  }

  if (loading) {
    return (
      <DashboardLayout role="driver" userName="Driver">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your calendar...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="driver" userName="Driver">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black">📅 My Schedule</h1>
          <p className="text-sm text-gray-500">
            View your availability and assigned orders
          </p>
        </div>

        {error && (
          <div className="mb-6 text-center text-sm font-medium text-red-600 bg-red-50 py-3 px-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{getTotalHours().toFixed(1)}</div>
              <div className="text-sm text-gray-600">Hours Scheduled</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getOrderCount()}</div>
              <div className="text-sm text-gray-600">Orders Assigned</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {events.filter(e => e.type === 'order' && e.order?.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Orders Completed</div>
            </div>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Schedule Overview</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">View:</label>
            <select
              value={currentView}
              onChange={(e) => setCurrentView(e.target.value as View)}
              className="border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={currentView}
            onView={(view) => setCurrentView(view)}
            onSelectEvent={handleEventClick}
            style={{ height: '600px' }}
            eventPropGetter={(event: DriverEvent) => {
              let backgroundColor = '#3182ce'
              let textColor = '#fff'
              
              if (event.type === 'availability') {
                backgroundColor = event.title.includes('Unavailable') ? '#e53e3e' : '#38a169'
              } else if (event.type === 'order' && event.order) {
                backgroundColor = getStatusColor(event.order.status)
              }
              
              return { 
                style: { 
                  backgroundColor, 
                  color: textColor,
                  border: 'none',
                  borderRadius: '4px'
                } 
              }
            }}
            dayPropGetter={(date) => {
              const isToday = moment(date).isSame(moment(), 'day')
              return isToday ? { style: { backgroundColor: '#fef3e2' } } : {}
            }}
          />
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Assigned Order</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span>Completed</span>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Order #{selectedOrder.id}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Pickup Date:</span> {selectedOrder.pickup_date}
              </div>
              <div>
                <span className="font-medium">Pickup Time:</span> {selectedOrder.pickup_time}
              </div>
              {selectedOrder.delivery_window_start && (
                <div>
                  <span className="font-medium">Delivery Window:</span>{' '}
                  {selectedOrder.delivery_window_start} - {selectedOrder.delivery_window_end}
                </div>
              )}
              {selectedOrder.vehicle_type && (
                <div>
                  <span className="font-medium">Vehicle Type:</span> {selectedOrder.vehicle_type}
                </div>
              )}
              {selectedOrder.tail_lift_required && (
                <div>
                  <span className="font-medium">Tail Lift:</span> Required
                </div>
              )}
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedOrder.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                  selectedOrder.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                  selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedOrder.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              {selectedOrder.special_instructions && (
                <div>
                  <span className="font-medium">Special Instructions:</span>
                  <p className="text-gray-600 mt-1">{selectedOrder.special_instructions}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              {selectedOrder.status === 'assigned' && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, 'in_progress')}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm font-medium"
                >
                  Start Order
                </button>
              )}
              {selectedOrder.status === 'in_progress' && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium"
                >
                  Complete Order
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}