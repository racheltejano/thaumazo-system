'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InventoryMovement } from '@/types/inventory.types';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  ChevronDown,
  Calendar,
  Package,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  ChevronUp
} from 'lucide-react';

// Helper function to format currency with dynamic sizing
const formatCurrency = (amount: number): string => {
  const formatted = amount.toLocaleString('en-PH', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  // If amount is very large, use abbreviated format
  if (amount >= 1000000) {
    return `₱${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `₱${(amount / 1000).toFixed(1)}K`;
  }
  
  return `₱${formatted}`;
};

interface ActivityLogsHeaderProps {
  isVisible: boolean;
}

function ActivityLogsHeader({ isVisible }: ActivityLogsHeaderProps) {
  return (
    <div 
      className={`flex justify-between items-start mb-8 transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-8'
      }`}
    >
      <div>
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="mt-2 text-gray-700">Track all inventory movements and stock changes across all products</p>
      </div>
    </div>
  );
}

interface ActivityStatsCardsProps {
  movements: InventoryMovement[];
  isVisible: boolean;
}

function ActivityStatsCards({ movements, isVisible }: ActivityStatsCardsProps) {
  const calculateStats = () => {
    if (!movements || movements.length === 0) {
      return {
        totalMovements: 0,
        stockInCount: 0,
        stockOutCount: 0,
        totalValue: 0,
      };
    }

    const stockInMovements = movements.filter(m => m.movement_type === 'stock_in');
    const stockOutMovements = movements.filter(m => m.movement_type === 'stock_out');
    
    const totalValue = movements.reduce((sum, movement) => {
      const variant = movement.inventory_items_variants;
      if (!variant) return sum;
      
      if (movement.movement_type === 'stock_in') {
        return sum + ((variant.cost_price || 0) * movement.quantity);
      } else {
        return sum + ((variant.selling_price || 0) * movement.quantity);
      }
    }, 0);

    return {
      totalMovements: movements.length,
      stockInCount: stockInMovements.length,
      stockOutCount: stockOutMovements.length,
      totalValue,
    };
  };

  const stats = calculateStats();

  const statCards = [
    {
      title: 'Total Movements',
      value: stats.totalMovements.toLocaleString(),
      icon: Package,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-gray-900',
    },
    {
      title: 'Stock In',
      value: stats.stockInCount,
      icon: TrendingUp,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
    },
    {
      title: 'Stock Out',
      value: stats.stockOutCount,
      icon: TrendingDown,
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: Package,
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-gray-900',
      tooltip: 'Total value of all movements\n(cost for stock in, selling price for stock out)',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div 
          key={index}
          className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 cursor-pointer transition-all duration-700 ease-out hover:scale-105 hover:shadow-lg ${
            isVisible 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-8'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                {stat.tooltip && (
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 max-w-xs">
                      <div className="whitespace-pre-line">{stat.tooltip}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
              <p className={`text-3xl font-bold ${stat.valueColor}`}>{stat.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${stat.iconBgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface MovementsTableProps {
  movements: InventoryMovement[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterValue: string;
  setFilterValue: (value: string) => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}

function MovementsTable({ 
  movements, 
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  filterValue,
  setFilterValue,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  showFilters, 
  setShowFilters 
}: MovementsTableProps) {
  const [expandedMovements, setExpandedMovements] = useState<Set<string>>(new Set());
  const router = useRouter();

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
      'manual_correction': 'Manual Correction'
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

  // Filter and sort movements
  const filteredAndSortedMovements = movements
    .filter(movement => {
      // Search filter
      const searchMatch = searchQuery === '' || 
        movement.inventory_items_variants?.variant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.inventory_items_variants?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.inventory_items_variants?.inventory_items?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movement.inventory_items_variants?.inventory_items?.inventory_items_categories?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!searchMatch) return false;
      
      // Additional filters
      if (filterType === 'movement_type' && filterValue) {
        return movement.movement_type === filterValue;
      }
      
      if (filterType === 'category' && filterValue) {
        return movement.inventory_items_variants?.inventory_items?.inventory_items_categories?.name === filterValue;
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        const movementDate = new Date(movement.created_at);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null; // Include entire day
        
        if (fromDate && movementDate < fromDate) return false;
        if (toDate && movementDate > toDate) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'item_name':
          aValue = a.inventory_items_variants?.inventory_items?.name?.toLowerCase() || '';
          bValue = b.inventory_items_variants?.inventory_items?.name?.toLowerCase() || '';
          break;
        case 'variant_name':
          aValue = a.inventory_items_variants?.variant_name?.toLowerCase() || '';
          bValue = b.inventory_items_variants?.variant_name?.toLowerCase() || '';
          break;
        case 'category':
          aValue = a.inventory_items_variants?.inventory_items?.inventory_items_categories?.name?.toLowerCase() || '';
          bValue = b.inventory_items_variants?.inventory_items?.inventory_items_categories?.name?.toLowerCase() || '';
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'movement_type':
          aValue = a.movement_type;
          bValue = b.movement_type;
          break;
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          All Movements
        </h2>
      </div>

      {/* Search and Filter Bar */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col gap-4">
          {/* Search Bar and Controls Row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by item name, variant name, category, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter and Sort Controls */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Sort by Date</option>
              <option value="item_name">Sort by Item Name</option>
              <option value="variant_name">Sort by Variant Name</option>
              <option value="category">Sort by Category</option>
              <option value="quantity">Sort by Quantity</option>
              <option value="movement_type">Sort by Movement Type</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Movement Type</label>
                <select
                  value={filterType === 'movement_type' ? filterValue : ''}
                  onChange={(e) => {
                    setFilterType(e.target.value ? 'movement_type' : '');
                    setFilterValue(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="stock_in">Stock In</option>
                  <option value="stock_out">Stock Out</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
                <select
                  value={filterType === 'category' ? filterValue : ''}
                  onChange={(e) => {
                    setFilterType(e.target.value ? 'category' : '');
                    setFilterValue(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {Array.from(new Set(movements
                    .map(m => m.inventory_items_variants?.inventory_items?.inventory_items_categories?.name)
                    .filter(Boolean)
                  )).sort().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredAndSortedMovements.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-gray-500 text-lg">No movements found</div>
          <p className="text-gray-400 mt-2">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="p-6">
          <div className="space-y-4">
            {filteredAndSortedMovements.map((movement) => {
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
                            {movement.inventory_items_variants?.inventory_items?.name || 'Unknown Item'}
                          </span>
                          <span className="text-gray-500">-</span>
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
                      <div className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Column */}
                          <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-600">SKU:</span>
                          <button 
                            onClick={() => {
                              // Store current page in sessionStorage for back navigation
                              sessionStorage.setItem('lastActivityLogsPage', window.location.pathname);
                              router.push(`/inventory/item-variant/${movement.variant_id}`);
                            }}
                            className="text-sm font-mono px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 rounded border border-gray-300 transition-colors cursor-pointer"
                          >
                            {movement.inventory_items_variants?.sku || 'N/A'}
                          </button>
                        </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">Variant:</span>
                              <span className="text-sm font-medium">
                                {movement.inventory_items_variants?.variant_name || 'Unknown Variant'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-600">Category:</span>
                              <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {movement.inventory_items_variants?.inventory_items?.inventory_items_categories?.name || 'Uncategorized'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Right Column */}
                          <div className="space-y-3">
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
                            From {movement.inventory_items_variants?.current_stock ? 
                              (movement.movement_type === 'stock_in' ? 
                                movement.inventory_items_variants.current_stock - movement.quantity : 
                                movement.inventory_items_variants.current_stock + movement.quantity
                              ) : 0} units to {movement.inventory_items_variants?.current_stock || 0} units
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-600">
                            {movement.movement_type === 'stock_in' ? 'Cost:' : 'Earnings:'}
                          </span>
                          <span className={`text-sm font-semibold ${movement.movement_type === 'stock_in' ? 'text-red-600' : 'text-green-600'}`}>
                            {movement.movement_type === 'stock_in' 
                              ? `₱${((movement.inventory_items_variants?.cost_price || 0) * movement.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `₱${((movement.inventory_items_variants?.selling_price || 0) * movement.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

export default function ActivityLogsPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: movementsData, error: movementsError } = await supabase
        .from('inventory_items_movements')
        .select(`
          *,
          inventory_items_variants (
            id,
            variant_name,
            sku,
            current_stock,
            cost_price,
            selling_price,
            inventory_items (
              id,
              name,
              category_id,
              inventory_items_categories (
                id,
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (movementsError) {
        setError('Error loading movements');
        setLoading(false);
        return;
      }

      setMovements(movementsData || []);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Loading activity logs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <ActivityLogsHeader isVisible={isVisible} />
        <ActivityStatsCards movements={movements} isVisible={isVisible} />
        <MovementsTable 
          movements={movements}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType}
          setFilterType={setFilterType}
          filterValue={filterValue}
          setFilterValue={setFilterValue}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
        />
      </div>
    </div>
  );
} 