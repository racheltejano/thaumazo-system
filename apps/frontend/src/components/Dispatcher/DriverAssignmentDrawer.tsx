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

type TimeSlotOption = {
  id: string
  start_time: string
  end_time: string
  display: string
  availabilityBlockId: string
}

const TIMEZONE = 'Asia/Manila'
const SLOT_INTERVAL_MINUTES = 30 // Generate slots every 30 minutes
const BUFFER_MINUTES = 10 // Buffer time between bookings
const ROUND_UP_TO_MINUTES = 10 // Round up durations to nearest 10 minutes

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
  const [timeSlotOptions, setTimeSlotOptions] = useState<TimeSlotOption[]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [pickupDate, setPickupDate] = useState<Date | null>(null)
  const [error, setError] = useState<string>('')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [popupMessage, setPopupMessage] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [actualEstimatedDuration, setActualEstimatedDuration] = useState(estimatedDurationMins)

  useEffect(() => {
    const fetchOrderAndDrivers = async () => {
      const { data: orderData } = await supabase
      .from('orders')
      .select('pickup_timestamp, estimated_total_duration')
      .eq('id', orderId)
      .single()

      if (orderData?.pickup_timestamp) {
        // Convert UTC pickup timestamp to PH time
        const pickupUtc = new Date(orderData.pickup_timestamp)
        const pickupPH = utcToZonedTime(pickupUtc, TIMEZONE)
        setPickupDate(pickupPH)
      }

      // Use the estimated_total_duration from the database if available
      if (orderData?.estimated_total_duration) {
        setActualEstimatedDuration(orderData.estimated_total_duration)
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

      const { data: timeSlots } = await supabase
        .from('driver_time_slots')
        .select('id, start_time, end_time, status, order_id')
        .eq('driver_id', selectedDriverId)
        .lte('start_time', dayEnd.toISOString())
        .gte('end_time', dayStart.toISOString())
        .neq('status', 'cancelled')

      if (timeSlots) {
        setExistingTimeSlots(timeSlots)
      }

      const blocks = (availabilities || [])
        .map((block) => {
          const blockStart = new Date(block.start_time)
          const blockEnd = new Date(block.end_time)
          const effectiveStart = new Date(Math.max(blockStart.getTime(), dayStart.getTime()))
          const effectiveEnd = new Date(Math.min(blockEnd.getTime(), dayEnd.getTime()))
          
          if (effectiveStart < effectiveEnd) {
            return {
              id: block.id,
              start_time: block.start_time, 
              end_time: block.end_time,     
            }
          }
          return null
        })
        .filter(Boolean) as AvailabilityBlock[]

      setAvailableBlocks(blocks)
    }

    fetchAvailabilityAndTimeSlots()
  }, [selectedDriverId, pickupDate])

  // Helper function to round up duration to nearest 10 minutes
  const roundUpDuration = (minutes: number): number => {
    return Math.ceil(minutes / ROUND_UP_TO_MINUTES) * ROUND_UP_TO_MINUTES
  }

  // Generate available time slot options with buffer logic
  useEffect(() => {
    const generateTimeSlotOptions = () => {
      if (!pickupDate || availableBlocks.length === 0) {
        setTimeSlotOptions([])
        return
      }

      const pickupDateStr = formatDate(pickupDate, 'yyyy-MM-dd')
      const dayStart = zonedTimeToUtc(`${pickupDateStr}T00:00:00`, TIMEZONE)
      const dayEnd = zonedTimeToUtc(`${pickupDateStr}T23:59:59`, TIMEZONE)
      
      // Round up the estimated duration to nearest 10 minutes
      const roundedDuration = roundUpDuration(actualEstimatedDuration)
      const durationMs = roundedDuration * 60 * 1000
      const bufferMs = BUFFER_MINUTES * 60 * 1000

      const options: TimeSlotOption[] = []

      // Create buffered time slots from existing bookings
      const bufferedExistingSlots = existingTimeSlots.map(slot => {
        const existingStartStr = slot.start_time.endsWith('Z') ? slot.start_time : slot.start_time + 'Z'
        const existingEndStr = slot.end_time.endsWith('Z') ? slot.end_time : slot.end_time + 'Z'
        
        const existingStart = new Date(existingStartStr)
        const existingEnd = new Date(existingEndStr)
        
        // Add buffer before and after existing slots
        return {
          ...slot,
          bufferedStart: new Date(existingStart.getTime() - bufferMs),
          bufferedEnd: new Date(existingEnd.getTime() + bufferMs),
          originalStart: existingStart,
          originalEnd: existingEnd
        }
      })

      availableBlocks.forEach(block => {
        const blockStart = new Date(block.start_time + 'Z')
        const blockEnd = new Date(block.end_time + 'Z')
        
        // Calculate effective window for this day
        const effectiveStart = new Date(Math.max(blockStart.getTime(), dayStart.getTime()))
        const effectiveEnd = new Date(Math.min(blockEnd.getTime(), dayEnd.getTime()))
        
        if (effectiveStart >= effectiveEnd) return

        // Generate slots at SLOT_INTERVAL_MINUTES intervals
        let currentSlotStart = new Date(effectiveStart)
        
        // Round up to the nearest slot interval
        const startMinutes = currentSlotStart.getMinutes()
        const remainder = startMinutes % SLOT_INTERVAL_MINUTES
        if (remainder !== 0) {
          currentSlotStart.setMinutes(startMinutes + (SLOT_INTERVAL_MINUTES - remainder), 0, 0)
        }

        while (currentSlotStart < effectiveEnd) {
          const slotEnd = new Date(currentSlotStart.getTime() + durationMs)
          
          // Check if slot fits within the availability block
          if (slotEnd <= effectiveEnd) {
            // Check for conflicts with buffered existing time slots
            const hasConflict = bufferedExistingSlots.some(existingSlot => {
              // Check overlap with the buffered time range
              return currentSlotStart < existingSlot.bufferedEnd && existingSlot.bufferedStart < slotEnd
            })

            if (!hasConflict) {
              const startPH = utcToZonedTime(currentSlotStart, TIMEZONE)
              const endPH = utcToZonedTime(slotEnd, TIMEZONE)
              
              const displayText = `${formatDate(startPH, 'h:mm a')} - ${formatDate(endPH, 'h:mm a')} (${roundedDuration} min)`
              
              options.push({
                id: `${currentSlotStart.getTime()}_${slotEnd.getTime()}`,
                start_time: currentSlotStart.toISOString(),
                end_time: slotEnd.toISOString(),
                display: displayText,
                availabilityBlockId: block.id
              })
            }
          }
          
          // Move to next slot interval
          currentSlotStart = new Date(currentSlotStart.getTime() + (SLOT_INTERVAL_MINUTES * 60 * 1000))
        }
      })

      // Sort options by start time
      options.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      
      setTimeSlotOptions(options)
    }

    generateTimeSlotOptions()
  }, [availableBlocks, existingTimeSlots, pickupDate, actualEstimatedDuration])

  const handleAssign = async () => {
    if (!selectedDriverId || !selectedTimeSlot || !pickupDate) return
    
    const selectedOption = timeSlotOptions.find(option => option.id === selectedTimeSlot)
    if (!selectedOption) {
      setError('Please select a valid time slot')
      return
    }

    setIsAssigning(true)

    const startDateTime = new Date(selectedOption.start_time)
    const endDateTime = new Date(selectedOption.end_time)
    const durationMins = (endDateTime.getTime() - startDateTime.getTime()) / 60000

    try {
      const { data: orderUpdate, error: orderError } = await supabase
      .from('orders')
      .update({
        driver_id: selectedDriverId,
        pickup_timestamp: startDateTime.toISOString(),
        estimated_total_duration: durationMins,
        estimated_end_timestamp: endDateTime.toISOString(),
        status: 'driver_assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

      if (orderError) {
        throw orderError
      }

      // Create time slot entry with UTC times
      const { error: timeSlotError } = await supabase
        .from('driver_time_slots')
        .insert({
          driver_id: selectedDriverId,
          driver_availability_id: selectedOption.availabilityBlockId,
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
    router.refresh()
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
              setSelectedTimeSlot('')
              setError('')
            }}
            disabled={isAssigning}
          >
            <option value="">-- Choose Driver --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
            ))}
          </select>

          {/* Show pickup date in PH time */}
          {pickupDate && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <span className="font-medium text-blue-800">
                Pickup Date: {formatDate(pickupDate, 'MMMM dd, yyyy (EEEE)')} (PH Time)
              </span>
              <br />
              <span className="text-sm text-blue-600">
                Estimated Duration: {actualEstimatedDuration} minutes → Scheduled Duration: {roundUpDuration(actualEstimatedDuration)} minutes
              </span>
              <br />
              <span className="text-xs text-blue-500">
                (Includes {BUFFER_MINUTES}-minute buffer between bookings)
              </span>
            </div>
          )}

          {selectedDriverId && availableBlocks.length > 0 && (
            <>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Available Time Slots (PH Time)</label>
                <select
                  className="w-full border p-2 rounded"
                  value={selectedTimeSlot}
                  onChange={(e) => {
                    setSelectedTimeSlot(e.target.value)
                    setError('')
                  }}
                  disabled={isAssigning}
                >
                  <option value="">-- Choose Time Slot --</option>
                  {timeSlotOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.display}
                    </option>
                  ))}
                </select>
                {timeSlotOptions.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No available time slots for the selected driver on this date.
                  </p>
                )}
              </div>

              {/* Show driver's availability blocks for reference */}
              <div className="mb-4">
                <label className="block mb-2 font-medium text-gray-600">Driver's Available Hours</label>
                <div className="text-sm text-gray-500 space-y-1">
                  {availableBlocks.map((block) => {
                    const utcStart = new Date(block.start_time + 'Z')
                    const utcEnd = new Date(block.end_time + 'Z')
                    
                    const phStart = utcToZonedTime(utcStart, TIMEZONE)
                    const phEnd = utcToZonedTime(utcEnd, TIMEZONE)
                    
                    const formattedStart = formatDate(phStart, 'h:mm a')
                    const formattedEnd = formatDate(phEnd, 'h:mm a')

                    return (
                      <div key={block.id}>
                        {formattedStart} – {formattedEnd}
                      </div>
                    )
                  })}
                </div>
              </div>

              {existingTimeSlots.length > 0 && (
                <div className="mb-4">
                  <label className="block mb-2 font-medium text-orange-600">Existing Bookings</label>
                  <div className="text-sm text-gray-600 space-y-1">
                    {existingTimeSlots.map((slot) => {
                      const slotStartStr = slot.start_time.endsWith('Z') ? slot.start_time : slot.start_time + 'Z'
                      const slotEndStr = slot.end_time.endsWith('Z') ? slot.end_time : slot.end_time + 'Z'
                      
                      const slotStartUTC = new Date(slotStartStr)
                      const slotEndUTC = new Date(slotEndStr)
                      const slotStartPH = utcToZonedTime(slotStartUTC, TIMEZONE)
                      const slotEndPH = utcToZonedTime(slotEndUTC, TIMEZONE)
                      
                      return (
                        <div key={slot.id} className="flex justify-between bg-red-50 p-2 rounded">
                          <span>
                            {formatDate(slotStartPH, 'h:mm a')} – {formatDate(slotEndPH, 'h:mm a')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {slot.order_id ? 'Order' : 'Slot'} ({slot.status})
                          </span>
                        </div>
                      )
                    })}
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
              selectedDriverId && selectedTimeSlot && !isAssigning
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={!selectedDriverId || !selectedTimeSlot || isAssigning}
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