'use client'

import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment-timezone'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Set moment's default timezone to Asia/Manila
moment.tz.setDefault('Asia/Manila')

const localizer = momentLocalizer(moment)

type DriverEvent = {
  title: string
  start: Date
  end: Date
}

const events: DriverEvent[] = [
  {
    title: 'Driver Alex - Available',
    start: new Date(2025, 6, 2, 9, 0),
    end: new Date(2025, 6, 2, 17, 0),
  },
  {
    title: 'Driver Bea - Out of Office',
    start: new Date(2025, 6, 3, 10, 0),
    end: new Date(2025, 6, 3, 12, 0),
  },
  {
    title: 'Driver Chris - Morning Shift',
    start: new Date(2025, 6, 4, 8, 0),
    end: new Date(2025, 6, 4, 12, 0),
  },
]

export default function DispatcherCalendarPage() {
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
