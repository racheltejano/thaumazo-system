'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ClientForm = {
  contact_person: string
  contact_number: string
  email?: string
  pickup_address: string
  landmark?: string
  pickup_area?: string
}

export default function CreateOrderPage({ params }: { params: { trackingId: string } }) {
  const [form, setForm] = useState<ClientForm>({
    contact_person: '',
    contact_number: '',
    email: '',
    pickup_address: '',
    landmark: '',
    pickup_area: '',
  })

  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchClient = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tracking_id', params.trackingId)
        .single<ClientForm>()

      if (error || !data) {
        setError('Tracking ID not found.')
      } else {
        setForm({
          contact_person: data.contact_person !== 'Pending' ? data.contact_person : '',
          contact_number: data.contact_number !== 'Pending' ? data.contact_number : '',
          email: data.email || '',
          pickup_address: data.pickup_address !== 'Pending' ? data.pickup_address : '',
          landmark: data.landmark || '',
          pickup_area: data.pickup_area || '',
        })
      }

      setLoading(false)
    }

    fetchClient()
  }, [params.trackingId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { error: updateError } = await supabase
      .from('clients')
      .update(form)
      .eq('tracking_id', params.trackingId)

    if (updateError) {
      setError('Something went wrong while saving your info.')
      return
    }

    const { data: clientRow, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('tracking_id', params.trackingId)
      .single()

    if (clientError || !clientRow) {
      setError('Client not found after update.')
      return
    }

    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: clientRow.id,
        status: 'order_placed',
      })

    if (orderError) {
      setError('Could not create order.')
      return
    }

    await supabase.functions.invoke('notify_dispatch', {
      body: { tracking_id: params.trackingId },
    })

    setSubmitted(true)
  }

  if (loading) return <p className="p-4">Loading...</p>
  if (submitted) {
    return (
      <main className="p-6 text-green-600 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">✅ Submitted!</h1>
        <p>Your order was successfully created. You may now track it using your tracking ID.</p>
        <p className="mt-4 text-gray-500">Tracking ID: <code className="bg-gray-100 px-2 py-1 rounded">{params.trackingId}</code></p>
      </main>
    )
  }
  if (error) return (
    <main className="p-6 text-red-600">
      {error}
    </main>
  )

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📋 Submit Order Information</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="Contact Person" className="w-full p-2 border rounded" required />
        <input name="contact_number" value={form.contact_number} onChange={handleChange} placeholder="Contact Number" className="w-full p-2 border rounded" required />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email (optional)" className="w-full p-2 border rounded" />
        <input name="pickup_address" value={form.pickup_address} onChange={handleChange} placeholder="Pickup Address" className="w-full p-2 border rounded" required />
        <input name="landmark" value={form.landmark} onChange={handleChange} placeholder="Landmark (optional)" className="w-full p-2 border rounded" />
        <input name="pickup_area" value={form.pickup_area} onChange={handleChange} placeholder="Pickup Area (optional)" className="w-full p-2 border rounded" />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Submit Order</button>
      </form>
    </main>
  )
}
