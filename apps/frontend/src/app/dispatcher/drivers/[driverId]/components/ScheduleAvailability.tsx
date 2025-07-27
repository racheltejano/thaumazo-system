import React from 'react';
import { Calendar, Filter, Clock, CheckCircle, XCircle } from 'lucide-react';

interface AvailabilityEntry {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  created_at: string;
  is_available?: boolean; 
}

interface ScheduleAvailabilityProps {
  availabilityData: AvailabilityEntry[];
  filteredAvailabilityData: AvailabilityEntry[];
  showDateFilter: boolean;
  startDate: string;
  endDate: string;
  setShowDateFilter: (show: boolean) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  formatDateOnly: (dateString: string) => string;
  formatTime: (timeString: string) => string;
}

export default function ScheduleAvailability({
  availabilityData,
  filteredAvailabilityData,
  showDateFilter,
  startDate,
  endDate,
  setShowDateFilter,
  setStartDate,
  setEndDate,
  formatDateOnly,
  formatTime
}: ScheduleAvailabilityProps) {
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'available' | 'unavailable'>('all');

  // Convert UTC time to Philippine Time (UTC+8)
  const convertToPHTime = (utcTimeString: string): string => {
    const utcDate = new Date(utcTimeString);
    // Add 8 hours for Philippine Time
    const phDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
    
    return phDate.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateToPH = (utcTimeString: string): string => {
    const utcDate = new Date(utcTimeString);
    const phDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
    
    return phDate.toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if an entry is unavailable based on title/note content
  const isUnavailable = (item: AvailabilityEntry): boolean => {
    if (item.is_available === false) return true;
    const titleLower = item.title?.toLowerCase() || '';
    return titleLower.includes('unavailable') || 
           titleLower.includes('ooo') || 
           titleLower.includes('out of office') ||
           titleLower.includes('not available');
  };

  // Filter data based on availability status
  const statusFilteredData = filteredAvailabilityData.filter(item => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'available') return !isUnavailable(item);
    if (statusFilter === 'unavailable') return isUnavailable(item);
    return true;
  });

  const availableCount = filteredAvailabilityData.filter(item => !isUnavailable(item)).length;
  const unavailableCount = filteredAvailabilityData.filter(item => isUnavailable(item)).length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Schedule & Availability</h3>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-600 font-medium">Philippine Time</span>
          </div>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500">{statusFilteredData.length} slots</span>
          <div className="text-xs text-gray-400 mt-1">
            <span className="text-green-600">{availableCount} available</span> • 
            <span className="text-red-600 ml-1">{unavailableCount} unavailable</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showDateFilter && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          {/* Date Range Filter */}
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                const today = new Date();
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(today.getDate() + 30);
                setStartDate(today.toISOString().split('T')[0]);
                setEndDate(thirtyDaysFromNow.toISOString().split('T')[0]);
              }}
              className="mt-6 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset to 30 days
            </button>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Availability Status</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All ({filteredAvailabilityData.length})
              </button>
              <button
                onClick={() => setStatusFilter('available')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'available'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Available ({availableCount})
              </button>
              <button
                onClick={() => setStatusFilter('unavailable')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'unavailable'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Unavailable ({unavailableCount})
              </button>
            </div>
          </div>
        </div>
      )}
      
      {statusFilteredData.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {statusFilter === 'all' 
              ? 'No availability in selected date range' 
              : `No ${statusFilter} slots in selected date range`
            }
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {showDateFilter ? 'Try adjusting the filters' : 'Driver hasn\'t set their availability yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {statusFilteredData.map((availability) => {
            const startTime = new Date(availability.start_time);
            const endTime = new Date(availability.end_time);
            const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
            const isAvailable = !isUnavailable(availability);
            
            return (
              <div 
                key={availability.id} 
                className={`border rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-white h-fit ${
                  isAvailable 
                    ? 'border-green-200 hover:border-green-300' 
                    : 'border-red-200 hover:border-red-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  {isAvailable ? (
                    <CheckCircle className="w-7 h-7 text-green-600" />
                  ) : (
                    <XCircle className="w-7 h-7 text-red-600" />
                  )}
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    isAvailable
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 leading-tight">
                    {formatDateToPH(availability.start_time)}
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Time (PH)</p>
                      <p className="text-base font-medium text-gray-900">
                        {convertToPHTime(availability.start_time)} - {convertToPHTime(availability.end_time)}
                      </p>  
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Duration</p>
                      <p className="text-base font-medium text-gray-900">{duration} hours</p>
                    </div>

                    {availability.title && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Note</p>
                        <p className="text-sm text-gray-600">{availability.title}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}