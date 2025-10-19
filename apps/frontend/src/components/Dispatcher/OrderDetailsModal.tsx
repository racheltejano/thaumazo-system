import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { OrderInfo } from './OrderInfo'
import { ClientInfo } from './ClientInfo'
import { DropoffInfo } from './DropoffInfo'
import { StatusUpdate } from './StatusUpdate'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

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

interface OrderDetailsModalProps {
  selectedOrder: Order
  onClose: () => void
  onOrderUpdate: () => void
}

export function OrderDetailsModal({ selectedOrder, onClose, onOrderUpdate }: OrderDetailsModalProps) {
  const [client, setClient] = useState<Client | null>(null)
  const [dropoffs, setDropoffs] = useState<Dropoff[]>([])
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [updatedOrder, setUpdatedOrder] = useState<Order>(selectedOrder)

  useEffect(() => {
    setUpdatedOrder(selectedOrder)
    fetchOrderDetails(selectedOrder)
  }, [selectedOrder])

  useEffect(() => {
    if (client && dropoffs.length > 0) {
      fetchEstimatedTravelTime(client, dropoffs)
    }
  }, [client, dropoffs])

  const fetchOrderDetails = async (order: Order) => {
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('tracking_id', order.tracking_id)
        .single()

      setClient(clientData)

      const { data: dropoffData } = await supabase
        .from('order_dropoffs')
        .select('*')
        .eq('order_id', order.id)
        .order('sequence', { ascending: true })

      setDropoffs(dropoffData || [])
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

    const filtered = dropoffData.filter(d => d.latitude && d.longitude)
    if (filtered.length === 0) {
      setEstimatedTime('Unavailable')
      return
    }

    const coords = [
      `${clientData.pickup_longitude},${clientData.pickup_latitude}`,
      ...filtered.map(d => `${d.longitude},${d.latitude}`)
    ]

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords.join(';')}?access_token=${MAPBOX_TOKEN}&overview=false`

    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.routes?.[0]?.duration) {
        const mins = Math.round(data.routes[0].duration / 60)
        const hrs = Math.floor(mins / 60)
        setEstimatedTime(hrs > 0 ? `${hrs} hrs ${mins % 60} mins` : `${mins} mins`)
      } else setEstimatedTime('Unavailable')
    } catch {
      setEstimatedTime('Unavailable')
    }
  }

  const googleMapsUrl = client && dropoffs.length > 0
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        client.pickup_address
      )}&destination=${encodeURIComponent(
        dropoffs[dropoffs.length - 1].dropoff_address
      )}&waypoints=${encodeURIComponent(
        dropoffs.slice(0, -1).map(d => d.dropoff_address).join('|')
      )}`
    : null

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col">

        {/* HEADER - Fixed at top */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">📝 Order Details</h3>
            <p className="text-sm text-gray-600 mt-1">Tracking ID: <span className="font-semibold text-blue-600">{updatedOrder.tracking_id}</span></p>
          </div>
          <button 
            onClick={onClose} 
            className="text-3xl font-bold text-gray-400 hover:text-gray-600 transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/50"
          >
            ×
          </button>
        </div>

        {/* BODY - Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <OrderInfo order={updatedOrder} estimatedTime={estimatedTime} />
              <StatusUpdate 
                currentStatus={updatedOrder.status} 
                order={updatedOrder} 
                onStatusUpdate={() => {}} 
                loading={statusLoading} 
              />
            </div>
            <div className="space-y-6">
              {client && <ClientInfo client={client} mapboxToken={MAPBOX_TOKEN} />}
              {dropoffs.length > 0 && <DropoffInfo dropoffs={dropoffs} mapboxToken={MAPBOX_TOKEN} />}
            </div>
          </div>
        </div>

        {/* FOOTER - Fixed at bottom */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          {googleMapsUrl && (
            <button
              onClick={() => window.open(googleMapsUrl, '_blank')}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <span>🚗</span>
              <span>View Route</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}