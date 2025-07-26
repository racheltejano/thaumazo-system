'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Initialize dayjs plugins
dayjs.extend(utc)
dayjs.extend(timezone)

type Dropoff = {
  name: string
  address: string
  contact: string
  phone: string
  latitude?: number
  longitude?: number
}

type Product = {
  id: string
  name: string
  weight?: number
  volume?: number
  is_fragile?: boolean
}

type OrderProduct = {
  product_id: string | null
  product_name: string // For new products
  quantity: number
  isNewProduct: boolean
  // Additional fields for new products
  weight?: number
  volume?: number
  is_fragile?: boolean
}

type ClientOrderForm = {
  pickup_address: string
  landmark?: string
  pickup_area?: string
  pickup_date?: string
  pickup_time?: string
  truck_type?: string
  tail_lift_required?: boolean
  special_instructions?: string
  estimated_cost?: number
  pickup_latitude?: number
  pickup_longitude?: number
}

interface ClientOrderFormProps {
  clientProfile: any
}

export default function ClientOrderForm({ clientProfile }: ClientOrderFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<ClientOrderForm>({
    pickup_address: '',
    landmark: '',
    pickup_area: '',
    pickup_date: '',
    pickup_time: '09:00',
    truck_type: '',
    tail_lift_required: false,
    special_instructions: '',
    estimated_cost: 2500,
  })
  const [products, setProducts] = useState<Product[]>([])
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([
    { product_id: null, product_name: '', quantity: 1, isNewProduct: false, weight: undefined, volume: undefined, is_fragile: false }
  ])
  const [dropoffs, setDropoffs] = useState<Dropoff[]>([{ name: '', address: '', contact: '', phone: '' }])
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const TIMEZONE = 'Asia/Manila'

  const getMapboxMapUrl = (lat: number, lon: number) =>
    `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lon},${lat})/${lon},${lat},16/600x200?access_token=${mapboxToken}`

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${info}`])
    console.log(info)
  }

  // Generate tracking ID using admin format
  const generateTrackingId = async (): Promise<string> => {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const trackingId = `TXT_${random}`

    // Check if tracking ID already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('tracking_id', trackingId)
      .single()

    if (existingClient) {
      // If exists, generate a new one recursively
      return generateTrackingId()
    }

    return trackingId
  }

  // Helper function to create UTC timestamp from local date/time
  const createPickupTimestamp = (date: string, time: string): string => {
    if (!date || !time) return ''
    
    // Create datetime in Manila timezone
    const manilaDateTime = dayjs.tz(`${date} ${time}`, TIMEZONE)
    
    // Convert to UTC and return ISO string
    return manilaDateTime.utc().toISOString()
  }

  useEffect(() => {
    const fetchData = async () => {
      addDebugInfo(`Fetching products for client order`)
      
      // Fetch existing products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (productsError) {
        addDebugInfo(`Error fetching products: ${productsError.message}`)
      } else {
        addDebugInfo(`Found ${productsData?.length || 0} products`)
        setProducts(productsData || [])
      }

      // Fetch saved addresses
      if (clientProfile?.id) {
        const { data: addressesData, error: addressesError } = await supabase
          .from('client_saved_addresses')
          .select('*')
          .eq('client_profile_id', clientProfile.id)
          .order('is_default', { ascending: false })
          .order('is_pickup_address', { ascending: false })
          .order('created_at', { ascending: false })

        if (addressesError) {
          addDebugInfo(`Error fetching addresses: ${addressesError.message}`)
        } else {
          addDebugInfo(`Found ${addressesData?.length || 0} saved addresses`)
          setSavedAddresses(addressesData || [])
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [clientProfile])

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId)
    const selectedAddress = savedAddresses.find(addr => addr.id === addressId)
    
    if (selectedAddress) {
      // Combine address lines
      const fullAddress = [
        selectedAddress.address_line1,
        selectedAddress.address_line2,
        selectedAddress.city,
        selectedAddress.state,
        selectedAddress.postal_code,
        selectedAddress.country
      ].filter(Boolean).join(', ')

      setForm(prev => ({
        ...prev,
        pickup_address: fullAddress,
        pickup_latitude: selectedAddress.latitude || undefined,
        pickup_longitude: selectedAddress.longitude || undefined,
      }))
    }
  }

  const updateOrderProduct = (index: number, field: keyof OrderProduct, value: any) => {
    setOrderProducts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
      // If switching from new product to existing product
      if (field === 'isNewProduct' && value === false) {
        updated[index].product_name = ''
        updated[index].product_id = null
        updated[index].weight = undefined
        updated[index].volume = undefined
        updated[index].is_fragile = false
      }
      // If switching from existing product to new product
      else if (field === 'isNewProduct' && value === true) {
        updated[index].product_id = null
      }
      
      return updated
    })
  }

  const updateDropoff = <K extends keyof Dropoff>(i: number, key: K, val: Dropoff[K]) => {
    const updated = [...dropoffs]
    updated[i][key] = val
    setDropoffs(updated)
  }

  const addDropoff = () => setDropoffs([...dropoffs, { name: '', address: '', contact: '', phone: '' }])
  const addOrderProduct = () => setOrderProducts([...orderProducts, { product_id: null, product_name: '', quantity: 1, isNewProduct: false, weight: undefined, volume: undefined, is_fragile: false }])

  const removeOrderProduct = (index: number) => {
    if (orderProducts.length > 1) {
      setOrderProducts(orderProducts.filter((_, i) => i !== index))
    }
  }

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

  const calculateAndStoreTravelTimes = async (orderId: string, pickupCoords: any, dropoffsList: Dropoff[]) => {
    try {
      // Validate pickup coordinates
      if (!pickupCoords?.lat || !pickupCoords?.lon) {
        console.log('Missing pickup coordinates')
        return { success: false, reason: 'missing_pickup_coordinates' }
      }

      // Filter dropoffs with valid coordinates
      const validDropoffs = dropoffsList.filter(d => d.latitude && d.longitude)
      
      if (validDropoffs.length === 0) {
        console.log('No dropoffs with valid coordinates')
        return { success: false, reason: 'no_valid_dropoff_coordinates' }
      }

      // Build waypoints: pickup + all valid dropoffs
      const allPoints = [
        [pickupCoords.lon, pickupCoords.lat], // Pickup point
        ...validDropoffs.map(d => [d.longitude, d.latitude]) // Dropoffs
      ]

      const waypoints = allPoints.map(([lon, lat]) => `${lon},${lat}`).join(';')

      // Call Mapbox Directions API
      const response = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}`,
        {
          params: {
            access_token: mapboxToken,
            geometries: 'geojson',
            overview: 'full',
            annotations: 'duration,distance',
          },
        }
      )

      if (!response.data?.routes?.length) {
        console.log('No routes returned from Mapbox')
        return { success: false, reason: 'no_routes_found' }
      }

      const route = response.data.routes[0]
      
      if (!route.duration) {
        console.log('No duration in Mapbox response')
        return { success: false, reason: 'no_duration_in_response' }
      }

      // Convert total duration from seconds to minutes (rounded up)
      const estimatedTotalDuration = Math.ceil(route.duration / 60)

      // Update order with total travel time
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          estimated_total_duration: estimatedTotalDuration,
        })
        .eq('id', orderId)

      if (orderUpdateError) {
        console.error('Failed to update order with travel time:', orderUpdateError)
        return { success: false, reason: 'order_update_failed', error: orderUpdateError }
      }

      // Calculate and store individual leg durations if we have route legs
      if (route.legs?.length) {
        const legs = route.legs
        const dropoffDurations = legs.map(leg => Math.ceil(leg.duration / 60)) // Round up each leg

        // Update dropoff records with individual durations
        const dropoffUpdatePromises = validDropoffs.map(async (dropoff, i) => {
          const duration = dropoffDurations[i] || null
          
          const { error } = await supabase
            .from('order_dropoffs')
            .update({ 
              estimated_duration_mins: duration,
              sequence: i + 1,
            })
            .match({
              order_id: orderId,
              dropoff_address: dropoff.address,
            })

          if (error) {
            console.error(`Failed to update dropoff #${i + 1} duration:`, error)
            return false
          }

          return true
        })

        await Promise.all(dropoffUpdatePromises)
      }

      console.log(`Successfully stored travel times - Total: ${estimatedTotalDuration} minutes`)
      
      return { 
        success: true, 
        totalDuration: estimatedTotalDuration,
        dropoffDurations: route.legs?.map(leg => Math.ceil(leg.duration / 60)) || [],
      }

    } catch (error: any) {
      console.error('Mapbox API error:', error)
      return { 
        success: false, 
        reason: 'mapbox_api_failed', 
        error: error.message 
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setDebugInfo([])

    addDebugInfo('Starting client order submission...')

    // Generate tracking ID first
    addDebugInfo('Generating tracking ID...')
    const trackingId = await generateTrackingId()
    addDebugInfo(`Generated tracking ID: ${trackingId}`)

    // Validation
    if (!form.pickup_address.trim()) {
      setError('Pickup address is required')
      setSubmitting(false)
      return
    }
    if (!form.pickup_date) {
      setError('Pickup date is required')
      setSubmitting(false)
      return
    }
    if (!form.pickup_time) {
      setError('Pickup time is required')
      setSubmitting(false)
      return
    }
    if (!form.truck_type) {
      setError('Truck type is required')
      setSubmitting(false)
      return
    }

    // Create pickup timestamp in UTC
    const pickupTimestamp = createPickupTimestamp(form.pickup_date!, form.pickup_time!)
    if (!pickupTimestamp) {
      setError('Invalid pickup date or time')
      setSubmitting(false)
      return
    }

    addDebugInfo(`Pickup timestamp (UTC): ${pickupTimestamp}`)
    addDebugInfo(`Pickup timestamp (Manila): ${dayjs(pickupTimestamp).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`)

    // Validate order products
    for (let i = 0; i < orderProducts.length; i++) {
      const op = orderProducts[i]
      if (op.isNewProduct && !op.product_name.trim()) {
        setError(`Product #${i + 1} name is required`)
        setSubmitting(false)
        return
      }
      if (!op.isNewProduct && !op.product_id) {
        setError(`Please select a product for item #${i + 1}`)
        setSubmitting(false)
        return
      }
      if (op.quantity <= 0) {
        setError(`Product #${i + 1} quantity must be greater than 0`)
        setSubmitting(false)
        return
      }
    }

    const pickupCoords = {
      lat: form.pickup_latitude!,
      lon: form.pickup_longitude!,
    }
    addDebugInfo(`Pickup coordinates: ${JSON.stringify(pickupCoords)}`)

    // Validate drop-offs
    for (let i = 0; i < dropoffs.length; i++) {
      const d = dropoffs[i]
      if (!d.address.trim()) {
        setError(`Drop-off #${i + 1} is missing an address.`)
        setSubmitting(false)
        return
      }
      if (!d.contact.trim() && !d.phone.trim()) {
        setError(`Drop-off #${i + 1} must have either a contact name or a phone.`)
        setSubmitting(false)
        return
      }
    }

    // Step 1: Create client record (will be automatically linked to user via trigger)
    addDebugInfo('Creating client record...')
    const clientData = {
      tracking_id: trackingId,
      client_type: 'returning',
      contact_person: `${clientProfile.first_name} ${clientProfile.last_name}`,
      contact_number: clientProfile.contact_number,
      email: clientProfile.email,
      pickup_address: form.pickup_address,
      landmark: form.landmark,
      pickup_area: form.pickup_area,
      pickup_latitude: pickupCoords?.lat,
      pickup_longitude: pickupCoords?.lon,
    }

    addDebugInfo(`Client data: ${JSON.stringify(clientData)}`)

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert(clientData)
      .select('id')
      .single()

    if (clientError) {
      addDebugInfo(`Client error: ${JSON.stringify(clientError)}`)
      setError(`❌ Failed to save client: ${clientError.message}`)
      setSubmitting(false)
      return
    }

    if (!client) {
      addDebugInfo('No client returned from insert')
      setError('❌ Failed to save client - no data returned')
      setSubmitting(false)
      return
    }

    addDebugInfo(`Client saved with ID: ${client.id}`)
    addDebugInfo('Client will be automatically linked to user account via trigger')
    
    // Step 2: Create order with combined timestamp
    addDebugInfo('Creating order...')
    const orderData = {
      client_id: client.id,
      pickup_date: form.pickup_date,
      pickup_time: form.pickup_time,
      pickup_timestamp: pickupTimestamp, // Store as single UTC timestamp
      vehicle_type: form.truck_type,
      tail_lift_required: form.tail_lift_required || false,
      special_instructions: form.special_instructions,
      estimated_cost: form.estimated_cost,
      status: 'order_placed',
      tracking_id: trackingId,
      estimated_total_duration: null, // Will be calculated and updated
      estimated_end_time: null, // Will be calculated and updated
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
      setSubmitting(false)
      return
    }

    if (!order) {
      addDebugInfo('No order returned from insert')
      setError('❌ Failed to create order - no data returned')
      setSubmitting(false)
      return
    }

    addDebugInfo(`Order created with ID: ${order.id}`)

    // Step 3: Create new products and order products
    addDebugInfo('Processing products...')
    const orderProductEntries = []

    for (const op of orderProducts) {
      if (op.isNewProduct && op.product_name.trim()) {
        // Create new product first
        const newProductData = {
          name: op.product_name,
          weight: op.weight || null,
          volume: op.volume || null,
          is_fragile: op.is_fragile || false,
        }
        
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert(newProductData)
          .select('id')
          .single()

        if (productError) {
          addDebugInfo(`Product creation error: ${JSON.stringify(productError)}`)
          setError(`❌ Failed to create product "${op.product_name}": ${productError.message}`)
          return
        }

        if (newProduct) {
          addDebugInfo(`Created new product: ${op.product_name} with ID: ${newProduct.id}`)
          orderProductEntries.push({
            order_id: order.id,
            product_id: newProduct.id,
            quantity: op.quantity,
          })
        }
      } else if (!op.isNewProduct && op.product_id) {
        // Use existing product
        orderProductEntries.push({
          order_id: order.id,
          product_id: op.product_id,
          quantity: op.quantity,
        })
      }
    }

    if (orderProductEntries.length > 0) {
      const { error: orderProductError } = await supabase
        .from('order_products')
        .insert(orderProductEntries)

      if (orderProductError) {
        addDebugInfo(`Order product error: ${JSON.stringify(orderProductError)}`)
        setError(`❌ Failed to save order products: ${orderProductError.message}`)
        return
      } else {
        addDebugInfo(`${orderProductEntries.length} order products created`)
      }
    }

    // Step 4: Create dropoffs with coordinates
    addDebugInfo('Creating dropoffs with coordinates...')
    const dropoffEntries = await Promise.all(
      dropoffs.filter(d => d.address.trim()).map(async (d, index) => {
        const coords = d.latitude && d.longitude
          ? { lat: d.latitude, lon: d.longitude }
          : await geocodeAddress(d.address)

        if (!coords) {
          addDebugInfo(`⚠️ No coordinates found for dropoff: ${d.address}`)
        }

        return {
          order_id: order.id,
          dropoff_name: d.name,
          dropoff_address: d.address,
          dropoff_contact: d.contact,
          dropoff_phone: d.phone,
          latitude: coords?.lat,
          longitude: coords?.lon,
          sequence: index + 1, // Add sequence number
          estimated_duration_mins: null, // Will be updated by travel time calculation
        }
      })
    )

    if (dropoffEntries.length > 0) {
      const { error: dropoffError } = await supabase
        .from('order_dropoffs')
        .insert(dropoffEntries)

      if (dropoffError) {
        addDebugInfo(`Dropoff error: ${JSON.stringify(dropoffError)}`)
        setError(`❌ Failed to create dropoffs: ${dropoffError.message}`)
        return
      } else {
        addDebugInfo(`${dropoffEntries.length} dropoffs created`)
      }
    }

    // Step 5: Calculate and store travel times
    const travelTimeResult = await calculateAndStoreTravelTimes(order.id, pickupCoords, dropoffs)
    
    if (travelTimeResult.success) {
      addDebugInfo(`🎉 Order created successfully with travel time data!`)
      addDebugInfo(`📊 Total travel time: ${travelTimeResult.totalDuration} minutes`)
    } else {
      addDebugInfo(`⚠️ Order created but travel time calculation failed: ${travelTimeResult.reason}`)
      // Note: We don't treat this as a fatal error since the order was created successfully
    }

    addDebugInfo('Order submission completed successfully!')
    setSubmitted(true)
    
    // Show success message and redirect
    toast.success('✅ Order created successfully!')
    setTimeout(() => {
      router.push(`/client/track/${trackingId}`)
    }, 2000)
  }

  if (loading) return <p className="p-6">Loading...</p>
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-green-600 text-2xl font-bold mb-4">✅ Order Created!</p>
        <p className="text-gray-500">Redirecting to your order tracking page...</p>
        <div className="mt-6 h-8 w-8 border-4 border-orange-500 border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">📦 Order Details</h2>

      {error && <p className="text-red-600 font-semibold">{error}</p>}

      {/* Client Information Display */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg text-gray-800">👤 Client Information</legend>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input 
                type="text" 
                value={`${clientProfile?.first_name} ${clientProfile?.last_name}`} 
                disabled 
                className="border border-gray-300 p-3 w-full rounded text-gray-500 bg-gray-100" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input 
                type="text" 
                value={clientProfile?.contact_number || ''} 
                disabled 
                className="border border-gray-300 p-3 w-full rounded text-gray-500 bg-gray-100" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                value={clientProfile?.email || ''} 
                disabled 
                className="border border-gray-300 p-3 w-full rounded text-gray-500 bg-gray-100" 
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* Pickup Info */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg text-gray-800">📍 Pickup Info</legend>
        
        {/* Saved Addresses Dropdown */}
        {savedAddresses.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Use Saved Address
            </label>
            <select
              value={selectedAddressId}
              onChange={(e) => handleAddressSelect(e.target.value)}
              className="border border-gray-400 p-3 w-full rounded text-gray-900"
            >
              <option value="">Select a saved address...</option>
              {savedAddresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label || 'Address'} 
                  {address.is_default && ' (Default)'}
                  {address.is_pickup_address && ' (Pickup)'}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <input name="pickup_address" value={form.pickup_address} onChange={handleChange} onBlur={handlePickupBlur} placeholder="Pickup Address*" className="border border-gray-400 p-3 w-full rounded text-gray-900" required />
        {form.pickup_latitude && form.pickup_longitude && (
          <div className="relative w-full h-40 mt-2 rounded overflow-hidden shadow">
            <Image src={getMapboxMapUrl(form.pickup_latitude, form.pickup_longitude)} alt="Pickup Map" layout="fill" objectFit="cover" />
          </div>
        )}
        <input name="pickup_area" value={form.pickup_area || ''} onChange={handleChange} placeholder="Pickup Area" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
        <input name="landmark" value={form.landmark || ''} onChange={handleChange} placeholder="Landmark" className="border border-gray-400 p-3 w-full rounded text-gray-900" />
        
        {/* Combined Date and Time inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date </label>
            <input 
              type="date" 
              name="pickup_date" 
              value={form.pickup_date} 
              onChange={handleChange} 
              className="border border-gray-400 p-3 w-full rounded text-gray-900" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time </label>
            <input 
              type="time" 
              name="pickup_time" 
              value={form.pickup_time} 
              onChange={handleChange} 
              className="border border-gray-400 p-3 w-full rounded text-gray-900" 
              required 
            />
          </div>
        </div>
        
        {/* Display combined datetime preview */}
        {form.pickup_date && form.pickup_time && (
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Pickup scheduled for:</strong> {dayjs.tz(`${form.pickup_date} ${form.pickup_time}`, TIMEZONE).format('dddd, MMMM D, YYYY [at] h:mm A')} (Manila Time)
            </p>
          </div>
        )}
      </fieldset>

      {/* Products */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg text-gray-800">📦 Products</legend>
        {orderProducts.map((op, i) => (
          <div key={i} className="bg-gray-50 p-4 rounded border border-gray-300 shadow space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm text-gray-700">Product #{i + 1}</h3>
              {orderProducts.length > 1 && (
                <button type="button" onClick={() => removeOrderProduct(i)} className="text-sm text-red-600 hover:underline">❌ Remove</button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`product_type_${i}`}
                  checked={!op.isNewProduct}
                  onChange={() => updateOrderProduct(i, 'isNewProduct', false)}
                />
                <span className="text-sm text-gray-700">Select existing product</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`product_type_${i}`}
                  checked={op.isNewProduct}
                  onChange={() => updateOrderProduct(i, 'isNewProduct', true)}
                />
                <span className="text-sm text-gray-700">Create new product</span>
              </label>
            </div>

            <div className="flex gap-2">
              {op.isNewProduct ? (
                <input
                  value={op.product_name}
                  onChange={e => updateOrderProduct(i, 'product_name', e.target.value)}
                  placeholder="New Product Name*"
                  className="border border-gray-400 p-3 flex-1 rounded text-gray-900"
                />
              ) : (
                <select
                  value={op.product_id || ''}
                  onChange={e => updateOrderProduct(i, 'product_id', e.target.value)}
                  className="border border-gray-400 p-3 flex-1 rounded text-gray-900"
                >
                  <option value="">Select Product*</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {product.weight && ` (${product.weight}kg)`}
                      {product.is_fragile && ' - Fragile'}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                value={op.quantity}
                onChange={e => updateOrderProduct(i, 'quantity', +e.target.value)}
                placeholder="Qty"
                min="1"
                className="border border-gray-400 p-3 w-24 rounded text-gray-900"
              />
            </div>

            {op.isNewProduct && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={op.weight || ''}
                    onChange={e => updateOrderProduct(i, 'weight', e.target.value ? +e.target.value : undefined)}
                    placeholder="0.0"
                    className="border border-gray-400 p-2 w-full rounded text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={op.volume || ''}
                    onChange={e => updateOrderProduct(i, 'volume', e.target.value ? +e.target.value : undefined)}
                    placeholder="0.00"
                    className="border border-gray-400 p-2 w-full rounded text-gray-900"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-gray-700">
                    <input
                      type="checkbox"
                      checked={op.is_fragile || false}
                      onChange={e => updateOrderProduct(i, 'is_fragile', e.target.checked)}
                    />
                    <span className="text-sm">Fragile Item</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
        <button type="button" onClick={addOrderProduct} className="text-orange-600 hover:underline">+ Add Product</button>
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

      <button 
        type="submit" 
        disabled={submitting}
        className={`w-full font-semibold py-3 rounded shadow ${
          submitting 
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
            : 'bg-orange-500 hover:bg-orange-600 text-white'
        }`}
      >
        {submitting ? '🔄 Submitting Order...' : '🚀 Submit Order'}
      </button>
    </form>
  )
} 