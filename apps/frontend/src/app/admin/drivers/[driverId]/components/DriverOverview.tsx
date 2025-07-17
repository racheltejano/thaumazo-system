import { ArrowLeft, Calendar, Clock, Package, Truck, User, Mail, Phone, Activity } from 'lucide-react';
import Link from 'next/link';

interface DriverProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  role: string;
  can_login: boolean;
  last_login: string | null;
  profile_pic: string | null;
  created_at: string;
}

interface DriverStats {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  average_delivery_time: number;
  total_distance: number;
}

interface DriverOverviewProps {
  driver: DriverProfile;
  stats: DriverStats | null;
  formatDate: (dateString: string) => string;
  formatLastLogin: (lastLogin: string | null) => string;
}

export default function DriverOverview({ driver, stats, formatDate, formatLastLogin }: DriverOverviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      {/* Driver Overview Card */}
      <div className="lg:col-span-6 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Column 1: Profile Picture and Name */}
          <div className="flex flex-col items-center space-y-3">
            <div className="flex-shrink-0">
              {driver.profile_pic ? (
                <img
                  className="h-40 w-40 rounded-full object-cover"
                  src={driver.profile_pic.replace('/upload/', '/upload/w_160,h_160,c_fill,f_auto,q_auto/')}
                  alt={`${driver.first_name} ${driver.last_name}`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`h-40 w-40 rounded-full bg-blue-500 flex items-center justify-center ${driver.profile_pic ? 'hidden' : ''}`}>
                <span className="text-white font-medium text-3xl">
                  {`${driver.first_name || ''} ${driver.last_name || ''}`.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {driver.first_name} {driver.last_name}
              </h2>
              <p className="text-gray-600 capitalize">{driver.role.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Column 2: Contact Info and Dates */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{driver.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-900">{driver.contact_number || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="text-gray-900">{formatDate(driver.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Activity className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="text-gray-900">{formatLastLogin(driver.last_login)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="lg:col-span-4 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-500" />
              <span className="text-gray-600">Total Orders</span>
            </div>
            <span className="text-2xl font-semibold text-gray-900">{stats?.total_orders || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Truck className="w-8 h-8 text-green-500" />
              <span className="text-gray-600">Completed</span>
            </div>
            <span className="text-2xl font-semibold text-gray-900">{stats?.completed_orders || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-orange-500" />
              <span className="text-gray-600">Active</span>
            </div>
            <span className="text-2xl font-semibold text-gray-900">{stats?.active_orders || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="w-8 h-8 text-purple-500" />
              <span className="text-gray-600">Success Rate</span>
            </div>
            <span className="text-2xl font-semibold text-gray-900">
              {stats?.total_orders ? Math.round((stats.completed_orders / stats.total_orders) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 