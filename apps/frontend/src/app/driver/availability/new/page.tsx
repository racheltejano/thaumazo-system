'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { addDays, startOfWeek, endOfWeek, format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

const SHIFT_PRESETS = {
  morning: { label: 'Morning (8AM–12PM)', start: '08:00', end: '12:00', hours: 4 },
  afternoon: { label: 'Afternoon (1PM–5PM)', start: '13:00', end: '17:00', hours: 4 },
  night: { label: 'Night (8PM–12AM)', start: '20:00', end: '00:00', hours: 4 },
  graveyard: { label: 'Graveyard (8PM–5AM)', start: '20:00', end: '05:00', hours: 9 },
  full_day: { label: 'Full Day (8AM–5PM)', start: '08:00', end: '17:00', hours: 9 },
}

const UNAVAILABLE_REASONS = ['vl', 'sl', 'ooo']
const TIME_SLOT_INTERVAL_MINUTES = 30

type DayEntry = {
  day: string
  shift: keyof typeof SHIFT_PRESETS | ''
  available: boolean
  unavailableReason?: string
}

// Helper function to create UTC date from PH time (proper timezone conversion)
function createUTCFromPHTime(dateString: string, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number)
  const [year, month, day] = dateString.split('-').map(Number)
  
  // PH is UTC+8, so PH 00:00 = UTC 16:00 previous day
  // We need to subtract 8 from PH time to get UTC
  let utcHours = hours - 8
  let utcDay = day
  
  if (utcHours < 0) {
    utcHours += 24
    utcDay -= 1
  }
  
  const utcDate = new Date(Date.UTC(year, month - 1, utcDay, utcHours, minutes, 0, 0))
  return utcDate
}

// Helper function to generate 30-minute time slots
function generateTimeSlots(startTime: Date, endTime: Date, driverId: string, availabilityId: string) {
  const slots = []
  let currentSlotStart = new Date(startTime)
  
  while (currentSlotStart < endTime) {
    const currentSlotEnd = new Date(currentSlotStart.getTime() + TIME_SLOT_INTERVAL_MINUTES * 60 * 1000)
    
    // Don't create a slot if it would exceed the end time
    if (currentSlotEnd > endTime) {
      break
    }
    
    slots.push({
      id: uuidv4(),
      driver_id: driverId,
      driver_availability_id: availabilityId,
      order_id: null,
      start_time: currentSlotStart.toISOString(),
      end_time: currentSlotEnd.toISOString(),
      start_time_tz: currentSlotStart.toISOString(),
      end_time_tz: currentSlotEnd.toISOString(),
      status: 'available',
    })
    
    currentSlotStart = currentSlotEnd
  }
  
  return slots
}

