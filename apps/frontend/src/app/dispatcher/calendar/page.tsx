'use client'

import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
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

export default function DriverCalendarPage() {
  const [events, setEvents] = useState<DriverEvent[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [currentView, setCurrentView] = useState<View>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const currentDate = moment()
  const startOfWeek = currentDate.clone().startOf('week')
  const endOfWeek = currentDate.clone().endOf('week')

  useEffect(() => {
    const fetchSessionThenData = async () => {
      const { data: { session } } = await supabase.auth.getSession()

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

      const { data: availabilityData, error: availError } = await supabase
        .from('driver_availability')
        .select('id, title, start_time, end_time')
        .eq('driver_id', user.id)

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

      const statusOrder = [
        'order_placed',
        'driver_assigned',
        'truck_left_warehouse',
        'arrived_at_pickup',
        'delivered',
        'cancelled',
      ]

      const sortedOrderData = (orderData || []).sort((a, b) => {
        const aStatusIndex = statusOrder.indexOf(a.status)
        const bStatusIndex = statusOrder.indexOf(b.status)
        if (aStatusIndex !== bStatusIndex) return aStatusIndex - bStatusIndex
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

      const availEvents: DriverEvent[] = (availabilityData || []).map((e) => ({
        id: e.id,
        title: e.title || 'Available',
        start: new Date(e.start_time + 'Z'),
        end: new Date(e.end_time + 'Z'),
        type: 'availability',
      }))

      const orderEvents: DriverEvent[] = sortedOrderData.map((o) => {
        const pickupDateTimeUTC = moment.utc(`${o.pickup_date}T${o.pickup_time}`)
        const pickupDateTimePH = pickupDateTimeUTC.tz('Asia/Manila').toDate()
        let endDateTimePH: Date

        if (o.delivery_window_end) {
          const deliveryEndUTC = moment.utc(`${o.pickup_date}T${o.delivery_window_end}`)
          endDateTimePH = deliveryEndUTC.tz('Asia/Manila').toDate()
        } else {
          endDateTimePH = moment(pickupDateTimePH).add(2, 'hours').toDate()
        }

        let title = `Tracking #${o.tracking_id}`
        if (o.driver_id === user.id) title += ' (Assigned to You)'
        else if (o.driver_id) title += ' (Assigned to Other)'
        else title += ' (Unassigned)'

        return {
          id: o.id,
          title,
          start: pickupDateTimePH,
          end: endDateTimePH,
          type: 'order',
          order: o,
        }
      })

      setEvents([...availEvents, ...orderEvents])
    } catch (err) {
      console.error('❌ Unexpected error fetching data:', err)
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const statusObj = ORDER_STATUSES.find((s) => s.value === status)
    return statusObj ? statusObj.color : '#718096'
  }

  const getStatusLabel = (status: string) => {
    const statusObj = ORDER_STATUSES.find((s) => s.value === status)
    return statusObj ? statusObj.label : status.replace('_', ' ').toUpperCase()
  }

  const getTotalHours = () =>
    events
      .filter((e) => e.type === 'availability' && !e.title.includes('Unavailable'))
      .reduce((total, event) => {
        const hours = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)
        return total + hours
      }, 0)

  const getOrderCount = () => events.filter((e) => e.type === 'order').length

  const getUnassignedOrderCount = () =>
    events.filter((e) => e.type === 'order' && !e.order?.driver_id).length

  const upcomingOrders = events
    .filter(
      (e) =>
        e.type === 'order' &&
        moment(e.start).isBetween(moment().startOf('day'), moment().add(7, 'days').endOf('day'), null, '[]')
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime())

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
      {error && (
        <div className="mb-6 text-center text-sm font-medium text-red-600 bg-red-50 py-3 px-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dispatcher Calendar</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-orange-600 mb-1">{getTotalHours().toFixed(1)}</div>
          <div className="text-sm text-gray-600 font-medium">Hours Scheduled</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-blue-600 mb-1">{getOrderCount()}</div>
          <div className="text-sm text-gray-600 font-medium">Total Orders</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-purple-600 mb-1">{getUnassignedOrderCount()}</div>
          <div className="text-sm text-gray-600 font-medium">Unassigned Orders</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {events.filter((e) => e.type === 'order' && e.order?.status === 'delivered').length}
          </div>
          <div className="text-sm text-gray-600 font-medium">Orders Delivered</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Sidebar now only shows Today's Orders */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-orange-600 mb-4 flex items-center gap-2">
              <span>📦</span>
              Orders for Today
            </h2>
            {events.filter((e) => e.type === 'order' && moment(e.start).isSame(moment(), 'day')).length === 0 ? (
              <div className="text-center py-4">
                <div className="text-gray-400 text-2xl mb-2">📅</div>
                <p className="text-sm text-gray-500 italic">No orders scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events
                  .filter((e) => e.type === 'order' && moment(e.start).isSame(moment(), 'day'))
                  .map((order) => (
                    <div
                      key={order.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrder(order.order!)}
                    >
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
                onSelectEvent={(event) => event.type === 'order' && event.order && setSelectedOrder(event.order)}
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
                      padding: '2px 4px',
                    },
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
                <div
                  key={orderEvent.id}
                  className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
                  onClick={() => setSelectedOrder(orderEvent.order!)}
                >
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
                  <div className="text-xs text-gray-600">{moment(orderEvent.start).format('ddd, MMM D')}</div>
                  <div className="text-xs text-gray-500">
                    {moment(orderEvent.start).format('HH:mm')} - {moment(orderEvent.end).format('HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
