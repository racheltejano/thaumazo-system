'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Dropoff = {
  name: string
  address: string
  contact: string
  phone: string
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
  product_name?: string
  quantity?: string
  delivery_type?: 'single' | 'multi'
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
    product_name: '',
    quantity: '',
    delivery_type: 'single',
    truck_type: '',
    tail_lift_required: false,
    special_instructions: '',
    estimated_cost: 2500,
  })

  const [dropoffs, setDropoffs] = useState<Dropoff[]>([{ name: '', address: '', contact: '', phone: '' }])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [verificationNeeded, setVerificationNeeded] = useState(false)
  const [clientVerified, setClientVerified] = useState(false)

  useEffect(() => {
    const fetchClient = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tracking_id', trackingId)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      if (data.client_type === 'returning') {
        setVerificationNeeded(true)
        setForm(prev => ({ ...prev, client_type: 'returning' }))
      } else {
        setForm(prev => ({
          ...prev,
          contact_person: data.contact_person || '',
          contact_number: data.contact_number || '',
          email: data.email || '',
          pickup_address: data.pickup_address || '',
          landmark: data.landmark || '',
          pickup_area: data.pickup_area || ''
        }))
      }

      setLoading(false)
    }

    fetchClient()
  }, [trackingId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setForm(prev => ({ ...prev, [name]: val }))
  }

  const handleDropoffChange = (i: number, key: keyof Dropoff, value: string) => {
    const updated = [...dropoffs]
    updated[i][key] = value
    setDropoffs(updated)
  }

  const addDropoff = () => {
    setDropoffs([...dropoffs, { name: '', address: '', contact: '', phone: '' }])
  }

  const handleVerify = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('tracking_id', trackingId)
      .eq('client_pin', form.client_pin)
      .single()

    if (error || !data) {
      setError('❌ Invalid PIN. Please try again.')
      return
    }

    setForm({
      ...form,
      client_pin: data.client_pin,
      contact_person: data.contact_person,
      contact_number: data.contact_number,
      email: data.email,
      pickup_address: data.pickup_address,
      landmark: data.landmark,
      pickup_area: data.pickup_area,
    })

    setClientVerified(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
        pickup_area: form.pickup_area
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
        status: 'order_placed'
      })
      .select('id')
      .single()

    if (orderError || !order) {
      setError('❌ Failed to create order.')
      return
    }

    const dropoffInsert = dropoffs.map(d => ({
      order_id: order.id,
      dropoff_name: d.name,
      dropoff_address: d.address,
      dropoff_contact: d.contact,
      dropoff_phone: d.phone
    }))

    const { error: dropError } = await supabase.from('order_dropoffs').insert(dropoffInsert)
    if (dropError) {
      setError('❌ Failed to add drop-offs.')
      return
    }

    await supabase.functions.invoke('notify_dispatch', { body: { tracking_id: trackingId } })
    setSubmitted(true)
  }

  if (loading) return <p className="p-4">Loading...</p>
  if (submitted) return (
    <main className="p-6 text-green-600 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-2">✅ Submitted!</h1>
      <p>Your order was successfully created.</p>
      <p className="mt-4 text-gray-500">Tracking ID: <code className="bg-gray-100 px-2 py-1 rounded">{trackingId}</code></p>
    </main>
  )

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">📋 Submit Order Information</h1>
      {error && <p className="text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Are you a returning client?</label>
          <div className="flex space-x-4">
            <label><input type="radio" name="client_type" value="first_time" checked={form.client_type === 'first_time'} onChange={() => { setForm(f => ({ ...f, client_type: 'first_time', client_pin: '' })); setVerificationNeeded(false) }} /> First-time</label>
            <label><input type="radio" name="client_type" value="returning" checked={form.client_type === 'returning'} onChange={() => setForm(f => ({ ...f, client_type: 'returning' }))} /> Returning</label>
          </div>
        </div>

        {form.client_type === 'returning' && verificationNeeded && !clientVerified && (
          <>
            <input name="client_pin" value={form.client_pin} onChange={handleChange} placeholder="🔐 Enter your PIN" className="w-full p-2 border rounded" required />
            <button type="button" onClick={handleVerify} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Verify Returning Client</button>
          </>
        )}

        {(form.client_type === 'first_time' || clientVerified) && (
          <>
            <input name="business_name" value={form.business_name} onChange={handleChange} placeholder="Business Name" className="w-full p-2 border rounded" />
            <input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="Contact Person" className="w-full p-2 border rounded" required />
            <input name="contact_number" value={form.contact_number} onChange={handleChange} placeholder="Contact Number" className="w-full p-2 border rounded" required />
            <input name="email" value={form.email} onChange={handleChange} placeholder="Email (optional)" className="w-full p-2 border rounded" />
            <input name="pickup_address" value={form.pickup_address} onChange={handleChange} placeholder="Pickup Address" className="w-full p-2 border rounded" required />
            <input name="pickup_area" value={form.pickup_area} onChange={handleChange} placeholder="Pickup Area (optional)" className="w-full p-2 border rounded" />
            <input name="landmark" value={form.landmark} onChange={handleChange} placeholder="Landmark (optional)" className="w-full p-2 border rounded" />
            <input name="pickup_date" type="date" value={form.pickup_date} onChange={handleChange} className="w-full p-2 border rounded" required />
            <input name="product_name" value={form.product_name} onChange={handleChange} placeholder="Product" className="w-full p-2 border rounded" />
            <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" className="w-full p-2 border rounded" />
            <select name="truck_type" value={form.truck_type} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="">Select Truck Type</option>
              <option value="10-ton truck">10-ton truck</option>
              <option value="6-wheeler">6-wheeler</option>
              <option value="van">Van</option>
            </select>
            <label><input type="checkbox" name="tail_lift_required" checked={form.tail_lift_required || false} onChange={handleChange} /> Tail Lift Required</label>
            <textarea name="special_instructions" value={form.special_instructions} onChange={handleChange} placeholder="Special Instructions" className="w-full p-2 border rounded" />
            <p>Estimated Cost: ₱{form.estimated_cost?.toFixed(2)}</p>

            <h2 className="text-lg font-medium">Drop-off Details</h2>
            {dropoffs.map((d, i) => (
              <div key={i} className="border p-3 space-y-2 rounded">
                <input value={d.name} onChange={e => handleDropoffChange(i, 'name', e.target.value)} placeholder="Name" className="w-full p-2 border rounded" />
                <input value={d.address} onChange={e => handleDropoffChange(i, 'address', e.target.value)} placeholder="Address" className="w-full p-2 border rounded" />
                <input value={d.contact} onChange={e => handleDropoffChange(i, 'contact', e.target.value)} placeholder="Contact Person" className="w-full p-2 border rounded" />
                <input value={d.phone} onChange={e => handleDropoffChange(i, 'phone', e.target.value)} placeholder="Phone Number" className="w-full p-2 border rounded" />
              </div>
            ))}
            <button type="button" onClick={addDropoff} className="bg-gray-200 px-3 py-1 rounded">+ Add Drop-off</button>

            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Submit Order</button>
          </>
        )}
      </form>
    </main>
  )
}
