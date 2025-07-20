'use client';

import React, { useState, useMemo } from 'react';
import { InventoryItem } from '@/types/inventory.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Search, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface InventoryTableProps {
  inventory: InventoryItem[];
  onEditQuantity: (item: any) => void;
  onViewProduct: (item: InventoryItem) => void;
}

const sortOptions = [
  { label: 'Name A-Z', value: 'name-az' },
  { label: 'Name Z-A', value: 'name-za' },
  { label: 'Variants High-Low', value: 'variants-high' },
  { label: 'Variants Low-High', value: 'variants-low' },
  { label: 'Total Stock High-Low', value: 'stock-high' },
  { label: 'Total Stock Low-High', value: 'stock-low' },
  { label: 'Total Value High-Low', value: 'value-high' },
  { label: 'Total Value Low-High', value: 'value-low' },
];

const pageSizeOptions = [10, 25, 50, 100];

// Column configuration
const columnConfig = {
  name: { label: 'Item Name', key: 'name', defaultVisible: true },
  category: { label: 'Category', key: 'category', defaultVisible: true },
  variants: { label: 'Variants', key: 'variants', defaultVisible: true },
  totalStock: { label: 'Total Stock', key: 'totalStock', defaultVisible: true },
  totalCost: { label: 'Total Cost', key: 'totalCost', defaultVisible: true },
  totalValue: { label: 'Total Value', key: 'totalValue', defaultVisible: true },
  actions: { label: 'Actions', key: 'actions', defaultVisible: true },
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
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.inventory_items_categories?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      (item.variantsCount || 0).toString().includes(search) ||
      (item.totalStock || 0).toString().includes(search)
    );
  }, [inventory, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aVariants = a.variantsCount || 0;
      const bVariants = b.variantsCount || 0;
      const aStock = a.totalStock || 0;
      const bStock = b.totalStock || 0;
      const aValue = a.totalValue || 0;
      const bValue = b.totalValue || 0;

      switch (sort) {
        case 'name-az':
          return aName.localeCompare(bName);
        case 'name-za':
          return bName.localeCompare(aName);
        case 'variants-high':
          return bVariants - aVariants;
        case 'variants-low':
          return aVariants - bVariants;
        case 'stock-high':
          return bStock - aStock;
        case 'stock-low':
          return aStock - bStock;
        case 'value-high':
          return bValue - aValue;
        case 'value-low':
          return aValue - bValue;
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

  const getVariantsDisplay = (item: InventoryItem) => {
    const count = item.variantsCount || 0;
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{count}</span>
        {count === 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
            No Variants
          </span>
        )}
      </div>
    );
  };

  const getStockDisplay = (item: InventoryItem) => {
    const stock = item.totalStock || 0;
    const isLowStock = stock <= 3;
    return (
      <div className="flex items-center gap-2">
        <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
          {stock}
        </span>
        {isLowStock && stock > 0 && (
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
        <Link
          href={`/inventory/item/${item.id}`}
          className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center text-sm font-bold transition-colors"
          title="View item details"
        >
          👁️
        </Link>
        <button
          onClick={() => onViewProduct(item)}
          className="w-8 h-8 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center justify-center text-sm font-bold transition-colors"
          title="Edit item"
        >
          ✏️
        </button>
      </div>
    );
  };

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No inventory items found.</div>
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
                placeholder="Search items..."
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
                  Item Name
                </th>
              )}
              {visibleColumns.category && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Category
                </th>
              )}
              {visibleColumns.variants && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Variants
                </th>
              )}
              {visibleColumns.totalStock && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Total Stock
                </th>
              )}
              {visibleColumns.totalCost && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Total Cost
                </th>
              )}
              {visibleColumns.totalValue && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Total Value
                </th>
              )}
              {visibleColumns.actions && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
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
                      {item.name || 'Unknown'}
                    </button>
                  </td>
                )}
                {visibleColumns.category && (
                  <td className="px-6 py-4 text-gray-700">
                    {item.inventory_items_categories?.name || '-'}
                  </td>
                )}
                {visibleColumns.variants && (
                  <td className="px-6 py-4">
                    {getVariantsDisplay(item)}
                  </td>
                )}
                {visibleColumns.totalStock && (
                  <td className="px-6 py-4">
                    {getStockDisplay(item)}
                  </td>
                )}
                {visibleColumns.totalCost && (
                  <td className="px-6 py-4 text-gray-700">
                    ${(item.totalCost || 0).toFixed(2)}
                  </td>
                )}
                {visibleColumns.totalValue && (
                  <td className="px-6 py-4 text-gray-700">
                    ${(item.totalValue || 0).toFixed(2)}
                  </td>
                )}
                {visibleColumns.actions && (
                  <td className="px-6 py-4">
                    {getActionsDisplay(item)}
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
              className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};