'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryMovement } from '@/types/inventory.types';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  ChevronDown,
  Calendar
} from 'lucide-react';

interface ItemMovementsListProps {
  movements: InventoryMovement[];
  title?: string;
  emptyMessage?: string;
  emptyDescription?: string;
}

export default function ItemMovementsList({ 
  movements, 
  title = "Recent Activity",
  emptyMessage = "No activity yet",
  emptyDescription = "Activity will appear here when you add or remove stock from any variant."
}: ItemMovementsListProps) {
  const router = useRouter();
  const [expandedMovements, setExpandedMovements] = useState<Set<string>>(new Set());

  const getMovementTypeIcon = (type: string) => {
    return type === 'stock_in' ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getMovementTypeLabel = (type: string) => {
    return type === 'stock_in' ? 'Stock In' : 'Stock Out';
  };

  const getMovementTypeColor = (type: string) => {
    return type === 'stock_in' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
  };

  const getReferenceTypeLabel = (referenceType: string) => {
    const labels: Record<string, string> = {
      'purchase_order': 'Purchase Order',
      'customer_sale': 'Customer Sale',
      'adjustment': 'Adjustment',
      'manual_correction': 'Manual Correction',
      'initial_stock': 'Initial Stock'
    };
    return labels[referenceType] || referenceType;
  };

  const toggleMovementExpansion = (movementId: string) => {
    setExpandedMovements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(movementId)) {
        newSet.delete(movementId);
      } else {
        newSet.add(movementId);
      }
      return newSet;
    });
  };

  const handleVariantClick = (variantId: string) => {
    router.push(`/inventory/item-variant/${variantId}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          {title}
        </h2>
      </div>

      {movements.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-gray-500 text-lg">{emptyMessage}</div>
          <p className="text-gray-400 mt-2">{emptyDescription}</p>
        </div>
      ) : (
        <div className="p-6">
          <div className="space-y-4">
            {movements.map((movement) => {
              const isExpanded = expandedMovements.has(movement.id);
              return (
                <div key={movement.id} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                  {/* Collapsed View */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleMovementExpansion(movement.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-300">
                          {getMovementTypeIcon(movement.movement_type)}
                        </div>
                      </div>
                                             <div>
                         <div className="flex items-center gap-2">
                           <span className="font-medium">
                             {movement.inventory_items_variants?.variant_name || 'Unknown Variant'}
                           </span>
                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.movement_type)}`}>
                             {movement.quantity} units
                           </span>
                         </div>
                         <div className="text-sm text-gray-500 font-mono">
                           {movement.inventory_items_variants?.sku || 'N/A'}
                         </div>
                       </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(movement.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200 bg-white">
                                             <div className="pt-4 space-y-3">
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-gray-600">SKU:</span>
                           <button 
                             onClick={() => handleVariantClick(movement.variant_id)}
                             className="text-sm font-mono px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                           >
                             {movement.inventory_items_variants?.sku || 'N/A'}
                           </button>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-gray-600">Transaction Type:</span>
                           <span className="text-sm">
                             {movement.reference_type ? getReferenceTypeLabel(movement.reference_type) : 
                              movement.remarks === 'Initial stock' ? 'Initial Stock' : 
                              getMovementTypeLabel(movement.movement_type)}
                           </span>
                         </div>
                                                 <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-gray-600">Change:</span>
                           <span className="text-sm">
                             From {movement.old_stock} units to {movement.new_stock} units
                           </span>
                         </div>
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-gray-600">
                             {movement.movement_type === 'stock_in' ? 'Cost:' : 'Earnings:'}
                           </span>
                           <span className={`text-sm font-semibold ${movement.movement_type === 'stock_in' ? 'text-red-600' : 'text-green-600'}`}>
                             {movement.price_at_movement 
                               ? `₱${(movement.price_at_movement * movement.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                               : 'N/A'
                             }
                           </span>
                         </div>
                        {movement.reference_id && movement.reference_id !== '' && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Reference ID:</span>
                            <span className="text-sm font-mono">{movement.reference_id}</span>
                          </div>
                        )}
                        {movement.remarks && movement.remarks !== 'Initial stock' && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Remarks:</span>
                            <span className="text-sm">{movement.remarks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 