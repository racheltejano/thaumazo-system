'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { addDays, startOfWeek } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

const SHIFT_PRESETS = {
  morning: { label: 'Morning (8AM–12PM)', start: '08:00', end: '12:00', hours: 4 },
  afternoon: { label: 'Afternoon (1PM–5PM)', start: '13:00', end: '17:00', hours: 4 },
  night: { label: 'Night (8PM–12AM)', start: '20:00', end: '00:00', hours: 4 },
  full_day: { label: 'Full Day (8AM–5PM)', start: '08:00', end: '17:00', hours: 9 },
}

const UNAVAILABLE_REASONS = ['vl', 'sl', 'ooo'] // vacation, sick, out of office

type DayEntry = {
  day: string
  shift: keyof typeof SHIFT_PRESETS | ''
  available: boolean
  unavailableReason?: string
}

export default function DriverAvailabilityForm() {
  const [weekData, setWeekData] = useState<DayEntry[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Set current week days
  useEffect(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      return {
        day: date.toISOString().split('T')[0], // YYYY-MM-DD
        shift: '',
        available: true,
        unavailableReason: '',
      }
    })
    setWeekData(days as DayEntry[])
  }, [])

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
        start_time: new Date(`${d.day}T${d.available ? shift?.start : '00:00'}`),
        end_time: new Date(`${d.day}T${d.available ? shift?.end : '00:00'}`),
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
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📆 Set Weekly Availability</h1>
      <p className="text-sm text-gray-500">Please select your shifts for this week (Minimum: 20 hours).</p>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Date</th>
            <th className="p-2">Available?</th>
            <th className="p-2">Shift</th>
            <th className="p-2">Reason (if Unavailable)</th>
          </tr>
        </thead>
        <tbody>
          {weekData.map((d, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{d.day}</td>
              <td className="p-2 text-center">
                <input
                  type="checkbox"
                  checked={d.available}
                  onChange={(e) => handleAvailabilityToggle(d.day, e.target.checked)}
                />
              </td>
              <td className="p-2">
                {d.available ? (
                  <select
                    value={d.shift}
                    onChange={(e) => handleShiftChange(d.day, e.target.value as keyof typeof SHIFT_PRESETS)}
                    className="border p-1 rounded w-full"
                  >
                    <option value="">-- Select Shift --</option>
                    {Object.entries(SHIFT_PRESETS).map(([key, s]) => (
                      <option key={key} value={key}>{s.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-gray-400 italic">Unavailable</span>
                )}
              </td>
              <td className="p-2">
                {!d.available && (
                  <select
                    value={d.unavailableReason}
                    onChange={(e) => handleReasonChange(d.day, e.target.value)}
                    className="border p-1 rounded w-full"
                  >
                    <option value="">-- Select Reason --</option>
                    {UNAVAILABLE_REASONS.map(r => (
                      <option key={r} value={r}>
                        {r === 'vl' ? 'Vacation Leave' : r === 'sl' ? 'Sick Leave' : 'Out of Office'}
                      </option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right text-sm text-gray-600">Total hours scheduled: {totalHours} hrs</div>

      {message && <div className="text-center text-sm mt-2 text-blue-600">{message}</div>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Availability'}
      </button>
    </main>
  )
}
