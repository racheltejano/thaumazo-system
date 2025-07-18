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
import Image from 'next/image'

moment.tz.setDefault('Asia/Manila')
const localizer = momentLocalizer(moment)

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

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

function formatDate(dateString: string): string {
  return moment(dateString).format('MMMM D, YYYY')
}

function formatTime(timeString: string): string {
  return moment(timeString, 'HH:mm:ss').format('h:mm A')
}

export default function DriverCalendarPage() {
  const [events, setEvents] = useState<DriverEvent[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [dropoffs, setDropoffs] = useState<Dropoff[]>([])
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null)
  const [showPickupMap, setShowPickupMap] = useState(false)
  const [showDropoffMaps, setShowDropoffMaps] = useState<{[key: string]: boolean}>({})
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

  const fetchOrderDetails = async (order: Order) => {
    try {
      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(
          'tracking_id, business_name, contact_person, contact_number, email, pickup_address, landmark, pickup_area, pickup_latitude, pickup_longitude'
        )
        .eq('id', order.client_id)
        .single()

      if (clientError) {
        console.error('❌ Failed to fetch client:', clientError)
      } else {
        setClient(clientData)
      }

      // Fetch dropoffs
      const { data: dropoffData, error: dropoffError } = await supabase
        .from('order_dropoffs')
        .select('id, dropoff_name, dropoff_address, dropoff_contact, dropoff_phone, sequence, latitude, longitude')
        .eq('order_id', order.id)
        .order('sequence', { ascending: true })

      if (dropoffError) {
        console.error('❌ Failed to fetch dropoffs:', dropoffError)
      } else {
        setDropoffs(dropoffData || [])
      }

    } catch (err) {
      console.error('❌ Error fetching order details:', err)
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

    const filteredDropoffs = dropoffData.filter(d => d.latitude && d.longitude)
    if (filteredDropoffs.length === 0) {
      setEstimatedTime('Unavailable')
      return
    }

    const coordinates = [
      `${clientData.pickup_longitude},${clientData.pickup_latitude}`,
      ...filteredDropoffs.map(d => `${d.longitude},${d.latitude}`)
    ]

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.join(';')}?access_token=${MAPBOX_TOKEN}&overview=false&geometries=geojson`

    try {
      const res = await fetch(url)
      const data = await res.json()

      if (data.routes && data.routes[0]?.duration) {
        const durationInMinutes = Math.round(data.routes[0].duration / 60)
        const hours = Math.floor(durationInMinutes / 60)
        const minutes = durationInMinutes % 60
        
        if (hours > 0) {
          setEstimatedTime(`${hours} hour${hours > 1 ? 's' : ''} ${minutes} mins`)
        } else {
          setEstimatedTime(`${minutes} mins`)
        }
      } else {
        console.warn('No valid route returned:', data)
        setEstimatedTime('Unavailable')
      }
    } catch (err) {
      console.error('❌ Error fetching travel time:', err)
      setEstimatedTime('Unavailable')
    }
  }

  const handleEventClick = async (event: DriverEvent) => {
    if (event.type === 'order' && event.order) {
      setSelectedOrder(event.order)
      setClient(null)
      setDropoffs([])
      setEstimatedTime(null)
      setShowPickupMap(false)
      setShowDropoffMaps({})
      
      await fetchOrderDetails(event.order)
    }
  }

  useEffect(() => {
    if (client && dropoffs.length > 0) {
      fetchEstimatedTravelTime(client, dropoffs)
    }
  }, [client, dropoffs])

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

  const toggleDropoffMap = (dropoffId: string) => {
    setShowDropoffMaps(prev => ({
      ...prev,
      [dropoffId]: !prev[dropoffId]
    }))
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

    {/* Error Message */}
    {error && (
      <div className="mb-6 text-center text-sm font-medium text-red-600 bg-red-50 py-3 px-4 rounded-lg border border-red-200">
        {error}
      </div>
    )}

    {/* Dashboard Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Hours Scheduled */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
        <div className="text-3xl font-bold text-orange-600 mb-1">{getTotalHours().toFixed(1)}</div>
        <div className="text-sm text-gray-600 font-medium">Hours Scheduled</div>
      </div>
      
      {/* Orders Assigned */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
        <div className="text-3xl font-bold text-blue-600 mb-1">{getOrderCount()}</div>
        <div className="text-sm text-gray-600 font-medium">Orders Assigned</div>
      </div>
      
      {/* Orders Delivered */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
        <div className="text-3xl font-bold text-green-600 mb-1">
          {events.filter(e => e.type === 'order' && e.order?.status === 'delivered').length}
        </div>
        <div className="text-sm text-gray-600 font-medium">Orders Delivered</div>
      </div>
    </div>

    {/* Main Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
      {/* Left Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        {/* Current Weather */}
        <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <span>🌤️</span>
            Current Weather
          </h2>
          {weatherLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">Loading weather...</span>
            </div>
          ) : weatherError ? (
            <p className="text-red-600 text-sm">{weatherError}</p>
          ) : weather ? (
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex justify-between">
                <span className="font-medium">Temperature:</span>
                <span>{weather.temperature}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Wind Speed:</span>
                <span>{weather.windspeed} km/h</span>
              </div>
              <div className="mt-3 p-2 bg-blue-200 rounded-lg">
                <span className="font-medium">Condition:</span>
                <div className="text-blue-900 font-semibold">{weather.weatherDescription}</div>
              </div>
            </div>
          ) : (
            <p className="text-blue-700 text-sm">No weather data available.</p>
          )}
        </div>

        {/* Today's Orders */}
        <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-orange-600 mb-4 flex items-center gap-2">
            <span>📦</span>
            Today's Orders
          </h2>
          {events.filter(e => e.type === 'order' && moment(e.start).isSame(moment(), 'day')).length === 0 ? (
            <div className="text-center py-4">
              <div className="text-gray-400 text-2xl mb-2">📅</div>
              <p className="text-sm text-gray-500 italic">No orders scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events
                .filter(e => e.type === 'order' && moment(e.start).isSame(moment(), 'day'))
                .map(order => (
                  <div key={order.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                       onClick={() => handleEventClick(order)}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm text-gray-900">
                        Tracking #{order.order?.tracking_id}
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: getStatusColor(order.order?.status || 'order_placed') }}
                      >
                        {getStatusLabel(order.order?.status || 'order_placed')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {moment(order.start).format('HH:mm')} - {moment(order.end).format('HH:mm')}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Calendar View */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Calendar View</h2>
          </div>
          <div className="p-4">
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
                    borderRadius: '6px',
                    fontSize: '12px',
                    padding: '2px 4px'
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
      </div>
    </div>

    {/* Upcoming Orders Section */}
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-orange-600 flex items-center gap-2">
          <span>📅</span>
          Upcoming Orders (Next 7 Days)
        </h2>
      </div>
      <div className="p-6">
        {upcomingOrders.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-3xl mb-3">📋</div>
            <p className="text-gray-500 italic">No upcoming orders in the next 7 days</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingOrders.map((orderEvent) => (
              <div key={orderEvent.id} 
                   className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                   onClick={() => handleEventClick(orderEvent)}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm text-gray-900">
                    Tracking #{orderEvent.order?.tracking_id}
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: getStatusColor(orderEvent.order?.status || 'order_placed') }}
                  >
                    {getStatusLabel(orderEvent.order?.status || 'order_placed')}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {moment(orderEvent.start).format('ddd, MMM D')}
                </div>
                <div className="text-xs text-gray-500">
                  {moment(orderEvent.start).format('HH:mm')} - {moment(orderEvent.end).format('HH:mm')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Order Details Modal */}
{selectedOrder && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
      {/* Modal Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>📝</span>
            Order Details: {selectedOrder.tracking_id}
          </h3>
          <button
            onClick={() => setSelectedOrder(null)}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
            disabled={statusLoading}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            {/* Order Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-gray-900">
                <span>📋</span> Order Information
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Pickup Date:</span>
                  <span className="text-gray-900">{formatDate(selectedOrder.pickup_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Pickup Time:</span>
                  <span className="text-gray-900">{formatTime(selectedOrder.pickup_time)}</span>
                </div>
                {selectedOrder.delivery_window_start && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Delivery Window:</span>
                    <span className="text-gray-900">
                      {formatTime(selectedOrder.delivery_window_start)} - {formatTime(selectedOrder.delivery_window_end || '')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Vehicle Type:</span>
                  <span className="text-gray-900">{selectedOrder.vehicle_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Tail Lift:</span>
                  <span className="text-gray-900">{selectedOrder.tail_lift_required ? 'Required' : 'Not Required'}</span>
                </div>
                {estimatedTime && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Est. Travel Time:</span>
                        <span className="text-gray-900">{estimatedTime}</span>
                      </div>
                    )}
                  </div>
                </div>
            {/* Current Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-gray-900">
                <span>🔄</span> Current Status
              </h4>
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: getStatusColor(selectedOrder.status) }}
                >
                  {getStatusLabel(selectedOrder.status)}
                </span>
              </div>
            </div>

            {/* Special Instructions */}
            {selectedOrder.special_instructions && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-yellow-800">
                  <span>⚠️</span> Special Instructions
                </h4>
                <p className="text-sm text-yellow-800">{selectedOrder.special_instructions}</p>
              </div>
            )}
          </div>

          {/* Right Column - Client & Status Updates */}
          <div className="space-y-6">
            {/* Client Information with Map Button */}
            {client && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-blue-800">
                  <span>👤</span> Client Information
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Business:</span>
                    <div className="text-blue-900">{client.business_name}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Contact:</span>
                    <div className="text-blue-900">{client.contact_person}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Phone:</span>
                    <div className="text-blue-900">{client.contact_number}</div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Pickup Address:</span>
                    <div className="text-blue-900 mb-2">{client.pickup_address}</div>
                    {/* Map button for pickup location */}
                    {client.pickup_latitude && client.pickup_longitude && (
                      <button
                        onClick={() => setShowPickupMap(!showPickupMap)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors flex items-center gap-1"
                      >
                        <span>🗺️</span>
                        {showPickupMap ? 'Hide Map' : 'Show Map'}
                      </button>
                    )}
                  </div>
                  
                  {/* Pickup Location Map */}
                  {showPickupMap && client.pickup_latitude && client.pickup_longitude && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-blue-300">
                      <img
                        src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-p+ff0000(${client.pickup_longitude},${client.pickup_latitude})/${client.pickup_longitude},${client.pickup_latitude},14,0/400x200@2x?access_token=${MAPBOX_TOKEN}`}
                        alt="Pickup Location Map"
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'block';
                        }}
                      />
                      <div className="hidden p-3 bg-red-50 text-red-600 text-sm text-center">
                        Map could not be loaded
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dropoff Information with Map Buttons */}
            {dropoffs.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-green-800">
                  <span>📍</span> Dropoff Locations
                </h4>
                <div className="space-y-4">
                  {dropoffs.map((dropoff) => (
                    <div key={dropoff.id} className="text-sm border-b border-green-200 last:border-b-0 pb-3 last:pb-0">
                      <div className="font-medium text-green-700">
                        {dropoff.sequence}. {dropoff.dropoff_name}
                      </div>
                      <div className="text-green-600 mb-1">{dropoff.dropoff_address}</div>
                      <div className="text-green-600 mb-2">{dropoff.dropoff_contact} - {dropoff.dropoff_phone}</div>
                      
                      {/* Map button for dropoff location */}
                      {dropoff.latitude && dropoff.longitude && (
                        <button
                          onClick={() => toggleDropoffMap(dropoff.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors flex items-center gap-1 mb-2"
                        >
                          <span>🗺️</span>
                          {showDropoffMaps[dropoff.id] ? 'Hide Map' : 'Show Map'}
                        </button>
                      )}
                      
                      {/* Dropoff Location Map */}
                      {showDropoffMaps[dropoff.id] && dropoff.latitude && dropoff.longitude && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-green-300">
                          <img
                            src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-${dropoff.sequence}+00ff00(${dropoff.longitude},${dropoff.latitude})/${dropoff.longitude},${dropoff.latitude},14,0/400x200@2x?access_token=${MAPBOX_TOKEN}`}
                            alt={`Dropoff ${dropoff.sequence} Location Map`}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling.style.display = 'block';
                            }}
                          />
                          <div className="hidden p-3 bg-red-50 text-red-600 text-sm text-center">
                            Map could not be loaded
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Update Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-gray-900">
                <span>🔄</span> Update Status
              </h4>
              <div className="space-y-2">
                {getAvailableNextStatuses(selectedOrder.status).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateOrderStatus(selectedOrder.id, status)}
                    disabled={statusLoading}
                    className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                      statusLoading
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'text-white hover:opacity-90 hover:shadow-md'
                    }`}
                    style={{ backgroundColor: statusLoading ? '#e5e7eb' : getStatusColor(status) }}
                  >
                    {statusLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                        Updating...
                      </div>
                    ) : (
                      `Mark as ${getStatusLabel(status)}`
                    )}
                  </button>
                ))}
                {getAvailableNextStatuses(selectedOrder.status).length === 0 && (
                  <div className="text-center py-4">
                    <div className="text-gray-400 text-xl mb-2">✅</div>
                    <p className="text-sm text-gray-500 italic">No status updates available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={() => setSelectedOrder(null)}
              disabled={statusLoading}
              className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
  </div>
)
}