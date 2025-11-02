'use client'
import { useMemo } from 'react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { geocodePhilippineAddress } from '@/lib/maps'
import { toast } from 'sonner'
import { usePricingCalculator, PriceBreakdown } from '@/components/PricingCalculator'
import { generateInventoryTrackingId } from '@/lib/trackingIdGenerator'


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

type InventoryProduct = {
  id: string
  variant_name: string
  sku: string
  current_stock: number
  is_fragile?: boolean
  item_id: string
  weight?: number  
  volume?: number  
  inventory_items: {
    name: string
  }
}

type OrderProduct = {
  variant_id: string | null  
  quantity: number
  product_name?: string  
  weight?: number        
  volume?: number        
  is_fragile?: boolean   
}

type OrderForm = {
  pickup_address: string
  landmark?: string
  pickup_area?: string
  pickup_date?: string
  pickup_time?: string
  truck_type?: string
  tail_lift_required?: boolean
  special_instructions?: string
  pickup_latitude?: number
  pickup_longitude?: number
}

export default function CreateOrderForm() {
  const auth = useAuth()
  const user = auth?.user
  const role = auth?.role
  
  // Profile data (auto-filled, hidden from user)
  const [inventoryStaffProfile, setInventoryStaffProfile] = useState({
    contact_person: '',
    contact_number: '',
    email: ''
  })
  
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')
  
  const [form, setForm] = useState<OrderForm>({
    pickup_address: '',
    landmark: '',
    pickup_area: '',
    pickup_date: '',
    pickup_time: '09:00',
    truck_type: '',
    tail_lift_required: false,
    special_instructions: '',
  })
  
  const [generatedTrackingId, setGeneratedTrackingId] = useState<string>('')
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([{ variant_id: null, quantity: 1 }])
  const [dropoffs, setDropoffs] = useState<Dropoff[]>([{ name: '', address: '', contact: '', phone: '' }])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const stableOrderProducts = useMemo(() => 
    orderProducts.map(op => ({
      product_name: op.product_name || '',
      quantity: op.quantity,
      weight: op.weight,
      volume: op.volume,
      is_fragile: op.is_fragile
    })), 
    [JSON.stringify(orderProducts.map(op => ({
      id: op.variant_id,
      qty: op.quantity,
      weight: op.weight,
      volume: op.volume,
      fragile: op.is_fragile
    })))]
  )

  const stableDropoffs = useMemo(() => dropoffs, [
    JSON.stringify(dropoffs.map(d => ({
      addr: d.address,
      lat: d.latitude,
      lon: d.longitude
    })))
  ])

  const { estimatedCost } = usePricingCalculator({
    pickupLatitude: form.pickup_latitude,
    pickupLongitude: form.pickup_longitude,
    dropoffs: stableDropoffs,
    orderProducts: stableOrderProducts,
    truckType: form.truck_type,
    tailLiftRequired: form.tail_lift_required
  })

  const [addressValidation, setAddressValidation] = useState<{
    pickup: { isValid: boolean; isValidating: boolean; coordinates?: { lat: number; lon: number } }
    dropoffs: { isValid: boolean; isValidating: boolean; coordinates?: { lat: number; lon: number } }[]
  }>({
    pickup: { isValid: false, isValidating: false },
    dropoffs: [{ isValid: false, isValidating: false }]
  })

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const TIMEZONE = 'Asia/Manila'

  const getCurrentManilaDateTime = () => dayjs().tz(TIMEZONE)
  const getMinDate = () => getCurrentManilaDateTime().format('YYYY-MM-DD')

  const getMinTimeForToday = () => {
    const now = getCurrentManilaDateTime()
    const minTime = now.add(1, 'hour')
    const minutes = minTime.minute()
    const roundedMinutes = Math.ceil(minutes / 15) * 15
    return minTime.minute(roundedMinutes).second(0).format('HH:mm')
  }

  const isSelectedDateToday = () => {
    if (!form.pickup_date) return false
    const selectedDate = dayjs(form.pickup_date).format('YYYY-MM-DD')
    const today = getCurrentManilaDateTime().format('YYYY-MM-DD')
    return selectedDate === today
  }

  const isDateTimeValid = (date: string, time: string) => {
    if (!date || !time) return false
    const selectedDateTime = dayjs.tz(`${date} ${time}`, TIMEZONE)
    const now = getCurrentManilaDateTime()
    return selectedDateTime.isAfter(now.add(1, 'hour'))
  }

  const generateTimeOptions = () => {
    const options = []
    const isToday = isSelectedDateToday()
    const minTime = isToday ? getMinTimeForToday() : '00:00'
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const isDisabled = isToday && timeString < minTime
        
        options.push({
          value: timeString,
          label: timeString,
          disabled: isDisabled
        })
      }
    }
    
    return options
  }

  const getMapboxMapUrl = (lat: number, lon: number) =>
    `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lon},${lat})/${lon},${lat},16/600x200?access_token=${mapboxToken}`

  const createPickupTimestamp = (date: string, time: string): string => {
  if (!date || !time) {
    console.error('❌ Missing date or time:', { date, time })
    return ''
  }
  
  try {
    // Ensure time is in HH:mm format
    const formattedTime = time.length === 5 ? time : `${time}:00`
    
    // Create datetime string: "YYYY-MM-DD HH:mm"
    const dateTimeString = `${date} ${formattedTime}`
    console.log('📅 Creating timestamp from:', dateTimeString)
    
    // Parse as Manila timezone using explicit format
    const manilaDateTime = dayjs.tz(dateTimeString, 'YYYY-MM-DD HH:mm', 'Asia/Manila')
    
    // Validate the parsed datetime
    if (!manilaDateTime.isValid()) {
      console.error('❌ Invalid datetime:', dateTimeString)
      return ''
    }
    
    // Convert to UTC and get ISO string
    const utcISO = manilaDateTime.utc().toISOString()
    console.log('✅ Generated UTC timestamp:', utcISO)
    console.log('   Manila time:', manilaDateTime.format('YYYY-MM-DD HH:mm:ss'))
    console.log('   UTC time:', manilaDateTime.utc().format('YYYY-MM-DD HH:mm:ss'))
    
    return utcISO
  } catch (error) {
    console.error('❌ Error creating timestamp:', error)
    return ''
  }
}

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || role !== 'inventory_staff') {
        setLoading(false)
        return
      }

      // 1. Fetch inventory staff profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, contact_number, email')
        .eq('id', user.id)
        .single()

      if (!profileError && profileData) {
        setInventoryStaffProfile({
          contact_person: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
          contact_number: profileData.contact_number || '',
          email: user.email || profileData.email || '',
        })
      }

      // 2. Fetch warehouses
      const { data: warehouseList, error: warehouseError } = await supabase
        .from('inventory_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })

      if (!warehouseError && warehouseList && warehouseList.length > 0) {
        setWarehouses(warehouseList)
        
        const defaultWarehouse = warehouseList.find(w => w.is_default) || warehouseList[0]
        setSelectedWarehouseId(defaultWarehouse.id)
        
        setForm(prev => ({
          ...prev,
          pickup_address: defaultWarehouse.pickup_address || '',
          landmark: defaultWarehouse.landmark || '',
          pickup_area: defaultWarehouse.pickup_area || '',
          pickup_latitude: defaultWarehouse.pickup_latitude ? parseFloat(defaultWarehouse.pickup_latitude) : undefined,
          pickup_longitude: defaultWarehouse.pickup_longitude ? parseFloat(defaultWarehouse.pickup_longitude) : undefined,
        }))

        if (defaultWarehouse.pickup_latitude && defaultWarehouse.pickup_longitude) {
          setAddressValidation(prev => ({
            ...prev,
            pickup: {
              isValid: true,
              isValidating: false,
              coordinates: {
                lat: parseFloat(defaultWarehouse.pickup_latitude),
                lon: parseFloat(defaultWarehouse.pickup_longitude)
              }
            }
          }))
        }
      }

      // 3. Fetch inventory products
      const { data: inventoryProducts, error: inventoryError } = await supabase
        .from('inventory_items_variants')
        .select(`
          id,
          variant_name,
          sku,
          current_stock,
          is_fragile,
          item_id,       
          inventory_items (
            name
          )
        `)
        .gt('current_stock', 0)
        .order('variant_name')

      if (inventoryError) {
        console.error('Error fetching inventory products:', inventoryError.message)
      } else {
        setProducts(inventoryProducts || [])
      }

      setLoading(false)
    }

    fetchData()
  }, [user, role])

  useEffect(() => {
    if (form.pickup_date && form.pickup_time) {
      if (!isDateTimeValid(form.pickup_date, form.pickup_time)) {
        const minTime = isSelectedDateToday() ? getMinTimeForToday() : '09:00'
        setForm(prev => ({ ...prev, pickup_time: minTime }))
      }
    }
  }, [form.pickup_date])

  const handleDropoffBlur = async (index: number, address: string) => {
    if (!address.trim()) {
      setAddressValidation(prev => ({
        ...prev,
        dropoffs: prev.dropoffs.map((d, i) => 
          i === index ? { isValid: false, isValidating: false } : d
        )
      }))
      return
    }

    setAddressValidation(prev => ({
      ...prev,
      dropoffs: prev.dropoffs.map((d, i) => 
        i === index ? { isValid: false, isValidating: true } : d
      )
    }))

    try {
      const dropoffCoords = await geocodePhilippineAddress(address)
      if (dropoffCoords) {
        setDropoffs(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            latitude: dropoffCoords.lat,
            longitude: dropoffCoords.lon,
          }
          return updated
        })

        setAddressValidation(prev => ({
          ...prev,
          dropoffs: prev.dropoffs.map((d, i) => 
            i === index ? { isValid: true, isValidating: false, coordinates: dropoffCoords } : d
          )
        }))
      } else {
        setAddressValidation(prev => ({
          ...prev,
          dropoffs: prev.dropoffs.map((d, i) => 
            i === index ? { isValid: false, isValidating: false } : d
          )
        }))
      }
    } catch (error) {
      console.error('Dropoff geocoding error:', error)
      setAddressValidation(prev => ({
        ...prev,
        dropoffs: prev.dropoffs.map((d, i) => 
          i === index ? { isValid: false, isValidating: false } : d
        )
      }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const updateOrderProduct = (index: number, field: keyof OrderProduct, value: any) => {
    setOrderProducts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'variant_id' && value) {
        const selectedProduct = products.find(p => p.id === value)
        if (selectedProduct) {
          updated[index].is_fragile = selectedProduct.is_fragile
          updated[index].product_name = `${selectedProduct.inventory_items?.name} - ${selectedProduct.variant_name}`
        }
      }
      return updated
    })
  }

  const updateDropoff = <K extends keyof Dropoff>(i: number, key: K, val: Dropoff[K]) => {
    const updated = [...dropoffs]
    updated[i][key] = val
    setDropoffs(updated)
  }

  const addDropoff = () => {
    setDropoffs([...dropoffs, { name: '', address: '', contact: '', phone: '' }])
    setAddressValidation(prev => ({
      ...prev,
      dropoffs: [...prev.dropoffs, { isValid: false, isValidating: false }]
    }))
  }

  const addOrderProduct = () => setOrderProducts([...orderProducts, { variant_id: null, quantity: 1 }])

  const removeOrderProduct = (index: number) => {
    if (orderProducts.length > 1) {
      setOrderProducts(orderProducts.filter((_, i) => i !== index))
    }
  }

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId)
    
    const selectedWarehouse = warehouses.find(w => w.id === warehouseId)
    if (selectedWarehouse) {
      setForm(prev => ({
        ...prev,
        pickup_address: selectedWarehouse.pickup_address || '',
        landmark: selectedWarehouse.landmark || '',
        pickup_area: selectedWarehouse.pickup_area || '',
        pickup_latitude: selectedWarehouse.pickup_latitude ? parseFloat(selectedWarehouse.pickup_latitude) : undefined,
        pickup_longitude: selectedWarehouse.pickup_longitude ? parseFloat(selectedWarehouse.pickup_longitude) : undefined,
      }))

      if (selectedWarehouse.pickup_latitude && selectedWarehouse.pickup_longitude) {
        setAddressValidation(prev => ({
          ...prev,
          pickup: {
            isValid: true,
            isValidating: false,
            coordinates: {
              lat: parseFloat(selectedWarehouse.pickup_latitude),
              lon: parseFloat(selectedWarehouse.pickup_longitude)
            }
          }
        }))
      }
    }
  }

  const sortDropoffsByDistance = (
    pickupCoords: { lat: number; lon: number },
    dropoffsList: Dropoff[]
  ): Dropoff[] => {
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const R = 6371
      const dLat = (lat2 - lat1) * (Math.PI / 180)
      const dLon = (lon2 - lon1) * (Math.PI / 180)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    }

    const dropoffsWithDistance = dropoffsList
      .filter(d => d.latitude && d.longitude)
      .map(d => ({
        ...d,
        distanceFromPickup: calculateDistance(
          pickupCoords.lat,
          pickupCoords.lon,
          d.latitude!,
          d.longitude!
        )
      }))

    return dropoffsWithDistance.sort((a, b) => a.distanceFromPickup - b.distanceFromPickup)
  }

  const calculateAndStoreTravelTimes = async (
    orderId: string, 
    pickupCoords: { lat: number; lon: number }, 
    dropoffsList: Dropoff[]
  ) => {
    try {
      if (!pickupCoords?.lat || !pickupCoords?.lon) {
        console.log('Missing pickup coordinates')
        return { success: false, reason: 'missing_pickup_coordinates' }
      }

      const validDropoffs = dropoffsList.filter((d: Dropoff) => d.latitude && d.longitude)
      
      if (validDropoffs.length === 0) {
        console.log('No dropoffs with valid coordinates')
        return { success: false, reason: 'no_valid_dropoff_coordinates' }
      }

      const allPoints = [
        [pickupCoords.lon, pickupCoords.lat],
        ...validDropoffs.map((d: Dropoff) => [d.longitude, d.latitude])
      ]

      const waypoints = allPoints.map(([lon, lat]) => `${lon},${lat}`).join(';')

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

      const estimatedTotalDuration = Math.ceil(route.duration / 60)

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

      if (route.legs?.length) {
        const legs = route.legs
        const dropoffDurations = legs.map((leg: any) => Math.ceil(leg.duration / 60))

        const dropoffUpdatePromises = validDropoffs.map(async (dropoff: Dropoff, i: number) => {
          const duration = dropoffDurations[i] || null
          
          const { error } = await supabase
            .from('order_dropoffs')
            .update({ 
              estimated_duration_mins: duration,
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
        dropoffDurations: route.legs?.map((leg: any) => Math.ceil(leg.duration / 60)) || [],
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
    setError('')

    // Validation
    if (!form.pickup_address.trim()) {
      setError('Pickup address is required')
      return
    }
    if (!form.pickup_date) {
      setError('Pickup date is required')
      return
    }
    if (!form.pickup_time) {
      setError('Pickup time is required')
      return
    }
    if (!form.truck_type) {
      setError('Truck type is required')
      return
    }

    if (!isDateTimeValid(form.pickup_date, form.pickup_time!)) {
      setError('Pickup must be scheduled at least 1 hour from now')
      return
    }

    const pickupTimestamp = createPickupTimestamp(form.pickup_date!, form.pickup_time!)

// 🔥 Enhanced validation with detailed logging
if (!pickupTimestamp) {
  console.error('❌ Failed to create pickup timestamp:', {
    pickup_date: form.pickup_date,
    pickup_time: form.pickup_time,
    timezone: TIMEZONE
  })
  setError('Failed to create valid pickup timestamp. Please check date and time format.')
  return
}

console.log('✅ Pickup timestamp validated:', pickupTimestamp)
console.log('   Will be stored in database as:', pickupTimestamp)

    // Validate order products
    for (let i = 0; i < orderProducts.length; i++) {
      const op = orderProducts[i]
      if (!op.variant_id) {
        setError(`Product #${i + 1} must be selected`)
        return
      }
      if (op.quantity <= 0) {
        setError(`Product #${i + 1} quantity must be greater than 0`)
        return
      }

      const product = products.find(p => p.id === op.variant_id)
      if (product && op.quantity > product.current_stock) {
        setError(`Product #${i + 1}: Only ${product.current_stock} units available in stock`)
        return
      }
    }

    const pickupCoords = {
      lat: form.pickup_latitude!,
      lon: form.pickup_longitude!,
    }

    if (!pickupCoords.lat || !pickupCoords.lon) {
      setError('Unable to get coordinates for pickup address')
      return
    }

    for (let i = 0; i < dropoffs.length; i++) {
      const d = dropoffs[i]
      if (!d.address.trim()) {
        setError(`Drop-off #${i + 1} is missing an address`)
        return
      }
      if (!d.contact.trim() && !d.phone.trim()) {
        setError(`Drop-off #${i + 1} must have either a contact name or a phone`)
        return
      }
    }

    try {
      console.log('🔍 Starting order creation process...')

      // 1. Check if client exists (using inventory staff contact number)
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id, tracking_id')
        .eq('contact_number', inventoryStaffProfile.contact_number)
        .single()

      let clientId: string
      let clientTrackingId: string

      if (existingClient) {
        clientId = existingClient.id
        clientTrackingId = existingClient.tracking_id
        console.log('✅ Using existing client (inventory staff):', clientTrackingId)
      } else {
        const generatedClientTrackingId = await generateInventoryTrackingId()
        
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            tracking_id: generatedClientTrackingId,
            business_name: 'Thaumazo Express Transport Solutions - Buy and Sell',
            contact_person: inventoryStaffProfile.contact_person,
            contact_number: inventoryStaffProfile.contact_number,
            email: inventoryStaffProfile.email,
            pickup_address: form.pickup_address,
            landmark: form.landmark || null,
            pickup_area: form.pickup_area || null,
            pickup_latitude: form.pickup_latitude,
            pickup_longitude: form.pickup_longitude,
            client_type: 'returning'
          })
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
        clientTrackingId = newClient.tracking_id
        console.log('✅ Created new client (inventory staff):', clientTrackingId)
      }

      // 2. Generate order tracking ID
      const orderTrackingId = await generateInventoryTrackingId()
      setGeneratedTrackingId(orderTrackingId)
      console.log('✅ Generated order tracking ID:', orderTrackingId)

      // 3. Create the order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: clientId,
          status: 'order_placed',
          vehicle_type: form.truck_type,
          pickup_timestamp: pickupTimestamp,
          pickup_date: form.pickup_date,
          pickup_time: form.pickup_time,
          tail_lift_required: form.tail_lift_required || false,
          special_instructions: form.special_instructions || null,
          priority_level: 'medium',
          estimated_cost: estimatedCost,
          estimated_total_duration: null,
          estimated_end_time: null,
          created_by_user_id: user.id,
          order_source: 'inventory_staff',
          tracking_id: orderTrackingId
        })
        .select()
        .single()

      if (orderError) throw orderError
      console.log('✅ Created order:', newOrder.id)

      // 4. Deduct inventory & log movements
      console.log('📦 Processing inventory deductions...')
      for (const op of orderProducts) {
        const variant = products.find(p => p.id === op.variant_id)
        if (!variant) {
          console.warn(`⚠️ Variant ${op.variant_id} not found, skipping`)
          continue
        }

        const oldStock = variant.current_stock
        const newStock = oldStock - op.quantity

        console.log(`  → Deducting ${op.quantity} units of "${variant.variant_name}" (${oldStock} → ${newStock})`)

        const { error: stockError } = await supabase
          .from('inventory_items_variants')
          .update({ 
            current_stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', op.variant_id)

        if (stockError) {
          console.error('❌ Failed to update stock:', stockError)
          throw stockError
        }

        const movementData = {
          variant_id: op.variant_id,
          quantity: -op.quantity,
          movement_type: 'stock_out',
          reference_type: 'customer_sale',
          reference_id: newOrder.id,
          old_stock: oldStock,
          new_stock: newStock,
          remarks: `Order ${orderTrackingId} - Stock deducted for delivery`
        }

        const { error: movementError } = await supabase
          .from('inventory_items_movements')
          .insert(movementData)

        if (movementError) {
          console.error('❌ Failed to log movement:', movementError)
        } else {
          console.log(`  ✅ Movement logged successfully`)
        }
      }
      console.log('✅ All inventory deductions completed')

      // 5. Geocode and create dropoffs
      console.log('📍 Processing dropoff locations...')
      const dropoffsWithCoords = await Promise.all(
        dropoffs.filter(d => d.address.trim()).map(async (d) => {
          let latitude = d.latitude
          let longitude = d.longitude
          
          if (!latitude || !longitude) {
            const coords = await geocodePhilippineAddress(d.address)
            latitude = coords?.lat
            longitude = coords?.lon
          }
          
          return {
            ...d,
            latitude,
            longitude,
          }
        })
      )

      const sortedDropoffs = sortDropoffsByDistance(pickupCoords, dropoffsWithCoords)

      const dropoffsData = sortedDropoffs.map((d, index) => ({
        order_id: newOrder.id,
        dropoff_name: d.name,
        dropoff_address: d.address,
        dropoff_contact: d.contact,
        dropoff_phone: d.phone,
        latitude: d.latitude,
        longitude: d.longitude,
        sequence: index + 1,
        estimated_duration_mins: null,
      }))

      const { error: dropoffsError } = await supabase
        .from('order_dropoffs')
        .insert(dropoffsData)

      if (dropoffsError) throw dropoffsError
      console.log(`✅ Created ${dropoffsData.length} dropoff locations`)

      // 6. Calculate travel times
      console.log('🗺️ Calculating travel times...')
      await calculateAndStoreTravelTimes(newOrder.id, pickupCoords, sortedDropoffs)

      // 7. Create status log
      const { error: logError } = await supabase
        .from('order_status_logs')
        .insert({
          order_id: newOrder.id,
          status: 'order_placed',
          description: 'Order created by inventory staff and awaiting dispatcher assignment'
        })

      if (logError) throw logError
      console.log('✅ Status log created')

      // 8. Notify dispatchers
      const { data: dispatchers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'dispatcher')

      if (dispatchers && dispatchers.length > 0) {
        const notifications = dispatchers.map(dispatcher => ({
          user_id: dispatcher.id,
          order_id: newOrder.id,
          title: 'New Inventory Order',
          message: `Order ${orderTrackingId} created - Assign driver and schedule delivery`,
          type: 'order',
          read: false,
          link: '/dispatcher/calendar',
        }))

        await supabase.from('notifications').insert(notifications)
        console.log(`✅ Notified ${dispatchers.length} dispatchers`)
      }
    console.log('🎉 Order creation complete!')
    toast.success('✅ Order submitted successfully!')
    setSubmitted(true)

  } catch (err: any) {
    console.error('❌ Error creating order:', err)
    const errorMessage = err?.message || 'Failed to create order. Please try again.'
    setError(errorMessage)
    toast.error(errorMessage)
  }
}

  const timeOptions = generateTimeOptions()

  if (auth?.loading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (role !== 'inventory_staff') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">Inventory staff only</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white p-12 rounded-2xl shadow-2xl text-center max-w-md">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-6xl">✅</span>
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-3">Order Created!</h1>
          <p className="text-gray-600 mb-2">Your order has been successfully submitted</p>
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 mt-4">
            <p className="text-sm text-gray-500 mb-1">Tracking ID</p>
            <p className="text-xl font-mono font-bold text-gray-800">{generatedTrackingId}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-orange-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-4xl">📦</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                Create New Order
              </h1>
              <p className="text-gray-500 mt-1">Fill in the details to create a delivery order</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-xl shadow-md">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-red-800 mb-1">Error</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pickup Details Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-purple-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-purple-100">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">📍</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Pickup Details</h2>
            </div>
            
            <div className="space-y-6">
              {/* Warehouse Selection Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select Warehouse <span className="text-red-500">*</span>
                </label>
                {warehouses.length > 0 ? (
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => handleWarehouseChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 bg-white appearance-none cursor-pointer"
                    required
                  >
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouse_name || 'Unnamed Warehouse'} - {warehouse.pickup_address}
                        {warehouse.is_default ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                    <p className="text-yellow-800 font-medium">⚠️ No warehouses found</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please set up a warehouse in Warehouse Settings first.
                    </p>
                  </div>
                )}
              </div>

              {/* Display Selected Warehouse Info (Read-only) */}
              {selectedWarehouseId && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Pickup Address
                    </label>
                    <div className="p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                      {form.pickup_address || 'No address set'}
                    </div>
                  </div>

                  {addressValidation.pickup.isValid && addressValidation.pickup.coordinates && mapboxToken && (
                    <div className="rounded-xl overflow-hidden border-2 border-purple-200 shadow-md">
                      <Image
                        src={getMapboxMapUrl(addressValidation.pickup.coordinates.lat, addressValidation.pickup.coordinates.lon)}
                        alt="Pickup location"
                        width={600}
                        height={200}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Landmark
                      </label>
                      <div className="p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                        {form.landmark || 'None'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Pickup Area
                      </label>
                      <div className="p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                        {form.pickup_area || 'None'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Pickup Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="pickup_date"
                    value={form.pickup_date || ''}
                    onChange={handleChange}
                    min={getMinDate()}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Pickup Time <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="pickup_time"
                    value={form.pickup_time || '09:00'}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 bg-white appearance-none cursor-pointer"
                    required
                  >
                    {timeOptions.map(option => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label} {option.disabled ? '(Past)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-amber-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-amber-100">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">📦</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Order Products</h2>
            </div>

            <div className="space-y-6">
              {orderProducts.map((op, i) => {
                const selectedProduct = products.find(p => p.id === op.variant_id)
                return (
                  <div key={i} className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border-2 border-amber-200 relative overflow-visible">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800 text-lg">Product #{i + 1}</h3>
                      {orderProducts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOrderProduct(i)}
                          className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all shadow-md hover:shadow-lg"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative z-10">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Select Product <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={op.variant_id || ''}
                          onChange={(e) => updateOrderProduct(i, 'variant_id', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-gray-900 bg-white appearance-none cursor-pointer"
                          required
                        >
                          <option value="">Choose a product...</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.inventory_items?.name} - {product.variant_name} 
                              (Stock: {product.current_stock})
                              {product.is_fragile ? ' 🔴 FRAGILE' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={selectedProduct?.current_stock || 999}
                          value={op.quantity}
                          onChange={(e) => updateOrderProduct(i, 'quantity', parseInt(e.target.value))}
                          className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-gray-900 bg-white"
                          required
                        />
                        {selectedProduct && (
                          <p className="text-sm text-gray-600 mt-2">
                            Available: <span className="font-bold text-amber-600">{selectedProduct.current_stock}</span> units
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedProduct && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-amber-200">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">ℹ️</span>
                          <div>
                            <p className="font-semibold text-gray-800">{selectedProduct.inventory_items?.name}</p>
                            <p className="text-sm text-gray-600">SKU: {selectedProduct.sku}</p>
                            {selectedProduct.is_fragile && (
                              <p className="text-sm text-red-600 font-bold mt-1">⚠️ Handle with care - Fragile item</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                type="button"
                onClick={addOrderProduct}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="text-xl">➕</span> Add Another Product
              </button>
            </div>
          </div>

          {/* Drop-off Locations Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-rose-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-rose-100">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">🎯</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Drop-off Locations</h2>
            </div>

            <div className="space-y-6">
              {dropoffs.map((dropoff, i) => (
                <div key={i} className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-6 border-2 border-rose-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">Drop-off #{i + 1}</h3>
                    {dropoffs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDropoffs(dropoffs.filter((_, idx) => idx !== i))
                          setAddressValidation(prev => ({
                            ...prev,
                            dropoffs: prev.dropoffs.filter((_, idx) => idx !== i)
                          }))
                        }}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-all shadow-md hover:shadow-lg"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Recipient Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={dropoff.name}
                        onChange={(e) => updateDropoff(i, 'name', e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full px-4 py-3 border-2 border-rose-300 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all text-gray-900 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Delivery Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          value={dropoff.address}
                          onChange={(e) => updateDropoff(i, 'address', e.target.value)}
                          onBlur={(e) => handleDropoffBlur(i, e.target.value)}
                          placeholder="Enter complete delivery address"
                          className="w-full px-4 py-3 pr-12 border-2 border-rose-300 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all text-gray-900 bg-white"
                          required
                        />
                        {addressValidation.dropoffs[i]?.isValidating && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        {!addressValidation.dropoffs[i]?.isValidating && dropoff.address.trim() && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {addressValidation.dropoffs[i]?.isValid ? (
                              <span className="text-2xl">✅</span>
                            ) : (
                              <span className="text-2xl">❌</span>
                            )}
                          </div>
                        )}
                      </div>
                      {addressValidation.dropoffs[i]?.isValid && addressValidation.dropoffs[i]?.coordinates && mapboxToken && (
                        <div className="mt-4 rounded-xl overflow-hidden border-2 border-rose-200 shadow-md">
                          <Image
                            src={getMapboxMapUrl(addressValidation.dropoffs[i].coordinates!.lat, addressValidation.dropoffs[i].coordinates!.lon)}
                            alt={`Drop-off ${i + 1} location`}
                            width={600}
                            height={200}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Contact Name
                        </label>
                        <input
                          value={dropoff.contact}
                          onChange={(e) => updateDropoff(i, 'contact', e.target.value)}
                          placeholder="Contact person"
                          className="w-full px-4 py-3 border-2 border-rose-300 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          value={dropoff.phone}
                          onChange={(e) => updateDropoff(i, 'phone', e.target.value)}
                          placeholder="09XX-XXX-XXXX"
                          className="w-full px-4 py-3 border-2 border-rose-300 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addDropoff}
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="text-xl">➕</span> Add Another Drop-off
              </button>
            </div>
          </div>

          {/* Truck Details Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-green-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-green-100">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">🚚</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Truck Requirements</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Truck Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="truck_type"
                  value={form.truck_type || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-900 bg-white appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select truck type</option>
                  <option value="small">Small Truck (L300)</option>
                  <option value="medium">Medium Truck (4W)</option>
                  <option value="large">Large Truck (6W)</option>
                  <option value="wing_van">Wing Van</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="tail_lift_required"
                      checked={form.tail_lift_required || false}
                      onChange={handleChange}
                      className="peer sr-only"
                    />
                    <div className="w-14 h-7 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-all duration-300"></div>
                    <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 peer-checked:translate-x-7 shadow-md"></div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 group-hover:text-green-600 transition-colors">
                    Tail Lift Required
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Special Instructions <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                name="special_instructions"
                value={form.special_instructions || ''}
                onChange={handleChange}
                placeholder="Any special handling requirements or instructions..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-gray-900 bg-white resize-none"
              />
              <PriceBreakdown
                pickupLatitude={form.pickup_latitude}
                pickupLongitude={form.pickup_longitude}
                dropoffs={dropoffs}
                orderProducts={orderProducts.map(op => ({
                  product_name: op.product_name || '',
                  quantity: op.quantity,
                  weight: op.weight,
                  volume: op.volume,
                  is_fragile: op.is_fragile
                }))}
                truckType={form.truck_type}
                tailLiftRequired={form.tail_lift_required}
                estimatedCost={estimatedCost}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-lg flex items-center justify-center gap-2"
          >
            <span className="text-2xl">🚀</span> Create Order
          </button>
        </form>
      </div>
    </div>
  )
}