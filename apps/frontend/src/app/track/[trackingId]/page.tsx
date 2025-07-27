'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { generateGoogleMapsRoute } from '@/lib/maps'
import { exportHtmlToPdf } from '@/lib/exportHtmlToPdf'
import TrackingHistory from '@/components/Client/TrackingHistory'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
  timestamp: string // ISO timestamp
}

type Order = {
  id: string
  status: string
  estimated_total_duration?: number | null
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
  pickup_timestamp: string // Combined timestamp
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

// Helper function to format timestamp in Asia/Manila timezone
const formatTimestampInManila = (timestamp: string, options: Intl.DateTimeFormatOptions) => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    ...options
  })
}

// Helper function to get pickup date and time separately for display
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

export default function TrackingPage() {
  const router = useRouter(); 
  const params = useParams()
  const trackingId = (params as { trackingId: string })?.trackingId
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trackingId) return

    const fetchData = async () => {
      try {
        // STEP 1: Get client by tracking_id
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('tracking_id', trackingId)
          .single()

        if (clientError || !clientData) {
          console.warn(`[TrackingPage] Invalid tracking ID "${trackingId}" — no client found.`);
          toast.error('Tracking ID not found. Redirecting in 2 seconds...');
          setTimeout(() => {
            router.replace('/track');
          }, 2000);
          return;
        }

        // STEP 2: Get latest order by that client - using pickup_timestamp instead of pickup_date/pickup_time
        const { data: rawOrder, error: orderError } = await supabase
          .from('orders')
          .select(`
            *,
            estimated_total_duration,
            pickup_timestamp
          `)
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (orderError || !rawOrder) {
          console.error('[TrackingPage] No order found for client:', orderError)
          setLoading(false)
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

        // Separate logs fetch (with logging)
        const logsResponse = await supabase
          .from('order_status_logs')
          .select('id, order_id, status, description, timestamp')
          .eq('order_id', rawOrder.id)
          .order('timestamp', { ascending: true })

        const rawLogs = logsResponse.data || []

        if (logsResponse.error) {
          console.error('[TrackingPage] Error fetching logs:', logsResponse.error)
        } else {
          console.log('[TrackingPage] Logs fetched successfully:', rawLogs)
        }

        // Build timeline - using Asia/Manila timezone for consistency
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
        
        console.log('📍 Map coordinates:', { pickupLat, pickupLng })
        console.log('🗺️ Mapbox token available:', !!MAPBOX_TOKEN)
        
        const mapUrl =
          pickupLat && pickupLng && MAPBOX_TOKEN
            ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${pickupLng},${pickupLat})/${pickupLng},${pickupLat},15/700x300?access_token=${MAPBOX_TOKEN}`
            : undefined

        console.log('🗺️ Generated map URL:', mapUrl ? 'Available' : 'Not available')

        setOrder({
          id: rawOrder.id,
          status: rawOrder.status.replace(/_/g, ' ').toUpperCase(),
          driver: driverData.data
            ? { ...driverData.data, plate_number: 'To Be Added' }
            : null,
          client: fullClientData.data || null,
          vehicle_type: rawOrder.vehicle_type,
          pickup_timestamp: rawOrder.pickup_timestamp, // Use combined timestamp
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
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [trackingId])

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

  // Helper function to format estimated travel time
  const getFormattedTravelTime = () => {
    if (order?.estimated_total_duration != null) {
      return `${order.estimated_total_duration} mins`
    }
    
    // Fallback: sum up individual dropoff durations if available
    const totalDropoffTime = order?.dropoffs
      ?.filter(d => d.estimated_duration_mins != null)
      ?.reduce((sum, d) => sum + (d.estimated_duration_mins || 0), 0)
    
    if (totalDropoffTime && totalDropoffTime > 0) {
      return `${totalDropoffTime} mins`
    }
    
    return 'N/A'
  }

  if (loading) return <p className="text-center py-10 text-gray-500 animate-pulse">Loading...</p>;
  if (!order) return <p className="text-center py-10 text-red-500">Tracking information not found.</p>;

  // Extract pickup date and time for display
  const { pickupDate, pickupTime } = getPickupDateAndTime(order.pickup_timestamp)

  return (
    <div style={{ width: '80%', maxWidth: '1800px', margin: '0 auto' }}>
      <div
        id="report-page"
        className="p-6 text-black bg-white mt-4 mx-auto shadow-lg rounded-2xl"
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column: Tracking, Client, Tracking History */}
          <div className="space-y-6">
            {/* Tracking Status */}
            <div
              style={{ backgroundColor: '#fff7ed', borderLeft: '4px solid #f97316' }}
              className="p-5 rounded-lg"
            >
              <h1 className="text-xl font-bold">Tracking ID: {trackingId}</h1>
              <p className="text-green-700 font-semibold">📦 Status: {order.status}</p>
            </div>

            {/* Client Info */}
            <div className="bg-white p-5 rounded-lg shadow">
              <h2 className="font-semibold text-lg mb-3">Client Information</h2>
              <ul className="text-sm space-y-1">
                <li><b>Business:</b> {order.client?.business_name}</li>
                <li><b>Contact:</b> {order.client?.contact_person}</li>
                <li><b>Phone:</b> {order.client?.contact_number}</li>
                <li><b>Email:</b> {order.client?.email || 'N/A'}</li>
                <li><b>Address:</b> {order.client?.pickup_address}</li>
                <li><b>Landmark:</b> {order.client?.landmark || 'N/A'}</li>
                <li><b>Area:</b> {order.client?.pickup_area || 'N/A'}</li>
              </ul>
            </div>

            {/* Tracking History */}
            <TrackingHistory
              logs={order.order_status_logs}
              onViewRoute={handleViewRoute}
              onDownloadReport={() => exportHtmlToPdf('report-page')}
            />
          </div>

          {/* Right Column: Map, Dropoffs, Order + Driver Info */}
          <div className="space-y-6">
            {/* Pickup Map */}
            {order.mapUrl ? (
              <div className="no-print rounded-lg overflow-hidden border aspect-[2/1] relative w-full">
                <Image
                  src={order.mapUrl}
                  alt="Pickup Map"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg border aspect-[2/1] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="text-sm">📍 Map not available</p>
                  <p className="text-xs mt-1">
                    {!order.client?.pickup_latitude || !order.client?.pickup_longitude 
                      ? 'Coordinates not available for this address'
                      : 'Mapbox token not configured'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Dropoff Locations */}
            <div className="bg-white p-5 rounded-lg shadow">
              <h2 className="font-semibold text-lg mb-3">Dropoff Locations</h2>
              {order.dropoffs.length > 0 ? (
                <ul className="text-sm space-y-2">
                  {order.dropoffs.map((d, i) => (
                    <li key={i} className="flex justify-between items-start">
                      <span>
                        <b>{d.sequence}.</b> {d.dropoff_name} - {d.dropoff_address} ({d.dropoff_phone})
                      </span>
                      {d.estimated_duration_mins && (
                        <span className="text-gray-500 text-xs ml-2 flex-shrink-0">
                          ~{d.estimated_duration_mins}min
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="italic text-gray-500">No dropoffs found.</p>
              )}
            </div>

            {/* Side-by-side Order + Driver Info */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Order Info */}
              <div className="bg-white p-5 rounded-lg shadow w-full lg:w-1/2">
                <h2 className="font-semibold text-lg mb-3">Order Details</h2>
                <ul className="text-sm space-y-1">
                  <li><b>Vehicle Type:</b> {order.vehicle_type}</li>
                  <li><b>Pickup Date:</b> {pickupDate}</li>
                  <li><b>Pickup Time:</b> {pickupTime}</li>
                  <li><b>Instructions:</b> {order.special_instructions}</li>
                  <li>
                    <b>Estimated Travel Time:</b> {getFormattedTravelTime()}
                  </li>
                </ul>
              </div>

              {/* Driver Info */}
              <div className="bg-white p-5 rounded-lg shadow w-full lg:w-1/2">
                <h2 className="font-semibold text-lg mb-3">Assigned Driver</h2>
                {order.driver ? (
                  <ul className="text-sm space-y-1">
                    <li><b>Name:</b> {order.driver.first_name} {order.driver.last_name}</li>
                    <li><b>Contact:</b> {order.driver.contact_number}</li>
                    <li><b>Plate Number:</b> {order.driver.plate_number}</li>
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
  );
}