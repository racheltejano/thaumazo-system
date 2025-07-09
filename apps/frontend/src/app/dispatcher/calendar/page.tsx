'use client'

import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment-timezone'
import { supabase } from '@/lib/supabase'
import 'react-big-calendar/lib/css/react-big-calendar.css'
<<<<<<< Updated upstream
=======
import DashboardLayout from '@/components/DashboardLayout'
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
      alert(`✅ ${data.message}`)
      window.location.reload()
    } catch (err: any) {
      console.error('Auto-assign failed:', err)
      alert(`❌ ${err.message}`)
    } finally {
      setAssigning(false)
    }
=======
    alert(`✅ ${data.message}`)
    window.location.reload()
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Auto-assign failed:', err)
      alert(`❌ Auto-assign failed: ${err.message}`)
    } else {
      console.error('Auto-assign failed:', err)
      alert('❌ Auto-assign failed: An unknown error occurred.')
    }
  } finally {
    setAssigning(false)
>>>>>>> Stashed changes
  }


  if (loading) return <p className="p-6">Loading calendar...</p>

return (
    <DashboardLayout role="dispatcher" userName="Dispatcher">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header + View Selector */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-2xl font-bold text-black">🚛 Driver Availability Calendar</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-black">View:</label>
            <select
              value={currentView}
              onChange={(e) => setCurrentView(e.target.value as View)}
              className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-black"
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
          </div>
        </div>

        {/* Content Container */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Unassigned Orders Sidebar */}
          <div className="w-full lg:w-1/3 bg-white border rounded-2xl shadow p-4 space-y-4">
            <h2 className="text-lg font-semibold text-black">📦 Unassigned Orders</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">All orders are assigned!</p>
            ) : (
              <>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {orders.map(o => (
                    <div
                      key={o.id}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-3"
                    >
                      <p className="text-sm font-medium text-black">
                        Pickup: {o.pickup_date} @ {o.pickup_time}
                      </p>
                      <p className="text-xs text-gray-600">
                        {o.special_instructions || 'No special instructions'}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAutoAssign}
                  disabled={assigning}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 rounded-md transition disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Auto-Assign Orders'}
                </button>
              </>
            )}
          </div>

          {/* Calendar */}
          <div className="w-full lg:w-2/3 h-[650px] bg-white rounded-2xl shadow border overflow-hidden">
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
        </div>
      </div>
    </DashboardLayout>
  )
}