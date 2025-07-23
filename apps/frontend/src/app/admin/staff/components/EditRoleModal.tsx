import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, AlertCircle } from 'lucide-react';

interface EditRoleModalProps {
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const roleOptions = [
  { value: 'driver', label: 'Driver', description: 'Delivery driver' },
  { value: 'inventory_staff', label: 'Inventory Staff', description: 'Warehouse staff' },
  { value: 'dispatcher', label: 'Dispatcher', description: 'Order dispatcher' },
];

export const EditRoleModal = ({ staff, isOpen, onClose, onSuccess }: EditRoleModalProps) => {
  const [selectedRole, setSelectedRole] = useState(staff.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Don't allow editing admin roles
  const isAdminUser = staff.role === 'admin';

  const handleSave = async () => {
    if (selectedRole === staff.role) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', staff.id);

      if (updateError) {
        throw updateError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit User Role</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* User Info */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-medium">
                  {`${staff.first_name || ''} ${staff.last_name || ''}`.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {`${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unknown User'}
                </p>
                <p className="text-sm text-gray-500">{staff.email}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Current Role: <span className="font-medium capitalize">{staff.role.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Admin Warning */}
          {isAdminUser && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Cannot Edit Admin Role</h3>
                  <p className="text-sm text-red-600 mt-1">
                    Administrator roles cannot be modified for security reasons.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Role Selection */}
          {!isAdminUser && (
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-700">
                Select New Role
              </label>
              {roleOptions.map((option) => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selectedRole === option.value}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-400"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-xs text-blue-600">
              <strong>Security Notice:</strong> Admin roles cannot be assigned or modified through this interface for security purposes.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {!isAdminUser && (
            <button
              onClick={handleSave}
              disabled={loading || selectedRole === staff.role}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 border border-transparent rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update Role
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};