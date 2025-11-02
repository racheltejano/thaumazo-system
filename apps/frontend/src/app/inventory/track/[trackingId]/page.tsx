// apps/frontend/src/app/inventory/track/[trackingId]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateGoogleMapsRoute } from '@/lib/maps'
import { exportHtmlToPdf } from '@/lib/exportHtmlToPdf'
import { useDriverLocationSubscription } from '@/hooks/useDriverLocationSubscription'
import TrackingHistory from '@/components/Client/TrackingHistory'
import LiveTrackingMap from '@/components/Client/LiveTrackingMap'
import { toast } from 'sonner'
import { Navigation, Truck, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

type OrderDropoff = {
  id: string
  order_id: string
  dropoff_name: string
  dropoff_address: string
  dropoff_contact: string
  dropoff_phone: string
  latitude: number | null
  longitude: number | null
  sequence: number | null
  estimated_duration_mins: number | null
}

type OrderStatusLog = {
  id: string
  order_id: string
  status: string
  description: string | null
  timestamp: string
}

type Order = {
  id: string
  status: string
  estimated_total_duration?: number | null
  driver_id?: string | null
  created_by_user_id: string
  driver: {
    first_name: string
    last_name: string
    contact_number: string
    plate_number: string
  } | null
  client: {
    business_name: string
    contact_person: string
    contact_number: string
    email?: string
    pickup_address: string
    pickup_latitude?: number
    pickup_longitude?: number
    landmark?: string
    pickup_area?: string
  } | null
  vehicle_type: string
  pickup_timestamp: string
  priority_level: string
  special_instructions: string
  timeline: {
    date: string
    entries: { time: string; label: string }[]
  }[]
  dropoffs: OrderDropoff[]
  order_status_logs: OrderStatusLog[]
  mapUrl?: string
}

const formatTimestampInManila = (timestamp: string, options: Intl.DateTimeFormatOptions) => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    ...options
  })
}

