'use client';

import React, { useState, useMemo } from 'react';
import { InventoryItemVariant, EditStockItem } from '@/types/inventory.types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Search, ChevronUp, ChevronDown } from 'lucide-react';

interface InventoryTableProps {
  inventory: InventoryItemVariant[];
  onEditQuantity: (item: EditStockItem) => void;
  onViewProduct: (item: InventoryItemVariant) => void;
}

const sortOptions = [
  { label: 'Name A-Z', value: 'name-az' },
  { label: 'Name Z-A', value: 'name-za' },
  { label: 'Stock High-Low', value: 'stock-high' },
  { label: 'Stock Low-High', value: 'stock-low' },
  { label: 'SKU A-Z', value: 'sku-az' },
  { label: 'SKU Z-A', value: 'sku-za' },
  { label: 'Price High-Low', value: 'price-high' },
  { label: 'Price Low-High', value: 'price-low' },
];

const pageSizeOptions = [10, 25, 50, 100];

// Column configuration
const columnConfig = {
  name: { label: 'Item Name', key: 'name', defaultVisible: true },
  sku: { label: 'SKU', key: 'sku', defaultVisible: true },
  stock: { label: 'Current Stock', key: 'stock', defaultVisible: true },
  supplier: { label: 'Supplier', key: 'supplier', defaultVisible: true },
  costPrice: { label: 'Cost Price', key: 'costPrice', defaultVisible: true },
  sellingPrice: { label: 'Selling Price', key: 'sellingPrice', defaultVisible: true },
  packaging: { label: 'Packaging', key: 'packaging', defaultVisible: true },
  fragile: { label: 'Fragile', key: 'fragile', defaultVisible: true },
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
      item.inventory_items?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.current_stock?.toString().includes(search) ||
      item.cost_price?.toString().includes(search) ||
      item.selling_price?.toString().includes(search)
    );
  }, [inventory, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aName = (a.inventory_items?.name || '').toLowerCase();
      const bName = (b.inventory_items?.name || '').toLowerCase();
      const aStock = a.current_stock || 0;
      const bStock = b.current_stock || 0;
      const aSku = (a.sku || '').toLowerCase();
      const bSku = (b.sku || '').toLowerCase();
      const aCost = a.cost_price || 0;
      const bCost = b.cost_price || 0;

      switch (sort) {
        case 'name-az':
          return aName.localeCompare(bName);
        case 'name-za':
          return bName.localeCompare(aName);
        case 'stock-high':
          return bStock - aStock;
        case 'stock-low':
          return aStock - bStock;
        case 'sku-az':
          return aSku.localeCompare(bSku);
        case 'sku-za':
          return bSku.localeCompare(aSku);
        case 'price-high':
          return bCost - aCost;
        case 'price-low':
          return aCost - bCost;
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

  const getStockDisplay = (item: InventoryItemVariant) => {
    const isLowStock = item.current_stock <= 3;
    return (
      <div className="flex items-center gap-2">
        <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
          {item.current_stock}
        </span>
        {isLowStock && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
            Low Stock
          </span>
        )}
      </div>
    );
  };

  const getActionsDisplay = (item: InventoryItemVariant) => {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEditQuantity({
            variant_id: item.id,
            currentStock: item.current_stock,
            mode: 'add',
            quantity: 1,
          })}
          className="w-8 h-8 rounded-full bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center text-sm font-bold transition-colors"
          title="Add stock"
        >
          +
        </button>
        <button
          onClick={() => onEditQuantity({
            variant_id: item.id,
            currentStock: item.current_stock,
            mode: 'subtract',
            quantity: 1,
          })}
          className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center text-sm font-bold transition-colors"
          title="Subtract stock"
        >
          -
        </button>
      </div>
    );
  };

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No inventory variants found.</div>
        <p className="text-gray-400 mt-2">Start by adding some inventory items and variants.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow">
      {/* Header Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">Inventory Variants</h2>
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
                  Item Name
                </th>
              )}
              {visibleColumns.sku && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  SKU
                </th>
              )}
              {visibleColumns.stock && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Current Stock
                </th>
              )}
              {visibleColumns.supplier && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Supplier
                </th>
              )}
              {visibleColumns.costPrice && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Cost Price
                </th>
              )}
              {visibleColumns.sellingPrice && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Selling Price
                </th>
              )}
              {visibleColumns.packaging && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Packaging
                </th>
              )}
              {visibleColumns.fragile && (
                <th className="px-6 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">
                  Fragile
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
                      {item.inventory_items?.name ?? 'Unknown'}
                    </button>
                  </td>
                )}
                {visibleColumns.sku && (
                  <td className="px-6 py-4 text-gray-700 font-mono">
                    {item.sku}
                  </td>
                )}
                {visibleColumns.stock && (
                  <td className="px-6 py-4">
                    {getStockDisplay(item)}
                  </td>
                )}
                {visibleColumns.supplier && (
                  <td className="px-6 py-4 text-gray-700">
                    {item.supplier_name}
                  </td>
                )}
                {visibleColumns.costPrice && (
                  <td className="px-6 py-4 text-gray-700">
                    {item.cost_price ? `$${item.cost_price.toFixed(2)}` : '-'}
                  </td>
                )}
                {visibleColumns.sellingPrice && (
                  <td className="px-6 py-4 text-gray-700">
                    {item.selling_price ? `$${item.selling_price.toFixed(2)}` : '-'}
                  </td>
                )}
                {visibleColumns.packaging && (
                  <td className="px-6 py-4 text-gray-700">
                    {item.packaging_type || '-'}
                  </td>
                )}
                {visibleColumns.fragile && (
                  <td className="px-6 py-4">
                    {item.is_fragile ? (
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