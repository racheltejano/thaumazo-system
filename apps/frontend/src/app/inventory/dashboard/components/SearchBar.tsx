'use client';

import { Search, Filter, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8 transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Search Input Field */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-colors"
          />
        </div>

        {/* Filter Button */}
        <button className="inline-flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
          <Filter className="h-4 w-4" />
          Create Filter
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 