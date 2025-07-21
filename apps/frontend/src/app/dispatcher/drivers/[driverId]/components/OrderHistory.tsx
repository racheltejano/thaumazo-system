import { Package } from 'lucide-react';

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

interface OrderHistoryProps {
  orders: Order[];
  formatDate: (dateString: string) => string;
  formatDateOnly: (dateString: string) => string;
  getStatusColor: (status: string) => string;
}

export default function OrderHistory({ orders, formatDate, formatDateOnly, getStatusColor }: OrderHistoryProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
        <span className="text-sm text-gray-500">{orders.length} orders</span>
      </div>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No order history</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-gray-900">#{order.tracking_id}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Pickup:</strong> {order.pickup_address}</p>
                <p><strong>Delivery:</strong> {order.delivery_address}</p>
                {order.pickup_date && order.pickup_time && (
                  <p><strong>Scheduled:</strong> {formatDateOnly(order.pickup_date)} at {order.pickup_time}</p>
                )}
                <p><strong>Updated:</strong> {formatDate(order.updated_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 