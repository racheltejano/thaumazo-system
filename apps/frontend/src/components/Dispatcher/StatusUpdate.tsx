import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CancellationModal } from './CancellationModal' 
import { getCancellationEmailMessage, type CancellationReasonKey } from './cancellationConfig'

const ORDER_STATUSES = [
  { value: 'order_placed', label: 'Order Placed', color: '#718096' },
  { value: 'driver_assigned', label: 'Driver Assigned', color: '#3182ce' },
  { value: 'truck_left_warehouse', label: 'Truck Left Warehouse', color: '#d69e2e' },
  { value: 'arrived_at_pickup', label: 'Arrived at Pickup', color: '#ed8936' },
  { value: 'delivered', label: 'Delivered', color: '#38a169' },
  { value: 'cancelled', label: 'Cancelled', color: '#e53e3e' },
]

type Driver = {
  id: string
  full_name: string
  email: string
  availableSlots?: number
}

type Order = {
  id: string
  tracking_id?: string
  pickup_date: string
  pickup_time: string
  status: string
  driver_id: string | null
}

interface StatusUpdateProps {
  currentStatus: string
  onStatusUpdate: (newStatus: string, selectedDriverId?: string) => void
  loading: boolean
  order: Order
}

function getStatusColor(status: string) {
  const statusObj = ORDER_STATUSES.find(s => s.value === status)
  return statusObj ? statusObj.color : '#718096'
}

function getStatusLabel(status: string) {
  const statusObj = ORDER_STATUSES.find(s => s.value === status)
  return statusObj ? statusObj.label : status.replace('_', ' ').toUpperCase()
}

function getAvailableNextStatuses(currentStatus: string) {
  const statusFlow = {
    'order_placed': ['driver_assigned', 'cancelled'],
    'driver_assigned': ['truck_left_warehouse', 'cancelled'],
    'truck_left_warehouse': ['arrived_at_pickup', 'cancelled'],
    'arrived_at_pickup': ['delivered', 'cancelled'],
    'delivered': [],
    'cancelled': []
  }
  
  return statusFlow[currentStatus as keyof typeof statusFlow] || []
}

function getStatusUpdateLabel(status: string) {
  const updateLabels = {
    'driver_assigned': 'Assign Driver',
    'truck_left_warehouse': 'Mark as Truck Left Warehouse',
    'arrived_at_pickup': 'Mark as Arrived at Pickup',
    'delivered': 'Mark as Delivered',
    'cancelled': 'Cancel Order'
  }
  
  return updateLabels[status as keyof typeof updateLabels] || `Mark as ${getStatusLabel(status)}`
}

