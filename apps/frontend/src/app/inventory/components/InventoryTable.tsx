'use client';

import React, { useState, useMemo } from 'react';
import { InventoryItem, EditQtyItem } from '../types/inventory.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Search, ChevronUp, ChevronDown } from 'lucide-react';

interface InventoryTableProps {
  inventory: InventoryItem[];
  onEditQuantity: (item: EditQtyItem) => void;
  onViewProduct: (item: InventoryItem) => void;
}

const sortOptions = [
  { label: 'Name A-Z', value: 'name-az' },
  { label: 'Name Z-A', value: 'name-za' },
  { label: 'Quantity High-Low', value: 'qty-high' },
  { label: 'Quantity Low-High', value: 'qty-low' },
  { label: 'Weight High-Low', value: 'weight-high' },
  { label: 'Weight Low-High', value: 'weight-low' },
];

const pageSizeOptions = [10, 25, 50, 100];

// Column configuration
const columnConfig = {
  name: { label: 'Product Name', key: 'name', defaultVisible: true },
  quantity: { label: 'Quantity', key: 'quantity', defaultVisible: true },
  actions: { label: 'Actions', key: 'actions', defaultVisible: true },
  weight: { label: 'Weight (kg)', key: 'weight', defaultVisible: true },
  volume: { label: 'Volume (m³)', key: 'volume', defaultVisible: true },
  fragile: { label: 'Fragile', key: 'fragile', defaultVisible: true },
  location: { label: 'Location', key: 'location', defaultVisible: true },
};

export const InventoryTable = ({ inventory, onEditQuantity, onViewProduct }: InventoryTableProps) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-az');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultVisible: Record<string, boolean> = {};
    Object.entries(columnConfig).forEach(([key, config]) => {
      defaultVisible[key] = config.defaultVisible;
    });
    return defaultVisible;
  });

  const filtered = useMemo(() => {
    return inventory.filter((item) =>
      item.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.products?.weight?.toString().includes(search) ||
      item.products?.volume?.toString().includes(search) ||
      item.quantity.toString().includes(search)
    );
  }, [inventory, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aName = (a.products?.name || '').toLowerCase();
      const bName = (b.products?.name || '').toLowerCase();
      const aQty = a.quantity || 0;
      const bQty = b.quantity || 0;
      const aWeight = parseFloat(a.products?.weight || '0') || 0;
      const bWeight = parseFloat(b.products?.weight || '0') || 0;

      switch (sort) {
        case 'name-az':
          return aName.localeCompare(bName);
        case 'name-za':
          return bName.localeCompare(aName);
        case 'qty-high':
          return bQty - aQty;
        case 'qty-low':
          return aQty - bQty;
        case 'weight-high':
          return bWeight - aWeight;
        case 'weight-low':
          return aWeight - bWeight;
        default:
          return 0;
      }
    });
  }, [filtered, sort]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const getVisibleColumnCount = () => {
    return Object.values(visibleColumns).filter(Boolean).length;
  };

  const getQuantityDisplay = (item: InventoryItem) => {
    const isLowStock = item.quantity <= 3;
    return (
      <div className="flex items-center gap-2">
        <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
          {item.quantity}
        </span>
        {isLowStock && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
            Low Stock
          </span>
        )}
      </div>
    );
  };

  const getActionsDisplay = (item: InventoryItem) => {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEditQuantity({
            id: item.id,
            currentQty: item.quantity,
            mode: 'add',
          })}
          className="w-8 h-8 rounded-full bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center text-sm font-bold transition-colors"
          title="Add quantity"
        >
          +
        </button>
        <button
          onClick={() => onEditQuantity({
            id: item.id,
            currentQty: item.quantity,
            mode: 'subtract',
          })}
          className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center text-sm font-bold transition-colors"
          title="Subtract quantity"
        >
          -
        </button>
      </div>
    );
  };

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No inventory found.</div>
        <p className="text-gray-400 mt-2">Start by adding some inventory items.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow">
      {/* Header Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">Inventory Items</h2>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 w-full md:w-64 text-gray-900"
              />
            </div>
            
            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-gray-900"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            
            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-gray-900"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
            
            {/* Column Settings */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 text-gray-900 hover:bg-orange-50 transition-colors flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Columns ({getVisibleColumnCount()})
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Table Column Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {Object.entries(columnConfig).map(([key, config]) => (
                    <label key={key} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[key]}
                        onChange={(e) => {
                          setVisibleColumns(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }));
                        }}
                        className="form-checkbox h-4 w-4 text-orange-500 rounded focus:ring-orange-400"
                      />
                      <span className="text-sm text-gray-700">{config.label}</span>
                    </label>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-gray-900">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {visibleColumns.name && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Product Name
                </th>
              )}
                             {visibleColumns.quantity && (
                 <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                   Quantity
                 </th>
               )}
               {visibleColumns.actions && (
                 <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                   Actions
                 </th>
               )}
              {visibleColumns.weight && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Weight (kg)
                </th>
              )}
              {visibleColumns.volume && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Volume (m³)
                </th>
              )}
              {visibleColumns.fragile && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Fragile
                </th>
              )}
              {visibleColumns.location && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Location
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 transition-colors"
              >
                                 {visibleColumns.name && (
                   <td className="px-6 py-4">
                     <button
                       onClick={() => onViewProduct(item)}
                       className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left"
                     >
                       {item.products?.name ?? 'Unknown'}
                     </button>
                   </td>
                 )}
                                 {visibleColumns.quantity && (
                   <td className="px-6 py-4">
                     {getQuantityDisplay(item)}
                   </td>
                 )}
                 {visibleColumns.actions && (
                   <td className="px-6 py-4">
                     {getActionsDisplay(item)}
                   </td>
                 )}
                {visibleColumns.weight && (
                  <td className="px-6 py-4 text-gray-700">
                    {item.products?.weight ? `${item.products.weight} kg` : '-'}
                  </td>
                )}
                {visibleColumns.volume && (
                  <td className="px-6 py-4 text-gray-700">
                    {item.products?.volume ? `${item.products.volume} m³` : '-'}
                  </td>
                )}
                {visibleColumns.fragile && (
                  <td className="px-6 py-4">
                    {item.products?.is_fragile ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        No
                      </span>
                    )}
                  </td>
                )}
                {visibleColumns.location && (
                  <td className="px-6 py-4 text-gray-700 font-mono text-sm">
                    {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, sorted.length)} of {sorted.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};