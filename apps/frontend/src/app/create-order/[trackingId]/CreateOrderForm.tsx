'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import dayjs from 'dayjs'
import { createSupabaseWithTracking } from '@/lib/supabase'

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
  const supabase = createSupabaseWithTracking(trackingId)
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
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  const getMapboxMapUrl = (lat: number, lon: number) =>
    `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lon},${lat})/${lon},${lat},16/600x200?access_token=${mapboxToken}`

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${info}`])
    console.log(info)
  }

  useEffect(() => {
    const fetchClient = async () => {
      addDebugInfo(`Fetching client with tracking ID: ${trackingId}`)
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tracking_id', trackingId)
        .single()

      if (error) {
        addDebugInfo(`Error fetching client: ${error.message}`)
      } else if (data) {
        addDebugInfo(`Client found: ${JSON.stringify(data)}`)
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
      } else {
        addDebugInfo('No client data found')
      }

      setLoading(false)
    }

    fetchClient()
  }, [trackingId])

    const handlePickupBlur = async () => {
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

 const handleDropoffBlur = async (index: number, address: string) => {
  if (!address) return

  const coords = await geocodeAddress(address)
  if (!coords) {
    addDebugInfo(`❌ Geocoding failed for drop-off #${index + 1}`)
    return
  }

  setDropoffs(prev => {
    const updated = [...prev]
    updated[index] = {
      ...updated[index],
      latitude: coords.lat,
      longitude: coords.lon,
    }
    return updated
  })

  addDebugInfo(`✅ Geocoded drop-off #${index + 1}: ${coords.lat}, ${coords.lon}`)
}



