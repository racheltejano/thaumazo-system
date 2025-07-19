'use client';

import DashboardHeader from './components/DashboardHeader';
import StatsCards from './components/StatsCards';
import SearchBar from './components/SearchBar';
import InventoryItemsGrid from './components/InventoryItemsGrid';

export default function InventoryDashboardPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardHeader />
        <StatsCards />
        <SearchBar />
        <InventoryItemsGrid />
      </div>
    </div>
  );
} 