export default function DriverAvailabilityForm() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekData, setWeekData] = useState<DayEntry[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingEntriesCount, setExistingEntriesCount] = useState(0)
  const [checkingExisting, setCheckingExisting] = useState(false)

  useEffect(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      return {
        day: date.toISOString().split('T')[0],
        shift: '',
        available: true,
        unavailableReason: '',
      }
    })
    setWeekData(days as DayEntry[])
    
    // Check for existing entries when week changes
    checkExistingEntries(weekStart)
  }, [selectedDate])

  const checkExistingEntries = async (weekStart: Date) => {
    setCheckingExisting(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setCheckingExisting(false)
      return
    }

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    
    // Convert week boundaries to UTC
    const weekStartUTC = createUTCFromPHTime(format(weekStart, 'yyyy-MM-dd'), '00:00')
    const weekEndUTC = createUTCFromPHTime(format(weekEnd, 'yyyy-MM-dd'), '23:59')

    const { data, error } = await supabase
      .from('driver_availability')
      .select('id')
      .eq('driver_id', user.id)
      .gte('start_time', weekStartUTC.toISOString())
      .lte('start_time', weekEndUTC.toISOString())

    if (!error && data) {
      setExistingEntriesCount(data.length)
    } else {
      setExistingEntriesCount(0)
    }
    
    setCheckingExisting(false)
  }

  const handleShiftChange = (day: string, value: keyof typeof SHIFT_PRESETS | '') => {
    setWeekData(prev =>
      prev.map(d =>
        d.day === day ? { ...d, shift: value, available: true, unavailableReason: '' } : d
      )
    )
  }

  const handleAvailabilityToggle = (day: string, isAvailable: boolean) => {
    setWeekData(prev =>
      prev.map(d =>
        d.day === day
          ? {
              ...d,
              available: isAvailable,
              shift: isAvailable ? d.shift : '',
              unavailableReason: isAvailable ? '' : d.unavailableReason,
            }
          : d
      )
    )
  }

  const handleReasonChange = (day: string, reason: string) => {
    setWeekData(prev =>
      prev.map(d => (d.day === day ? { ...d, unavailableReason: reason } : d))
    )
  }

  const totalHours = weekData.reduce((acc, d) => {
    if (d.available && d.shift) {
      const shift = SHIFT_PRESETS[d.shift]
      return acc + shift.hours
    }
    return acc
  }, 0)

  const handleSubmit = async () => {
  setMessage('')
  setLoading(true)

  if (totalHours < 20) {
    setMessage('❌ Please schedule at least 20 hours this week.')
    setLoading(false)
    return
  }

  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) {
    setMessage('❌ You must be logged in to submit availability.')
    setLoading(false)
    return
  }

  // Step 1: Delete existing entries for this week using the actual days in weekData
  const firstDay = weekData[0].day // First day of the week (Monday)
  const lastDay = weekData[6].day // Last day of the week (Sunday)
  
  // Convert to UTC - from start of first day to start of day after last day
  const weekStartUTC = createUTCFromPHTime(firstDay, '00:00')
  const dayAfterLastDay = new Date(lastDay)
  dayAfterLastDay.setDate(dayAfterLastDay.getDate() + 1)
  const weekEndUTC = createUTCFromPHTime(dayAfterLastDay.toISOString().split('T')[0], '00:00')

  console.log('🗑️ Deleting entries between:')
  console.log('   First day:', firstDay, '→ UTC:', weekStartUTC.toISOString())
  console.log('   Last day:', lastDay, '→ Next day UTC:', weekEndUTC.toISOString())

  const { error: deleteError, count } = await supabase
    .from('driver_availability')
    .delete({ count: 'exact' })
    .eq('driver_id', user.id)
    .gte('start_time', weekStartUTC.toISOString())
    .lt('start_time', weekEndUTC.toISOString())

  console.log(`🗑️ Deleted ${count} existing entries`)

  if (deleteError) {
    setMessage(`❌ Failed to clear existing entries: ${deleteError.message}`)
    setLoading(false)
    return
  }

    // Step 2: Insert new availability entries
    const entries = weekData.map(d => {
      const shift = SHIFT_PRESETS[d.shift as keyof typeof SHIFT_PRESETS]
      
      let startTime: Date
      let endTime: Date
      
      if (d.available && shift) {
        startTime = createUTCFromPHTime(d.day, shift.start)
        console.log('📅 Day:', d.day)
        console.log('⏰ PH Time:', shift.start)
        console.log('🌍 UTC Time:', startTime.toISOString())
        console.log('---')
        
        // Handle shifts that end on the next day (midnight or graveyard)
        if (shift.end === '00:00' || (shift.start > shift.end)) {
          const nextDay = new Date(d.day)
          nextDay.setDate(nextDay.getDate() + 1)
          endTime = createUTCFromPHTime(nextDay.toISOString().split('T')[0], shift.end)
        } else {
          endTime = createUTCFromPHTime(d.day, shift.end)
        }
      } else {
        startTime = createUTCFromPHTime(d.day, '00:00')
        endTime = createUTCFromPHTime(d.day, '00:00')
      }
      
      return {
        id: uuidv4(),
        driver_id: user.id,
        title: d.available ? shift?.label || '' : `Unavailable - ${d.unavailableReason?.toUpperCase()}`,
        start_time: startTime,
        end_time: endTime,
      }
    })

    const { data: insertedAvailability, error: insertError } = await supabase
      .from('driver_availability')
      .insert(entries)
      .select('id, start_time, end_time')

    if (insertError) {
      setMessage(`❌ Failed to submit availability: ${insertError.message}`)
      setLoading(false)
      return
    }

    if (!insertedAvailability || insertedAvailability.length === 0) {
      setMessage('❌ No availability data was inserted')
      setLoading(false)
      return
    }

    // Step 3: Generate and insert time slots for each availability entry
    const allTimeSlots = []
    
    for (let i = 0; i < insertedAvailability.length; i++) {
      const availability = insertedAvailability[i]
      const dayEntry = weekData[i]
      
      // Only create time slots for available days with shifts
      if (dayEntry.available && dayEntry.shift) {
        // note time slots does auto convert ph to UTC so need to do this
        const startTimeTemp = new Date(availability.start_time)
        const startTime = new Date(startTimeTemp.getTime() + 8*60*60*1000)
        const endTimeTemp = new Date(availability.end_time)
        const endTime = new Date(endTimeTemp.getTime() + 8*60*60*1000)

        console.log('🎯 Generating slots for:', dayEntry.day)
        console.log('   Start:', startTime.toISOString(), '(PH:', new Date(startTime.getTime() + 8*60*60*1000).toISOString(), ')')
        console.log('   End:', endTime.toISOString(), '(PH:', new Date(endTime.getTime() + 8*60*60*1000).toISOString(), ')')
      
        
        const slots = generateTimeSlots(
          startTime,
          endTime,
          user.id,
          availability.id
        )

        console.log('   First slot:', slots[0]?.start_time)
        console.log('   Last slot:', slots[slots.length-1]?.end_time)
        console.log('   Total slots:', slots.length)
        
        allTimeSlots.push(...slots)
      }
    }

    if (allTimeSlots.length > 0) {
      const { error: slotsError } = await supabase
        .from('driver_time_slots')
        .insert(allTimeSlots)

      if (slotsError) {
        console.error('Failed to create time slots:', slotsError)
        setMessage(`⚠️ Availability saved but time slots failed: ${slotsError.message}`)
        setLoading(false)
        return
      }

      console.log(`✅ Created ${allTimeSlots.length} time slots`)
    }

    setMessage(`✅ Availability submitted successfully! Created ${allTimeSlots.length} time slots.`)
    setExistingEntriesCount(entries.length)
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-black">📅 Driver Availability</h1>
        <p className="text-sm text-gray-500">
          Please schedule at least <span className="font-semibold">20 hours</span> this week.
          <br />
          <span className="text-xs text-gray-400">Times are in Philippine Time (UTC+8) • 30-min time slots</span>
        </p>
      </div>

      <div className="mb-6 text-center">
        <label className="block mb-2 text-sm font-medium text-gray-700">Select Week</label>
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        
        {checkingExisting ? (
          <p className="text-xs text-gray-400 mt-2">Checking for existing entries...</p>
        ) : existingEntriesCount > 0 ? (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            ⚠️ You have {existingEntriesCount} existing entries for this week. Submitting will replace them and regenerate time slots.
          </p>
        ) : (
          <p className="text-xs text-green-600 mt-2">
            ✓ No existing entries for this week
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {weekData.map((d, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow p-4 border border-gray-200 space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-700">
              {new Date(d.day).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </h2>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={d.available}
                onChange={(e) => handleAvailabilityToggle(d.day, e.target.checked)}
                className="accent-orange-500"
              />
              Available
            </label>

            {d.available ? (
              <>
                <select
                  value={d.shift}
                  onChange={(e) =>
                    handleShiftChange(d.day, e.target.value as keyof typeof SHIFT_PRESETS)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">-- Select Shift --</option>
                  {Object.entries(SHIFT_PRESETS).map(([key, s]) => (
                    <option key={key} value={key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {d.shift && (
                  <p className="text-xs text-gray-500">
                    {SHIFT_PRESETS[d.shift].hours * 2} time slots will be created
                  </p>
                )}
              </>
            ) : (
              <select
                value={d.unavailableReason}
                onChange={(e) => handleReasonChange(d.day, e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">-- Unavailable Reason --</option>
                {UNAVAILABLE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r === 'vl'
                      ? 'Vacation Leave'
                      : r === 'sl'
                      ? 'Sick Leave'
                      : 'Out of Office'}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-right text-sm text-gray-600">
        Total Scheduled: <span className="font-semibold">{totalHours} hrs</span>
        <span className="text-xs text-gray-500 ml-2">
          ({totalHours * 2} time slots)
        </span>
      </div>

      {message && (
        <div className={`mt-4 text-center text-sm font-medium ${
          message.includes('✅') ? 'text-green-600' : 
          message.includes('⚠️') ? 'text-amber-600' : 'text-red-600'
        }`}>
          {message}
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? 'Submitting...' : existingEntriesCount > 0 ? 'Update Availability & Time Slots' : 'Submit Availability'}
        </button>
      </div>
    </div>
  )
}