'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit, Trash2, Package, Mail, Phone, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import EditSupplierModal from '@/components/Suppliers/EditSupplierModal';
import SupplierItemsModal from '@/components/Suppliers//SupplierItemModal'

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string | null;
  variant_count?: number;
}

const ITEMS_PER_PAGE = 10;

export default function ManageSuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewingSupplierItems, setViewingSupplierItems] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchSuppliers();
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Handle body scroll lock when any modal is open
  useEffect(() => {
    if (showCreateModal || editingSupplier || showDeleteConfirm || viewingSupplierItems) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [showCreateModal, editingSupplier, showDeleteConfirm, viewingSupplierItems]);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('inventory_suppliers')
        .select('*')
        .order('name');

      if (suppliersError) throw suppliersError;

      const suppliersWithCounts = await Promise.all(
        (suppliersData || []).map(async (supplier) => {
          const { count } = await supabase
            .from('inventory_items_variants')
            .select('*', { count: 'exact', head: true })
            .eq('supplier_id', supplier.id);

          return {
            ...supplier,
            variant_count: count || 0
          };
        })
      );

      setSuppliers(suppliersWithCounts);
    } catch (err: any) {
      setError(err.message || 'Error loading suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;

      fetchSuppliers();
      setShowDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || 'Error deleting supplier');
    }
  };

  const handleSupplierUpdated = () => {
    fetchSuppliers();
    setEditingSupplier(null);
    setShowCreateModal(false);
  };

  // Pagination logic
  const totalPages = Math.ceil(suppliers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSuppliers = suppliers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Loading suppliers...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        <div 
          className={`max-w-6xl mx-auto transition-all duration-700 ease-out ${
            isVisible 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-8'
          }`}
        >
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/inventory/dashboard')}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 transition-all duration-200 hover:scale-105"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Supplier
              </button>
            </div>
            <p className="text-gray-600 ml-14">Manage your inventory suppliers</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                All Suppliers ({suppliers.length})
              </h2>
            </div>

            {suppliers.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 text-lg font-medium">No suppliers yet</div>
                <p className="text-gray-400 mt-2">Add your first supplier to get started.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {currentSuppliers.map((supplier) => (
                    <div 
                      key={supplier.id} 
                      className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setViewingSupplierItems(supplier)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                            {supplier.variant_count !== undefined && supplier.variant_count > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                <Package className="w-3 h-3" />
                                {supplier.variant_count} variant{supplier.variant_count !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            {supplier.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <a 
                                  href={`mailto:${supplier.email}`} 
                                  className="hover:text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {supplier.email}
                                </a>
                              </div>
                            )}
                            
                            {supplier.phone_number && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <a 
                                  href={`tel:${supplier.phone_number}`} 
                                  className="hover:text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {supplier.phone_number}
                                </a>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-3">
                              <Calendar className="w-3 h-3" />
                              Added {new Date(supplier.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSupplier(supplier);
                            }}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit supplier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(supplier.id);
                            }}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete supplier"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, suppliers.length)} of {suppliers.length} suppliers
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`px-3 py-1 rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals rendered at root level, outside scrollable content */}
      {showCreateModal && (
        <EditSupplierModal
          supplier={null}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSupplierUpdated}
        />
      )}

      {editingSupplier && (
        <EditSupplierModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSuccess={handleSupplierUpdated}
        />
      )}

      {viewingSupplierItems && (
        <SupplierItemsModal
          supplierId={viewingSupplierItems.id}
          supplierName={viewingSupplierItems.name}
          onClose={() => setViewingSupplierItems(null)}
        />
      )}

      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ position: 'fixed' }}
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Supplier</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this supplier? 
              {suppliers.find(s => s.id === showDeleteConfirm)?.variant_count ? (
                <span className="block mt-2 text-red-600 font-medium">
                  ⚠️ This supplier is linked to {suppliers.find(s => s.id === showDeleteConfirm)?.variant_count} variant(s). 
                  The supplier_id will be set to null for these variants.
                </span>
              ) : null}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSupplier(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}