'use client';

import { useRouter } from 'next/navigation';

interface InventoryItemCardProps {
  item: {
    id: string;
    name: string;
    description: string;
    stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
    category: string;
    totalStock: number;
    variants: number;
    avgPrice: string;
  };
}

function getStockStatusConfig(status: string) {
  switch (status) {
    case 'in_stock':
      return { bg: 'bg-green-500', text: 'In Stock' };
    case 'low_stock':
      return { bg: 'bg-yellow-500', text: 'Low Stock' };
    case 'out_of_stock':
      return { bg: 'bg-red-500', text: 'Out of Stock' };
    default:
      return { bg: 'bg-gray-500', text: 'Unknown' };
  }
}

export default function InventoryItemCard({ item }: InventoryItemCardProps) {
  const router = useRouter();
  const statusConfig = getStockStatusConfig(item.stockStatus);

  const handleViewDetails = () => {
    router.push(`/inventory/item/${item.id}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 ease-out hover:scale-102 h-80">
      {/* Header with Name and Stock Status */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4 truncate">
          {item.name}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusConfig.bg} flex-shrink-0`}>
          {statusConfig.text}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 mb-4 truncate">
        {item.description}
      </p>

      {/* Info Details */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Category:</span>
          <span className="text-sm font-medium text-gray-900">{item.category}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Total Stock:</span>
          <span className="text-sm font-medium text-gray-900">{item.totalStock}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Variants:</span>
          <span className="text-sm font-medium text-gray-900">{item.variants}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Avg Price:</span>
          <span className="text-sm font-medium text-gray-900">{item.avgPrice}</span>
        </div>
      </div>

      {/* View Details Button */}
      <button 
        onClick={handleViewDetails}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
      >
        View Details
      </button>
    </div>
  );
} 