// page calendar - Enhanced with Dashboard order details functionality
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
import QRScanner from '@/components/Driver/QRScanner'
import { QrCode, X } from 'lucide-react'

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

type Order = {
  id: string
  tracking_id: string
  pickup_timestamp: string
  estimated_end_timestamp: string | null
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
  { value: 'items_being_delivered', label: 'Items Being Delivered', color: '#9333ea' }, 
  { value: 'delivered', label: 'Delivered', color: '#38a169' },
  { value: 'cancelled', label: 'Cancelled', color: '#e53e3e' },
]

function formatDate(timestamp: string): string {
  return moment(timestamp).format('MMMM D, YYYY')
}

function formatTime(timestamp: string): string {
  return moment(timestamp).format('h:mm A')
}

export default function DriverCalendarPage() {
  const [availabilityEvents, setAvailabilityEvents] = useState<DriverEvent[]>([])
  const [orderEvents, setOrderEvents] = useState<DriverEvent[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [dropoffs, setDropoffs] = useState<Dropoff[]>([])
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null)
  const [showPickupMap, setShowPickupMap] = useState(false)
  const [showDropoffMaps, setShowDropoffMaps] = useState<{[key: string]: boolean}>({})
  const [currentView, setCurrentView] = useState<View>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarFilter, setCalendarFilter] = useState<'orders' | 'availability'>('orders')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [showPickupConfirmation, setShowPickupConfirmation] = useState(false)

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
          tracking_id,
          pickup_timestamp,
          estimated_end_timestamp,
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
      const ordEvents: DriverEvent[] = (orderData || []).map((o) => {
        const pickupDateTime = new Date(o.pickup_timestamp)
        let endDateTime = new Date(pickupDateTime)
        
        if (o.estimated_end_timestamp) {
          endDateTime = new Date(o.estimated_end_timestamp)
        } else if (o.delivery_window_end) {
          const pickupDate = moment(o.pickup_timestamp).format('YYYY-MM-DD')
          endDateTime = new Date(`${pickupDate}T${o.delivery_window_end}`)
        } else {
          endDateTime = new Date(pickupDateTime.getTime() + 2 * 60 * 60 * 1000)
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

      setAvailabilityEvents(availEvents)
      setOrderEvents(ordEvents)
    } catch (err) {
      console.error('Error fetching driver data:', err)
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

  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate)
  }

  const handleViewChange = (newView: View) => {
    setCurrentView(newView)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setStatusLoading(true)
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) {
        alert('You must be logged in to update orders.')
        return
      }

      const { data: orderCheck, error: checkError } = await supabase
        .from('orders')
        .select('id, tracking_id, driver_id, status')
        .eq('id', orderId)
        .single()

      if (checkError || !orderCheck) {
        alert('Failed to verify order.')
        return
      }

      if (orderCheck.driver_id !== user.id) {
        alert('You can only update your own orders.')
        return
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()

      if (error) {
        alert('Failed to update order status: ' + error.message)
      } else {
        alert('Order status updated successfully!')
        
        if (selectedOrder) {
          setSelectedOrder({
            ...selectedOrder,
            status: newStatus
          })
        }
        
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

  const handlePickupScanSuccess = async (orderId: string) => {
    console.log('✅ Pickup confirmed for order:', orderId)
    setShowPickupConfirmation(false)
    await fetchDriverData()
    alert('Pickup confirmed! Order status updated to Items Being Delivered.')
    setSelectedOrder(null)
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
    const statusFlow = {
      'order_placed': ['driver_assigned', 'cancelled'],
      'driver_assigned': ['truck_left_warehouse', 'cancelled'],
      'truck_left_warehouse': ['arrived_at_pickup', 'cancelled'],
      'arrived_at_pickup': ['cancelled'],
      'items_being_delivered': ['delivered', 'cancelled'], 
      'delivered': [], 
      'cancelled': [] 
    }

    return statusFlow[currentStatus as keyof typeof statusFlow] || []
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

  const toggleDropoffMap = (dropoffId: string) => {
    setShowDropoffMaps(prev => ({
      ...prev,
      [dropoffId]: !prev[dropoffId]
    }))
  }

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
              {orderEvents.filter(e => e.order?.status === 'delivered').length}
            </div>
            <div className="text-sm text-gray-600">Orders Delivered</div>
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
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Unavailable</span>
            </div>
          </>
        ) : (
          <>
            {ORDER_STATUSES.map(status => (
              <div key={status.value} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: status.color }}></div>
                <span className="text-sm">{status.label}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Order Details Modal - Enhanced from Dashboard */}
      {selectedOrder && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center p-4 z-50">
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
                        <span className="text-gray-900">{formatDate(selectedOrder.pickup_timestamp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Pickup Time:</span>
                        <span className="text-gray-900">{formatTime(selectedOrder.pickup_timestamp)}</span>
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
                        
                        {showPickupMap && client.pickup_latitude && client.pickup_longitude && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-blue-300">
                            <img
                              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-p+ff0000(${client.pickup_longitude},${client.pickup_latitude})/${client.pickup_longitude},${client.pickup_latitude},14,0/400x200@2x?access_token=${MAPBOX_TOKEN}`}
                              alt="Pickup Location Map"
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const nextEl = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextEl) nextEl.style.display = 'block';
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
                            
                            {dropoff.latitude && dropoff.longitude && (
                              <button
                                onClick={() => toggleDropoffMap(dropoff.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors flex items-center gap-1 mb-2"
                              >
                                <span>🗺️</span>
                                {showDropoffMaps[dropoff.id] ? 'Hide Map' : 'Show Map'}
                              </button>
                            )}
                            
                            {showDropoffMaps[dropoff.id] && dropoff.latitude && dropoff.longitude && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-green-300">
                                <img
                                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-${dropoff.sequence}+00ff00(${dropoff.longitude},${dropoff.latitude})/${dropoff.longitude},${dropoff.latitude},14,0/400x200@2x?access_token=${MAPBOX_TOKEN}`}
                                  alt={`Dropoff ${dropoff.sequence} Location Map`}
                                  className="w-full h-48 object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const nextEl = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (nextEl) nextEl.style.display = 'block';
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

                  {/* Pickup Confirmation Section - Only show when status is 'arrived_at_pickup' */}
                  {selectedOrder.status === 'arrived_at_pickup' && (
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-orange-800">
                        <QrCode className="w-5 h-5" />
                        Confirm Pickup with QR Code
                      </h4>
                      
                      {!showPickupConfirmation ? (
                        <div>
                          <p className="text-sm text-orange-700 mb-3">
                            Ask the client to show their pickup QR code and scan it to confirm pickup.
                          </p>
                          <button
                            onClick={() => setShowPickupConfirmation(true)}
                            className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <QrCode className="w-4 h-4" />
                            Open QR Scanner
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-orange-700 font-medium">
                              Point camera at client's QR code
                            </p>
                            <button
                              onClick={() => setShowPickupConfirmation(false)}
                              className="p-1 hover:bg-orange-100 rounded-full transition"
                            >
                              <X className="w-4 h-4 text-orange-600" />
                            </button>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-orange-200">
                            <QRScanner 
                              onScanSuccess={handlePickupScanSuccess}
                              driverId={selectedOrder.driver_id || null}
                            />
                          </div>
                        </div>
                      )}
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