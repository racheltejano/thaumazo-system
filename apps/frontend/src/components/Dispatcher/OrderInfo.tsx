import moment from 'moment-timezone'

type Order = {
  id: string
  tracking_id: string
  pickup_date: string
  pickup_time: string
  delivery_window_start: string | null
  delivery_window_end: string | null
  special_instructions: string
  client_id: string
  status: string
  vehicle_type: string | null
  tail_lift_required: boolean | null
  driver_id: string | null
}

const ORDER_STATUSES = [
  { value: 'order_placed', label: 'Order Placed', color: '#718096' },
  { value: 'driver_assigned', label: 'Driver Assigned', color: '#3182ce' },
  { value: 'truck_left_warehouse', label: 'Truck Left Warehouse', color: '#d69e2e' },
  { value: 'arrived_at_pickup', label: 'Arrived at Pickup', color: '#ed8936' },
  { value: 'delivered', label: 'Delivered', color: '#38a169' },
  { value: 'cancelled', label: 'Cancelled', color: '#e53e3e' },
]

interface OrderInfoProps {
  order: Order
  estimatedTime: string | null
}

function formatDate(dateString: string): string {
  return moment(dateString).format('MMMM D, YYYY')
}

function formatTime(timeString: string): string {
  return moment(timeString, 'HH:mm:ss').format('h:mm A')
}

function getStatusColor(status: string) {
  const statusObj = ORDER_STATUSES.find(s => s.value === status)
  return statusObj ? statusObj.color : '#718096'
}

function getStatusLabel(status: string) {
  const statusObj = ORDER_STATUSES.find(s => s.value === status)
  return statusObj ? statusObj.label : status.replace('_', ' ').toUpperCase()
}

export function OrderInfo({ order, estimatedTime }: OrderInfoProps) {
  return (
    <>
      {/* Order Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-gray-900">
          <span>📋</span> Order Information
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Pickup Date:</span>
            <span className="text-gray-900">{formatDate(order.pickup_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Pickup Time:</span>
            <span className="text-gray-900">{formatTime(order.pickup_time)}</span>
          </div>
          {order.delivery_window_start && (
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Delivery Window:</span>
              <span className="text-gray-900">
                {formatTime(order.delivery_window_start)} - {formatTime(order.delivery_window_end || '')}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Vehicle Type:</span>
            <span className="text-gray-900">{order.vehicle_type || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Tail Lift:</span>
            <span className="text-gray-900">{order.tail_lift_required ? 'Required' : 'Not Required'}</span>
          </div>
          {estimatedTime && (
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Est. Travel Time:</span>
              <span className="text-gray-900">{estimatedTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-gray-900">
          <span>🔄</span> Current Status
        </h4>
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: getStatusColor(order.status) }}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>

      {/* Special Instructions */}
      {order.special_instructions && (
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h4 className="text-md font-semibold mb-3 flex items-center gap-2 text-yellow-800">
            <span>⚠️</span> Special Instructions
          </h4>
          <p className="text-sm text-yellow-800">{order.special_instructions}</p>
        </div>
      )}
    </>
  )
}