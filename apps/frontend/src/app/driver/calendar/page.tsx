'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  momentLocalizer,
  View,
} from 'react-big-calendar'
import moment from 'moment-timezone'
import { supabase } from '@/lib/supabase'
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
  pickup_timestamp: string
  estimated_end_timestamp: string
  special_instructions: string
  client_id: string
  status: string
  vehicle_type: string | null
  tail_lift_required: boolean | null
  driver_id: string | null
  tracking_id: string
}

export default function DriverCalendarPage() {
  const [availabilityEvents, setAvailabilityEvents] = useState<DriverEvent[]>([])
  const [orderEvents, setOrderEvents] = useState<DriverEvent[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [currentView, setCurrentView] = useState<View>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarFilter, setCalendarFilter] = useState<'orders' | 'availability'>('orders')
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

      // Fetch orders assigned to this driver - Updated to use correct timestamp fields
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          tracking_id,
          pickup_timestamp,
          estimated_end_timestamp,
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

      // Create order events - Updated to use correct timestamp fields
      const ordEvents: DriverEvent[] = (orderData || []).map((o) => {
        // Use pickup_timestamp and estimated_end_timestamp directly
        const startDateTime = new Date(o.pickup_timestamp)
        const endDateTime = new Date(o.estimated_end_timestamp)

        return {
          id: o.id,
          title: `Tracking #${o.tracking_id}`,
          start: startDateTime,
          end: endDateTime,
          type: 'order',
          order: o,
        }
      })

      setAvailabilityEvents(availEvents)
      setOrderEvents(ordEvents)
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

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate)
  }

  const handleViewChange = (newView: View) => {
    setCurrentView(newView)
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
    return availabilityEvents
      .filter(e => !e.title.includes('Unavailable'))
      .reduce((total, event) => {
        const hours = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)
        return total + hours
      }, 0)
  }

  const getOrderCount = () => {
    return orderEvents.length
  }

  // Get the current events to display based on filter
  const getCurrentEvents = () => {
    return calendarFilter === 'orders' ? orderEvents : availabilityEvents
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your calendar...</p>
        </div>
      </div>
    )
  }

  return (
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
              {orderEvents.filter(e => e.order?.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Orders Completed</div>
          </div>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter:</label>
          <select
            value={calendarFilter}
            onChange={(e) => setCalendarFilter(e.target.value as 'orders' | 'availability')}
            className="border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="orders">📦 Assigned Orders</option>
            <option value="availability">📅 My Availability</option>
          </select>
        </div>
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
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h3 className="text-sm font-medium text-gray-700">
            {calendarFilter === 'orders' ? '📦 Your Assigned Orders' : '📅 Your Availability Schedule'}
          </h3>
        </div>
        <Calendar
          localizer={localizer}
          events={getCurrentEvents()}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          date={currentDate}
          onView={handleViewChange}
          onNavigate={handleNavigate}
          onSelectEvent={handleEventClick}
          style={{ height: '600px' }}
          toolbar={true}
          showMultiDayTimes={true}
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
          messages={{
            today: 'Today',
            previous: 'Back',
            next: 'Next',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            agenda: 'Agenda',
            date: 'Date',
            time: 'Time',
            event: 'Event',
            noEventsInRange: calendarFilter === 'orders' 
              ? 'No orders assigned for this period' 
              : 'No availability scheduled for this period',
            showMore: (total) => `+${total} more`,
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6">
        {calendarFilter === 'availability' ? (
          // Availability Legend
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Unavailable</span>
            </div>
          </>
        ) : (
          // Orders Legend
          <>
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
          </>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Tracking #{selectedOrder.tracking_id}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Pickup Time:</span> {moment(selectedOrder.pickup_timestamp).format('MMMM DD, YYYY HH:mm')}
              </div>
              <div>
                <span className="font-medium">Estimated End Time:</span> {moment(selectedOrder.estimated_end_timestamp).format('MMMM DD, YYYY HH:mm')}
              </div>
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
    </div>
  )
}