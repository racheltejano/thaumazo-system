'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Dropoff = {
  name: string
  address: string
  contact: string
  phone: string
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
  const [clientVerified, setClientVerified] = useState(false)
  const [verificationNeeded, setVerificationNeeded] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClient = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tracking_id', trackingId)
        .single()

      if (!error && data) {
        if (data.client_type === 'returning') {
          setVerificationNeeded(true)
          setForm(prev => ({ ...prev, client_type: 'returning' }))
        } else {
          setForm(prev => ({
            ...prev,
            contact_person: data.contact_person,
            contact_number: data.contact_number,
            email: data.email,
            pickup_address: data.pickup_address,
            landmark: data.landmark,
            pickup_area: data.pickup_area,
          }))
        }
      }
      setLoading(false)
    }

    fetchClient()
  }, [trackingId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleVerify = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('tracking_id', trackingId)
      .eq('client_pin', form.client_pin)
      .single()

    if (!error && data) {
      setForm(prev => ({
        ...prev,
        client_pin: data.client_pin,
        contact_person: data.contact_person,
        contact_number: data.contact_number,
        email: data.email,
        pickup_address: data.pickup_address,
        landmark: data.landmark,
        pickup_area: data.pickup_area,
      }))
      setClientVerified(true)
    } else {
      setError('❌ Invalid PIN. Please try again.')
    }
  }

  const addDropoff = () => setDropoffs([...dropoffs, { name: '', address: '', contact: '', phone: '' }])
  const updateDropoff = (i: number, field: keyof Dropoff, value: string) => {
    const updated = [...dropoffs]
    updated[i][field] = value
    setDropoffs(updated)
  }

  const addProduct = () => setProducts([...products, { name: '', quantity: 1 }])
  const updateProduct = (i: number, field: keyof Product, value: string | number) => {
    const updated = [...products]
    updated[i][field] = field === 'quantity' ? Number(value) : value
    setProducts(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
      })
      .select('id')
      .single()

    if (clientError || !client) {
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

    if (orderError || !order) {
      setError('❌ Failed to create order.')
      return
    }

    const dropoffData = dropoffs.map(d => ({
      order_id: order.id,
      dropoff_name: d.name,
      dropoff_address: d.address,
      dropoff_contact: d.contact,
      dropoff_phone: d.phone,
    }))

    const productData = products.map(p => ({
      order_id: order.id,
      product_name: p.name,
      quantity: p.quantity,
    }))

    const { error: dropErr } = await supabase.from('order_dropoffs').insert(dropoffData)
    const { error: prodErr } = await supabase.from('order_products').insert(productData)

    if (dropErr || prodErr) {
      setError('❌ Failed to save drop-offs or products.')
      return
    }

    await supabase.functions.invoke('notify_dispatch', { body: { tracking_id: trackingId } })
    setSubmitted(true)
  }

  if (loading) return <p>Loading...</p>
  if (submitted) return <p className="p-6 text-green-600">✅ Order submitted successfully.</p>

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">🚚 Create Order</h1>
      {error && <p className="text-red-500">{error}</p>}

      {/* Radio Buttons for Client Type */}
      <div className="flex gap-4">
        <label><input type="radio" name="client_type" value="first_time" checked={form.client_type === 'first_time'} onChange={handleChange} /> First-time</label>
        <label><input type="radio" name="client_type" value="returning" checked={form.client_type === 'returning'} onChange={handleChange} /> Returning</label>
      </div>

      {form.client_type === 'returning' && !clientVerified && (
        <>
          <input name="client_pin" value={form.client_pin} onChange={handleChange} placeholder="🔐 Enter PIN" className="border p-2 w-full" required />
          <button type="button" onClick={handleVerify} className="bg-blue-600 text-white px-4 py-2 rounded">Verify</button>
        </>
      )}

      {(form.client_type === 'first_time' || clientVerified) && (
        <>
          <input name="business_name" placeholder="Business Name" value={form.business_name} onChange={handleChange} className="border p-2 w-full" />
          <input name="contact_person" placeholder="Contact Person" value={form.contact_person} onChange={handleChange} className="border p-2 w-full" />
          <input name="contact_number" placeholder="Contact Number" value={form.contact_number} onChange={handleChange} className="border p-2 w-full" />
          <input name="email" placeholder="Email (optional)" value={form.email} onChange={handleChange} className="border p-2 w-full" />

          <input name="pickup_address" placeholder="Pickup Address" value={form.pickup_address} onChange={handleChange} className="border p-2 w-full" />
          <input name="pickup_area" placeholder="Area/Zone" value={form.pickup_area} onChange={handleChange} className="border p-2 w-full" />
          <input name="landmark" placeholder="Landmark (optional)" value={form.landmark} onChange={handleChange} className="border p-2 w-full" />
          <input name="pickup_date" type="date" value={form.pickup_date} onChange={handleChange} className="border p-2 w-full" />

          <h3 className="font-medium mt-4">🧾 Products</h3>
          {products.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} placeholder="Product Name" className="border p-2 w-full" />
              <input type="number" value={p.quantity} onChange={e => updateProduct(i, 'quantity', e.target.value)} placeholder="Qty" className="border p-2 w-24" />
            </div>
          ))}
          <button type="button" onClick={addProduct} className="text-blue-600">+ Add Product</button>

          <select name="truck_type" value={form.truck_type} onChange={handleChange} className="border p-2 w-full mt-2">
            <option value="">Select Truck</option>
            <option value="van">Van</option>
            <option value="6-wheeler">6-Wheeler</option>
            <option value="10-ton truck">10-ton Truck</option>
          </select>
          <label className="block mt-2">
            <input type="checkbox" name="tail_lift_required" checked={form.tail_lift_required || false} onChange={handleChange} /> Tail Lift Needed
          </label>

          <textarea name="special_instructions" placeholder="Special Instructions" value={form.special_instructions} onChange={handleChange} className="border p-2 w-full" />
          <p>Estimated Cost: ₱{form.estimated_cost?.toFixed(2)}</p>

          <h3 className="font-medium mt-4">📍 Drop-Offs</h3>
          {dropoffs.map((d, i) => (
            <div key={i} className="border p-3 rounded space-y-2">
              <input value={d.name} onChange={e => updateDropoff(i, 'name', e.target.value)} placeholder="Recipient Name" className="border p-2 w-full" />
              <input value={d.address} onChange={e => updateDropoff(i, 'address', e.target.value)} placeholder="Address" className="border p-2 w-full" />
              <input value={d.contact} onChange={e => updateDropoff(i, 'contact', e.target.value)} placeholder="Contact Person" className="border p-2 w-full" />
              <input value={d.phone} onChange={e => updateDropoff(i, 'phone', e.target.value)} placeholder="Phone" className="border p-2 w-full" />
            </div>
          ))}
          <button type="button" onClick={addDropoff} className="text-blue-600 mt-2">+ Add Another Drop-off</button>

          <button type="submit" className="w-full mt-6 bg-green-600 text-white py-2 rounded hover:bg-green-700">🚀 Submit Order</button>
        </>
      )}
    </form>
  )
}
