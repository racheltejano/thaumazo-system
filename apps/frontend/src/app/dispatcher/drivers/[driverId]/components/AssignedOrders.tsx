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
  priority_level?: string;
  estimated_total_duration?: number;
  vehicle_type?: string;
  special_instructions?: string;
}

interface AssignedOrdersProps {
  orders: Order[];
  formatDate?: (dateString: string) => string;
  formatDateOnly?: (dateString: string) => string;
}

function AssignedOrders({ orders }: AssignedOrdersProps) {
  // Helper function to FORCE UTC interpretation and convert to Philippine time
  const formatToPHTime = (dateString: string) => {
    if (!dateString) return 'No date provided';
    
    try {
      const date = new Date(dateString);
      const phTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
      
      return phTime.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Helper to format pickup time from UTC date + time strings
  const formatPickupDateTime = (dateString: string, timeString: string) => {
    if (!dateString || !timeString) return 'No pickup time scheduled';
    
    try {
      const utcDateTime = new Date(`${dateString}T${timeString}Z`);
      
      const phDate = utcDateTime.toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      const phTime = utcDateTime.toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      return `${phDate} at ${phTime}`;
    } catch (error) {
      return 'Invalid pickup time';
    }
  };

  // Helper to safely display addresses
  const safeDisplayAddress = (address: string | null | undefined, label: string) => {
    if (!address || address.trim() === '') {
      return (
        <div className="text-red-500 italic text-sm">
          {label} not provided
        </div>
      );
    }
    return (
      <p className="text-sm text-gray-900 break-words">
        {address}
      </p>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Assigned Orders</h3>
        <span className="text-sm text-gray-500">{orders?.length || 0} orders</span>
      </div>
      
      {!orders || orders.length === 0 ? (
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
                  <span className="font-semibold text-gray-900 text-lg">
                    #{order.tracking_id || 'No tracking ID'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {order.pickup_date && order.pickup_time && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Pickup Scheduled</p>
                    <p className="text-sm text-gray-900">
                      {formatPickupDateTime(order.pickup_date, order.pickup_time)}
                    </p>
                  </div>
                )}

                {order.delivery_window_start && order.delivery_window_end && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Delivery Window</p>
                    <p className="text-sm text-gray-900">
                      {order.delivery_window_start} - {order.delivery_window_end}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Order Created</p>
                  <p className="text-sm text-gray-900">{formatToPHTime(order.created_at)}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Last Updated</p>
                  <p className="text-sm text-gray-900">{formatToPHTime(order.updated_at)}</p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Priority</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {order.priority_level || 'Normal'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AssignedOrders;