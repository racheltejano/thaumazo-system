/**
 * 🚚 Assigned Orders Component
 * 
 * Displays a list of orders assigned to a driver in a clean, card-style layout.
 * Each card shows tracking info, pickup and delivery addresses, and schedule details.
 * 
 * ⚙️ Main Function:
 * - `AssignedOrders({ orders, formatDate, formatDateOnly })`: Renders assigned order cards or an empty state message.
 * 
 * 🧩 Features:
 * - Responsive grid layout for order cards
 * - Uses Lucide icons (`Truck`, `Package`)
 * - Shows pickup/delivery addresses and creation date
 * - Graceful empty state when no orders are assigned
 */


import { Package, Truck } from 'lucide-react';

interface Order {
  id: string;
  tracking_id: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  pickup_date?: string;
  pickup_time?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
}

interface AssignedOrdersProps {
  orders: Order[];
  formatDate: (dateString: string) => string;
  formatDateOnly: (dateString: string) => string;
}

export default function AssignedOrders({ orders, formatDate, formatDateOnly }: AssignedOrdersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Assigned Orders</h3>
        <span className="text-sm text-gray-500">{orders.length} orders</span>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No assigned orders</p>
          <p className="text-gray-400 text-sm mt-2">Driver has no orders assigned yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => (
            <div key={order.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300 bg-white h-fit">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Truck className="w-6 h-6 text-blue-600" />
                  <span className="font-semibold text-gray-900 text-lg">#{order.tracking_id}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Pickup Address</p>
                  <p className="text-sm text-gray-900">{order.pickup_address}</p>
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Delivery Address</p>
                  <p className="text-sm text-gray-900">{order.delivery_address}</p>
                </div>
                
                {order.pickup_date && order.pickup_time && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Scheduled</p>
                    <p className="text-sm text-gray-900">{formatDateOnly(order.pickup_date)} at {order.pickup_time}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Created</p>
                  <p className="text-sm text-gray-900">{formatDate(order.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 