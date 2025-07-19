'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, X, Check } from 'lucide-react';
import { useCategories, Category } from '@/hooks/useCategories';

interface CategorySelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export default function CategorySelector({ 
  value, 
  onChange, 
  placeholder = "Select or create category",
  className = ""
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { categories, loading, createCategory } = useCategories();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateCategory = async (name: string) => {
    if (!name.trim()) return;

    setCreating(true);
    try {
      const newCategory = await createCategory(name);
      if (newCategory) {
        // Set as selected value
        onChange(newCategory.id);
        setSearchTerm('');
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (searchTerm.trim() && !filteredCategories.some(cat => cat.name.toLowerCase() === searchTerm.toLowerCase())) {
      handleCreateCategory(searchTerm);
    }
  };

  const selectedCategory = categories.find(cat => cat.id === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className="w-full border border-gray-300 bg-white text-gray-900 p-3 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 text-sm cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedCategory ? (
              <span className="text-gray-900">{selectedCategory.name}</span>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <Plus className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-500 text-sm">
                Loading categories...
              </div>
            ) : (
              <>
                {/* Create new category option */}
                {searchTerm.trim() && 
                 !filteredCategories.some(cat => cat.name.toLowerCase() === searchTerm.toLowerCase()) && (
                  <div
                    className="flex items-center gap-2 p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                    onClick={handleCreateNew}
                  >
                    <Plus className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600 font-medium">
                      Create "{searchTerm}"
                    </span>
                    {creating && (
                      <div className="ml-auto">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Existing categories */}
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center gap-2 p-3 hover:bg-gray-50 cursor-pointer"
                                             onClick={() => handleSelect(category.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{category.name}</div>
                        {category.description && (
                          <div className="text-xs text-gray-500 truncate">{category.description}</div>
                        )}
                      </div>
                                             {category.id === value && (
                         <Check className="h-4 w-4 text-blue-600" />
                       )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    {searchTerm ? 'No categories found' : 'No categories available'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 