export function StatusUpdate({ currentStatus, onStatusUpdate, loading, order }: StatusUpdateProps) {
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [loadingDrivers, setLoadingDrivers] = useState(false)
  const [showDriverDropdown, setShowDriverDropdown] = useState(false)
  const [assigningDriver, setAssigningDriver] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [orderClient, setOrderClient] = useState<{ email: string; contact_person: string } | null>(null)
  
  const availableStatuses = getAvailableNextStatuses(currentStatus)

  useEffect(() => {
    if (showDriverDropdown) {
      loadAvailableDrivers()
    }
  }, [showDriverDropdown])

  const loadAvailableDrivers = async () => {
    console.log('🚀 [loadAvailableDrivers] Starting to load available drivers')
    setLoadingDrivers(true)
    try {
      let formattedTime = order.pickup_time
      
      const timeParts = order.pickup_time.split(':')
      if (timeParts.length === 2) {
        formattedTime = `${order.pickup_time}:00`
      } else if (timeParts.length === 3) {
        formattedTime = order.pickup_time
      } else {
        console.error('❌ [loadAvailableDrivers] Invalid time format:', order.pickup_time)
        alert('Invalid pickup time format')
        setShowDriverDropdown(false)
        return
      }
      
      const pickupDateTime = `${order.pickup_date} ${formattedTime}`
      
      console.log('🔍 [loadAvailableDrivers] Looking for available driver time slots')
      console.log('📅 [loadAvailableDrivers] Pickup DateTime:', pickupDateTime)
      console.log('📦 [loadAvailableDrivers] Order data:', { 
        order_id: order.id,
        pickup_date: order.pickup_date, 
        pickup_time: order.pickup_time 
      })

      const { data: timeSlots, error } = await supabase
        .from('driver_time_slots')
        .select(`
          id,
          driver_id,
          start_time,
          end_time,
          status,
          order_id
        `)
        .eq('status', 'available')
        .is('order_id', null)
        .lte('start_time', pickupDateTime)
        .gte('end_time', pickupDateTime)

      console.log('📊 [loadAvailableDrivers] Time slots query response:', { 
        count: timeSlots?.length || 0,
        data: timeSlots, 
        error 
      })

      if (error) {
        console.error('❌ [loadAvailableDrivers] Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Database error: ${error.message}`)
      }

      if (!timeSlots || timeSlots.length === 0) {
        console.log('⚠️ [loadAvailableDrivers] No available driver time slots found')
        
        const { data: allSlots } = await supabase
          .from('driver_time_slots')
          .select('driver_id, start_time, end_time, status, order_id')
          .limit(10)
        
        console.log('🔍 [loadAvailableDrivers] Sample time slots in database:', allSlots)
        
        setAvailableDrivers([])
        alert('No drivers have available time slots during this pickup time. Please check driver schedules.')
        setShowDriverDropdown(false)
        return
      }

      const driverIds = [...new Set(timeSlots.map(slot => slot.driver_id).filter(Boolean))]
      console.log('👥 [loadAvailableDrivers] Unique driver IDs found:', driverIds)
      
      if (driverIds.length === 0) {
        console.log('❌ [loadAvailableDrivers] No valid driver IDs found in time slots')
        setAvailableDrivers([])
        alert('No valid drivers found in available time slots.')
        setShowDriverDropdown(false)
        return
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', driverIds)

      console.log('📊 [loadAvailableDrivers] Profiles query response:', { 
        count: profiles?.length || 0,
        data: profiles, 
        error: profileError 
      })

      if (profileError) {
        console.error('❌ [loadAvailableDrivers] Profile fetch error:', profileError)
        throw new Error(`Profile fetch error: ${profileError.message}`)
      }

      if (!profiles || profiles.length === 0) {
        console.log('❌ [loadAvailableDrivers] No driver profiles found')
        setAvailableDrivers([])
        alert('No driver profile information found.')
        setShowDriverDropdown(false)
        return
      }

      const drivers: Driver[] = profiles.map(profile => {
        const driverSlots = timeSlots.filter(slot => slot.driver_id === profile.id)
        const slotCount = driverSlots.length
        
        return {
          id: profile.id,
          full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Driver',
          email: profile.email || 'No email',
          availableSlots: slotCount
        }
      })

      console.log('✅ [loadAvailableDrivers] Successfully loaded drivers:', {
        count: drivers.length,
        drivers: drivers.map(d => ({ id: d.id, name: d.full_name, slots: d.availableSlots }))
      })
      setAvailableDrivers(drivers)
      
    } catch (error: any) {
      console.error('❌ [loadAvailableDrivers] Error:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      alert(`Failed to load available drivers: ${errorMessage}`)
      setShowDriverDropdown(false)
    } finally {
      setLoadingDrivers(false)
      console.log('🏁 [loadAvailableDrivers] Finished loading drivers')
    }
  }

  const handleDriverAssignment = async () => {
    if (!selectedDriverId) {
      console.warn('⚠️ [handleDriverAssignment] No driver selected')
      alert('Please select a driver before assigning.')
      return
    }
    
    console.log('🚀 [handleDriverAssignment] Starting driver assignment process')
    console.log('📦 [handleDriverAssignment] Assignment details:', {
      order_id: order.id,
      driver_id: selectedDriverId,
      pickup_date: order.pickup_date,
      pickup_time: order.pickup_time
    })

    setAssigningDriver(true)

    try {
      // Format pickup datetime
      let formattedTime = order.pickup_time
      const timeParts = order.pickup_time.split(':')
      if (timeParts.length === 2) {
        formattedTime = `${order.pickup_time}:00`
      }
      const pickupDateTime = `${order.pickup_date} ${formattedTime}`
      
      console.log('📅 [handleDriverAssignment] Formatted pickup datetime:', pickupDateTime)

      // Step 1: Find the specific time slot to update
      console.log('🔍 [handleDriverAssignment] Step 1: Finding time slot to assign')
      const { data: timeSlotToAssign, error: findError } = await supabase
        .from('driver_time_slots')
        .select('id, driver_id, start_time, end_time, status, order_id')
        .eq('driver_id', selectedDriverId)
        .eq('status', 'available')
        .is('order_id', null)
        .lte('start_time', pickupDateTime)
        .gte('end_time', pickupDateTime)
        .limit(1)
        .single()

      console.log('📊 [handleDriverAssignment] Time slot search result:', {
        found: !!timeSlotToAssign,
        data: timeSlotToAssign,
        error: findError
      })

      if (findError || !timeSlotToAssign) {
        console.error('❌ [handleDriverAssignment] No available time slot found:', findError)
        throw new Error('No available time slot found for this driver. The slot may have been assigned to another order.')
      }

      console.log('✅ [handleDriverAssignment] Found time slot to assign:', {
        slot_id: timeSlotToAssign.id,
        driver_id: timeSlotToAssign.driver_id,
        start_time: timeSlotToAssign.start_time,
        end_time: timeSlotToAssign.end_time
      })

      // Step 2: Update the time slot
      console.log('🔄 [handleDriverAssignment] Step 2: Updating time slot status to "scheduled"')
      const { data: updatedSlot, error: slotError } = await supabase
        .from('driver_time_slots')
        .update({ 
          status: 'scheduled',
          order_id: order.id 
        })
        .eq('id', timeSlotToAssign.id)
        .select()

      console.log('📊 [handleDriverAssignment] Time slot update result:', {
        success: !slotError,
        data: updatedSlot,
        error: slotError
      })

      if (slotError) {
        console.error('❌ [handleDriverAssignment] Failed to update time slot:', slotError)
        throw new Error(`Failed to update time slot: ${slotError.message}`)
      }

      console.log('✅ [handleDriverAssignment] Time slot updated successfully')

      // Step 3: Update the order
      console.log('🔄 [handleDriverAssignment] Step 3: Updating order status to "driver_assigned"')
      const { data: updatedOrder, error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'driver_assigned',
          driver_id: selectedDriverId 
        })
        .eq('id', order.id)
        .select()

      console.log('📊 [handleDriverAssignment] Order update result:', {
        success: !orderError,
        data: updatedOrder,
        error: orderError
      })

      if (orderError) {
        console.error('❌ [handleDriverAssignment] Failed to update order:', orderError)
        
        // Rollback: Reset the time slot if order update fails
        console.log('⏪ [handleDriverAssignment] Rolling back time slot update')
        await supabase
          .from('driver_time_slots')
          .update({ 
            status: 'available',
            order_id: null 
          })
          .eq('id', timeSlotToAssign.id)
        
        throw new Error(`Failed to update order: ${orderError.message}`)
      }

      console.log('✅ [handleDriverAssignment] Order updated successfully')
      console.log('🎉 [handleDriverAssignment] Driver assignment completed successfully!')

      // Call the parent's onStatusUpdate callback
      console.log('📞 [handleDriverAssignment] Calling parent onStatusUpdate callback')
      onStatusUpdate('driver_assigned', selectedDriverId)
      
      // Reset UI state
      setShowDriverDropdown(false)
      setSelectedDriverId('')
      setAvailableDrivers([])
      
      alert('Driver assigned successfully!')
      // Auto-reload the page to show updated data
      console.log('🔄 [handleDriverAssignment] Reloading page to show updated data')
      window.location.reload()
      
    } catch (error: any) {
      console.error('❌ [handleDriverAssignment] Assignment failed:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      alert(`Failed to assign driver: ${errorMessage}`)
    } finally {
      setAssigningDriver(false)
      console.log('🏁 [handleDriverAssignment] Assignment process completed')
    }
  }

  const fetchClientInfo = async () => {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          clients!client_id (
            email,
            contact_person
          )
        `)
        .eq('id', order.id)
        .single()
      
      if (orderData?.clients) {
        setOrderClient({
          email: orderData.clients.email,
          contact_person: orderData.clients.contact_person
        })
      }
    } catch (error) {
      console.error('Error fetching client info:', error)
    }
  }

  const handleStatusUpdate = (status: string) => {
    console.log('🔄 [handleStatusUpdate] Status update requested:', status)
    
    if (status === 'driver_assigned') {
      console.log('👥 [handleStatusUpdate] Opening driver selection dropdown')
      setShowDriverDropdown(true)
      return
    }
    
    if (status === 'cancelled') {
      console.log('🚫 [handleStatusUpdate] Opening cancellation modal')
      fetchClientInfo() 
      setShowCancelModal(true)
      return
    }
    
    console.log('📞 [handleStatusUpdate] Calling parent onStatusUpdate for status:', status)
    onStatusUpdate(status)
  }

  const cancelDriverAssignment = () => {
    console.log('❌ [cancelDriverAssignment] Cancelling driver assignment')
    setShowDriverDropdown(false)
    setSelectedDriverId('')
    setAvailableDrivers([])
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-gray-900">
        <span>🔄</span>
        Update Status
      </h4>
      
      {!showDriverDropdown ? (
        <div className="space-y-2">
          {availableStatuses.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusUpdate(status)}
              disabled={loading}
              className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                loading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'text-white hover:opacity-90 hover:shadow-md'
              }`}
              style={{
                backgroundColor: loading ? '#e5e7eb' : getStatusColor(status)
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  Updating...
                </div>
              ) : (
                getStatusUpdateLabel(status)
              )}
            </button>
          ))}
          
          {availableStatuses.length === 0 && (
            <div className="text-center py-4">
              <div className="text-gray-400 text-xl mb-2">✅</div>
              <p className="text-sm text-gray-500 italic">No status updates available</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 font-medium mb-2">
              📋 Select Driver for Assignment
            </p>
            <p className="text-xs text-blue-600">
              Pickup: {order.pickup_date} at {order.pickup_time}
            </p>
          </div>

          {loadingDrivers ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Loading available drivers...</span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Drivers ({availableDrivers.length})
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => {
                    console.log('👤 [Driver Selection] Driver selected:', e.target.value)
                    setSelectedDriverId(e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  disabled={assigningDriver}
                >
                  <option value="">Select a driver...</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name} ({driver.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDriverAssignment}
                  disabled={assigningDriver || !selectedDriverId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {assigningDriver ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Assigning...
                    </div>
                  ) : (
                    'Assign Driver'
                  )}
                </button>
                
                <button
                  onClick={cancelDriverAssignment}
                  disabled={assigningDriver}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <CancellationModal
          orderId={order.id}
          trackingId={order.tracking_id || order.id}
          onClose={() => setShowCancelModal(false)}
          onConfirm={async (reason, customMessage) => {
            try {
              const emailMessage = getCancellationEmailMessage(reason, customMessage)

              const { error: logError } = await supabase
                .from('order_status_logs')
                .insert({
                  order_id: order.id,
                  status: 'cancelled',
                  description: `Order cancelled by dispatcher. Reason: ${emailMessage}`,
                  timestamp: new Date().toISOString()
                })

              if (logError) throw logError

              if (orderClient?.email) {
                await fetch('/api/send-dispatcher-cancellation-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: orderClient.email,
                    trackingId: order.tracking_id || order.id,
                    contactPerson: orderClient.contact_person,
                    reason: emailMessage,
                    cancellationType: reason
                  })
                })
              }

              await onStatusUpdate('cancelled')
              
              alert('✅ Order cancelled successfully. Client has been notified via email.')
              setShowCancelModal(false)
            } catch (err) {
              console.error('Error cancelling order:', err)
              alert('❌ Failed to cancel order. Please try again.')
            }
          }}
        />
      )}
    </div>
  )
}

export default StatusUpdate