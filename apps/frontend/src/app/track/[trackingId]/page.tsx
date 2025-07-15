'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { generateGoogleMapsRoute } from '@/lib/maps'
import { exportHtmlToPdf } from '@/lib/exportHtmlToPdf'


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

type Order = {
  id: number
  status: string
  driver: {
    first_name: string
    last_name: string
    contact_number: string
    plate_number: string
  } | null
  client: any
  vehicle_type: string
  pickup_date: string
  pickup_time: string
  priority_level: string
  special_instructions: string
  timeline: {
    date: string
    time: string
    label: string
  }[]
  dropoffs: any[]
  mapUrl?: string
}

export default function TrackingPage() {
  const params = useParams()
  const trackingId = (params as { trackingId: string })?.trackingId
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trackingId) return

    const fetchData = async () => {
      try {
        const { data: rawOrder, error } = await supabase
          .from('orders')
          .select('*')
          .eq('tracking_id', trackingId)
          .single()

        if (error || !rawOrder) {
          console.error('Order fetch failed:', error)
          setLoading(false)
          return
        }

        const [driverData, clientData, logs, dropoffs] = await Promise.all([
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
            .from('order_status_logs')
            .select('status, description, timestamp')
            .eq('order_id', rawOrder.id)
            .order('timestamp', { ascending: true }),
          supabase
            .from('order_dropoffs')
            .select('*')
            .eq('order_id', rawOrder.id)
            .order('sequence', { ascending: true }),
        ])

        const timeline = (logs.data || []).map(log => {
          const ts = new Date(log.timestamp)
          return {
            date: ts.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
            time: ts.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            }),
            label: log.description || log.status.replace(/_/g, ' ').toUpperCase(),
          }
        })

        const pickupLat = clientData.data?.pickup_latitude
        const pickupLng = clientData.data?.pickup_longitude
        const mapUrl =
          pickupLat && pickupLng
            ? `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${pickupLng},${pickupLat})/${pickupLng},${pickupLat},15/700x300?access_token=${MAPBOX_TOKEN}`
            : undefined

        setOrder({
          id: rawOrder.id,
          status: rawOrder.status.replace(/_/g, ' ').toUpperCase(),
          driver: driverData.data
            ? { ...driverData.data, plate_number: 'To Be Added' }
            : null,
          client: clientData.data || null,
          vehicle_type: rawOrder.vehicle_type,
          pickup_date: rawOrder.pickup_date,
          pickup_time: rawOrder.pickup_time,
          priority_level: rawOrder.priority_level,
          special_instructions: rawOrder.special_instructions,
          timeline,
          dropoffs: dropoffs.data || [],
          mapUrl,
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
      order.dropoffs
    )
    window.open(routeUrl, '_blank')
  }

  if (loading) return <p className="text-center py-10 text-gray-500 animate-pulse">Loading...</p>
  if (!order) return <p className="text-center py-10 text-red-500">Tracking information not found.</p>

  return (
    <div
      id="report-page"
      className="p-8 text-black bg-white"
      style={{ all: 'unset', backgroundColor: '#ffffff', color: '#000000' }}
    >


      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Info */}
        <div className="space-y-6">
          <div style={{ backgroundColor: '#fff7ed', borderLeft: '4px solid #f97316' }} className="p-5 rounded-lg">
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

          {/* Order Info */}
          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-3">Order Details</h2>
            <ul className="text-sm space-y-1">
              <li><b>Vehicle Type:</b> {order.vehicle_type}</li>
              <li><b>Pickup Date:</b> {order.pickup_date}</li>
              <li><b>Pickup Time:</b> {order.pickup_time}</li>
              <li><b>Priority:</b> {order.priority_level}</li>
              <li><b>Instructions:</b> {order.special_instructions}</li>
            </ul>
          </div>

          {/* Driver Info */}
          <div className="bg-white p-5 rounded-lg shadow">
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

        {/* Map, Dropoffs, Timeline */}
        <div className="space-y-6">
          {order.mapUrl && (
            <div className="rounded-lg overflow-hidden border aspect-[2/1] relative w-full">
              <Image fill alt="Pickup Map" src={order.mapUrl} className="object-cover" />
            </div>
          )}

          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-3">Dropoff Locations</h2>
            {order.dropoffs.length > 0 ? (
              <ul className="text-sm space-y-2">
                {order.dropoffs.map((d, i) => (
                  <li key={i}><b>{d.sequence}.</b> {d.dropoff_name} - {d.dropoff_address} ({d.dropoff_phone})</li>
                ))}
              </ul>
            ) : (
              <p className="italic text-gray-500">No dropoffs found.</p>
            )}
          </div>

          <div className="bg-white p-5 rounded-lg shadow">
            <h2 className="font-semibold text-lg mb-3">Tracking History</h2>
            {order.timeline.length > 0 ? (
              <div className="space-y-3">
                {order.timeline.map((entry, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-32 text-xs text-gray-500">
                      <p>{entry.date}</p>
                      <p>{entry.time}</p>
                    </div>
                    <div className="w-2 h-2 mt-2 bg-orange-500 rounded-full" />
                    <div className="text-sm font-medium text-gray-800">{entry.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="italic text-gray-500">No tracking updates available.</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleViewRoute}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                📍 View Route
              </button>

             <button
  onClick={() => exportHtmlToPdf('report-page')}
  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
>
  📄 Download Report
</button>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
