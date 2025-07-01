'use client'

import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment-timezone'
import { supabase } from '@/lib/supabase'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Set timezone
moment.tz.setDefault('Asia/Manila')
const localizer = momentLocalizer(moment)

type DriverEvent = {
  title: string
  start: Date
  end: Date
}

export default function DispatcherCalendarPage() {
  const [events, setEvents] = useState<DriverEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<View>('week') // 🧠 Controlled view

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('driver_availability')
        .select('title, start_time, end_time')

      if (error) {
        console.error('❌ Failed to fetch events:', error)
        return
      }

      const formatted = (data || []).map(e => ({
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
      }))

      setEvents(formatted)
      setLoading(false)
    }

    fetchEvents()
  }, [])

  if (loading) return <p className="p-6">Loading calendar...</p>

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">🚛 Driver Availability Calendar</h1>

      {/* 🔽 View Selector */}
      <div className="flex items-center gap-2">
        <label className="font-medium">View:</label>
        <select
          value={currentView}
          onChange={(e) => setCurrentView(e.target.value as View)}
          className="border p-2 rounded"
        >
          <option value="month">Month</option>
          <option value="week">Week</option>
          <option value="day">Day</option>
        </select>
      </div>

      <div className="h-[600px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={['month', 'week', 'day']}
          view={currentView}
          onView={(view) => setCurrentView(view)}
          style={{ height: '100%' }}
        />
      </div>
    </main>
  )
}
