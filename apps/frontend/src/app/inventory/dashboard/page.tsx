'use client';

import { useState } from 'react';
import DashboardHeader from './components/DashboardHeader';
import StatsCards from './components/StatsCards';
import SearchBar from './components/SearchBar';
import InventoryItemsGrid from './components/InventoryItemsGrid';

export default function InventoryDashboardPage() {
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader />
        <StatsCards />
        <SearchBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType}
          setFilterType={setFilterType}
          filterValue={filterValue}
          setFilterValue={setFilterValue}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
        />
        <InventoryItemsGrid 
          searchQuery={searchQuery}
          filterType={filterType}
          filterValue={filterValue}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </div>
    </div>
  );
} 