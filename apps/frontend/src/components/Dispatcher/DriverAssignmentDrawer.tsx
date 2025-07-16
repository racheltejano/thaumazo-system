'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format as formatDate } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime, format as tzFormat } from 'date-fns-tz'
import { useRouter } from 'next/navigation'

type Driver = {
  id: string
  first_name: string
  last_name: string
  profile_pic: string | null
}

type AvailabilityBlock = {
  id: string
  start_time: string
  end_time: string
}

type ExistingTimeSlot = {
  id: string
  start_time: string
  end_time: string
  status: string
  order_id: string | null
}

const TIMEZONE = 'Asia/Manila'

export default function DriverAssignmentDrawer({
  orderId,
  estimatedDurationMins,
  onClose,
}: {
  orderId: string
  estimatedDurationMins: number
  onClose: () => void
}) {
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [availableBlocks, setAvailableBlocks] = useState<AvailabilityBlock[]>([])
  const [existingTimeSlots, setExistingTimeSlots] = useState<ExistingTimeSlot[]>([])
  const [pickupDate, setPickupDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [popupMessage, setPopupMessage] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  useEffect(() => {
    const fetchOrderAndDrivers = async () => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('pickup_date')
        .eq('id', orderId)
        .single()

      if (orderData?.pickup_date) {
        const manilaMidnight = zonedTimeToUtc(`${orderData.pickup_date}T00:00:00`, TIMEZONE)
        setPickupDate(manilaMidnight)
      }

      const { data: driversData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_pic')
        .eq('role', 'driver')

      if (driversData) setDrivers(driversData)
    }

    fetchOrderAndDrivers()
  }, [orderId])

  useEffect(() => {
    const fetchAvailabilityAndTimeSlots = async () => {
      if (!selectedDriverId || !pickupDate) return

      const pickupDateStr = formatDate(pickupDate, 'yyyy-MM-dd')
      const dayStart = zonedTimeToUtc(`${pickupDateStr}T00:00:00`, TIMEZONE)
      const dayEnd = zonedTimeToUtc(`${pickupDateStr}T23:59:59`, TIMEZONE)

      // Fetch driver availability blocks that intersect with the pickup date
      // We need to find availability blocks where:
      // 1. The block starts before or on the pickup date end (start_time <= dayEnd)
      // 2. The block ends after or on the pickup date start (end_time >= dayStart)
      const { data: availabilities, error } = await supabase
        .from('driver_availability')
        .select('id, start_time, end_time')
        .eq('driver_id', selectedDriverId)
        .lte('start_time', dayEnd.toISOString())
        .gte('end_time', dayStart.toISOString())

      if (error) {
        console.error('Error fetching availability:', error)
        setAvailableBlocks([])
        return
      }

      // Fetch existing time slots for this driver on this date
      const { data: timeSlots } = await supabase
        .from('driver_time_slots')
        .select('id, start_time, end_time, status, order_id')
        .eq('driver_id', selectedDriverId)
        .gte('start_time', dayStart.toISOString())
        .lt('start_time', dayEnd.toISOString())
        .neq('status', 'cancelled')

      if (timeSlots) {
        setExistingTimeSlots(timeSlots)
      }

      // Process availability blocks to get the portions that fall on the pickup date
      const blocks = (availabilities || [])
        .map((block) => {
          const blockStart = new Date(block.start_time)
          const blockEnd = new Date(block.end_time)
          
          // Get the intersection of the block with the pickup date
          const effectiveStart = new Date(Math.max(blockStart.getTime(), dayStart.getTime()))
          const effectiveEnd = new Date(Math.min(blockEnd.getTime(), dayEnd.getTime()))
          
          // Only include if there's actually an intersection
          if (effectiveStart < effectiveEnd) {
            return {
              id: block.id,
              start_time: effectiveStart.toISOString(),
              end_time: effectiveEnd.toISOString(),
            }
          }
          return null
        })
        .filter(Boolean) as AvailabilityBlock[]

      setAvailableBlocks(blocks)
    }

    fetchAvailabilityAndTimeSlots()
  }, [selectedDriverId, pickupDate])

  const checkTimeSlotIntersection = (start: Date, end: Date): string | null => {
    for (const slot of existingTimeSlots) {
      const slotStart = new Date(slot.start_time)
      const slotEnd = new Date(slot.end_time)
      
      // Check if times intersect
      if (start < slotEnd && end > slotStart) {
        return `Time slot intersects with existing ${slot.order_id ? 'order' : 'slot'} from ${tzFormat(utcToZonedTime(slotStart, TIMEZONE), 'hh:mm a', { timeZone: TIMEZONE })} to ${tzFormat(utcToZonedTime(slotEnd, TIMEZONE), 'hh:mm a', { timeZone: TIMEZONE })}`
      }
    }
    return null
  }

  const checkTimeWithinAvailability = (start: Date, end: Date): boolean => {
    return availableBlocks.some(block => {
      const blockStart = new Date(block.start_time)
      const blockEnd = new Date(block.end_time)
      return start >= blockStart && end <= blockEnd
    })
  }

  const validateTimeSlot = (): string | null => {
    if (!startTime || !endTime) {
      return 'Please select both start and end times'
    }

    if (!pickupDate) {
      return 'Pickup date not available'
    }

    const startDateTime = zonedTimeToUtc(`${formatDate(pickupDate, 'yyyy-MM-dd')}T${startTime}`, TIMEZONE)
    const endDateTime = zonedTimeToUtc(`${formatDate(pickupDate, 'yyyy-MM-dd')}T${endTime}`, TIMEZONE)

    if (startDateTime >= endDateTime) {
      return 'End time must be after start time'
    }

    const durationMins = (endDateTime.getTime() - startDateTime.getTime()) / 60000
    if (durationMins < estimatedDurationMins) {
      return `Time slot too short. Minimum ${estimatedDurationMins} minutes required`
    }

    if (!checkTimeWithinAvailability(startDateTime, endDateTime)) {
      return 'Selected time is outside driver availability hours'
    }

    const intersectionError = checkTimeSlotIntersection(startDateTime, endDateTime)
    if (intersectionError) {
      return intersectionError
    }

    return null
  }

  const handleTimeChange = () => {
    setError('')
    if (startTime && endTime) {
      const validationError = validateTimeSlot()
      if (validationError) {
        setError(validationError)
      }
    }
  }

  useEffect(() => {
    handleTimeChange()
  }, [startTime, endTime, existingTimeSlots, availableBlocks])

  const handleAssign = async () => {
    if (!selectedDriverId || !startTime || !endTime || !pickupDate) return
    
    const validationError = validateTimeSlot()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsAssigning(true)

    const startDateTime = zonedTimeToUtc(`${formatDate(pickupDate, 'yyyy-MM-dd')}T${startTime}`, TIMEZONE)
    const endDateTime = zonedTimeToUtc(`${formatDate(pickupDate, 'yyyy-MM-dd')}T${endTime}`, TIMEZONE)
    const durationMins = (endDateTime.getTime() - startDateTime.getTime()) / 60000

    // Find the availability block this time slot falls within
    const availabilityBlock = availableBlocks.find(block => {
      const blockStart = new Date(block.start_time)
      const blockEnd = new Date(block.end_time)
      return startDateTime >= blockStart && endDateTime <= blockEnd
    })

    if (!availabilityBlock) {
      setError('Selected time is not within any availability block')
      setIsAssigning(false)
      return
    }

    try {
      // Start a transaction
      const { data: orderUpdate, error: orderError } = await supabase
        .from('orders')
        .update({
          driver_id: selectedDriverId,
          pickup_time: startTime,
          estimated_total_duration: durationMins,
          estimated_end_time: endTime,
          status: 'driver_assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (orderError) {
        throw orderError
      }

      // Create time slot entry
      const { error: timeSlotError } = await supabase
        .from('driver_time_slots')
        .insert({
          driver_id: selectedDriverId,
          driver_availability_id: availabilityBlock.id,
          order_id: orderId,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'scheduled',
        })

      if (timeSlotError) {
        throw timeSlotError
      }

      // Success - show success popup
      const selectedDriver = drivers.find(d => d.id === selectedDriverId)
      setPopupMessage(`Driver ${selectedDriver?.first_name} ${selectedDriver?.last_name} has been successfully assigned to the order!`)
      setShowSuccessPopup(true)
      setIsAssigning(false)
    } catch (err: any) {
      setPopupMessage(`Failed to assign driver: ${err.message}`)
      setShowErrorPopup(true)
      setIsAssigning(false)
    }
  }

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false)
    onClose()
    // Navigate to calendar or reload the page
    //router.push('/dispatcher/calendar')
    // Alternative: reload the current page
    window.location.reload()
  }

  const handleErrorPopupClose = () => {
    setShowErrorPopup(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-end">
        <div className="bg-white p-6 w-full max-w-md h-full overflow-y-auto shadow-lg rounded-l-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🧑‍✈️ Assign Driver</h2>
            <button onClick={onClose} className="text-lg font-bold text-gray-600 hover:text-red-600">✖</button>
          </div>

          <label className="block mb-2 font-medium">Select Driver</label>
          <select
            className="w-full border p-2 rounded mb-4"
            value={selectedDriverId || ''}
            onChange={(e) => {
              setSelectedDriverId(e.target.value)
              setStartTime('')
              setEndTime('')
              setError('')
            }}
            disabled={isAssigning}
          >
            <option value="">-- Choose Driver --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
            ))}
          </select>

          {selectedDriverId && availableBlocks.length > 0 && (
            <>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Available Hours</label>
                <div className="text-sm text-gray-600 mb-2">
                  {availableBlocks.map((block, index) => (
                    <div key={block.id}>
                      {tzFormat(utcToZonedTime(new Date(block.start_time), TIMEZONE), 'hh:mm a', { timeZone: TIMEZONE })} – 
                      {tzFormat(utcToZonedTime(new Date(block.end_time), TIMEZONE), 'hh:mm a', { timeZone: TIMEZONE })}
                      {index < availableBlocks.length - 1 && ', '}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-2 font-medium">Start Time</label>
                  <input
                    type="time"
                    className="w-full border p-2 rounded"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={isAssigning}
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">End Time</label>
                  <input
                    type="time"
                    className="w-full border p-2 rounded"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={isAssigning}
                  />
                </div>
              </div>

              {existingTimeSlots.length > 0 && (
                <div className="mb-4">
                  <label className="block mb-2 font-medium text-orange-600">Existing Time Slots</label>
                  <div className="text-sm text-gray-600 space-y-1">
                    {existingTimeSlots.map((slot) => (
                      <div key={slot.id} className="flex justify-between">
                        <span>
                          {tzFormat(utcToZonedTime(new Date(slot.start_time), TIMEZONE), 'hh:mm a', { timeZone: TIMEZONE })} – 
                          {tzFormat(utcToZonedTime(new Date(slot.end_time), TIMEZONE), 'hh:mm a', { timeZone: TIMEZONE })}
                        </span>
                        <span className="text-xs text-gray-500">
                          {slot.order_id ? 'Order' : 'Slot'} ({slot.status})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
            </>
          )}

          {selectedDriverId && availableBlocks.length === 0 && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              No availability blocks found for this driver on the selected date.
            </div>
          )}

          <button
            onClick={handleAssign}
            className={`w-full py-2 rounded text-white ${
              selectedDriverId && startTime && endTime && !error && !isAssigning
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={!selectedDriverId || !startTime || !endTime || !!error || isAssigning}
          >
            {isAssigning ? '🔄 Assigning...' : '🚚 Assign Driver'}
          </button>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-4 text-green-600">Success!</h3>
              <p className="text-gray-700 mb-6">{popupMessage}</p>
              <button
                onClick={handleSuccessPopupClose}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-xl font-semibold mb-4 text-red-600">Error</h3>
              <p className="text-gray-700 mb-6">{popupMessage}</p>
              <button
                onClick={handleErrorPopupClose}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}