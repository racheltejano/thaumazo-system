'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import Image from 'next/image';
import { geocodePhilippineAddress } from '@/lib/maps';

export default function WarehouseSettings() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;

  // Warehouse state
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseContactPerson, setWarehouseContactPerson] = useState('');
  const [warehouseContactNumber, setWarehouseContactNumber] = useState('');
  const [warehousePickupAddress, setWarehousePickupAddress] = useState('');
  const [warehouseLandmark, setWarehouseLandmark] = useState('');
  const [warehousePickupArea, setWarehousePickupArea] = useState('');
  const [warehouseLatitude, setWarehouseLatitude] = useState<number | null>(null);
  const [warehouseLongitude, setWarehouseLongitude] = useState<number | null>(null);
  const [warehouseLoading, setWarehouseLoading] = useState(false);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  
  // Saved warehouse state for comparison
  const [savedWarehouseName, setSavedWarehouseName] = useState('');
  const [savedWarehouseContactPerson, setSavedWarehouseContactPerson] = useState('');
  const [savedWarehouseContactNumber, setSavedWarehouseContactNumber] = useState('');
  const [savedWarehousePickupAddress, setSavedWarehousePickupAddress] = useState('');
  const [savedWarehouseLandmark, setSavedWarehouseLandmark] = useState('');
  const [savedWarehousePickupArea, setSavedWarehousePickupArea] = useState('');
  const [savedWarehouseLatitude, setSavedWarehouseLatitude] = useState<number | null>(null);
  const [savedWarehouseLongitude, setSavedWarehouseLongitude] = useState<number | null>(null);

  // Validation errors
  const [warehouseErrors, setWarehouseErrors] = useState({
    contactNumber: '',
    pickupAddress: '',
  });

  // Address validation state
  const [addressValidation, setAddressValidation] = useState({
    isValid: false,
    isValidating: false,
    coordinates: null as { lat: number; lon: number } | null,
  });

  const [fieldTouched, setFieldTouched] = useState(false);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

  // Check if warehouse changes have been made
  const hasWarehouseChanges = () => {
    return (
      warehouseName !== savedWarehouseName ||
      warehouseContactPerson !== savedWarehouseContactPerson ||
      warehouseContactNumber !== savedWarehouseContactNumber ||
      warehousePickupAddress !== savedWarehousePickupAddress ||
      warehouseLandmark !== savedWarehouseLandmark ||
      warehousePickupArea !== savedWarehousePickupArea ||
      warehouseLatitude !== savedWarehouseLatitude ||
      warehouseLongitude !== savedWarehouseLongitude
    );
  };

  // Validate Philippine phone number
  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    const ph09Pattern = /^09\d{9}$/;
    const ph639Pattern = /^\+639\d{9}$/;
    return ph09Pattern.test(cleaned) || ph639Pattern.test(cleaned);
  };

  // Get Mapbox static map URL
  const getMapboxMapUrl = (lat: number, lon: number) =>
    `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff0000(${lon},${lat})/${lon},${lat},16/600x200?access_token=${MAPBOX_TOKEN}`;

  // Handle address blur (validate when user leaves the field)
  const handleAddressBlur = async () => {
    setFieldTouched(true);

    if (!warehousePickupAddress.trim()) {
      setAddressValidation({
        isValid: false,
        isValidating: false,
        coordinates: null,
      });
      return;
    }

    setAddressValidation({
      isValid: false,
      isValidating: true,
      coordinates: null,
    });

    try {
      const coords = await geocodePhilippineAddress(warehousePickupAddress);
      if (coords) {
        setWarehouseLatitude(coords.lat);
        setWarehouseLongitude(coords.lon);
        setAddressValidation({
          isValid: true,
          isValidating: false,
          coordinates: coords,
        });
        setWarehouseErrors(prev => ({ ...prev, pickupAddress: '' }));
      } else {
        setAddressValidation({
          isValid: false,
          isValidating: false,
          coordinates: null,
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setAddressValidation({
        isValid: false,
        isValidating: false,
        coordinates: null,
      });
    }
  };

  // Fetch warehouse settings on mount
  useEffect(() => {
    const fetchWarehouseSettings = async () => {
      if (!user?.id || role !== 'inventory_staff') return;
      
      const { data, error } = await supabase
        .from('inventory_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();
      
      if (!error && data) {
        setWarehouseId(data.id);
        setWarehouseName(data.warehouse_name || '');
        setWarehouseContactPerson(data.contact_person || '');
        setWarehouseContactNumber(data.contact_number || '');
        setWarehousePickupAddress(data.pickup_address || '');
        setWarehouseLandmark(data.landmark || '');
        setWarehousePickupArea(data.pickup_area || '');
        setWarehouseLatitude(data.pickup_latitude ? parseFloat(data.pickup_latitude) : null);
        setWarehouseLongitude(data.pickup_longitude ? parseFloat(data.pickup_longitude) : null);
        
        setSavedWarehouseName(data.warehouse_name || '');
        setSavedWarehouseContactPerson(data.contact_person || '');
        setSavedWarehouseContactNumber(data.contact_number || '');
        setSavedWarehousePickupAddress(data.pickup_address || '');
        setSavedWarehouseLandmark(data.landmark || '');
        setSavedWarehousePickupArea(data.pickup_area || '');
        setSavedWarehouseLatitude(data.pickup_latitude ? parseFloat(data.pickup_latitude) : null);
        setSavedWarehouseLongitude(data.pickup_longitude ? parseFloat(data.pickup_longitude) : null);

        // Set validation state if we have valid coordinates
        if (data.pickup_latitude && data.pickup_longitude) {
          setAddressValidation({
            isValid: true,
            isValidating: false,
            coordinates: {
              lat: parseFloat(data.pickup_latitude),
              lon: parseFloat(data.pickup_longitude),
            },
          });
        }
      }
    };
    
    fetchWarehouseSettings();
  }, [user, role]);

  // Warehouse save handler
  const handleWarehouseUpdate = async () => {
    const errors = {
      contactNumber: '',
      pickupAddress: '',
    };

    if (!warehousePickupAddress.trim()) {
      errors.pickupAddress = 'Pickup address is required';
    } else if (!warehouseLatitude || !warehouseLongitude) {
      errors.pickupAddress = 'Address must be validated (geocoded)';
    }

    if (warehouseContactNumber && !validatePhoneNumber(warehouseContactNumber)) {
      errors.contactNumber = 'Invalid phone format (09XX-XXX-XXXX or +639XX-XXX-XXXX)';
    }

    setWarehouseErrors(errors);

    if (errors.contactNumber || errors.pickupAddress) {
      toast.error('❌ Please fix the validation errors');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    setWarehouseLoading(true);

    const warehouseData = {
      user_id: user.id,
      warehouse_name: warehouseName || null,
      contact_person: warehouseContactPerson || null,
      contact_number: warehouseContactNumber || null,
      pickup_address: warehousePickupAddress,
      landmark: warehouseLandmark || null,
      pickup_area: warehousePickupArea || null,
      pickup_latitude: warehouseLatitude,
      pickup_longitude: warehouseLongitude,
      is_default: true,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (warehouseId) {
      const result = await supabase
        .from('inventory_settings')
        .update(warehouseData)
        .eq('id', warehouseId);
      error = result.error;
    } else {
      const result = await supabase
        .from('inventory_settings')
        .insert([warehouseData])
        .select()
        .single();
      error = result.error;
      if (!error && result.data) {
        setWarehouseId(result.data.id);
      }
    }

    setWarehouseLoading(false);

    if (error) {
      toast.error('❌ Failed to save warehouse settings.');
      console.error('Warehouse save error:', error);
    } else {
      toast.success('✅ Warehouse settings saved!');
      setSavedWarehouseName(warehouseName);
      setSavedWarehouseContactPerson(warehouseContactPerson);
      setSavedWarehouseContactNumber(warehouseContactNumber);
      setSavedWarehousePickupAddress(warehousePickupAddress);
      setSavedWarehouseLandmark(warehouseLandmark);
      setSavedWarehousePickupArea(warehousePickupArea);
      setSavedWarehouseLatitude(warehouseLatitude);
      setSavedWarehouseLongitude(warehouseLongitude);
    }
  };

  if (auth?.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-lg text-gray-500">Loading...</span>
      </div>
    );
  }

  if (role !== 'inventory_staff') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-lg text-red-600">Access denied. Inventory staff only.</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-800 mb-1">Warehouse Location</h1>
        <div className="h-1 w-16 bg-orange-500 mb-6" />
        
        <div className="bg-white shadow-md rounded-2xl p-6 space-y-6">
          {/* Warehouse Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse Name <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              className="w-full p-3 border rounded-xl"
              placeholder="e.g., Main Warehouse"
              value={warehouseName}
              onChange={e => setWarehouseName(e.target.value)}
            />
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              className="w-full p-3 border rounded-xl"
              placeholder="e.g., John Doe"
              value={warehouseContactPerson}
              onChange={e => setWarehouseContactPerson(e.target.value)}
            />
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              className={`w-full p-3 border rounded-xl ${warehouseErrors.contactNumber ? 'border-red-500' : ''}`}
              placeholder="09XX-XXX-XXXX or +639XX-XXX-XXXX"
              value={warehouseContactNumber}
              onChange={e => {
                setWarehouseContactNumber(e.target.value);
                if (warehouseErrors.contactNumber) {
                  setWarehouseErrors(prev => ({ ...prev, contactNumber: '' }));
                }
              }}
            />
            {warehouseErrors.contactNumber && (
              <p className="text-red-600 text-sm mt-1">{warehouseErrors.contactNumber}</p>
            )}
          </div>

          {/* Pickup Address - Matching CreateOrderForm style */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                className={`w-full p-3 border rounded-xl pr-10 ${
                  addressValidation.isValidating 
                    ? 'border-yellow-400 bg-yellow-50' 
                    : addressValidation.isValid 
                    ? 'border-green-400 bg-green-50' 
                    : fieldTouched && warehousePickupAddress.trim() && !addressValidation.isValid
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-400'
                }`}
                placeholder="Start typing an address..."
                value={warehousePickupAddress}
                onChange={e => {
                  setWarehousePickupAddress(e.target.value);
                  if (warehouseErrors.pickupAddress) {
                    setWarehouseErrors(prev => ({ ...prev, pickupAddress: '' }));
                  }
                }}
                onBlur={handleAddressBlur}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {addressValidation.isValidating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                )}
                {!addressValidation.isValidating && addressValidation.isValid && (
                  <span className="text-green-600">✓</span>
                )}
                {!addressValidation.isValidating && fieldTouched && warehousePickupAddress.trim() && !addressValidation.isValid && (
                  <span className="text-red-600">x</span>
                )}
              </div>
            </div>
            
            {warehouseErrors.pickupAddress && (
              <p className="text-red-600 text-sm mt-1">{warehouseErrors.pickupAddress}</p>
            )}
            
            {addressValidation.coordinates && (
              <div className="text-xs text-green-600 mt-1">
                📍 Coordinates: {addressValidation.coordinates.lat.toFixed(6)}, {addressValidation.coordinates.lon.toFixed(6)}
              </div>
            )}
            
            {fieldTouched && warehousePickupAddress.trim() && !addressValidation.isValid && !addressValidation.isValidating && (
              <div className="text-xs text-red-600 mt-1">
                x Unable to geocode this address. Please try a more general location.
              </div>
            )}

            {/* Map Preview - Same as CreateOrderForm */}
            {warehouseLatitude && warehouseLongitude && addressValidation.isValid && (
              <div className="relative w-full h-40 mt-2 rounded overflow-hidden shadow">
                <Image 
                  src={getMapboxMapUrl(warehouseLatitude, warehouseLongitude)} 
                  alt="Pickup Map" 
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Landmark <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              className="w-full p-3 border rounded-xl"
              placeholder="e.g., Near SM Mall"
              value={warehouseLandmark}
              onChange={e => setWarehouseLandmark(e.target.value)}
            />
          </div>

          {/* Pickup Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Area <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              className="w-full p-3 border rounded-xl"
              placeholder="e.g., North Zone"
              value={warehousePickupArea}
              onChange={e => setWarehousePickupArea(e.target.value)}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleWarehouseUpdate}
            disabled={warehouseLoading || !hasWarehouseChanges()}
            className={`w-full mt-4 ${
              hasWarehouseChanges()
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {warehouseLoading ? 'Saving...' : hasWarehouseChanges() ? 'Save Warehouse Settings' : 'No Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}