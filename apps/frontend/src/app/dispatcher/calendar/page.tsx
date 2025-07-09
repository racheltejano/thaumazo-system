'use client'

import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment-timezone'
import { supabase } from '@/lib/supabase'
import 'react-big-calendar/lib/css/react-big-calendar.css'

moment.tz.setDefault('Asia/Manila')
const localizer = momentLocalizer(moment)

type DriverEvent = {
  title: string
  start: Date
  end: Date
}

type Order = {
  id: string
  pickup_date: string
  pickup_time: string
  delivery_window_start: string | null
  delivery_window_end: string | null
  special_instructions: string
  client_id: string
  status: string
}

export default function DispatcherCalendarPage() {
  const [events, setEvents] = useState<DriverEvent[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [currentView, setCurrentView] = useState<View>('week')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
  const fetchData = async () => {
    setLoading(true);

    const { data: availabilityData, error: availError } = await supabase
      .from('driver_availability')
      .select('title, start_time, end_time');

    console.log('📦 Driver availability:', availabilityData);

    const { data: unassignedOrders, error: orderError } = await supabase
      .from('orders')
      .select(
        'id, pickup_date, pickup_time, delivery_window_start, delivery_window_end, special_instructions, client_id, status'
      )
      .eq('status', 'order_placed');

    if (availError || orderError) {
      console.error('❌ Supabase error:', availError || orderError);
      return;
    }

    const formattedEvents: DriverEvent[] = (availabilityData || []).map((e) => ({
      title: e.title || 'Driver Available',
      start: new Date(e.start_time + 'Z'), // ✅ Convert safely
      end: new Date(e.end_time + 'Z'),     // ✅ Convert safely
    }));

    console.log('📅 Formatted calendar events:', formattedEvents); // ✅ Log to verify

    setEvents(formattedEvents);
    setOrders(unassignedOrders || []);
    setLoading(false);
  };

  fetchData();
}, []);


  const handleAutoAssign = async () => {
    setAssigning(true)

    try {
      const res = await fetch('/api/auto-assign', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Auto-assign failed')

      alert(`✅ ${data.message}`)
      window.location.reload()
    } catch (err: any) {
      console.error('Auto-assign failed:', err)
      alert(`❌ ${err.message}`)
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return <p className="p-6">Loading calendar...</p>

  return (
    <main className="h-screen flex bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside className="w-1/5 border-r bg-white p-4 overflow-y-auto shadow-md">
        <h2 className="text-lg font-semibold mb-4">📦 Unassigned Orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">All orders are assigned!</p>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div
                key={o.id}
                className="bg-gray-100 rounded-md p-3 shadow-sm border border-gray-200"
              >
                <p className="text-sm font-medium">
                  Pickup: {o.pickup_date} @ {o.pickup_time}
                </p>
                <p className="text-xs text-gray-600">
                  {o.special_instructions || 'No special instructions'}
                </p>
              </div>
            ))}
            <button
              onClick={handleAutoAssign}
              disabled={assigning}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-md transition disabled:opacity-50"
            >
              {assigning ? 'Assigning...' : 'Auto-Assign Orders'}
            </button>
          </div>
        )}
      </aside>

      {/* Main Calendar */}
      <section className="w-4/5 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">🚛 Driver Availability Calendar</h1>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">View:</label>
            <select
              value={currentView}
              onChange={(e) => setCurrentView(e.target.value as View)}
              className="border rounded-md px-3 py-1 text-sm"
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
          </div>
        </div>

        <div className="h-[85%] bg-white rounded-lg shadow border overflow-hidden">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={currentView}
            onView={(view) => setCurrentView(view)}
            style={{ height: '100%' }}
          />
        </div>
      </section>
    </main>
  )
}
