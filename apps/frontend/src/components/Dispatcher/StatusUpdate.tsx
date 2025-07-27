import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
}

type Order = {
  id: string
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

function getStatusUpdateLabel(status: string) {
  // Custom labels for status update buttons
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

  const availableStatuses = getAvailableNextStatuses(currentStatus)

  // Load available drivers when driver assignment is needed
  useEffect(() => {
    if (showDriverDropdown) {
      loadAvailableDrivers()
    }
  }, [showDriverDropdown])

const loadAvailableDrivers = async () => {
  setLoadingDrivers(true)
  try {
    // Properly format the pickup datetime
    let formattedTime = order.pickup_time
    
    // Check if the time already has seconds (HH:MM:SS format)
    const timeParts = order.pickup_time.split(':')
    if (timeParts.length === 2) {
      // Time is in HH:MM format, add seconds
      formattedTime = `${order.pickup_time}:00`
    } else if (timeParts.length === 3) {
      // Time is already in HH:MM:SS format
      formattedTime = order.pickup_time
    } else {
      console.error('Invalid time format:', order.pickup_time)
      alert('Invalid pickup time format')
      setShowDriverDropdown(false)
      return
    }
    
    const pickupDateTime = `${order.pickup_date} ${formattedTime}`
    
    console.log('🔍 Looking for drivers available at:', pickupDateTime)
    console.log('🔍 Order data:', { pickup_date: order.pickup_date, pickup_time: order.pickup_time })
    console.log('🔍 Formatted time:', formattedTime)

    // Query driver availabilities directly with a simpler approach
    const { data: availabilities, error } = await supabase
      .from('driver_availability')
      .select(`
        driver_id,
        start_time,
        end_time,
        title
      `)
      .lte('start_time', pickupDateTime)
      .gte('end_time', pickupDateTime)

    console.log('📊 Supabase availability response:', { data: availabilities, error })

    if (error) {
      console.error('❌ Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(`Database error: ${error.message}`)
    }

    if (!availabilities || availabilities.length === 0) {
      console.log('❌ No drivers available during requested time')
      
      // Let's also check what availabilities exist for debugging
      const { data: allAvailabilities, error: debugError } = await supabase
        .from('driver_availability')
        .select('driver_id, start_time, end_time, title')
        .limit(5)
      
      console.log('🔍 Sample availabilities in database:', allAvailabilities)
      
      setAvailableDrivers([])
      alert('No drivers are available during this pickup time. Please check driver availability.')
      setShowDriverDropdown(false)
      return
    }

    // Get unique driver IDs
    const driverIds = [...new Set(availabilities.map(av => av.driver_id).filter(Boolean))]
    
    if (driverIds.length === 0) {
      console.log('❌ No valid driver IDs found')
      setAvailableDrivers([])
      alert('No valid drivers found in availability records.')
      setShowDriverDropdown(false)
      return
    }

    // Fetch driver profiles separately
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', driverIds)

    console.log('📊 Profiles response:', { data: profiles, error: profileError })

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError)
      throw new Error(`Profile fetch error: ${profileError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No driver profiles found')
      setAvailableDrivers([])
      alert('No driver profile information found.')
      setShowDriverDropdown(false)
      return
    }

    // Transform to Driver type, combining first_name and last_name
    const drivers: Driver[] = profiles.map(profile => ({
      id: profile.id,
      full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Driver',
      email: profile.email || 'No email'
    }))

    console.log('✅ Found available drivers:', drivers.length, drivers)
    setAvailableDrivers(drivers)
    
  } catch (error: any) {
    console.error('❌ Error loading drivers:', error)
    const errorMessage = error?.message || 'Unknown error occurred'
    alert(`Failed to load available drivers: ${errorMessage}`)
    setShowDriverDropdown(false)
  } finally {
    setLoadingDrivers(false)
  }
}
  const handleStatusUpdate = (status: string) => {
    if (status === 'driver_assigned') {
      setShowDriverDropdown(true)
      return
    }
    
    onStatusUpdate(status)
  }

  const handleDriverAssignment = () => {
    if (!selectedDriverId) {
      alert('Please select a driver before assigning.')
      return
    }
    
    onStatusUpdate('driver_assigned', selectedDriverId)
    setShowDriverDropdown(false)
    setSelectedDriverId('')
  }

  const cancelDriverAssignment = () => {
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
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  disabled={loading}
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
                  disabled={loading || !selectedDriverId}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
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
                  disabled={loading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Also add a default export to be safe
export default StatusUpdate