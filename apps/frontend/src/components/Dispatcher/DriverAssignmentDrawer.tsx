'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

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

type Order = {
  start_time: string
  end_time: string
}

export default function DriverAssignmentDrawer({
  orderId,
  estimatedDurationMins,
  onClose,
}: {
  orderId: string
  estimatedDurationMins: number
  onClose: () => void
}) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [availableBlocks, setAvailableBlocks] = useState<AvailabilityBlock[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [pickupDate, setPickupDate] = useState<Date | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('pickup_date')
        .eq('id', orderId)
        .single()

      if (!error && data?.pickup_date) {
        setPickupDate(new Date(`${data.pickup_date}T08:00:00+08:00`))
      }
    }

    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_pic')
        .eq('role', 'driver')

      if (!error) setDrivers(data || [])
    }

    fetchOrder()
    fetchDrivers()
  }, [orderId])

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDriverId || !pickupDate) return

      const { data: availabilities, error } = await supabase
        .from('driver_availability')
        .select('id, start_time, end_time')
        .eq('driver_id', selectedDriverId)

      if (error || !availabilities) return

      const pickupStart = new Date(pickupDate)
      pickupStart.setHours(0, 0, 0, 0)

      const pickupEnd = new Date(pickupDate)
      pickupEnd.setHours(23, 59, 59, 999)

      const blocksForPickupDate = availabilities.filter((block) => {
        const start = new Date(block.start_time)
        const end = new Date(block.end_time)
        return start < pickupEnd && end > pickupStart
      })

      const { data: existingOrders } = await supabase
        .from('orders')
        .select('pickup_time, estimated_total_duration')
        .eq('driver_id', selectedDriverId)
        .eq('pickup_date', format(pickupDate, 'yyyy-MM-dd'))

      const busyTimes: Order[] = (existingOrders || []).map((o) => {
        const start = new Date(`${format(pickupDate, 'yyyy-MM-dd')}T${o.pickup_time}`)
        const end = new Date(start.getTime() + (o.estimated_total_duration || 0) * 60000)
        return { start_time: start.toISOString(), end_time: end.toISOString() }
      })

      const bufferMins = estimatedDurationMins <= 30 ? 20 : 30
      const totalMinsNeeded = estimatedDurationMins + bufferMins
      const stepMins = 15

      const freeBlocks = blocksForPickupDate.flatMap((block) => {
        const rawStart = new Date(block.start_time)
        const rawEnd = new Date(block.end_time)

        const start = new Date(Math.max(rawStart.getTime(), pickupStart.getTime()))
        const end = new Date(Math.min(rawEnd.getTime(), pickupEnd.getTime()))

        let freeSlots: { start: Date; end: Date }[] = [{ start, end }]

        busyTimes.forEach(({ start_time, end_time }) => {
          const busyStart = new Date(start_time)
          const busyEnd = new Date(end_time)

          freeSlots = freeSlots.flatMap((slot) => {
            if (busyEnd <= slot.start || busyStart >= slot.end) {
              return [slot]
            } else if (busyStart <= slot.start && busyEnd >= slot.end) {
              return []
            } else if (busyStart <= slot.start) {
              return [{ start: busyEnd, end: slot.end }]
            } else if (busyEnd >= slot.end) {
              return [{ start: slot.start, end: busyStart }]
            } else {
              return [
                { start: slot.start, end: busyStart },
                { start: busyEnd, end: slot.end },
              ]
            }
          })
        })

        return freeSlots.flatMap((slot) => {
          const slotStart = slot.start
          const slotEnd = slot.end
          const results: AvailabilityBlock[] = []

          for (
            let s = new Date(slotStart);
            s.getTime() + totalMinsNeeded * 60000 <= slotEnd.getTime();
            s = new Date(s.getTime() + stepMins * 60000)
          ) {
            const e = new Date(s.getTime() + totalMinsNeeded * 60000)
            results.push({
              id: `${block.id}-${s.toISOString()}`,
              start_time: s.toISOString(),
              end_time: e.toISOString(),
            })
          }

          return results
        })
      })

      const sorted = freeBlocks.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )

      setAvailableBlocks(sorted)
    }

    fetchAvailability()
  }, [selectedDriverId, pickupDate, estimatedDurationMins])

  const handleAssign = async () => {
    if (!selectedDriverId || !selectedBlockId) return

    const { error } = await supabase
      .from('orders')
      .update({ driver_id: selectedDriverId })
      .eq('id', orderId)

    if (error) console.error('❌ Failed to assign driver:', error)
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-end">
      <div className="bg-white p-6 w-full max-w-md h-full overflow-y-auto shadow-lg rounded-l-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">🧑‍✈️ Assign Driver</h2>
          <button onClick={onClose} className="text-lg font-bold text-gray-600 hover:text-red-600">✖</button>
        </div>

        <label className="block mb-2 font-medium">Select Driver</label>
        <select
          className="w-full border p-2 rounded mb-4"
          value={selectedDriverId || ''}
          onChange={(e) => {
            setSelectedDriverId(e.target.value)
            setAvailableBlocks([])
            setSelectedBlockId(null)
          }}
        >
          <option value="">-- Choose Driver --</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.first_name} {d.last_name}
            </option>
          ))}
        </select>

        {availableBlocks.length > 0 && (
          <>
            <label className="block mb-2 font-medium">Available Time Blocks</label>
            <select
              className="w-full border p-2 rounded mb-4"
              value={selectedBlockId || ''}
              onChange={(e) => setSelectedBlockId(e.target.value)}
            >
              <option value="">-- Choose Time Slot --</option>
              {availableBlocks.map((b) => {
                const start = new Date(b.start_time)
                const end = new Date(b.end_time)

                return (
                  <option key={b.id} value={b.id}>
                    {format(start, 'hh:mm a')} – {format(end, 'hh:mm a')}
                  </option>
                )
              })}
            </select>
          </>
        )}

        <button
          onClick={handleAssign}
          className={`w-full py-2 rounded text-white ${
            selectedDriverId && selectedBlockId
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
          disabled={!selectedDriverId || !selectedBlockId}
        >
          🚚 Assign Driver
        </button>
      </div>
    </div>
  )
}
