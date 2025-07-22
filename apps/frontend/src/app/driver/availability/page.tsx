'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfWeek, addDays, format, isToday, isPast } from 'date-fns'

type AvailabilityEntry = {
  id: string
  driver_id: string
  title: string
  start_time: string
  end_time: string
  created_at: string
}

type WeekView = {
  date: Date
  dateString: string
  dayName: string
  availability: AvailabilityEntry | null
  isToday: boolean
  isPast: boolean
}

export default function DriverAvailabilityView() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekData, setWeekData] = useState<WeekView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAvailability()
  }, [selectedDate])

  const fetchAvailability = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user || userError) {
        setError('You must be logged in to view availability.')
        setLoading(false)
        return
      }

      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 6)

      const { data, error: fetchError } = await supabase
        .from('driver_availability')
        .select('*')
        .eq('driver_id', user.id)
        .gte('start_time', weekStart.toISOString().split('T')[0])
        .lte('start_time', weekEnd.toISOString().split('T')[0])
        .order('start_time', { ascending: true })

      if (fetchError) {
        setError(`Failed to fetch availability: ${fetchError.message}`)
        setLoading(false)
        return
      }

      // Create week view with availability data
      const weekView: WeekView[] = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i)
        const dateString = date.toISOString().split('T')[0]
        const availability = data?.find(entry => 
          entry.start_time.split('T')[0] === dateString
        ) || null

        return {
          date,
          dateString,
          dayName: format(date, 'EEEE'),
          availability,
          isToday: isToday(date),
          isPast: isPast(date) && !isToday(date)
        }
      })

      setWeekData(weekView)
    } catch (err) {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (entry: AvailabilityEntry | null) => {
    if (!entry) return 'bg-gray-100 text-gray-500'
    if (entry.title.includes('Unavailable')) return 'bg-red-100 text-red-700'
    return 'bg-green-100 text-green-700'
  }

  const getStatusIcon = (entry: AvailabilityEntry | null) => {
    if (!entry) return '❌'
    if (entry.title.includes('Unavailable')) return '🚫'
    return '✅'
  }

  const formatTime = (timeString: string) => {
    // Convert UTC time to Philippine time (UTC+8)
    const utcDate = new Date(timeString)
    const phDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000))
    return format(phDate, 'h:mm a')
  }

  const getTotalHours = () => {
    return weekData.reduce((total, day) => {
      if (day.availability && !day.availability.title.includes('Unavailable')) {
        const start = new Date(day.availability.start_time)
        const end = new Date(day.availability.end_time)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        return total + hours
      }
      return total
    }, 0)
  }

  const deleteAvailability = async (id: string) => {
    if (!confirm('Are you sure you want to delete this availability entry?')) return

    const { error } = await supabase
      .from('driver_availability')
      .delete()
      .eq('id', id)

    if (error) {
      setError(`Failed to delete: ${error.message}`)
    } else {
      fetchAvailability() // Refresh the data
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading availability...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black">📋 My Availability</h1>
          <p className="text-sm text-gray-500">
            View and manage your scheduled availability
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

        {error && (
          <div className="mb-6 text-center text-sm font-medium text-red-600 bg-red-50 py-3 px-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weekData.map((day, i) => (
            <div
              key={i}
              className={`bg-white rounded-xl shadow p-4 border-2 space-y-4 ${
                day.isToday ? 'border-orange-400' : 'border-gray-200'
              } ${day.isPast ? 'opacity-75' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-700">
                  {format(day.date, 'EEEE')}
                </h2>
                {day.isToday && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                    Today
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-500">
                {format(day.date, 'MMM d, yyyy')}
              </p>

              <div className={`rounded-lg p-3 ${getStatusColor(day.availability)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(day.availability)}</span>
                  <span className="font-medium text-sm">
                    {day.availability ? day.availability.title : 'No availability set'}
                  </span>
                </div>

                {day.availability && !day.availability.title.includes('Unavailable') && (
                  <div className="text-xs">
                    <p>
                      <span className="font-medium">Time:</span>{' '}
                      {formatTime(day.availability.start_time)} - {formatTime(day.availability.end_time)}
                    </p>
                  </div>
                )}
              </div>

              {day.availability && (
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>
                    Added: {format(new Date(day.availability.created_at), 'MMM d, h:mm a')}
                  </span>
                  <button
                    onClick={() => deleteAvailability(day.availability!.id)}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-orange-50 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium">Total Scheduled Hours:</span>{' '}
                <span className="text-orange-600 font-bold">{getTotalHours().toFixed(1)} hrs</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Week of {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - {format(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1 rounded-md text-sm font-medium"
              >
                ← Previous Week
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1 rounded-md text-sm font-medium"
              >
                Next Week →
              </button>
            </div>
          </div>
        </div>

        {/* <div className="mt-6 text-center">
          <a
            href="/driver-availability-form"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full text-sm font-medium transition inline-block"
          >
            Add New Availability
          </a>
        </div> */}
      </div>
    )
}