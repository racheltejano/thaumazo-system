'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Mail, Phone, User } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string | null;
}

interface EditSupplierModalProps {
  supplier: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditSupplierModal({ supplier, onClose, onSuccess }: EditSupplierModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    email: '',
    phone_number: ''
  });

  const isCreating = !supplier;

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        email: supplier.email || '',
        phone_number: supplier.phone_number || ''
      });
    }
  }, [supplier]);

  const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors = {
      name: '',
      email: '',
      phone_number: ''
    };

    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Supplier name is required';
      isValid = false;
    }

    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const supplierData = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone_number: formData.phone_number.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (isCreating) {
        const { error: insertError } = await supabase
          .from('inventory_suppliers')
          .insert([supplierData]);

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('inventory_suppliers')
          .update(supplierData)
          .eq('id', supplier.id);

        if (updateError) throw updateError;
      }

      onSuccess();
    } catch (err: any) {
      if (err.code === '23505') {
        setError('A supplier with this name already exists');
      } else {
        setError(err.message || `Error ${isCreating ? 'creating' : 'updating'} supplier`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isCreating ? 'Add New Supplier' : 'Edit Supplier'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isCreating ? 'Add a new supplier to your inventory' : 'Update supplier information'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter supplier name"
                  required
                />
              </div>
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="supplier@example.com"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+63 912 345 6789"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : isCreating ? 'Add Supplier' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}