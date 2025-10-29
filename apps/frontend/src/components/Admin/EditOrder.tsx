  import { useEffect, useState } from 'react'
  import { supabase } from '@/lib/supabase'
  import { X, Save, AlertCircle } from 'lucide-react'

  type Driver = { 
    id: string
    full_name: string
    email: string
    slots?: number 
  }

  type Order = {
    id: string
    status: string
    pickup_date: string
    pickup_time: string
    vehicle_type: string
    tail_lift_required: boolean
    special_instructions: string
    estimated_cost: number
    priority_level: string
    driver_id: string | null
    delivery_window_start: string | null
    delivery_window_end: string | null
    estimated_total_duration: number | null
    pickup_timestamp?: string | null
    delivery_window_start_tz?: string | null
    delivery_window_end_tz?: string | null
    estimated_end_time?: string | null
    estimated_end_timestamp?: string | null
  }

  interface EditOrderProps {
    order: Order
    onClose: () => void
    onSuccess: () => void
  }

  export default function EditOrder({ order, onClose, onSuccess }: EditOrderProps) {
    // Helper functions for timezone conversion
    const phToUTC = (dateStr: string, timeStr: string): string => {
      // PH is UTC+8, so subtract 8 hours to get UTC
      const dt = new Date(`${dateStr}T${timeStr}+08:00`)
      return dt.toISOString()
    }

    const utcToPH = (utcTimestamp: string): { date: string; time: string } => {
      if (!utcTimestamp) return { date: '', time: '' }
      const dt = new Date(utcTimestamp)
      // Convert to PH time (UTC+8)
      const phDate = new Date(dt.getTime() + (8 * 60 * 60 * 1000))
      const date = phDate.toISOString().split('T')[0]
      const time = phDate.toISOString().split('T')[1].substring(0, 5)
      return { date, time }
    }

    const timeToTimestamp = (dateStr: string, timeStr: string): string => {
      return phToUTC(dateStr, timeStr)
    }

    const calculateEstimatedEndTime = (pickupTime: string, durationMins: number): string => {
      if (!pickupTime || !durationMins) return ''
      const [hours, minutes] = pickupTime.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes + durationMins
      const endHours = Math.floor(totalMinutes / 60) % 24
      const endMinutes = totalMinutes % 60
      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`
    }


  const [formData, setFormData] = useState(() => {
      // Extract date and time from pickup_timestamp if it exists
      let pickupDate = order.pickup_date || ''
      let pickupTime = order.pickup_time || ''
      
      if (order.pickup_timestamp) {
        const utcDate = new Date(order.pickup_timestamp)
        // Add 8 hours for PH timezone (UTC+8)
        const phDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000))
        
        // Format as YYYY-MM-DD for date input
        pickupDate = phDate.toISOString().split('T')[0]
        
        // Format as HH:MM for time input
        pickupTime = phDate.toISOString().split('T')[1].substring(0, 5)
      } else if (order.pickup_date && order.pickup_time) {
        // Ensure time has seconds format (HH:MM:SS)
        const timeWithSeconds = order.pickup_time.length === 5 
          ? `${order.pickup_time}:00` 
          : order.pickup_time
        
        // Combine UTC date and time into a Date object
        const utcDateStr = `${order.pickup_date}T${timeWithSeconds}Z`
        const utcDate = new Date(utcDateStr)
        
        // Check if date is valid
        if (!isNaN(utcDate.getTime())) {
          // Add 8 hours for PH timezone (UTC+8)
          const phDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000))
          
          // Format as YYYY-MM-DD for date input
          pickupDate = phDate.toISOString().split('T')[0]
          
          // Format as HH:MM for time input
          pickupTime = phDate.toISOString().split('T')[1].substring(0, 5)
        } else {
          // Fallback to original values if conversion fails
          pickupDate = order.pickup_date
          pickupTime = order.pickup_time
        }
      }

      return {
        status: order.status,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        vehicle_type: order.vehicle_type || '',
        tail_lift_required: order.tail_lift_required || false,
        special_instructions: order.special_instructions || '',
        estimated_cost: order.estimated_cost || 0,
        priority_level: order.priority_level || 'medium',
        driver_id: order.driver_id || '',
        delivery_window_start: order.delivery_window_start || '',
        delivery_window_end: order.delivery_window_end || '',
        estimated_total_duration: order.estimated_total_duration || 0
      }
    })

    const [drivers, setDrivers] = useState<Driver[]>([])
    const [loadingDrivers, setLoadingDrivers] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [statusChangeReason, setStatusChangeReason] = useState('')
    const [showReasonModal, setShowReasonModal] = useState(false)
    const [pendingStatus, setPendingStatus] = useState('')

    // Status transition rules
    const statusTransitions: Record<string, string[]> = {
      order_placed: ['driver_assigned', 'cancelled'],
      driver_assigned: ['truck_left_warehouse', 'cancelled'],
      truck_left_warehouse: ['arrived_at_pickup', 'cancelled'],
      arrived_at_pickup: ['delivered', 'cancelled'],
      delivered: ['arrived_at_pickup', 'cancelled'],
      cancelled: ['order_placed']
    }

    const statusLabels: Record<string, string> = {
      order_placed: 'Order Placed',
      driver_assigned: 'Driver Assigned',
      truck_left_warehouse: 'Truck Left Warehouse',
      arrived_at_pickup: 'Arrived at Pickup',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    }

    useEffect(() => {
      if (formData.status === 'driver_assigned' && !order.driver_id) {
        loadAvailableDrivers()
      }
    }, [formData.status, order.driver_id])

    const loadAvailableDrivers = async () => {
      setLoadingDrivers(true)
      try {
        // Convert PH time to UTC for querying
        const pickupTimestamp = phToUTC(formData.pickup_date, formData.pickup_time)
        
        console.log('🔍 LOAD DRIVERS - PH Time:', {
          date: formData.pickup_date,
          time: formData.pickup_time,
          combined: `${formData.pickup_date} ${formData.pickup_time}`
        })
        console.log('🔍 LOAD DRIVERS - UTC Timestamp:', pickupTimestamp)
        console.log('🔍 LOAD DRIVERS - Query conditions:', {
          'start_time <=': pickupTimestamp,
          'end_time >=': pickupTimestamp
        })

        const { data: slots, error: slotsErr } = await supabase
          .from('driver_time_slots')
          .select('id,driver_id,start_time,end_time,status,order_id')
          .eq('status', 'available')
          .is('order_id', null)
          .lte('start_time', pickupTimestamp)
          .gt('end_time', pickupTimestamp)

        if (slotsErr) throw slotsErr
        
        console.log('🔍 LOAD DRIVERS - Slots found:', slots?.length || 0)
        if (slots && slots.length > 0) {
          console.log('🔍 LOAD DRIVERS - Sample slot:', slots[0])
        }
        
        if (!slots || slots.length === 0) {
          setDrivers([])
          return
        }

          const driverIds = [...new Set(slots.map((s: any) => s.driver_id).filter(Boolean))]
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('id,first_name,last_name,email')
          .in('id', driverIds)

        if (profErr) throw profErr
        if (!profiles || profiles.length === 0) {
          setDrivers([])
          return
        }

        const driverList = profiles.map((p: any) => {
          const count = slots.filter((s: any) => s.driver_id === p.id).length
          return {
            id: p.id,
            full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
            email: p.email || '',
            slots: count
          }
        })

        console.log('🔍 Debug Info:', {
          phDate: formData.pickup_date,
          phTime: formData.pickup_time,
          utcTimestamp: pickupTimestamp,
          parsedDate: new Date(pickupTimestamp).toISOString(),
          slotsFound: slots?.length || 0,
          sampleSlot: slots?.[0]
        })

        setDrivers(driverList)
      } catch (e: any) {
        console.error(e)
        setError('Failed to load available drivers')
      } finally {
        setLoadingDrivers(false)
      }
    }

    const handleStatusChange = (newStatus: string) => {
      if (newStatus === 'cancelled' || (order.status === 'cancelled' && newStatus === 'order_placed')) {
        setPendingStatus(newStatus)
        setShowReasonModal(true)
      } else {
        setFormData({ ...formData, status: newStatus })
      }
    }

    const confirmStatusChange = () => {
      if (!statusChangeReason.trim()) {
        alert('Please provide a reason for the status change')
        return
      }
      setFormData({ ...formData, status: pendingStatus })
      setShowReasonModal(false)
    }

    const handleSave = async () => {
      setError(null)
      setSaving(true)

      try {
        // Validate required fields
        if (!formData.pickup_date || !formData.pickup_time) {
          throw new Error('Pickup date and time are required')
        }

        if (formData.status === 'driver_assigned' && !formData.driver_id) {
          throw new Error('Driver must be assigned for this status')
        }

        // Prepare timestamp fields (convert PH time to UTC)
        const pickupTimestamp = phToUTC(formData.pickup_date, formData.pickup_time)
        
        const deliveryWindowStartTz = formData.delivery_window_start 
          ? phToUTC(formData.pickup_date, formData.delivery_window_start)
          : null
        
        const deliveryWindowEndTz = formData.delivery_window_end
          ? phToUTC(formData.pickup_date, formData.delivery_window_end)
          : null

        const estimatedEndTime = formData.estimated_total_duration
          ? calculateEstimatedEndTime(formData.pickup_time, formData.estimated_total_duration)
          : null

        const estimatedEndTimestamp = estimatedEndTime
          ? phToUTC(formData.pickup_date, estimatedEndTime)
          : null

        // convert pickup date and time columns to UTC
        const utcDate = new Date(pickupTimestamp)
        formData.pickup_date = utcDate.toISOString().split('T')[0]
        formData.pickup_time = utcDate.toISOString().split('T')[1].substring(0, 5)

        // Handle status change to cancelled
        if (formData.status === 'cancelled' && order.status !== 'cancelled') {
          // Release driver slot if driver was assigned
          if (order.driver_id) {
            const { error: slotErr } = await supabase
              .from('driver_time_slots')
              .update({ status: 'available', order_id: null })
              .eq('order_id', order.id)
              .eq('driver_id', order.driver_id)

            if (slotErr) throw slotErr
          }

          // Update order
          const { error: updateErr } = await supabase
            .from('orders')
            .update({
              status: 'cancelled',
              driver_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id)

          if (updateErr) throw updateErr

          // Add status log
          await supabase.from('order_status_logs').insert({
            order_id: order.id,
            status: 'cancelled',
            description: `Order cancelled. Reason: ${statusChangeReason}`,
            timestamp: new Date().toISOString()
          })
        }
        // Handle status change from cancelled to order_placed
        else if (order.status === 'cancelled' && formData.status === 'order_placed') {
          const { error: updateErr } = await supabase
            .from('orders')
            .update({
              status: 'order_placed',
              pickup_date: formData.pickup_date, // pickupTimestamp.date,
              pickup_time: formData.pickup_time,
              pickup_timestamp: pickupTimestamp,
              delivery_window_start: formData.delivery_window_start || null,
              delivery_window_end: formData.delivery_window_end || null,
              delivery_window_start_tz: deliveryWindowStartTz,
              delivery_window_end_tz: deliveryWindowEndTz,
              estimated_end_time: estimatedEndTime,
              estimated_end_timestamp: estimatedEndTimestamp,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id)

          if (updateErr) throw updateErr

          await supabase.from('order_status_logs').insert({
            order_id: order.id,
            status: 'order_placed',
            description: `Order reactivated. Reason: ${statusChangeReason}`,
            timestamp: new Date().toISOString()
          })
        }
        // Handle driver assignment
        else if (formData.status === 'driver_assigned' && !order.driver_id && formData.driver_id) {
          const pickupTimestampUTC = phToUTC(formData.pickup_date, formData.pickup_time)

          // Find available slot for selected driver
          const { data: slots, error: findErr } = await supabase
            .from('driver_time_slots')
            .select('id,driver_id,start_time,end_time,status,order_id')
            .eq('driver_id', formData.driver_id)
            .eq('status', 'available')
            .is('order_id', null)
            .lte('start_time', pickupTimestampUTC)
            .gt('end_time', pickupTimestampUTC)  // Changed from gte to gt

          if (findErr) throw findErr
          if (!slots || slots.length === 0) throw new Error('No available slot for this driver')

          const slot = slots[0]  // Take the first available slot

          // Mark slot as scheduled
          const { error: slotErr } = await supabase
            .from('driver_time_slots')
            .update({ status: 'scheduled', order_id: order.id })
            .eq('id', slot.id)

          if (slotErr) throw slotErr

          // Update order with all timestamp fields
          const { error: updateErr } = await supabase
            .from('orders')
            .update({
              status: formData.status,
              driver_id: formData.driver_id,
              pickup_date: formData.pickup_date,
              pickup_time: formData.pickup_time,
              pickup_timestamp: pickupTimestamp,
              vehicle_type: formData.vehicle_type,
              tail_lift_required: formData.tail_lift_required,
              special_instructions: formData.special_instructions,
              estimated_cost: formData.estimated_cost,
              priority_level: formData.priority_level,
              delivery_window_start: formData.delivery_window_start || null,
              delivery_window_end: formData.delivery_window_end || null,
              delivery_window_start_tz: deliveryWindowStartTz,
              delivery_window_end_tz: deliveryWindowEndTz,
              estimated_total_duration: formData.estimated_total_duration,
              estimated_end_time: estimatedEndTime,
              estimated_end_timestamp: estimatedEndTimestamp,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id)

          if (updateErr) {
            // Rollback slot update
            await supabase
              .from('driver_time_slots')
              .update({ status: 'available', order_id: null })
              .eq('id', slot.id)
            throw updateErr
          }
        }
        // Normal update
        else {
          const updateData: any = {
            status: formData.status,
            pickup_date: formData.pickup_date,
            pickup_time: formData.pickup_time,
            pickup_timestamp: pickupTimestamp,
            vehicle_type: formData.vehicle_type,
            tail_lift_required: formData.tail_lift_required,
            special_instructions: formData.special_instructions,
            estimated_cost: formData.estimated_cost,
            priority_level: formData.priority_level,
            delivery_window_start: formData.delivery_window_start || null,
            delivery_window_end: formData.delivery_window_end || null,
            delivery_window_start_tz: deliveryWindowStartTz,
            delivery_window_end_tz: deliveryWindowEndTz,
            estimated_total_duration: formData.estimated_total_duration,
            estimated_end_time: estimatedEndTime,
            estimated_end_timestamp: estimatedEndTimestamp,
            updated_at: new Date().toISOString()
          }
          
          // Remove driver_id if status is changing away from driver_assigned
          if (order.status === 'driver_assigned' && formData.status !== 'driver_assigned' && order.driver_id) {
            updateData.driver_id = null
            
            // Release driver slot
            await supabase
              .from('driver_time_slots')
              .update({ status: 'available', order_id: null })
              .eq('order_id', order.id)
              .eq('driver_id', order.driver_id)
          } else {
            updateData.driver_id = formData.driver_id || null
          }

          const { error: updateErr } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', order.id)

          if (updateErr) throw updateErr
        }

        onSuccess()
        onClose()
      } catch (e: any) {
        console.error(e)
        setError(e.message || 'Failed to update order')
      } finally {
        setSaving(false)
      }
    }

    const availableStatuses = statusTransitions[order.status] || []

    return (
      <>
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Edit Order</h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  ℹ️ All times are displayed in Philippine Time (UTC+8)
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 mb-2">
                    Current: <span className="font-medium">{statusLabels[order.status]}</span>
                  </div>
                  <select
                    value={formData.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={order.status}>{statusLabels[order.status]}</option>
                    {availableStatuses.map(status => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Driver Assignment (only show if status is driver_assigned) */}
              {formData.status === 'driver_assigned' && !order.driver_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Driver *
                  </label>
                  {loadingDrivers ? (
                    <div className="text-sm text-gray-500">Loading available drivers...</div>
                  ) : drivers.length > 0 ? (
                    <>
                      <select
                        value={formData.driver_id}
                        onChange={(e) => {
                          console.log('👤 Driver selected:', e.target.value)
                          setFormData({ ...formData, driver_id: e.target.value })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a driver</option>
                        {drivers.map(driver => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name} ({driver.email}) - {driver.slots} slots available
                          </option>
                        ))}
                      </select>
                      {!formData.driver_id && (
                        <p className="mt-1 text-sm text-red-600">Please select a driver before saving</p>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-red-600">No drivers available for this pickup time</div>
                  )}
                </div>
              )}

              {/* Pickup Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Date
                  </label>
                  <input
                    type="date"
                    value={formData.pickup_date}
                    onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Time (PH Time)
                  </label>
                  <input
                    type="time"
                    value={formData.pickup_time}
                    onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Delivery Window */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Window Start (PH Time)
                  </label>
                  <input
                    type="time"
                    value={formData.delivery_window_start}
                    onChange={(e) => setFormData({ ...formData, delivery_window_start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Window End (PH Time)
                  </label>
                  <input
                    type="time"
                    value={formData.delivery_window_end}
                    onChange={(e) => setFormData({ ...formData, delivery_window_end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Vehicle Type & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Van, Truck"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority_level}
                    onChange={(e) => setFormData({ ...formData, priority_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Tail Lift & Estimated Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.tail_lift_required}
                      onChange={(e) => setFormData({ ...formData, tail_lift_required: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Tail Lift Required</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Est. Duration (mins)
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_total_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_total_duration: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Estimated Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Cost (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  value={formData.special_instructions}
                  onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter any special instructions..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Status Change Reason Modal */}
        {showReasonModal && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-[60] p-4" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Status Change Reason</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Please provide a reason for changing the status to {statusLabels[pendingStatus]}.
                </p>
                <textarea
                  value={statusChangeReason}
                  onChange={(e) => setStatusChangeReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReasonModal(false)
                    setStatusChangeReason('')
                    setPendingStatus('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusChange}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }