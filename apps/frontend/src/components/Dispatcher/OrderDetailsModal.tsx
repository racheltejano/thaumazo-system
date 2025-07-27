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

type Driver = {
  id: string
  full_name: string
  email: string
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





const updateOrderStatus = async (orderId: string, newStatus: string, selectedDriverId?: string) => {
  setStatusLoading(true)
  console.log('🔄 Attempting to update order:', { orderId, newStatus, selectedDriverId })
  
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
      .select('id, tracking_id, driver_id, status, pickup_date, pickup_time')
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

    console.log('✅ Order verification passed:', orderCheck)

    // If status is being changed to 'driver_assigned', ensure we have a driver selected
    if (newStatus === 'driver_assigned' && !selectedDriverId) {
      alert('Please select a driver before assigning.')
      return
    }

    // Prepare update data
    const updateData: any = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    if (selectedDriverId && newStatus === 'driver_assigned') {
      updateData.driver_id = selectedDriverId
    }

    // Perform the update - FIXED: Use first_name and last_name instead of full_name
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        profiles!orders_driver_id_fkey (
          first_name,
          last_name,
          email
        )
      `)

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
      
      // Construct full name from first_name and last_name
      const driverFullName = data[0]?.profiles 
        ? `${data[0].profiles.first_name || ''} ${data[0].profiles.last_name || ''}`.trim() || 'Driver'
        : 'Driver'
      
      const successMessage = selectedDriverId && newStatus === 'driver_assigned' 
        ? `Driver assigned successfully: ${driverFullName}`
        : 'Order status updated successfully!'
      
      alert(successMessage)
      
      // Update the local order state immediately
      setUpdatedOrder({
        ...updatedOrder,
        status: newStatus,
        driver_id: selectedDriverId || updatedOrder.driver_id
      })
      
      // Refresh the calendar data and close modal
      onOrderUpdate()
      onClose()
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    alert('An unexpected error occurred while updating order status')
  } finally {
    setStatusLoading(false)
  }
}

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>📝</span>
              Order Details: {updatedOrder.tracking_id}
            </h3>
            <button
              onClick={onClose}
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
              <OrderInfo 
                order={updatedOrder} 
                estimatedTime={estimatedTime} 
              />
            </div>

            {/* Right Column - Client & Status Updates */}
            <div className="space-y-6">
              {client && (
                <ClientInfo 
                  client={client} 
                  mapboxToken={MAPBOX_TOKEN} 
                />
              )}

              {dropoffs.length > 0 && (
                <DropoffInfo 
                  dropoffs={dropoffs} 
                  mapboxToken={MAPBOX_TOKEN} 
                />
              )}

              <StatusUpdate
                currentStatus={updatedOrder.status}
                onStatusUpdate={(newStatus, selectedDriverId) => updateOrderStatus(updatedOrder.id, newStatus, selectedDriverId)}
                loading={statusLoading}
                order={updatedOrder}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={onClose}
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
  )
}