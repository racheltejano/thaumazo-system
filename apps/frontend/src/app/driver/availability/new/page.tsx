'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { addDays, startOfWeek, format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

const SHIFT_PRESETS = {
  morning: { label: 'Morning (8AM–12PM)', start: '08:00', end: '12:00', hours: 4 },
  afternoon: { label: 'Afternoon (1PM–5PM)', start: '13:00', end: '17:00', hours: 4 },
  night: { label: 'Night (8PM–12AM)', start: '20:00', end: '00:00', hours: 4 },
  full_day: { label: 'Full Day (8AM–5PM)', start: '08:00', end: '17:00', hours: 9 },
}

const UNAVAILABLE_REASONS = ['vl', 'sl', 'ooo']

type DayEntry = {
  day: string
  shift: keyof typeof SHIFT_PRESETS | ''
  available: boolean
  unavailableReason?: string
}

export default function DriverAvailabilityForm() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekData, setWeekData] = useState<DayEntry[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
  }, [selectedDate])

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

    const entries = weekData.map(d => {
      const shift = SHIFT_PRESETS[d.shift as keyof typeof SHIFT_PRESETS]
      return {
        id: uuidv4(),
        driver_id: user.id,
        title: d.available ? shift?.label || '' : `Unavailable - ${d.unavailableReason?.toUpperCase()}`,
        start_time: new Date(`${d.day}T${d.available ? shift?.start : '00:00'}:00+08:00`),
        end_time: new Date(`${d.day}T${d.available ? shift?.end : '00:00'}:00+08:00`),

      }
    })

    const { error: insertError } = await supabase.from('driver_availability').insert(entries)
    if (insertError) {
      setMessage(`❌ Failed to submit: ${insertError.message}`)
    } else {
      setMessage('✅ Availability submitted successfully!')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black">📅 Driver Availability</h1>
          <p className="text-sm text-gray-500">
            Please schedule at least <span className="font-semibold">20 hours</span> this week.
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
        </div>

        {message && (
          <div className="mt-4 text-center text-sm font-medium text-red-600">
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Availability'}
          </button>
        </div>
      </div>
    )
}
