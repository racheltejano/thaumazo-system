import { Calendar, Filter } from 'lucide-react';

interface AvailabilityEntry {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  created_at: string;
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
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Schedule & Availability</h3>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
        <span className="text-sm text-gray-500">{filteredAvailabilityData.length} slots</span>
      </div>

      {/* Date Range Filter */}
      {showDateFilter && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
        </div>
      )}
      
      {filteredAvailabilityData.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No availability in selected date range</p>
          <p className="text-gray-400 text-sm mt-2">
            {showDateFilter ? 'Try adjusting the date range' : 'Driver hasn\'t set their availability yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAvailabilityData.map((availability) => {
            const duration = Math.round((new Date(availability.end_time).getTime() - new Date(availability.start_time).getTime()) / (1000 * 60 * 60));
            
            return (
              <div 
                key={availability.id} 
                className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300 bg-white h-fit"
              >
                <div className="flex items-start justify-between mb-4">
                  <Calendar className="w-7 h-7 text-blue-600" />
                  <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                    Available
                  </span>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg mb-4 leading-tight">
                    {formatDateOnly(availability.start_time)}
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Time</p>
                      <p className="text-base font-medium text-gray-900">
                        {formatTime(availability.start_time)} - {formatTime(availability.end_time)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Duration</p>
                      <p className="text-base font-medium text-gray-900">{duration} hours</p>
                    </div>
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