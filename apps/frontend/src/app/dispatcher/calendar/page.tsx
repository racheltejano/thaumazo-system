'use client'

import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment-timezone'
import { supabase } from '@/lib/supabase'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Set timezone to Asia/Manila
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

  useEffect(() => {
  type RawEvent = {
    title: string
    start_time: string
    end_time: string
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('driver_availability')
      .select('title, start_time, end_time')

    if (error) {
      console.error('Failed to fetch events:', error)
      return
    }

    const formatted = (data as RawEvent[]).map(e => ({
      title: e.title,
      start: new Date(e.start_time),
      end: new Date(e.end_time),
    }))

    setEvents(formatted)
    setLoading(false)
  }

  fetchEvents()
}, [])


  if (loading) {
    return <div className="p-6">Loading calendar...</div>
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">🚛 Driver Availability Calendar</h1>
      <div className="h-[600px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView="week"
          views={['month', 'week', 'day']}
          style={{ height: '100%' }}
        />
      </div>
    </main>
  )
}
