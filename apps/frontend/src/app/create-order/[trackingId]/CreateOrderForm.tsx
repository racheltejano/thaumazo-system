'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import axios from 'axios'
import Image from 'next/image'

type Dropoff = {
  name: string
  address: string
  contact: string
  phone: string
  latitude?: number
  longitude?: number
}

type Product = {
  name: string
  quantity: number
}

type ClientForm = {
  client_type: 'first_time' | 'returning'
  client_pin?: string
  business_name?: string
  contact_person: string
  contact_number: string
  email?: string
  pickup_address: string
  landmark?: string
  pickup_area?: string
  pickup_date?: string
  truck_type?: string
  tail_lift_required?: boolean
  special_instructions?: string
  estimated_cost?: number
  pickup_latitude?: number
  pickup_longitude?: number
}


export default function CreateOrderForm({ trackingId }: { trackingId: string }) {
  const [form, setForm] = useState<ClientForm>({
    client_type: 'first_time',
    client_pin: '',
    business_name: '',
    contact_person: '',
    contact_number: '',
    email: '',
    pickup_address: '',
    landmark: '',
    pickup_area: '',
    pickup_date: '',
    truck_type: '',
    tail_lift_required: false,
    special_instructions: '',
    estimated_cost: 2500,
  })

  const [products, setProducts] = useState<Product[]>([{ name: '', quantity: 1 }])
  const [dropoffs, setDropoffs] = useState<Dropoff[]>([{ name: '', address: '', contact: '', phone: '' }])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  const getMapboxMapUrl = (lat: number, lon: number) =>
  `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lon},${lat})/${lon},${lat},16/600x200?access_token=${mapboxToken}`


  useEffect(() => {
    const fetchClient = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tracking_id', trackingId)
        .single()

      if (data && !error) {
        setForm(prev => ({
          ...prev,
          client_type: data.client_type,
          contact_person: data.contact_person,
          contact_number: data.contact_number,
          email: data.email,
          pickup_address: data.pickup_address,
          landmark: data.landmark,
          pickup_area: data.pickup_area,
          pickup_latitude: data.pickup_latitude,
          pickup_longitude: data.pickup_longitude,
        }))
      }

      setLoading(false)
    }

    fetchClient()
  }, [trackingId])

  useEffect(() => {
    const updateCoords = async () => {
      if (form.pickup_address) {
        const coords = await geocodeAddress(form.pickup_address)
        if (coords) {
          setForm(prev => ({
            ...prev,
            pickup_latitude: coords.lat,
            pickup_longitude: coords.lon,
          }))
        }
      }
    }

    updateCoords()
  }, [form.pickup_address])

  useEffect(() => {
    dropoffs.forEach(async (d, i) => {
      if (!d.address) return
      const coords = await geocodeAddress(d.address)
      if (coords) {
        setDropoffs(prev => {
          const updated = [...prev]
          updated[i].latitude = coords.lat
          updated[i].longitude = coords.lon
          return updated
        })
      }
    })
  }, [dropoffs.map(d => d.address).join(',')])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const updateProduct = <K extends keyof Product>(i: number, key: K, val: Product[K]) => {
    const updated = [...products]
    updated[i][key] = val
    setProducts(updated)
  }

  const updateDropoff = <K extends keyof Dropoff>(i: number, key: K, val: Dropoff[K]) => {
    const updated = [...dropoffs]
    updated[i][key] = val
    setDropoffs(updated)
  }

  const addDropoff = () => setDropoffs([...dropoffs, { name: '', address: '', contact: '', phone: '' }])
  const addProduct = () => setProducts([...products, { name: '', quantity: 1 }])

  const geocodeAddress = async (address: string) => {
  if (!address) return null
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    )
    if (res.data && res.data.length > 0) {
      return {
        lat: parseFloat(res.data[0].lat),
        lon: parseFloat(res.data[0].lon),
      }
    }
  } catch (error) {
    console.warn('Geocoding failed', error)
  }
  return null
}


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const pickupCoords = await geocodeAddress(form.pickup_address)

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .upsert({
        tracking_id: trackingId,
        client_type: form.client_type,
        client_pin: form.client_pin,
        business_name: form.business_name,
        contact_person: form.contact_person,
        contact_number: form.contact_number,
        email: form.email,
        pickup_address: form.pickup_address,
        landmark: form.landmark,
        pickup_area: form.pickup_area,
        pickup_latitude: pickupCoords?.lat,
        pickup_longitude: pickupCoords?.lon,
      })
      .select('id')
      .single()

    if (!client || clientError) {
      setError('❌ Failed to save client.')
      return
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: client.id,
        pickup_date: form.pickup_date,
        vehicle_type: form.truck_type,
        tail_lift_required: form.tail_lift_required,
        special_instructions: form.special_instructions,
        estimated_cost: form.estimated_cost,
        status: 'order_placed',
      })
      .select('id')
      .single()

    if (!order || orderError) {
      setError('❌ Failed to create order.')
      return
    }

    const dropoffEntries = await Promise.all(
      dropoffs.map(async d => {
        const coords = await geocodeAddress(d.address)
        return {
          order_id: order.id,
          dropoff_name: d.name,
          dropoff_address: d.address,
          dropoff_contact: d.contact,
          dropoff_phone: d.phone,
          latitude: coords?.lat,
          longitude: coords?.lon,
        }
      })
    )

    const productEntries = products.map(p => ({
      order_id: order.id,
      product_name: p.name,
      quantity: p.quantity,
    }))

    await supabase.from('order_dropoffs').insert(dropoffEntries)
    await supabase.from('order_products').insert(productEntries)

    await supabase.functions.invoke('notify_dispatch', { body: { tracking_id: trackingId } })

    setSubmitted(true)
  }



  if (loading) return <p className="p-6">Loading...</p>
  if (submitted) return <p className="p-6 text-green-600">✅ Order submitted successfully!</p>

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">📦 Create Order</h1>
      {error && <p className="text-red-600">{error}</p>}

      {/* Section: Contact Info */}
      <fieldset className="border p-4 rounded">
        <legend className="font-semibold">🧍 Client Info</legend>
        <input name="business_name" value={form.business_name || ''} onChange={handleChange} placeholder="Business Name" className="border p-2 w-full my-2" />
        <input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="Contact Person" className="border p-2 w-full my-2" />
        <input name="contact_number" value={form.contact_number} onChange={handleChange} placeholder="Contact Number" className="border p-2 w-full my-2" />
        <input name="email" value={form.email || ''} onChange={handleChange} placeholder="Email" className="border p-2 w-full my-2" />
      </fieldset>

      {/* Section: Pickup */}
      <fieldset className="border p-4 rounded">
        <legend className="font-semibold">📍 Pickup</legend>
        <input name="pickup_address" value={form.pickup_address} onChange={handleChange} placeholder="Pickup Address" className="border p-2 w-full my-2" />
       {form.pickup_latitude && form.pickup_longitude && (
          <div className="relative w-full h-40 mt-2 rounded overflow-hidden shadow">
            <Image
              src={getMapboxMapUrl(form.pickup_latitude, form.pickup_longitude)}
              alt="Map preview"
              layout="fill"
              objectFit="cover"
            />
          </div>
        )}


        <input name="pickup_area" value={form.pickup_area || ''} onChange={handleChange} placeholder="Pickup Area" className="border p-2 w-full my-2" />
        <input name="landmark" value={form.landmark || ''} onChange={handleChange} placeholder="Landmark" className="border p-2 w-full my-2" />
        <input name="pickup_date" type="date" value={form.pickup_date} onChange={handleChange} className="border p-2 w-full my-2" />
      </fieldset>

      {/* Section: Products */}
      <fieldset className="border p-4 rounded">
        <legend className="font-semibold">📦 Products</legend>
        {products.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} placeholder="Product Name" className="border p-2 w-full" />
            <input type="number" value={p.quantity} onChange={e => updateProduct(i, 'quantity', +e.target.value)} placeholder="Qty" className="border p-2 w-24" />
          </div>
        ))}
        <button type="button" onClick={addProduct} className="text-blue-600">+ Add Product</button>
      </fieldset>

      {/* Section: Drop-offs */}
      <fieldset className="border p-4 rounded">
        <legend className="font-semibold">📍 Drop-offs</legend>
        {dropoffs.map((d, i) => (
          <div key={i} className="space-y-2 border rounded p-3 mb-4">
            <input value={d.name} onChange={e => updateDropoff(i, 'name', e.target.value)} placeholder="Recipient Name" className="border p-2 w-full" />
            <input value={d.address} onChange={e => updateDropoff(i, 'address', e.target.value)} placeholder="Address" className="border p-2 w-full" />
            <input value={d.contact} onChange={e => updateDropoff(i, 'contact', e.target.value)} placeholder="Contact Person" className="border p-2 w-full" />
            <input value={d.phone} onChange={e => updateDropoff(i, 'phone', e.target.value)} placeholder="Phone" className="border p-2 w-full" />
          </div>
        ))}
        <button type="button" onClick={addDropoff} className="text-blue-600">+ Add Drop-off</button>
      </fieldset>

      {/* Section: Logistics */}
      <fieldset className="border p-4 rounded">
        <legend className="font-semibold">🚛 Logistics</legend>
        <select name="truck_type" value={form.truck_type} onChange={handleChange} className="border p-2 w-full my-2">
          <option value="">Select Truck Type</option>
          <option value="van">Van</option>
          <option value="6-wheeler">6-Wheeler</option>
          <option value="10-ton truck">10-Ton Truck</option>
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="tail_lift_required" checked={form.tail_lift_required || false} onChange={handleChange} />
          Tail Lift Required
        </label>
        <textarea name="special_instructions" value={form.special_instructions || ''} onChange={handleChange} placeholder="Special Instructions" className="border p-2 w-full my-2" />
        <p className="text-sm text-gray-600">Estimated Cost: ₱{form.estimated_cost?.toFixed(2)}</p>
      </fieldset>

      <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">🚀 Submit Order</button>
    </form>
  )
}
