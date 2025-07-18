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
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';


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

type WeatherData = {
  temperature: number | null
  windspeed: number | null
  weathercode: number | null
  weatherDescription: string
}

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


const ORDER_STATUSES = [
  { value: 'order_placed', label: 'Order Placed', color: '#718096' },
  { value: 'driver_assigned', label: 'Driver Assigned', color: '#3182ce' },
  { value: 'truck_left_warehouse', label: 'Truck Left Warehouse', color: '#d69e2e' },
  { value: 'arrived_at_pickup', label: 'Arrived at Pickup', color: '#ed8936' },
  { value: 'delivered', label: 'Delivered', color: '#38a169' },
  { value: 'cancelled', label: 'Cancelled', color: '#e53e3e' },
]

function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  }
  return weatherCodes[code] || 'Unknown'
}

export default function DriverCalendarPage() {
  const [events, setEvents] = useState<DriverEvent[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [currentView, setCurrentView] = useState<View>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const auth = useAuth();
  const router = useRouter();
  const currentDate = moment();
  const startOfWeek = currentDate.clone().startOf('week');
  const endOfWeek = currentDate.clone().endOf('week'); 
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState('')




  useEffect(() => {
  const fetchSessionThenData = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setError('You must be logged in to view your calendar.')
      setLoading(false)
      return
    }

    await fetchDriverData()
  }


  fetchSessionThenData()
}, [])


  const fetchDriverData = async () => {
    setLoading(true)
    setError('')
    console.log('🔄 Fetching driver data...')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) {
        console.error('❌ User authentication failed:', userError)
        setError('You must be logged in to view your calendar.')
        setLoading(false)
        return
      }
      console.log('✅ User authenticated:', user.id)

      // Fetch driver's availability
      const { data: availabilityData, error: availError } = await supabase
        .from('driver_availability')
        .select('id, title, start_time, end_time')
        .eq('driver_id', user.id)

      console.log('📅 Availability data:', availabilityData)

      // Fetch orders assigned to this driver
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          tracking_id,
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

      console.log('📦 Orders data:', orderData)

      if (availError || orderError) {
        console.error('❌ Supabase query error:', availError || orderError)
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
          title: `Tracking #${o.tracking_id}`,
          start: pickupDateTime,
          end: endDateTime,
          type: 'order',
          order: o,
        }
      })

      console.log('✅ Events created:', { availEvents: availEvents.length, orderEvents: orderEvents.length })
      setEvents([...availEvents, ...orderEvents])
    } catch (err) {
      console.error('❌ Unexpected error fetching data:', err)
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
    setStatusLoading(true)
    console.log('🔄 Attempting to update order:', { orderId, newStatus })
    
    try {
      // First, let's check if the user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) {
        console.error('❌ User not authenticated:', userError)
        alert('You must be logged in to update orders.')
        return
      }
      console.log('✅ User authenticated:', user.id)

      // Check if this order belongs to the current driver
      const { data: orderCheck, error: checkError } = await supabase
        .from('orders')
        .select('id, tracking_id, driver_id, status')
        .eq('id', orderId)
        .single()

      if (checkError) {
        console.error('❌ Error checking order:', checkError)
        alert('Failed to verify order: ' + checkError.message)
        return
      }

      if (!orderCheck) {
        console.error('❌ Order not found:', orderId)
        alert('Order not found.')
        return
      }

      if (orderCheck.driver_id !== user.id) {
        console.error('❌ Order does not belong to current driver:', {
          orderDriverId: orderCheck.driver_id,
          currentUserId: user.id
        })
        alert('You can only update your own orders.')
        return
      }

      console.log('✅ Order verification passed:', orderCheck)

      // Now attempt the update
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()

      if (error) {
        console.error('❌ Supabase update error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        alert('Failed to update order status: ' + error.message)
      } else {
        console.log('✅ Update successful:', data)
        alert('Order status updated successfully!')
        
        // Update the selected order state immediately
        if (selectedOrder) {
          setSelectedOrder({
            ...selectedOrder,
            status: newStatus
          })
        }
        
        // Refresh the calendar data
        await fetchDriverData()
        setSelectedOrder(null)
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err)
      alert('An unexpected error occurred while updating order status')
    } finally {
      setStatusLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (auth && typeof auth.refresh === 'function') {
      auth.refresh();
    }
    router.push('/login');
  }

  const getStatusColor = (status: string) => {
    const statusObj = ORDER_STATUSES.find(s => s.value === status)
    return statusObj ? statusObj.color : '#718096'
  }

  const getStatusLabel = (status: string) => {
    const statusObj = ORDER_STATUSES.find(s => s.value === status)
    return statusObj ? statusObj.label : status.replace('_', ' ').toUpperCase()
  }

  const getAvailableNextStatuses = (currentStatus: string) => {
    // Define logical progression of statuses
    const statusFlow = {
      'order_placed': ['driver_assigned', 'cancelled'],
      'driver_assigned': ['truck_left_warehouse', 'cancelled'],
      'truck_left_warehouse': ['arrived_at_pickup', 'cancelled'],
      'arrived_at_pickup': ['delivered', 'cancelled'],
      'delivered': [], // Final state
      'cancelled': [] // Final state
    }

    return statusFlow[currentStatus as keyof typeof statusFlow] || []
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

  useEffect(() => {
  const fetchWeather = async (lat: number, lon: number) => {
    try {
      setWeatherLoading(true)
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      )
      const data = await res.json()
      if (data && data.current_weather) {
        setWeather({
          temperature: data.current_weather.temperature,
          windspeed: data.current_weather.windspeed,
          weathercode: data.current_weather.weathercode,
          weatherDescription: getWeatherDescription(data.current_weather.weathercode)
        })
      } else {
        setWeatherError('Failed to fetch weather data.')
      }
    } catch {
      setWeatherError('Failed to fetch weather data.')
    } finally {
      setWeatherLoading(false)
    }
  }

  if (!navigator.geolocation) {
    setWeatherError('Geolocation is not supported by your browser.')
    setWeatherLoading(false)
    return
  }

  navigator.geolocation.getCurrentPosition(
  (position) => {
    fetchWeather(position.coords.latitude, position.coords.longitude)
  },
  (error) => {
    if (error.code !== 1) { 
      if (error && Object.keys(error).length > 0) {
        console.error('Geolocation error:', error)
      } else {
        console.warn('Geolocation failed with empty error object.')
      }
    }
    fetchWeather(14.5995, 120.9842)  
  }
)

}, [])



  const upcomingOrders = events
    .filter(e => e.type === 'order' && moment(e.start).isBetween(moment().startOf('day'), moment().add(7, 'days').endOf('day'), null, '[]'))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const filteredAvailability = events.filter((e) => {
  if (e.type === 'availability') {
    const startMoment = moment(e.start);
    return startMoment.isBetween(startOfWeek, endOfWeek, 'days', '[]');
  }
  return false;
});

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

    {/* Dashboard Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Hours Scheduled */}
      <div className="bg-white rounded-xl shadow p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-orange-600">{getTotalHours().toFixed(1)}</div>
        <div className="text-sm text-gray-600">Hours Scheduled</div>
      </div>
      {/* Orders Assigned */}
      <div className="bg-white rounded-xl shadow p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-blue-600">{getOrderCount()}</div>
        <div className="text-sm text-gray-600">Orders Assigned</div>
      </div>
      {/* Orders Delivered */}
      <div className="bg-white rounded-xl shadow p-4 border border-gray-200 text-center">
        <div className="text-2xl font-bold text-green-600">
          {events.filter(e => e.type === 'order' && e.order?.status === 'delivered').length}
        </div>
        <div className="text-sm text-gray-600">Orders Delivered</div>
      </div>
    </div>

    {/* Current Weather + Assigned Orders Today + Calendar View */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

      {/* Left Column: Weather + Assigned Orders (stacked) */}
      <div className="md:col-span-1 space-y-6 max-w-md">
        {/* Current Weather */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
          <h2 className="text-lg font-semibold mb-2">🌤️ Current Weather</h2>
          {weatherLoading ? (
            <p>Loading weather...</p>
          ) : weatherError ? (
            <p className="text-red-600">{weatherError}</p>
          ) : weather ? (
            <div>
              <p><strong>Temperature:</strong> {weather.temperature}°C</p>
              <p><strong>Wind Speed:</strong> {weather.windspeed} km/h</p>
              <p><strong>Condition:</strong> {weather.weatherDescription}</p>
            </div>
          ) : (
            <p>No weather data available.</p>
          )}
        </div>

        {/* Assigned Orders Today */}
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow">
          <h2 className="text-lg font-semibold text-orange-600 mb-3">📦 Assigned Orders Today</h2>
          {events.filter(e => e.type === 'order' && moment(e.start).isSame(moment(), 'day')).length === 0 ? (
            <p className="text-sm text-gray-500 italic">You have no assigned orders today.</p>
          ) : (
            <ul className="space-y-2">
              {events
                .filter(e => e.type === 'order' && moment(e.start).isSame(moment(), 'day'))
                .map(order => (
                  <li key={order.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">Tracking #{order.order?.tracking_id}</p>
                      <p className="text-gray-500">{moment(order.start).format('hh:mm A')} → {moment(order.end).format('hh:mm A')}</p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded"
                      style={{ backgroundColor: getStatusColor(order.order?.status || 'order_placed'), color: 'white' }}
                    >
                      {getStatusLabel(order.order?.status || 'order_placed')}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Column: Calendar View (75%) */}
      <div className="md:col-span-3 bg-white rounded-xl shadow overflow-hidden border border-gray-200">
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
    </div>

    {/* Upcoming Orders Next 7 Days */}
    <div className="p-4 rounded-xl bg-white border border-gray-200 shadow max-w-full mb-8">
      <h2 className="text-lg font-semibold text-orange-600 mb-3">📅 Upcoming Orders (Next 7 Days)</h2>
      {upcomingOrders.length === 0 ? (
        <p className="text-gray-500 italic">No upcoming orders in the next 7 days.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {upcomingOrders.map((orderEvent) => (
            <li key={orderEvent.id} className="flex justify-between items-center">
              <div>
                <p><strong>Tracking #{orderEvent.order?.tracking_id}</strong></p>
                <p>{moment(orderEvent.start).format('ddd, MMM D, hh:mm A')}</p>
              </div>
              <span
                className="text-xs font-semibold px-2 py-1 rounded"
                style={{ backgroundColor: getStatusColor(orderEvent.order?.status || 'order_placed'), color: 'white' }}
              >
                {getStatusLabel(orderEvent.order?.status || 'order_placed')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>




    {/* Error Message */}
    {error && (
      <div className="mb-6 text-center text-sm font-medium text-red-600 bg-red-50 py-3 px-4 rounded-lg">
        {error}
      </div>
    )}


    {/* Order Details Modal */}
    {selectedOrder && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Order #{selectedOrder.id}</h3>
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-gray-400 hover:text-gray-600"
              disabled={statusLoading}
              aria-label="Close modal"
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

            {/* Current Status */}
            <div>
              <span className="font-medium">Current Status:</span>{' '}
              <span
                className="px-2 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: getStatusColor(selectedOrder.status) }}
              >
                {getStatusLabel(selectedOrder.status)}
              </span>
            </div>

            {/* Status Update Buttons */}
            <div className="border-t pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Update Status:</label>
              <div className="space-y-2">
                {getAvailableNextStatuses(selectedOrder.status).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateOrderStatus(selectedOrder.id, status)}
                    disabled={statusLoading}
                    className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      statusLoading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={{ backgroundColor: statusLoading ? '#f3f4f6' : getStatusColor(status) }}
                  >
                    {statusLoading ? 'Updating...' : `Mark as ${getStatusLabel(status)}`}
                  </button>
                ))}
                {getAvailableNextStatuses(selectedOrder.status).length === 0 && (
                  <p className="text-sm text-gray-500 italic">No status updates available for this order.</p>
                )}
              </div>
            </div>

            {/* Special Instructions */}
            {selectedOrder.special_instructions && (
              <div className="border-t pt-3">
                <span className="font-medium">Special Instructions:</span>
                <p className="text-gray-600 mt-1">{selectedOrder.special_instructions}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setSelectedOrder(null)}
              disabled={statusLoading}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md text-sm font-medium disabled:opacity-50"
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