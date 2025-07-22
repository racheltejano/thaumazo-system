'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, 
  Clock, 
  Truck, 
  MapPin, 
  Phone, 
  Mail, 
  Package, 
  CreditCard,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  FileText
} from 'lucide-react'
import Link from 'next/link'

interface Order {
  id: string
  status: string
  created_at: string
  pickup_timestamp: string  // Changed from pickup_date and pickup_time
  vehicle_type: string
  special_instructions: string
  estimated_cost: number
  priority_level: string
  tracking_id: string
  tail_lift_required: boolean
  delivery_window_start: string
  delivery_window_end: string
  estimated_total_duration: number
  clients: {
    tracking_id: string
    contact_person: string
    contact_number: string
    email: string
    pickup_address: string
    landmark: string
    business_name: string
    client_type: string
  }
  profiles: {
    first_name: string
    last_name: string
    contact_number: string
    email: string
  } | null
  order_dropoffs: Array<{
    dropoff_name: string
    dropoff_address: string
    dropoff_contact: string
    dropoff_phone: string
    sequence: number
    estimated_duration_mins: number
  }>
  order_products: Array<{
    quantity: number
    products: {
      name: string
      weight: number
      volume: number
      is_fragile: boolean
    }
  }>
  order_pricing_components: Array<{
    label: string
    amount: number
  }>
  order_status_logs: Array<{
    status: string
    description: string
    timestamp: string
  }>
}

const statusConfig = {
  order_placed: { label: 'Order Placed', color: 'bg-blue-100 text-blue-800', icon: FileText },
  driver_assigned: { label: 'Driver Assigned', color: 'bg-yellow-100 text-yellow-800', icon: User },
  truck_left_warehouse: { label: 'Truck Left Warehouse', color: 'bg-orange-100 text-orange-800', icon: Truck },
  arrived_at_pickup: { label: 'Arrived at Pickup', color: 'bg-purple-100 text-purple-800', icon: MapPin },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle }
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'High', color: 'bg-red-100 text-red-800' }
}