const getPickupDateAndTime = (pickup_timestamp: string) => {
  const pickupDate = formatTimestampInManila(pickup_timestamp, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  
  const pickupTime = formatTimestampInManila(pickup_timestamp, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  
  return { pickupDate, pickupTime }
}

export default function InventoryTrackingPage() {
  const router = useRouter()
  const params = useParams()
  const trackingId = (params as { trackingId: string })?.trackingId
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [eta, setEta] = useState<{ duration: number; distance: number } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Determine destination based on order status
  const getDestinationCoordinates = () => {
    if (!order) return null

    const normalizedStatus = order.status.toLowerCase().replace(/ /g, '_')
    
    // After pickup confirmation, track to first dropoff
    if (['items_being_delivered', 'in_transit', 'arrived_at_dropoff'].includes(normalizedStatus)) {
      const firstDropoff = order.dropoffs.find(d => d.sequence === 1 || d.sequence === null)
      if (firstDropoff?.latitude && firstDropoff?.longitude) {
        return {
          lat: firstDropoff.latitude,
          lng: firstDropoff.longitude,
          label: `Dropoff: ${firstDropoff.dropoff_name || firstDropoff.dropoff_address}`
        }
      }
    }
    
    // Before pickup confirmation, track to pickup location
    if (order.client?.pickup_latitude && order.client?.pickup_longitude) {
      return {
        lat: order.client.pickup_latitude,
        lng: order.client.pickup_longitude,
        label: 'Pickup Location'
      }
    }
    
    return null
  }

  const destination = getDestinationCoordinates()

  // Determine if we should track driver location
  const shouldTrackDriver = order?.driver_id && 
    ['truck_left_warehouse', 'arrived_at_pickup', 'items_being_delivered', 'in_transit'].includes(
      order.status.toLowerCase().replace(/ /g, '_')
    )

  console.log('🚚 Inventory Tracking configuration:', {
    shouldTrackDriver,
    driverId: order?.driver_id,
    status: order?.status,
    destination: destination?.label
  })

  // Subscribe to driver location updates
  const { driverLocation, lastUpdated, loading: locationLoading } = useDriverLocationSubscription(
    order?.driver_id,
    !!shouldTrackDriver
  )

  // Subscribe to order status changes in real-time
  useEffect(() => {
    if (!order?.id) return

    const channel = supabase
      .channel(`inventory-order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`
        },
        (payload) => {
          console.log('📦 Order updated:', payload)
          fetchOrderData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_logs',
          filter: `order_id=eq.${order.id}`
        },
        (payload) => {
          console.log('📝 New status log:', payload)
          fetchOrderData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order?.id])

  useEffect(() => {
    if (driverLocation) {
      console.log('📍 Driver location received:', {
        lat: driverLocation.latitude,
        lng: driverLocation.longitude,
        speed: driverLocation.speed,
        lastUpdated
      })
    }
  }, [driverLocation, lastUpdated])

  const fetchOrderData = async () => {
    if (!trackingId) return

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // Get order by tracking_id
      const { data: rawOrder, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          estimated_total_duration,
          pickup_timestamp,
          driver_id,
          created_by_user_id
        `)
        .eq('tracking_id', trackingId)
        .single()

      if (orderError || !rawOrder) {
        console.error('[InventoryTrackingPage] No order found:', orderError)
        toast.error('Order not found. Redirecting...')
        setTimeout(() => {
          router.replace('/inventory/orders')
        }, 2000)
        return
      }

      // Verify this order was created by the current user
      if (rawOrder.created_by_user_id !== user.id) {
        toast.error('You do not have permission to track this order.')
        setTimeout(() => {
          router.replace('/inventory/orders')
        }, 2000)
        return
      }

      const [driverData, fullClientData, dropoffs] = await Promise.all([
        rawOrder.driver_id
          ? supabase
              .from('profiles')
              .select('first_name, last_name, contact_number')
              .eq('id', rawOrder.driver_id)
              .single()
          : Promise.resolve({ data: null }),

        rawOrder.client_id
          ? supabase
              .from('clients')
              .select('*')
              .eq('id', rawOrder.client_id)
              .single()
          : Promise.resolve({ data: null }),

        supabase
          .from('order_dropoffs')
          .select('*')
          .eq('order_id', rawOrder.id)
          .order('sequence', { ascending: true }),
      ])

      const logsResponse = await supabase
        .from('order_status_logs')
        .select('id, order_id, status, description, timestamp')
        .eq('order_id', rawOrder.id)
        .order('timestamp', { ascending: true })

      const rawLogs = logsResponse.data || []

      const groupedTimeline = rawLogs.reduce((acc, log) => {
        const date = formatTimestampInManila(log.timestamp, {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
        const time = formatTimestampInManila(log.timestamp, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        const label = log.description || log.status.replace(/_/g, ' ').toUpperCase()

        if (!acc[date]) acc[date] = []
        acc[date].push({ time, label })

        return acc
      }, {} as Record<string, { time: string; label: string }[]>)

      const timeline = Object.entries(groupedTimeline).map(([date, items]) => ({
        date,
        entries: items.map(({ time, label }) => ({ time, label }))
      }))

      const pickupLat = fullClientData.data?.pickup_latitude
      const pickupLng = fullClientData.data?.pickup_longitude
      
      const mapUrl =
        pickupLat && pickupLng && MAPBOX_TOKEN
          ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${pickupLng},${pickupLat})/${pickupLng},${pickupLat},15/700x300?access_token=${MAPBOX_TOKEN}`
          : undefined

      setOrder({
        id: rawOrder.id,
        status: rawOrder.status.replace(/_/g, ' ').toUpperCase(),
        driver_id: rawOrder.driver_id,
        created_by_user_id: rawOrder.created_by_user_id,
        driver: driverData.data
          ? { ...driverData.data, plate_number: 'To Be Added' }
          : null,
        client: fullClientData.data || null,
        vehicle_type: rawOrder.vehicle_type,
        pickup_timestamp: rawOrder.pickup_timestamp,
        priority_level: rawOrder.priority_level,
        special_instructions: rawOrder.special_instructions,
        timeline,
        dropoffs: dropoffs.data || [],
        order_status_logs: rawLogs, 
        mapUrl,
        estimated_total_duration: rawOrder.estimated_total_duration || null,
      })

    } catch (err) {
      console.error('Error loading tracking page:', err)
      toast.error('Failed to load tracking information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderData()
  }, [trackingId, router])

  const handleViewRoute = () => {
    if (
      !order?.client?.pickup_latitude ||
      !order?.client?.pickup_longitude ||
      order.dropoffs.length === 0
    ) {
      alert('Route data is incomplete or missing.')
      return
    }

    const routeUrl = generateGoogleMapsRoute(
      order.client.pickup_latitude,
      order.client.pickup_longitude,
      order.dropoffs.filter(d => d.latitude !== null && d.longitude !== null) as {
        latitude: number
        longitude: number
      }[]
    )

    window.open(routeUrl, '_blank')
  }

  const getFormattedTravelTime = () => {
    if (order?.estimated_total_duration != null) {
      return `${order.estimated_total_duration} mins`
    }
    
    const totalDropoffTime = order?.dropoffs
      ?.filter(d => d.estimated_duration_mins != null)
      ?.reduce((sum, d) => sum + (d.estimated_duration_mins || 0), 0)
    
    if (totalDropoffTime && totalDropoffTime > 0) {
      return `${totalDropoffTime} mins`
    }
    
    return 'N/A'
  }

  const handleEtaCalculated = (etaData: { duration: number; distance: number } | null) => {
    setEta(etaData)
    if (etaData) {
      console.log('📊 ETA received from map:', {
        duration: `${Math.round(etaData.duration / 60)} min`,
        distance: `${(etaData.distance / 1000).toFixed(2)} km`
      })
    }
  }

  const formatEtaDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-red-500 mb-4">Tracking information not found.</p>
          <Link 
            href="/inventory/orders"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  const { pickupDate, pickupTime } = getPickupDateAndTime(order.pickup_timestamp)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link 
              href="/inventory/orders" 
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Track Order</h1>
              <p className="text-sm text-gray-500">Real-time tracking for {trackingId}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div
          id="report-page"
          className="bg-white shadow-lg rounded-lg"
        >
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Tracking Status */}
              <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-lg">
                <h2 className="text-xl font-bold text-gray-900">Tracking ID: {trackingId}</h2>
                <p className="text-green-700 font-semibold mt-2">📦 Status: {order.status}</p>
                
                {/* Live Driver Status with ETA */}
                {shouldTrackDriver && driverLocation && lastUpdated && destination && (
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Navigation className="w-4 h-4 animate-pulse" />
                        <span className="font-semibold">En Route to {destination.label}</span>
                      </div>
                      {eta && (
                        <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded">
                          <Clock className="w-3 h-3 text-blue-700" />
                          <span className="text-sm font-bold text-blue-700">
                            ETA: {formatEtaDuration(eta.duration)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Last updated: {new Date(lastUpdated).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Manila'
                      })}
                    </p>
                    {driverLocation.speed && driverLocation.speed > 0 && (
                      <p className="text-sm text-gray-600">
                        Speed: {Math.round(driverLocation.speed * 3.6)} km/h
                      </p>
                    )}
                    {eta && (
                      <p className="text-sm text-gray-600">
                        Distance: {(eta.distance / 1000).toFixed(1)} km
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      📍 Accuracy: ±{Math.round(driverLocation.accuracy)}m
                    </p>
                  </div>
                )}

                {/* Waiting message if driver assigned but not started */}
                {order.driver && !shouldTrackDriver && (
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Truck className="w-4 h-4" />
                      <span className="font-semibold">Driver Assigned</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Waiting for driver to start delivery...
                    </p>
                  </div>
                )}
              </div>

              {/* Client Info */}
              <div className="bg-white border rounded-lg shadow-sm p-5">
                <h3 className="font-semibold text-lg mb-3 text-gray-900">Client Information</h3>
                <ul className="text-sm space-y-2 text-gray-700">
                  <li className="flex">
                    <span className="font-medium w-24">Business:</span>
                    <span>{order.client?.business_name || 'N/A'}</span>
                  </li>
                  <li className="flex">
                    <span className="font-medium w-24">Contact:</span>
                    <span>{order.client?.contact_person}</span>
                  </li>
                  <li className="flex">
                    <span className="font-medium w-24">Phone:</span>
                    <span>{order.client?.contact_number}</span>
                  </li>
                  <li className="flex">
                    <span className="font-medium w-24">Email:</span>
                    <span>{order.client?.email || 'N/A'}</span>
                  </li>
                  <li className="flex">
                    <span className="font-medium w-24">Address:</span>
                    <span>{order.client?.pickup_address}</span>
                  </li>
                  <li className="flex">
                    <span className="font-medium w-24">Landmark:</span>
                    <span>{order.client?.landmark || 'N/A'}</span>
                  </li>
                  <li className="flex">
                    <span className="font-medium w-24">Area:</span>
                    <span>{order.client?.pickup_area || 'N/A'}</span>
                  </li>
                </ul>
              </div>

              {/* Tracking History */}
              <TrackingHistory
                logs={order.order_status_logs}
                orderId={order.id}
                trackingId={trackingId}
                currentStatus={order.status}
                onViewRoute={handleViewRoute}
                onDownloadReport={() => exportHtmlToPdf('report-page')}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Live Tracking Map */}
              <LiveTrackingMap
                pickupLat={destination?.lat}
                pickupLng={destination?.lng}
                driverLocation={driverLocation}
                lastUpdated={lastUpdated}
                isTrackingEnabled={!!shouldTrackDriver}
                fallbackMapUrl={order.mapUrl}
                style="streets-v11"
                staleThresholdMinutes={5}
                onEtaCalculated={handleEtaCalculated}
              />

              {/* Dropoff Locations */}
              <div className="bg-white border rounded-lg shadow-sm p-5">
                <h3 className="font-semibold text-lg mb-3 text-gray-900">Dropoff Locations</h3>
                {order.dropoffs.length > 0 ? (
                  <ul className="text-sm space-y-3">
                    {order.dropoffs.map((d, i) => (
                      <li key={i} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              <span className="bg-blue-600 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-xs mr-2">
                                {d.sequence}
                              </span>
                              {d.dropoff_name}
                            </p>
                            <p className="text-gray-600 mt-1">{d.dropoff_address}</p>
                            <p className="text-gray-500 text-xs mt-1">{d.dropoff_phone}</p>
                          </div>
                          {d.estimated_duration_mins && (
                            <span className="text-gray-500 text-xs ml-2 flex-shrink-0">
                              ~{d.estimated_duration_mins}min
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-500">No dropoffs found.</p>
                )}
              </div>

              {/* Order and Driver Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Details */}
                <div className="bg-white border rounded-lg shadow-sm p-5">
                  <h3 className="font-semibold text-lg mb-3 text-gray-900">Order Details</h3>
                  <ul className="text-sm space-y-2 text-gray-700">
                    <li className="flex">
                      <span className="font-medium w-32">Vehicle Type:</span>
                      <span>{order.vehicle_type}</span>
                    </li>
                    <li className="flex">
                      <span className="font-medium w-32">Pickup Date:</span>
                      <span>{pickupDate}</span>
                    </li>
                    <li className="flex">
                      <span className="font-medium w-32">Pickup Time:</span>
                      <span>{pickupTime}</span>
                    </li>
                    <li className="flex">
                      <span className="font-medium w-32">Instructions:</span>
                      <span>{order.special_instructions || 'N/A'}</span>
                    </li>
                    <li className="flex">
                      <span className="font-medium w-32">Travel Time:</span>
                      <span>{getFormattedTravelTime()}</span>
                    </li>
                  </ul>
                </div>

                {/* Driver Info */}
                <div className="bg-white border rounded-lg shadow-sm p-5">
                  <h3 className="font-semibold text-lg mb-3 text-gray-900">Assigned Driver</h3>
                  {order.driver ? (
                    <ul className="text-sm space-y-2 text-gray-700">
                      <li className="flex">
                        <span className="font-medium w-24">Name:</span>
                        <span>{order.driver.first_name} {order.driver.last_name}</span>
                      </li>
                      <li className="flex">
                        <span className="font-medium w-24">Contact:</span>
                        <span>{order.driver.contact_number}</span>
                      </li>
                      <li className="flex">
                        <span className="font-medium w-24">Plate:</span>
                        <span>{order.driver.plate_number}</span>
                      </li>
                    </ul>
                  ) : (
                    <p className="italic text-gray-500">Driver not yet assigned.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}