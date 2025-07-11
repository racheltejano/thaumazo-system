'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export type Order = {
  id: string
  pickup_date: string
  pickup_time: string
  delivery_window_start: string | null
  delivery_window_end: string | null
  special_instructions: string
  client_id: string
  status: string
}

export type Client = {
  tracking_id: string
  business_name: string
  contact_person: string
  contact_number: string
  email: string | null
  pickup_address: string
  landmark: string | null
  pickup_area: string | null
  pickup_latitude: number | null
  pickup_longitude: number | null
}

export default function OrderDetailsModal({
  order,
  onClose,
}: {
  order: Order
  onClose: () => void
}) {
  const [client, setClient] = useState<Client | null>(null)
  const [dropoffs, setDropoffs] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    const fetchClient = async () => {
      if (!order.client_id) return
      const { data, error } = await supabase
        .from('clients')
        .select(
          'tracking_id, business_name, contact_person, contact_number, email, pickup_address, landmark, pickup_area, pickup_latitude, pickup_longitude'
        )
        .eq('id', order.client_id)
        .single()

      if (error) console.error('❌ Failed to fetch client:', error)
      else setClient(data)
    }

    const fetchDropoffs = async () => {
      const { data, error } = await supabase
        .from('order_dropoffs')
        .select('id, dropoff_name, dropoff_address, dropoff_contact, dropoff_phone, sequence')
        .eq('order_id', order.id)
        .order('sequence', { ascending: true })

      if (error) console.error('❌ Failed to fetch dropoffs:', error)
      else setDropoffs(data || [])
    }

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('order_products')
        .select('quantity, products(name)')
        .eq('order_id', order.id)

      if (error) console.error('❌ Failed to fetch products:', error)
      else setProducts(data || [])
    }

    fetchClient()
    fetchDropoffs()
    fetchProducts()
  }, [order.id, order.client_id])

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/20 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-lg w-[95%] max-w-5xl overflow-y-auto max-h-[90vh] space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-xl font-bold">
            📝 Tracking ID: <span className="break-all">{client?.tracking_id || order.id}</span>
          </h2>
          <button onClick={onClose} className="text-red-500 text-xl font-bold">✖</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <h3 className="text-md font-semibold mb-2">👤 Client Details</h3>
            <p><strong>Business Name:</strong> {client?.business_name}</p>
            <p><strong>Contact Person:</strong> {client?.contact_person}</p>
            <p><strong>Contact Number:</strong> {client?.contact_number}</p>
            <p><strong>Email:</strong> {client?.email || 'N/A'}</p>
            <p><strong>Pickup Address:</strong> {client?.pickup_address}</p>
            <p><strong>Landmark:</strong> {client?.landmark || 'N/A'}</p>
            <p><strong>Pickup Area:</strong> {client?.pickup_area || 'N/A'}</p>
          </div>

          <div>
            <h3 className="text-md font-semibold mb-2">📅 Order Info</h3>
            <p><strong>Pickup Date:</strong> {order.pickup_date}</p>
            <p><strong>Pickup Time:</strong> {order.pickup_time || 'N/A'}</p>
            <p><strong>Delivery Window:</strong> {order.delivery_window_start || 'N/A'} – {order.delivery_window_end || 'N/A'}</p>
            <p><strong>Instructions:</strong> {order.special_instructions || 'None'}</p>
            {MAPBOX_TOKEN && client?.pickup_latitude && client?.pickup_longitude && (
              <img
                className="rounded-md mt-2 border"
                alt={`Map of ${client.pickup_address}`}
                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${client.pickup_longitude},${client.pickup_latitude})/${client.pickup_longitude},${client.pickup_latitude},15/500x250?access_token=${MAPBOX_TOKEN}`}
              />
            )}
          </div>
        </div>

        {products.length > 0 && (
          <div className="pt-2 border-t space-y-2 text-sm text-gray-800">
            <h3 className="text-md font-semibold">📦 Products</h3>
            <ul className="list-disc list-inside grid md:grid-cols-2 gap-x-4">
              {products.map((p, idx) => (
                <li key={idx}>
                  {p.products?.name || 'Unknown Product'} — Qty: {p.quantity}
                </li>
              ))}
            </ul>
          </div>
        )}

        {dropoffs.length > 0 && (
          <div className="pt-2 border-t space-y-2 text-sm text-gray-800">
            <h3 className="text-md font-semibold">📍 Drop-off Points</h3>
            <ul className="grid md:grid-cols-2 gap-3">
              {dropoffs.map((d, idx) => (
                <li key={idx} className="border p-3 rounded-md shadow-sm bg-gray-50">
                  <p><strong>🔢 Seq:</strong> {d.sequence}</p>
                  <p><strong>👤 Name:</strong> {d.dropoff_name}</p>
                  <p>
                    <strong>📍 Address:</strong>{' '}
                    <a
                      href={`/dropoff-images/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {d.dropoff_address}
                    </a>
                  </p>
                  <p><strong>📞 Contact:</strong> {d.dropoff_contact}</p>
                  <p><strong>📱 Phone:</strong> {d.dropoff_phone}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded-md mt-4"
        >
          Close
        </button>
      </div>
    </div>
  )
}