useEffect(() => {
  const checkHeader = async () => {
    const { data, error } = await supabase.rpc('show_tracking_header')
    console.log('👀 HEADER DEBUG:', data, error)
  }
  checkHeader()
}, [])


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
    setDebugInfo([])

    addDebugInfo('Starting order submission...')

    // Validation
    if (!form.contact_person.trim()) {
      setError('Contact person is required')
      return
    }
    if (!form.contact_number.trim()) {
      setError('Contact number is required')
      return
    }
    if (!form.pickup_address.trim()) {
      setError('Pickup address is required')
      return
    }
    if (!form.pickup_date) {
      setError('Pickup date is required')
      return
    }
    if (!form.truck_type) {
      setError('Truck type is required')
      return
    }

    const pickupCoords = {
      lat: form.pickup_latitude,
      lon: form.pickup_longitude,
    }
    addDebugInfo(`Pickup coordinates: ${JSON.stringify(pickupCoords)}`)

    
    // Validate drop-offs
    for (let i = 0; i < dropoffs.length; i++) {
      const d = dropoffs[i]
      if (!d.address.trim()) {
        setError(`Drop-off #${i + 1} is missing an address.`)
        return
      }
      if (!d.contact.trim() && !d.phone.trim()) {
        setError(`Drop-off #${i + 1} must have either a contact name or a phone.`)
        return
      }
    }

    // Step 1: Upsert client
    addDebugInfo('Upserting client...')
    const clientData = {
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
    }

    addDebugInfo(`Client data: ${JSON.stringify(clientData)}`)

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .upsert(clientData, { onConflict: 'tracking_id' })
      .select('id')
      .single()

    if (clientError) {
      addDebugInfo(`Client error: ${JSON.stringify(clientError)}`)
      setError(`❌ Failed to save client: ${clientError.message}`)
      return
    }

    if (!client) {
      addDebugInfo('No client returned from upsert')
      setError('❌ Failed to save client - no data returned')
      return
    }

    addDebugInfo(`Client saved with ID: ${client.id}`)

    // Step 2: Create order
    addDebugInfo('Creating order...')
    const orderData = {
      client_id: client.id,
      pickup_date: form.pickup_date,
      vehicle_type: form.truck_type,
      tail_lift_required: form.tail_lift_required || false,
      special_instructions: form.special_instructions,
      estimated_cost: form.estimated_cost,
      status: 'order_placed',
      tracking_id: trackingId,
      estimated_total_duration: null,
      estimated_end_time: null,
    }


    addDebugInfo(`Order data: ${JSON.stringify(orderData)}`)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id')
      .single()

    if (orderError) {
      addDebugInfo(`Order error: ${JSON.stringify(orderError)}`)
      setError(`❌ Failed to create order: ${orderError.message}`)
      return
    }

    if (!order) {
      addDebugInfo('No order returned from insert')
      setError('❌ Failed to create order - no data returned')
      return
    }

    addDebugInfo(`Order created with ID: ${order.id}`)

    // Step 3: Create dropoffs
    addDebugInfo('Creating dropoffs...')
    const dropoffEntries = await Promise.all(
  dropoffs.filter(d => d.address.trim()).map(async d => {
    const coords = d.latitude && d.longitude
      ? { lat: d.latitude, lon: d.longitude }
      : await geocodeAddress(d.address)

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


    if (dropoffEntries.length > 0) {
      const { error: dropoffError } = await supabase
        .from('order_dropoffs')
        .insert(dropoffEntries)

      if (dropoffError) {
        addDebugInfo(`Dropoff error: ${JSON.stringify(dropoffError)}`)
      } else {
        addDebugInfo(`${dropoffEntries.length} dropoffs created`)
      }
    }

    // Step 4: Create products
    addDebugInfo('Creating products...')
    const productEntries = products.filter(p => p.name.trim()).map(p => ({
      order_id: order.id,
      product_name: p.name,
      quantity: p.quantity,
    }))

    if (productEntries.length > 0) {
      const { error: productError } = await supabase
        .from('order_products')
        .insert(productEntries)

      if (productError) {
        addDebugInfo(`Product error: ${JSON.stringify(productError)}`)
      } else {
        addDebugInfo(`${productEntries.length} products created`)
      }
    }

    // Step 5: Notify dispatch 
    // Step 4.5: Estimate delivery durations
    addDebugInfo('Estimating delivery durations...')

const allCoordsValid = [
  form.pickup_latitude,
  form.pickup_longitude,
  ...dropoffs.flatMap(d => [d.latitude, d.longitude])
].every(Boolean)

if (!allCoordsValid) {
  addDebugInfo('❌ Skipping duration estimation — missing coordinates')
  return
}

try {
  const allPoints = [
    [form.pickup_longitude!, form.pickup_latitude!],
    ...dropoffs.map(d => [d.longitude!, d.latitude!]),
  ]

  const waypoints = allPoints.map(([lon, lat]) => `${lon},${lat}`).join(';')

  const res = await axios.get(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}`,
    {
      params: {
        access_token: mapboxToken,
        geometries: 'geojson',
        overview: 'full',
        annotations: 'duration',
      },
    }
  )

  const route = res.data.routes[0]
  const durationSeconds = route.duration
  const estimatedTotalDuration = Math.round(durationSeconds / 60)
  const estimatedEndTime = dayjs().add(estimatedTotalDuration, 'minute').toISOString()

  addDebugInfo(`Total estimated duration: ${estimatedTotalDuration} mins`)
  addDebugInfo(`Estimated end time: ${estimatedEndTime}`)

  await supabase.from('orders').update({
    estimated_total_duration: estimatedTotalDuration,
    estimated_end_time: estimatedEndTime,
  }).eq('id', order.id)

  const legs = route.legs || []
  const dropoffDurations = legs.slice(1).map((leg: { duration: number }) => Math.round(leg.duration / 60))


  await Promise.all(
    dropoffs.map((dropoff, i) => {
      const duration = dropoffDurations[i] || null
      return supabase
        .from('order_dropoffs')
        .update({ estimated_duration_mins: duration })
        .match({
          order_id: order.id,
          dropoff_address: dropoff.address,
        })
    })
  )

} catch (error) {
  console.warn('❌ Failed to fetch Mapbox directions:', error)
  addDebugInfo('❌ Failed to calculate directions from Mapbox')
}



    addDebugInfo('Order submission completed successfully!')
    setSubmitted(true)
  }

  if (loading) return <p className="p-6">Loading...</p>
  if (submitted) return (
    <div className="p-6">
    <p className="text-green-600 text-xl mb-4">✅ Order submitted successfully!</p>
    </div>
  )

  return (
  <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">📦 Create Order</h1>

      {error && <p className="text-red-600 font-semibold">{error}</p>}

      {debugInfo.length > 0 && (
        <div className="bg-gray-100 p-4 rounded text-sm">
          <h3 className="font-semibold mb-2 text-gray-800">Debug Info:</h3>
          <div className="font-mono max-h-40 overflow-y-auto space-y-1 text-gray-700">
            {debugInfo.map((info, i) => (
              <div key={i}>{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* Client Info */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg text-gray-800">🧍 Client Info</legend>
        <input name="business_name" value={form.business_name || ''} onChange={handleChange} placeholder="Business Name" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
        <input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="Contact Person*" className="border border-gray-400 p-3 w-full rounded text-gray-900" required />
        <input name="contact_number" value={form.contact_number} onChange={handleChange} placeholder="Contact Number*" className="border border-gray-400 p-3 w-full rounded text-gray-900" required />
        <input name="email" value={form.email || ''} onChange={handleChange} placeholder="Email" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
      </fieldset>

      {/* Pickup Info */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg text-gray-800">📍 Pickup Info</legend>
        <input name="pickup_address" value={form.pickup_address} onChange={handleChange} onBlur={handlePickupBlur} placeholder="Pickup Address*" className="border border-gray-400 p-3 w-full rounded text-gray-900" required />
        {form.pickup_latitude && form.pickup_longitude && (
          <div className="relative w-full h-40 mt-2 rounded overflow-hidden shadow">
            <Image src={getMapboxMapUrl(form.pickup_latitude, form.pickup_longitude)} alt="Pickup Map" layout="fill" objectFit="cover" />
          </div>
        )}
        <input name="pickup_area" value={form.pickup_area || ''} onChange={handleChange} placeholder="Pickup Area" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
        <input name="landmark" value={form.landmark || ''} onChange={handleChange} placeholder="Landmark" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
        <input type="date" name="pickup_date" value={form.pickup_date} onChange={handleChange} className="border border-gray-400 p-3 w-full rounded text-gray-900" required />
      </fieldset>

      {/* Products */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg text-gray-800">📦 Products</legend>
        {products.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} placeholder="Product Name" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
            <input type="number" value={p.quantity} onChange={e => updateProduct(i, 'quantity', +e.target.value)} placeholder="Qty" className="border border-gray-400 p-3 w-24 rounded text-gray-900" />
          </div>
        ))}
        <button type="button" onClick={addProduct} className="text-orange-600 hover:underline">+ Add Product</button>
      </fieldset>

      {/* Drop-offs */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg text-gray-800">📍 Drop-offs</legend>
        {dropoffs.map((d, i) => (
          <div key={i} className="bg-gray-50 p-4 rounded border border-gray-300 shadow space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm text-gray-700">Drop-off #{i + 1}</h3>
              {dropoffs.length > 1 && (
                <button type="button" onClick={() => setDropoffs(dropoffs.filter((_, idx) => idx !== i))} className="text-sm text-red-600 hover:underline">❌ Remove</button>
              )}
            </div>
            <input value={d.name} onChange={e => updateDropoff(i, 'name', e.target.value)} placeholder="Recipient Name" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
            <input value={d.address} onChange={e => updateDropoff(i, 'address', e.target.value)} onBlur={e => handleDropoffBlur(i, e.target.value)} placeholder="Address*" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
            {d.latitude && d.longitude && (
              <div className="relative w-full h-40 my-2 rounded overflow-hidden shadow">
                <Image src={getMapboxMapUrl(d.latitude, d.longitude)} alt="Drop-off Map" layout="fill" objectFit="cover" />
              </div>
            )}
            <input value={d.contact} onChange={e => updateDropoff(i, 'contact', e.target.value)} placeholder="Contact Person" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
            <input value={d.phone} onChange={e => updateDropoff(i, 'phone', e.target.value)} placeholder="Phone" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
          </div>
        ))}
        <button type="button" onClick={addDropoff} className="text-orange-600 hover:underline">+ Add Drop-off</button>
      </fieldset>

      {/* Logistics */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg text-gray-800">🚛 Logistics</legend>
        <select name="truck_type" value={form.truck_type} onChange={handleChange} className="border border-gray-400 p-3 w-full rounded text-gray-900" required>
          <option value="">Select Truck Type*</option>
          <option value="van">Van</option>
          <option value="6-wheeler">6-Wheeler</option>
          <option value="10-ton truck">10-Ton Truck</option>
        </select>
        <label className="flex items-center gap-2 text-gray-800">
          <input type="checkbox" name="tail_lift_required" checked={form.tail_lift_required || false} onChange={handleChange} />
          Tail Lift Required
        </label>
        <textarea name="special_instructions" value={form.special_instructions || ''} onChange={handleChange} placeholder="Special Instructions" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
        <p className="text-sm text-gray-700">Estimated Cost: ₱{form.estimated_cost?.toFixed(2)}</p>
      </fieldset>

      <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded shadow">
        🚀 Submit Order
      </button>
    </form>
  </div>
);



}