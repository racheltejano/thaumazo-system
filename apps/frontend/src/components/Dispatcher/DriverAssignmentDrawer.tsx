'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format as formatDate } from 'date-fns'
import { zonedTimeToUtc, utcToZonedTime, format as tzFormat } from 'date-fns-tz'



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

const TIMEZONE = 'Asia/Manila'

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
    const fetchOrderAndDrivers = async () => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('pickup_date')
        .eq('id', orderId)
        .single()

      if (orderData?.pickup_date) {
        const manilaMidnight = zonedTimeToUtc(`${orderData.pickup_date}T00:00:00`, TIMEZONE)
        setPickupDate(manilaMidnight)
      }

      const { data: driversData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_pic')
        .eq('role', 'driver')

      if (driversData) setDrivers(driversData)
    }

    fetchOrderAndDrivers()
  }, [orderId])

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDriverId || !pickupDate) return

      const { data: availabilities } = await supabase
        .from('driver_availability')
        .select('id, start_time, end_time')
        .eq('driver_id', selectedDriverId)

      const { data: orders } = await supabase
        .from('orders')
        .select('pickup_time, estimated_total_duration')
        .eq('driver_id', selectedDriverId)
        .eq('pickup_date', formatDate(pickupDate, 'yyyy-MM-dd'))

      const busyTimes: Order[] = (orders || []).map((o) => {
        const start = zonedTimeToUtc(`${formatDate(pickupDate, 'yyyy-MM-dd')}T${o.pickup_time}`, TIMEZONE)
        const end = new Date(start.getTime() + (o.estimated_total_duration || 0) * 60000)
        return { start_time: start.toISOString(), end_time: end.toISOString() }
      })

      const dayStart = zonedTimeToUtc(`${formatDate(pickupDate, 'yyyy-MM-dd')}T00:00:00`, TIMEZONE)
      const dayEnd = zonedTimeToUtc(`${formatDate(pickupDate, 'yyyy-MM-dd')}T23:59:59`, TIMEZONE)

      const bufferMins = estimatedDurationMins <= 30 ? 20 : 30
      const totalMinsNeeded = estimatedDurationMins + bufferMins
      const stepMins = 15

      const blocks = (availabilities || [])
        .filter((b) => {
          const start = new Date(b.start_time)
          const end = new Date(b.end_time)
          return start < dayEnd && end > dayStart
        })
        .flatMap((block) => {
          const rawStart = new Date(block.start_time)
          const rawEnd = new Date(block.end_time)
          const start = new Date(Math.max(rawStart.getTime(), dayStart.getTime()))
          const end = new Date(Math.min(rawEnd.getTime(), dayEnd.getTime()))
          let freeSlots = [{ start, end }]

          busyTimes.forEach(({ start_time, end_time }) => {
            const busyStart = new Date(start_time)
            const busyEnd = new Date(end_time)

            freeSlots = freeSlots.flatMap((slot) => {
              if (busyEnd <= slot.start || busyStart >= slot.end) return [slot]
              if (busyStart <= slot.start && busyEnd >= slot.end) return []
              if (busyStart <= slot.start) return [{ start: busyEnd, end: slot.end }]
              if (busyEnd >= slot.end) return [{ start: slot.start, end: busyStart }]
              return [
                { start: slot.start, end: busyStart },
                { start: busyEnd, end: slot.end },
              ]
            })
          })

          return freeSlots.flatMap((slot) => {
            const results: AvailabilityBlock[] = []
            for (
              let s = new Date(slot.start);
              s.getTime() + totalMinsNeeded * 60000 <= slot.end.getTime();
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

      setAvailableBlocks(blocks.sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ))
    }

    fetchAvailability()
  }, [selectedDriverId, pickupDate, estimatedDurationMins])

  const handleAssign = async () => {
    if (!selectedDriverId || !selectedBlockId || !pickupDate) return
    const selected = availableBlocks.find((b) => b.id === selectedBlockId)
    if (!selected) return

    const pickupUTC = new Date(selected.start_time)
    const endUTC = new Date(selected.end_time)
    const durationMins = (endUTC.getTime() - pickupUTC.getTime()) / 60000

    const pickupTimeFormatted = tzFormat(utcToZonedTime(pickupUTC, TIMEZONE), 'HH:mm', { timeZone: TIMEZONE })
    const endTimeFormatted = tzFormat(utcToZonedTime(endUTC, TIMEZONE), 'HH:mm', { timeZone: TIMEZONE })

    const updates = {
      driver_id: selectedDriverId,
      pickup_time: pickupTimeFormatted,
      estimated_total_duration: durationMins,
      estimated_end_time: endTimeFormatted,
      status: 'driver_assigned',
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)

    if (error) {
      console.error('❌ Failed to assign driver:', error.message)
    } else {
      onClose()
    }
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
            <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
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
                const startLocal = utcToZonedTime(new Date(b.start_time), TIMEZONE)
                const endLocal = utcToZonedTime(new Date(b.end_time), TIMEZONE)
                return (
                  <option key={b.id} value={b.id}>
                    {tzFormat(startLocal, 'hh:mm a', { timeZone: TIMEZONE })} – {tzFormat(endLocal, 'hh:mm a', { timeZone: TIMEZONE })}
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