export default function OrderDetailsPage() {
  const params = useParams() as { orderId: string }
  const orderId = params.orderId

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          clients (
            tracking_id,
            contact_person,
            contact_number,
            email,
            pickup_address,
            landmark,
            business_name,
            client_type
          ),
          profiles (
            first_name,
            last_name,
            contact_number,
            email
          ),
          order_dropoffs (
            dropoff_name,
            dropoff_address,
            dropoff_contact,
            dropoff_phone,
            sequence,
            estimated_duration_mins
          ),
          order_products (
            quantity,
            products (
              name,
              weight,
              volume,
              is_fragile
            )
          ),
          order_pricing_components (
            label,
            amount
          ),
          order_status_logs (
            status,
            description,
            timestamp
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) {
        console.error(error)
        setError('Could not fetch order.')
      } else {
        setOrder(data)
      }

      setLoading(false)
    }

    fetchOrder()
  }, [orderId])

  // Helper function to convert UTC timestamp to Philippine time and split into date and time
  const formatPickupDateTime = (utcTimestamp: string) => {
    const date = new Date(utcTimestamp)
    
    // Convert to Philippine time (UTC+8)
    const phDate = new Date(date.getTime() + (8 * 60 * 60 * 1000))
    
    const pickupDate = phDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC' // Use UTC since we already adjusted for PH time
    })
    
    const pickupTime = phDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC' // Use UTC since we already adjusted for PH time
    })
    
    return { pickupDate, pickupTime }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
          <div className="flex items-center text-red-600 mb-2">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-gray-600">Order not found.</p>
        </div>
      </div>
    )
  }

  const currentStatus = statusConfig[order.status as keyof typeof statusConfig] || {
    label: order.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
    color: 'bg-gray-100 text-gray-800',
    icon: FileText
  }
  const currentPriority = priorityConfig[order.priority_level as keyof typeof priorityConfig] || {
    label: order.priority_level?.charAt(0).toUpperCase() + order.priority_level?.slice(1) || 'Unknown',
    color: 'bg-gray-100 text-gray-800'
  }
  const StatusIcon = currentStatus.icon

  // Get pickup date and time in Philippine time
  const { pickupDate, pickupTime } = formatPickupDateTime(order.pickup_timestamp)

  const formatTime = (timeStr: string) => {
    return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDateTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const totalCost = order.order_pricing_components.reduce((sum, component) => sum + Number(component.amount), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link 
                href="/admin/orders" 
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
                <p className="text-sm text-gray-500">Tracking ID: {order.tracking_id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentPriority.color}`}>
                {currentPriority.label} Priority
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatus.color}`}>
                <StatusIcon className="w-4 h-4 mr-1.5" />
                {currentStatus.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Overview */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Overview</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Pickup Date</p>
                        <p className="text-sm text-gray-500">{pickupDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Pickup Time</p>
                        <p className="text-sm text-gray-500">{pickupTime}</p>
                      </div>
                    </div>
                    {order.delivery_window_start && order.delivery_window_end && (
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Delivery Window</p>
                          <p className="text-sm text-gray-500">
                            {formatTime(order.delivery_window_start)} - {formatTime(order.delivery_window_end)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Truck className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Vehicle Type</p>
                        <p className="text-sm text-gray-500">{order.vehicle_type || 'Not specified'}</p>
                      </div>
                    </div>
                    {order.tail_lift_required && (
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Special Requirements</p>
                          <p className="text-sm text-gray-500">Tail lift required</p>
                        </div>
                      </div>
                    )}
                    {order.estimated_total_duration && (
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Estimated Duration</p>
                          <p className="text-sm text-gray-500">{order.estimated_total_duration} minutes</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {order.special_instructions && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">Special Instructions</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {order.special_instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Information */}
            {order.clients && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Client Information</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Contact Person</p>
                        <p className="text-sm text-gray-600">{order.clients.contact_person}</p>
                      </div>
                      {order.clients.business_name && (
                        <div>
                          <p className="text-sm font-medium text-gray-900">Business Name</p>
                          <p className="text-sm text-gray-600">{order.clients.business_name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">Client Type</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          order.clients.client_type === 'first_time' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {order.clients.client_type === 'first_time' ? 'First Time' : 'Returning'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Phone</p>
                          <p className="text-sm text-gray-600">{order.clients.contact_number}</p>
                        </div>
                      </div>
                      {order.clients.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Email</p>
                            <p className="text-sm text-gray-600">{order.clients.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Pickup Address</p>
                        <p className="text-sm text-gray-600">{order.clients.pickup_address}</p>
                        {order.clients.landmark && (
                            <p className="text-sm text-gray-500 mt-1">Landmark: {order.clients.landmark}</p>
                            )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Driver Information */}
            {order.profiles && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Assigned Driver</h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 rounded-full p-3">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.profiles.first_name} {order.profiles.last_name}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        {order.profiles.contact_number && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {order.profiles.contact_number}
                          </p>
                        )}
                        {order.profiles.email && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {order.profiles.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropoff Locations */}
            {order.order_dropoffs && order.order_dropoffs.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Delivery Locations</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {order.order_dropoffs
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((dropoff, index) => (
                        <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                            {dropoff.sequence}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{dropoff.dropoff_name}</p>
                            <p className="text-sm text-gray-600">{dropoff.dropoff_address}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              {dropoff.dropoff_contact && (
                                <p className="text-sm text-gray-500">{dropoff.dropoff_contact}</p>
                              )}
                              {dropoff.dropoff_phone && (
                                <p className="text-sm text-gray-500 flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {dropoff.dropoff_phone}
                                </p>
                              )}
                              {dropoff.estimated_duration_mins && (
                                <p className="text-sm text-gray-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  ~{dropoff.estimated_duration_mins} mins
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Products */}
            {order.order_products && order.order_products.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Products</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {order.order_products.map((orderProduct, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-lg ${
                            orderProduct.products.is_fragile ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            <Package className={`h-5 w-5 ${
                              orderProduct.products.is_fragile ? 'text-red-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {orderProduct.products.name}
                              {orderProduct.products.is_fragile && (
                                <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                  Fragile
                                </span>
                              )}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              {orderProduct.products.weight && (
                                <span>Weight: {orderProduct.products.weight}kg</span>
                              )}
                              {orderProduct.products.volume && (
                                <span>Volume: {orderProduct.products.volume}m³</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">Qty: {orderProduct.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pricing
                </h2>
              </div>
              <div className="p-6">
                {order.order_pricing_components.length > 0 ? (
                  <div className="space-y-3">
                    {order.order_pricing_components.map((component, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-sm text-gray-600">{component.label}</span>
                        <span className="text-sm font-medium text-gray-900">
                          ₱{Number(component.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-base font-semibold text-gray-900">Total</span>
                        <span className="text-base font-semibold text-gray-900">
                          ₱{totalCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-2xl font-bold text-gray-900">
                      ₱{Number(order.estimated_cost || 0).toLocaleString()}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">Estimated Cost</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Timeline */}
            {order.order_status_logs && order.order_status_logs.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Order Timeline</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {order.order_status_logs
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((log, index) => {
                        const logStatus = statusConfig[log.status as keyof typeof statusConfig] || {
                          label: log.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown',
                          color: 'bg-gray-100 text-gray-800',
                          icon: FileText
                        }
                        const LogIcon = logStatus.icon
                        return (
                          <div key={index} className="flex items-start space-x-3">
                            <div className={`p-2 rounded-full ${logStatus.color}`}>
                              <LogIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {logStatus.label}
                              </p>
                              {log.description && (
                                <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDateTime(log.timestamp)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Track Order
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  Edit Order
                </button>
                <button className="w-full bg-red-100 text-red-700 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors">
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}