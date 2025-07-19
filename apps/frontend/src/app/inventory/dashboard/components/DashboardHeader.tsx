'use client';

import { Plus, FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardHeader() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`flex justify-between items-start mb-8 transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div>
        <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
        <p className="mt-2 text-gray-700">Manage your inventory items and track stock levels</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/inventory/categories')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          <FolderOpen className="h-4 w-4" />
          Categories
        </button>
        <button
          onClick={() => router.push('/inventory/add')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New Item
        </button>
      </div>
    </div>
  );
} 