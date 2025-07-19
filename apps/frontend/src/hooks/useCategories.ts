import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('inventory_items_categories')
        .select('*')
        .order('name');

      if (error) {
        setError(`Error fetching categories: ${error.message}`);
        return;
      }

      setCategories(data || []);
    } catch (err) {
      setError('An unexpected error occurred while fetching categories');
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (name: string, description?: string) => {
    if (!name.trim()) {
      setError('Category name is required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('inventory_items_categories')
        .insert([{
          name: name.trim(),
          description: description?.trim() || null
        }])
        .select()
        .single();

      if (error) {
        setError(`Error creating category: ${error.message}`);
        return null;
      }

      // Add to local state
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err) {
      setError('An unexpected error occurred while creating category');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (id: string, name: string, description?: string) => {
    if (!name.trim()) {
      setError('Category name is required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('inventory_items_categories')
        .update({
          name: name.trim(),
          description: description?.trim() || null
        })
        .eq('id', id);

      if (error) {
        setError(`Error updating category: ${error.message}`);
        return false;
      }

      // Update local state
      setCategories(prev => 
        prev.map(cat => 
          cat.id === id 
            ? { ...cat, name: name.trim(), description: description?.trim() || null }
            : cat
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
      return true;
    } catch (err) {
      setError('An unexpected error occurred while updating category');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('inventory_items_categories')
        .delete()
        .eq('id', id);

      if (error) {
        setError(`Error deleting category: ${error.message}`);
        return false;
      }

      // Remove from local state
      setCategories(prev => prev.filter(cat => cat.id !== id));
      return true;
    } catch (err) {
      setError('An unexpected error occurred while deleting category');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}; 