'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  momentLocalizer,
  View,
} from 'react-big-calendar'
import moment from 'moment-timezone'
import { supabase } from '@/lib/supabase'
import { OrderDetailsModal } from '@/components/Dispatcher/OrderDetailsModal'
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

    // Fetch ALL orders - remove the driver filter to see all orders
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
      .order('status', { ascending: true })
      // Remove the .or() filter to fetch ALL orders regardless of driver assignment
      // If you want to see only orders assigned to current user AND unassigned orders, keep the original filter:
      // .or(`driver_id.eq.${user.id},driver_id.is.null`)

    console.log('📦 Orders data:', orderData)

    // Define custom status order for logical workflow progression
    const statusOrder = ['order_placed', 'driver_assigned', 'truck_left_warehouse', 'arrived_at_pickup', 'delivered', 'cancelled']
    
    // Sort orders by custom status order, then by pickup date/time
    const sortedOrderData = (orderData || []).sort((a, b) => {
      const aStatusIndex = statusOrder.indexOf(a.status)
      const bStatusIndex = statusOrder.indexOf(b.status)
      
      // If statuses are different, sort by status order
      if (aStatusIndex !== bStatusIndex) {
        return aStatusIndex - bStatusIndex
      }
      
      // If statuses are the same, sort by pickup date/time
      const aDateTime = `${a.pickup_date} ${a.pickup_time}`
      const bDateTime = `${b.pickup_date} ${b.pickup_time}`
      return aDateTime.localeCompare(bDateTime)
    })

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
    const orderEvents: DriverEvent[] = sortedOrderData.map((o) => {
      const pickupDateTimeUTC = moment.utc(`${o.pickup_date}T${o.pickup_time}`);
      const pickupDateTimePH = pickupDateTimeUTC.tz('Asia/Manila').toDate();

      let endDateTimePH: Date;

      if (o.delivery_window_end) {
        const deliveryEndUTC = moment.utc(`${o.pickup_date}T${o.delivery_window_end}`);
        endDateTimePH = deliveryEndUTC.tz('Asia/Manila').toDate();
      } else {
        endDateTimePH = moment(pickupDateTimePH).add(2, 'hours').toDate();
      }

      // Modify the title to show driver assignment status
      let title = `Tracking #${o.tracking_id}`
      if (o.driver_id === user.id) {
        title += ' (Assigned to You)'
      } else if (o.driver_id) {
        title += ' (Assigned to Other)'
      } else {
        title += ' (Unassigned)'
      }

      return {
        id: o.id,
        title: title,
        start: pickupDateTimePH,
        end: endDateTimePH,
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

  // AUTO-ASSIGN FUNCTIONALITY
  const autoAssignOrders = async () => {
    console.log('🤖 Starting auto-assignment process...')
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) {
        alert('You must be logged in to auto-assign orders.')
        return
      }

      // Get all unassigned orders with status 'order_placed'
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

      // Track assignments for each driver to distribute workload
      let driverAssignments: { [driverId: string]: number } = {}
      let totalAssigned = 0
      let totalFailed = 0

      // Process each order
      for (const order of unassignedOrders) {
        try {
          // Format the pickup time properly
          let formattedTime = order.pickup_time
          const timeParts = order.pickup_time.split(':')
          if (timeParts.length === 2) {
            formattedTime = `${order.pickup_time}:00`
          }
          
          const pickupDateTime = `${order.pickup_date} ${formattedTime}`
          
          console.log(`🔍 Finding drivers for order ${order.tracking_id} at ${pickupDateTime}`)

          // Find available drivers for this specific time
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

          // Get unique driver IDs
          const availableDriverIds = [...new Set(availabilities.map(av => av.driver_id).filter(Boolean))]
          
          if (availableDriverIds.length === 0) {
            console.log(`❌ No valid driver IDs for order ${order.tracking_id}`)
            totalFailed++
            continue
          }

          // Sort drivers by current assignment count (least assigned first) for load balancing
          const sortedDriverIds = availableDriverIds.sort((a, b) => {
            const aCount = driverAssignments[a] || 0
            const bCount = driverAssignments[b] || 0
            return aCount - bCount
          })

          // Assign to the driver with the least assignments
          const selectedDriverId = sortedDriverIds[0]

          // Update the order with the assigned driver
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

          // Update assignment counter for load balancing
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

      // Show results
      const message = `Auto-assignment completed!\n\n✅ Successfully assigned: ${totalAssigned} orders\n❌ Failed to assign: ${totalFailed} orders`
      
      if (totalAssigned > 0) {
        // Show driver distribution
        const distributionText = Object.entries(driverAssignments)
          .map(([driverId, count]) => `Driver ${driverId}: ${count} order${count > 1 ? 's' : ''}`)
          .join('\n')
        
        alert(`${message}\n\nDriver Distribution:\n${distributionText}`)
        
        // Refresh the calendar to show updated assignments
        await fetchDriverData()
      } else {
        alert(message)
      }

    } catch (error) {
      console.error('❌ Error in auto-assignment:', error)
      alert('An error occurred during auto-assignment. Please try again.')
    }
  }

  // AUTO-ASSIGN BUTTON COMPONENT
  const AutoAssignButton = () => {
    const [isAssigning, setIsAssigning] = useState(false)

    const handleAutoAssign = async () => {
      const confirmed = confirm(
        'This will automatically assign all unassigned orders to available drivers. Continue?'
      )
      
      if (!confirmed) return

      setIsAssigning(true)
      try {
        await autoAssignOrders()
      } finally {
        setIsAssigning(false)
      }
    }

    return (
      <button
        onClick={handleAutoAssign}
        disabled={isAssigning}
        className={`px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 ${
          isAssigning
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
        }`}
      >
        {isAssigning ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Auto-Assigning...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span>🤖</span>
            Auto-Assign Orders
          </div>
        )}
      </button>
    )
  }

  const handleEventClick = async (event: DriverEvent) => {
    if (event.type === 'order' && event.order) {
      setSelectedOrder(event.order)
    }
  }

  const getStatusColor = (status: string) => {
    const statusObj = ORDER_STATUSES.find(s => s.value === status)
    return statusObj ? statusObj.color : '#718096'
  }

  const getStatusLabel = (status: string) => {
    const statusObj = ORDER_STATUSES.find(s => s.value === status)
    return statusObj ? statusObj.label : status.replace('_', ' ').toUpperCase()
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

  const getUnassignedOrderCount = () => {
    return events.filter(e => e.type === 'order' && !e.order?.driver_id).length
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
      {/* Error Message */}
      {error && (
        <div className="mb-6 text-center text-sm font-medium text-red-600 bg-red-50 py-3 px-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Auto-Assign Button */}
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dispatcher Calendar</h1>
        <AutoAssignButton />
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Hours Scheduled */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-orange-600 mb-1">{getTotalHours().toFixed(1)}</div>
          <div className="text-sm text-gray-600 font-medium">Hours Scheduled</div>
        </div>
        
        {/* Orders Assigned */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-blue-600 mb-1">{getOrderCount()}</div>
          <div className="text-sm text-gray-600 font-medium">Total Orders</div>
        </div>
        
        {/* Unassigned Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-purple-600 mb-1">{getUnassignedOrderCount()}</div>
          <div className="text-sm text-gray-600 font-medium">Unassigned Orders</div>
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
              Orders for Today
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
        <OrderDetailsModal
          selectedOrder={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdate={fetchDriverData}
        />
      )}
    </div>
  )
}