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
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex justify-end">
        <div className="bg-gradient-to-br from-white to-gray-50 w-full max-w-lg h-full overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 p-6 shadow-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-gray-300/50 p-2 rounded-full">
                  <span className="text-2xl">🧑‍✈️</span>
                </div>
                <h2 className="text-lg font-bold">Assign Driver</h2>
              </div>
              <button 
                onClick={onClose} 
                className="bg-gray-300/50 hover:bg-gray-400/50 p-2 rounded-full transition-colors duration-200"
              >
                <span className="text-xl font-bold">✖</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">Select Driver</label>
              <select
                className="w-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-4 rounded-xl text-sm transition-all duration-200 bg-white shadow-sm"
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
            </div>

            {/* Show pickup date in PH time */}
            {pickupDate && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-5 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">📅</span>
                  <span className="font-bold text-blue-900 text-sm">
                    {formatDate(pickupDate, 'MMMM dd, yyyy (EEEE)')}
                  </span>
                </div>
                <div className="text-blue-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Estimated Duration:</span>
                    <span className="bg-blue-100 px-3 py-1 rounded-full text-sm font-semibold">
                      {actualEstimatedDuration} minutes
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Scheduled Duration:</span>
                    <span className="bg-green-100 px-3 py-1 rounded-full text-sm font-semibold text-green-700">
                      {roundUpDuration(actualEstimatedDuration)} minutes
                    </span>
                  </div>
                  <div className="text-xs text-blue-500 mt-2 italic">
                    * Includes {BUFFER_MINUTES}-minute buffer between bookings
                  </div>
                </div>
              </div>
            )}

            {selectedDriverId && availableBlocks.length > 0 && (
              <>
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center space-x-2">
                    <span>⏰</span>
                    <span>Available Time Slots</span>
                  </label>
                  <select
                    className="w-full border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-4 rounded-xl text-sm transition-all duration-200 bg-white shadow-sm"
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
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">⚠️</span>
                        <p className="text-yellow-700 font-medium">
                          No available time slots for the selected driver on this date.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Show driver's availability blocks for reference */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-xl">🕐</span>
                    <h3 className="font-semibold text-gray-700">Driver's Available Hours</h3>
                  </div>
                  <div className="grid gap-2">
                    {availableBlocks.map((block) => {
                      const utcStart = new Date(block.start_time + 'Z')
                      const utcEnd = new Date(block.end_time + 'Z')
                      
                      const phStart = utcToZonedTime(utcStart, TIMEZONE)
                      const phEnd = utcToZonedTime(utcEnd, TIMEZONE)
                      
                      const formattedStart = formatDate(phStart, 'h:mm a')
                      const formattedEnd = formatDate(phEnd, 'h:mm a')

                      return (
                        <div key={block.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                          <span className="font-medium text-gray-800">
                            {formattedStart} – {formattedEnd}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {existingTimeSlots.length > 0 && (
                  <div className="bg-red-50 p-5 rounded-xl border border-red-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-xl">🚫</span>
                      <h3 className="font-semibold text-red-700">Existing Bookings</h3>
                    </div>
                    <div className="grid gap-2">
                      {existingTimeSlots.map((slot) => {
                        const slotStartStr = slot.start_time.endsWith('Z') ? slot.start_time : slot.start_time + 'Z'
                        const slotEndStr = slot.end_time.endsWith('Z') ? slot.end_time : slot.end_time + 'Z'
                        
                        const slotStartUTC = new Date(slotStartStr)
                        const slotEndUTC = new Date(slotEndStr)
                        const slotStartPH = utcToZonedTime(slotStartUTC, TIMEZONE)
                        const slotEndPH = utcToZonedTime(slotEndUTC, TIMEZONE)
                        
                        return (
                          <div key={slot.id} className="bg-white p-3 rounded-lg border-l-4 border-red-400 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-800">
                                {formatDate(slotStartPH, 'h:mm a')} – {formatDate(slotEndPH, 'h:mm a')}
                              </span>
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                {slot.order_id ? 'Order' : 'Slot'} ({slot.status})
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">x</span>
                      <p className="text-red-700 font-medium">{error}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedDriverId && availableBlocks.length === 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-5 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📭</span>
                  <p className="text-amber-700 font-medium">
                    No availability blocks found for this driver on the selected date.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={handleAssign}
                className={`w-full py-4 rounded-xl text-white font-bold text-sm transition-all duration-300 shadow-lg transform ${
                  selectedDriverId && selectedTimeSlot && !isAssigning
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:scale-105 active:scale-95'
                    : 'bg-gray-400 cursor-not-allowed opacity-60'
                }`}
                disabled={!selectedDriverId || !selectedTimeSlot || isAssigning}
              >
                {isAssigning ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Assigning...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-xl">🚚</span>
                    <span>Assign Driver</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-pulse">
            <div className="text-center">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h3 className="text-lg font-bold mb-4 text-green-600">Success!</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">{popupMessage}</p>
              <button
                onClick={handleSuccessPopupClose}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Perfect!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-pulse">
            <div className="text-center">
              <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">x</span>
              </div>
              <h3 className="text-lg font-bold mb-4 text-red-600">Error</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">{popupMessage}</p>
              <button
                onClick={handleErrorPopupClose}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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
