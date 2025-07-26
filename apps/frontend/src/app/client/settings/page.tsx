"use client";
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRef } from 'react';
import { Pencil } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCroppedImg } from '@/lib/utils';
import ClientDashboardLayout from '@/components/ClientDashboardLayout';

// Custom styles for the zoom slider
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #f97316;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .slider::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #f97316;
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .slider::-webkit-slider-track {
    background: #e5e7eb;
    border-radius: 8px;
    height: 8px;
  }
  
  .slider::-moz-range-track {
    background: #e5e7eb;
    border-radius: 8px;
    height: 8px;
  }
`;

const sidebarLinks = [
  { label: 'Profile', key: 'profile' },
  { label: 'Account', key: 'account' },
  { label: 'Saved Addresses', key: 'addresses' },
];

export default function ClientSettingsPage() {
  const auth = useAuth();
  const router = useRouter();
  const user = auth?.user;
  const role = 'client'; // Client role
  const [activeTab, setActiveTab] = useState('profile');
  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Separate state for sidebar display (saved data)
  const [savedFirstName, setSavedFirstName] = useState('');
  const [savedLastName, setSavedLastName] = useState('');
  const [savedProfilePic, setSavedProfilePic] = useState<string | null>(null);
  
  // Check if changes have been made
  const hasChanges = () => {
    const nameChanged = firstName !== savedFirstName || lastName !== savedLastName;
    const pictureChanged = previewUrl !== savedProfilePic;
    return nameChanged || pictureChanged;
  };

  // Account state
  const [email, setEmail] = useState(user?.email || '');
  const [newEmail, setNewEmail] = useState('');
  const [showManageEmail, setShowManageEmail] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [showManagePhone, setShowManagePhone] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [showManagePassword, setShowManagePassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showEditAddress, setShowEditAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Philippines',
    is_default: false,
    is_pickup_address: false
  });

  // Photo editing state
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

  // Fetch profile from client_profiles when user changes
  useEffect(() => {
    // Reset all user-specific state on user change
    setFirstName('');
    setLastName('');
    setSavedFirstName('');
    setSavedLastName('');
    setSavedProfilePic(null);
    setProfilePicFile(null);
    setPreviewUrl(null);
    setOriginalImageUrl(null);
    setProfileLoading(false);
    setEmail(user?.email || '');
    setNewEmail('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setAccountLoading(false);
    setShowPhotoMenu(false);
    setShowCropModal(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCroppedImage(null);
    setOriginalImageUrl(null);
    setSavedProfilePic(null);
    
    // Fetch the profile data from client_profiles
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('client_profiles')
        .select('profile_pic, first_name, last_name')
        .eq('id', user.id)
        .single();
      
      console.log('Profile fetch result:', { data, error });
      
      if (error) {
        console.error('Error fetching profile:', error);
        // If no profile exists, create one
        if (error.code === 'PGRST116') { // No rows returned
          console.log('No profile found, creating new one...');
          const { data: newProfile, error: createError } = await supabase
            .from('client_profiles')
            .insert({
              id: user.id,
              email: user.email,
              first_name: '',
              last_name: '',
            })
            .select('profile_pic, first_name, last_name')
            .single();
          
          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            console.log('Created new profile:', newProfile);
            setFirstName(newProfile.first_name || '');
            setLastName(newProfile.last_name || '');
            setSavedFirstName(newProfile.first_name || '');
            setSavedLastName(newProfile.last_name || '');
            setSavedProfilePic(newProfile.profile_pic || null);
            setPreviewUrl(newProfile.profile_pic || null);
          }
        }
      } else if (data) {
        console.log('Profile data loaded:', data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setSavedFirstName(data.first_name || '');
        setSavedLastName(data.last_name || '');
        setSavedProfilePic(data.profile_pic || null);
        setPreviewUrl(data.profile_pic || null);
      }
      setEmail(user?.email || '');
    }
    fetchProfile();
  }, [user]);

  // Fetch phone number from client_profiles
  useEffect(() => {
    const fetchPhone = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('client_profiles')
        .select('contact_number')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setPhoneNumber(data.contact_number || '');
      }
    };
    fetchPhone();
  }, [user]);

  // Fetch saved addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user?.id) return;
      setAddressesLoading(true);
      
      const { data, error } = await supabase
        .from('client_saved_addresses')
        .select('*')
        .eq('client_profile_id', user.id)
        .order('is_default', { ascending: false })
        .order('is_pickup_address', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching addresses:', error);
        toast.error('Failed to load saved addresses');
      } else {
        setSavedAddresses(data || []);
      }
      
      setAddressesLoading(false);
    };

    if (activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [user, activeTab]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setOriginalImageUrl(objectUrl);
      setShowCropModal(true);
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      return data.secure_url || null;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return null;
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const onCropChange = (crop: { x: number; y: number }) => {
    // Allow full movement within the image boundaries
    // The cropper should handle boundaries automatically with restrictPosition=false
    setCrop(crop);
  };

  const handleCropSave = async () => {
    const imageToCrop = originalImageUrl || previewUrl;
    if (!imageToCrop || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(imageToCrop, croppedAreaPixels);
    setCroppedImage(cropped);
    setPreviewUrl(cropped);
    setShowCropModal(false);
  };

  const handleProfileUpdate = async () => {
    if (!firstName || !lastName) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (!user?.id) {
      toast.error('User not authenticated.');
      return;
    }
    setProfileLoading(true);
    let uploadedImageUrl: string | null = previewUrl;
    
    // Handle profile picture update/removal
    if (profilePicFile && (croppedImage || previewUrl)) {
      // Convert croppedImage (base64) to File for upload
      const fileToUpload = croppedImage
        ? await fetch(croppedImage).then(r => r.blob())
        : profilePicFile;
      uploadedImageUrl = await uploadToCloudinary(fileToUpload as File);
      if (!uploadedImageUrl) {
        toast.error('❌ Failed to upload image to Cloudinary.');
        setProfileLoading(false);
        return;
      }
    } else if (previewUrl === null && savedProfilePic !== null) {
      // Profile picture is being removed
      uploadedImageUrl = null;
    }
    
    // Check if client_profiles record exists, if not create it
    const { data: existingProfile, error: checkError } = await supabase
      .from('client_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    console.log('Profile picture URL to save:', uploadedImageUrl);
    console.log('Existing profile check:', { existingProfile, checkError });

    if (checkError && checkError.code === 'PGRST116') {
      // Record doesn't exist, create it
      console.log('Creating new client profile...');
      const { error: insertError } = await supabase
        .from('client_profiles')
        .insert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          profile_pic: uploadedImageUrl,
          email: user.email,
        });
      
      if (insertError) {
        console.error('Failed to create client profile:', insertError);
        toast.error('Failed to create profile');
        return;
      }
      console.log('Successfully created client profile');
    } else {
      // Record exists, update it
      console.log('Updating existing client profile...');
      const { error } = await supabase
        .from('client_profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          profile_pic: uploadedImageUrl,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Failed to update client profile:', error);
        toast.error('Failed to update profile');
        return;
      }
      console.log('Successfully updated client profile');
    }

    // Update saved state
    setSavedFirstName(firstName);
    setSavedLastName(lastName);
    setSavedProfilePic(uploadedImageUrl);
    setCroppedImage(null);
    
    toast.success('✅ Profile updated successfully!');
    if (auth && typeof auth.refresh === 'function') {
      auth.refresh(); // Refresh sidebar/profile context
    }
  };

  const handleEditPhotoClick = () => setShowPhotoMenu((v) => !v);
  const handleUploadPhotoClick = () => {
    fileInputRef.current?.click();
    setShowPhotoMenu(false);
  };
  const handleRecropClick = () => {
    if (savedProfilePic) {
      setOriginalImageUrl(savedProfilePic);
      setPreviewUrl(savedProfilePic);
      setShowCropModal(true);
    }
  };
  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    setSavedProfilePic(null);
    setProfilePicFile(null);
    setCroppedImage(null);
    setShowPhotoMenu(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail || newEmail === email) return;
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailLoading(false);
    if (!error) {
      setEmail(newEmail);
      setNewEmail('');
      setShowManageEmail(false);
      toast.success('✅ Email updated successfully!');
    } else {
      toast.error('❌ Failed to update email.');
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('❌ Please fill out all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('❌ New passwords do not match.');
      return;
    }
    setAccountLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) {
      setAccountLoading(false);
      toast.error(`❌ Incorrect current password: ${signInError.message}`);
      return;
    }
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    setAccountLoading(false);
    if (pwError) {
      toast.error(`❌ Failed to update password: ${pwError.message}`);
    } else {
      toast.success('🔐 Password updated! You\'ll be signed out shortly.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        supabase.auth.signOut();
        router.push('/client/login');
      }, 3000);
    }
  };

  const handlePhoneChange = async () => {
    if (!newPhoneNumber || newPhoneNumber === phoneNumber) return;
    setPhoneLoading(true);
    const { error } = await supabase
      .from('client_profiles')
      .update({ contact_number: newPhoneNumber })
      .eq('id', user.id);
    setPhoneLoading(false);
    if (!error) {
      setPhoneNumber(newPhoneNumber);
      setNewPhoneNumber('');
      setShowManagePhone(false);
      toast.success('✅ Phone number updated successfully!');
    } else {
      toast.error('❌ Failed to update phone number.');
    }
  };

  const formatRole = (role: string | null | undefined) => {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  };

  // Saved addresses functions
  const handleAddAddress = async () => {
    if (!newAddress.label || !newAddress.address_line1 || !newAddress.city) {
      toast.error('Please fill in all required fields (Label, Address and City)');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setAddressesLoading(true);

    try {
      // If setting as default, first unset all other addresses as default
      if (newAddress.is_default) {
        await supabase
          .from('client_saved_addresses')
          .update({ is_default: false })
          .eq('client_profile_id', user.id);
      }

      const { error } = await supabase
        .from('client_saved_addresses')
        .insert({
          ...newAddress,
          client_profile_id: user.id
        });

      if (error) {
        console.error('Error adding address:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast.error(`Failed to add address: ${error.message}`);
      } else {
        toast.success('Address added successfully!');
        setNewAddress({
          label: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'Philippines',
          is_default: false,
          is_pickup_address: false
        });
        setShowAddAddress(false);
        // Refresh addresses
        const { data } = await supabase
          .from('client_saved_addresses')
          .select('*')
          .eq('client_profile_id', user.id)
          .order('is_default', { ascending: false })
          .order('is_pickup_address', { ascending: false })
          .order('created_at', { ascending: false });
        setSavedAddresses(data || []);
      }
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    }

    setAddressesLoading(false);
  };

  const handleDeleteAddress = (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAddress = async () => {
    if (!user?.id || !addressToDelete) return;

    setAddressesLoading(true);

    try {
      const { error } = await supabase
        .from('client_saved_addresses')
        .delete()
        .eq('id', addressToDelete)
        .eq('client_profile_id', user.id);

      if (error) {
        console.error('Error deleting address:', error);
        toast.error('Failed to delete address');
      } else {
        toast.success('Address deleted successfully!');
        // Refresh addresses
        const { data } = await supabase
          .from('client_saved_addresses')
          .select('*')
          .eq('client_profile_id', user.id)
          .order('is_default', { ascending: false })
          .order('is_pickup_address', { ascending: false })
          .order('created_at', { ascending: false });
        setSavedAddresses(data || []);
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }

    setAddressesLoading(false);
    setShowDeleteConfirm(false);
    setAddressToDelete(null);
  };

  const handleEditAddress = (address: any) => {
    setEditingAddress(address);
    setShowEditAddress(true);
  };

  const handleUpdateAddress = async () => {
    if (!editingAddress || !user?.id) return;

    if (!editingAddress.label || !editingAddress.address_line1 || !editingAddress.city) {
      toast.error('Please fill in all required fields (Label, Address and City)');
      return;
    }

    setAddressesLoading(true);

    try {
      // If setting as default, first unset all other addresses as default
      if (editingAddress.is_default) {
        await supabase
          .from('client_saved_addresses')
          .update({ is_default: false })
          .eq('client_profile_id', user.id)
          .neq('id', editingAddress.id);
      }

      const { error } = await supabase
        .from('client_saved_addresses')
        .update({
          label: editingAddress.label,
          address_line1: editingAddress.address_line1,
          address_line2: editingAddress.address_line2,
          city: editingAddress.city,
          state: editingAddress.state,
          postal_code: editingAddress.postal_code,
          country: editingAddress.country,
          is_default: editingAddress.is_default,
          is_pickup_address: editingAddress.is_pickup_address
        })
        .eq('id', editingAddress.id)
        .eq('client_profile_id', user.id);

      if (error) {
        console.error('Error updating address:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        toast.error(`Failed to update address: ${error.message}`);
      } else {
        toast.success('Address updated successfully!');
        setShowEditAddress(false);
        setEditingAddress(null);
        // Refresh addresses
        const { data } = await supabase
          .from('client_saved_addresses')
          .select('*')
          .eq('client_profile_id', user.id)
          .order('is_default', { ascending: false })
          .order('is_pickup_address', { ascending: false })
          .order('created_at', { ascending: false });
        setSavedAddresses(data || []);
      }
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    }

    setAddressesLoading(false);
  };

  if (auth?.loading) {
    return (
      <ClientDashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <span className="text-lg text-gray-500">Loading...</span>
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout>
      <style dangerouslySetInnerHTML={{ __html: sliderStyles }} />
      <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col items-center py-8 px-4">
        <div className="flex flex-row items-center mb-8 w-full gap-4">
          {/* Profile Picture Column */}
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300 flex items-center justify-center bg-gray-200">
            {savedProfilePic ? (
              <Image src={savedProfilePic} alt="Profile" width={64} height={64} className="object-cover w-full h-full" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-2xl font-bold text-white bg-orange-500">{savedFirstName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {/* Name and Role Column */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="text-lg font-semibold text-gray-900 truncate">{savedFirstName} {savedLastName}</div>
            <div className="text-xs text-gray-500 capitalize mt-1 truncate">{formatRole(role)}</div>
          </div>
        </div>
        <nav className="w-full flex flex-col gap-2">
          {sidebarLinks.map(link => (
            <button
              key={link.key}
              onClick={() => setActiveTab(link.key)}
              className={`px-4 py-3 rounded-lg text-base font-medium transition-colors text-left ${activeTab === link.key ? 'bg-orange-100 text-orange-600' : 'text-gray-800 hover:bg-gray-100'}`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-8">
        {activeTab === 'profile' && (
          <div className="flex max-w-4xl gap-4">
            {/* Left column: 60% */}
            <div className="flex-[3] min-w-0">
              <h1 className="text-2xl font-bold text-zinc-800 mb-1">Profile</h1>
              <div className="h-1 w-16 bg-orange-500 mb-6" />
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input className="w-full p-3 border rounded-xl" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input className="w-full p-3 border rounded-xl" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <Button 
                onClick={handleProfileUpdate} 
                disabled={profileLoading || !hasChanges()} 
                className={`w-full mt-2 ${
                  hasChanges() 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {profileLoading ? 'Saving...' : hasChanges() ? 'Save Profile' : 'No Changes'}
              </Button>
            </div>
            {/* Right column: 40% */}
            <div className="flex-[2] flex flex-col items-center w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
              <div className="relative mb-2">
                <div className="w-44 h-44 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-200">
                  {previewUrl ? (
                    <Image src={previewUrl} alt="Profile" width={176} height={176} className="object-cover w-full h-full" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-5xl font-bold text-white bg-orange-500">{firstName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {/* Edit button below the picture */}
                <div className="flex justify-center mt-4 gap-2">
                  <button
                    type="button"
                    className="bg-white border border-gray-300 rounded-full px-4 py-2 shadow hover:bg-gray-50 flex items-center gap-1"
                    onClick={handleEditPhotoClick}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Edit</span>
                  </button>
                  {croppedImage && (
                    <button
                      type="button"
                      className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4 py-2 shadow hover:shadow-md flex items-center gap-1 transition-colors"
                      onClick={handleRecropClick}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">Recrop</span>
                    </button>
                  )}
                </div>
                {showPhotoMenu && (
                  <div className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-2 flex flex-col text-sm">
                    <button
                      className="px-4 py-2 text-left hover:bg-gray-100"
                      onClick={handleUploadPhotoClick}
                    >Upload a photo...</button>
                    <button
                      className="px-4 py-2 text-left text-red-600 hover:bg-gray-100"
                      onClick={handleRemovePhoto}
                    >Remove photo</button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'account' && (
          <div className="max-w-2xl space-y-4">
            <h1 className="text-2xl font-bold text-zinc-800 mb-1">Account Settings</h1>
            <div className="h-1 w-16 bg-orange-500 mb-6" />
            <div className="bg-white shadow-md rounded-2xl p-6 space-y-8">
              {/* Email */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-zinc-700">Email</h2>
                <div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="p-3 border rounded-xl bg-gray-100 text-gray-700 select-all">{email}</div>
                    </div>
                    <Button
                      type="button"
                      className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap self-center"
                      onClick={() => setShowManageEmail(v => !v)}
                    >
                      {showManageEmail ? 'Hide' : 'Manage'}
                    </Button>
                  </div>
                </div>
                {showManageEmail && (
                  <div className="mt-4 space-y-2">
                    <input
                      className="w-full p-3 border rounded-xl"
                      placeholder="New email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                    />
                    <Button
                      onClick={handleEmailChange}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={emailLoading || !newEmail || newEmail === email}
                    >
                      {emailLoading ? 'Updating...' : 'Update Email'}
                    </Button>
                  </div>
                )}
              </div>
              {/* Password */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-zinc-700">Password</h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    {!showManagePassword ? (
                      <input
                        className="w-full p-3 border rounded-xl bg-gray-100 text-gray-700 select-all"
                        type="password"
                        value={"••••••••"}
                        disabled
                      />
                    ) : (
                      <input
                        className="w-full p-3 border rounded-xl"
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap self-center"
                    onClick={() => {
                      setShowManagePassword(v => !v);
                      if (!showManagePassword) setCurrentPassword('');
                    }}
                  >
                    {showManagePassword ? 'Hide' : 'Manage'}
                  </Button>
                </div>
                {showManagePassword && (
                  <div className="mt-4 space-y-2">
                    <div className="relative">
                      <input
                        className="w-full p-3 border rounded-xl pr-10"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="New password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowNewPassword(v => !v)}
                        tabIndex={-1}
                      >
                        {showNewPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        className="w-full p-3 border rounded-xl pr-10"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <Button
                      onClick={() => {
                        if (!currentPassword || !newPassword || !confirmPassword) {
                          toast.error('❌ Please fill out all password fields.');
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          toast.error('❌ New passwords do not match.');
                          return;
                        }
                        handlePasswordChange();
                      }}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={accountLoading}
                    >
                      Update Password
                    </Button>
                  </div>
                )}
              </div>
              {/* Phone Number */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-zinc-700">Phone Number</h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="p-3 border rounded-xl bg-gray-100 text-gray-700 select-all">{phoneNumber || <span className='text-gray-400'>No phone number</span>}</div>
                  </div>
                  <Button
                    type="button"
                    className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap self-center"
                    onClick={() => setShowManagePhone(v => !v)}
                  >
                    {showManagePhone ? 'Hide' : 'Manage'}
                  </Button>
                </div>
                {showManagePhone && (
                  <div className="mt-4 space-y-2">
                    <input
                      className="w-full p-3 border rounded-xl"
                      placeholder="New phone number"
                      value={newPhoneNumber}
                      onChange={e => setNewPhoneNumber(e.target.value)}
                    />
                    <Button
                      onClick={handlePhoneChange}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={phoneLoading || !newPhoneNumber || newPhoneNumber === phoneNumber}
                    >
                      {phoneLoading ? 'Updating...' : 'Update Phone Number'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'addresses' && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-zinc-800 mb-1">Saved Addresses</h1>
            <div className="h-1 w-16 bg-orange-500 mb-6" />
            
            <div className="bg-white shadow-md rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-zinc-700">Your Addresses</h2>
                <Button
                  onClick={() => setShowAddAddress(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  + Add New Address
                </Button>
              </div>

              {addressesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  <span className="ml-2 text-gray-600">Loading addresses...</span>
                </div>
              ) : savedAddresses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-4">No saved addresses yet</p>
                  <Button
                    onClick={() => setShowAddAddress(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Add Your First Address
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedAddresses.map((address) => (
                    <div key={address.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">{address.label || 'Address'}</span>
                            {address.is_default && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Default</span>
                            )}
                            {address.is_pickup_address && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Pickup</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <div>{address.address_line1}</div>
                            {address.address_line2 && <div>{address.address_line2}</div>}
                            <div>{address.city}, {address.state} {address.postal_code}</div>
                            <div>{address.country}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditAddress(address)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(address.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Address Modal */}
            {showAddAddress && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold mb-4">Add New Address</h3>
                  
                  <div className="space-y-4">


                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                      <input
                        type="text"
                        value={newAddress.label}
                        onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
                        className="w-full p-3 border rounded-xl"
                        placeholder="Home Address"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                      <input
                        type="text"
                        value={newAddress.address_line1}
                        onChange={(e) => setNewAddress({...newAddress, address_line1: e.target.value})}
                        className="w-full p-3 border rounded-xl"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={newAddress.address_line2}
                        onChange={(e) => setNewAddress({...newAddress, address_line2: e.target.value})}
                        className="w-full p-3 border rounded-xl"
                        placeholder="Apt 4B"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                        <input
                          type="text"
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                          className="w-full p-3 border rounded-xl"
                          placeholder="Manila"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={newAddress.state}
                          onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                          className="w-full p-3 border rounded-xl"
                          placeholder="Metro Manila"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={newAddress.postal_code}
                          onChange={(e) => setNewAddress({...newAddress, postal_code: e.target.value})}
                          className="w-full p-3 border rounded-xl"
                          placeholder="1234"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={newAddress.country}
                          onChange={(e) => setNewAddress({...newAddress, country: e.target.value})}
                          className="w-full p-3 border rounded-xl"
                          placeholder="Philippines"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newAddress.is_default}
                          onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})}
                          className="mr-2"
                        />
                        <span className="text-sm">Set as default address</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newAddress.is_pickup_address}
                          onChange={(e) => setNewAddress({...newAddress, is_pickup_address: e.target.checked})}
                          className="mr-2"
                        />
                        <span className="text-sm">Set as pickup address</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => setShowAddAddress(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddAddress}
                      disabled={addressesLoading || !newAddress.label || !newAddress.address_line1 || !newAddress.city}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {addressesLoading ? 'Adding...' : 'Add Address'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Address Modal */}
            {showEditAddress && editingAddress && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold mb-4">Edit Address</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                      <input
                        type="text"
                        value={editingAddress.label || ''}
                        onChange={(e) => setEditingAddress({...editingAddress, label: e.target.value})}
                        className="w-full p-3 border rounded-xl"
                        placeholder="Home Address"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                      <input
                        type="text"
                        value={editingAddress.address_line1 || ''}
                        onChange={(e) => setEditingAddress({...editingAddress, address_line1: e.target.value})}
                        className="w-full p-3 border rounded-xl"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={editingAddress.address_line2 || ''}
                        onChange={(e) => setEditingAddress({...editingAddress, address_line2: e.target.value})}
                        className="w-full p-3 border rounded-xl"
                        placeholder="Apt 4B"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                        <input
                          type="text"
                          value={editingAddress.city || ''}
                          onChange={(e) => setEditingAddress({...editingAddress, city: e.target.value})}
                          className="w-full p-3 border rounded-xl"
                          placeholder="Manila"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={editingAddress.state || ''}
                          onChange={(e) => setEditingAddress({...editingAddress, state: e.target.value})}
                          className="w-full p-3 border rounded-xl"
                          placeholder="Metro Manila"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={editingAddress.postal_code || ''}
                          onChange={(e) => setEditingAddress({...editingAddress, postal_code: e.target.value})}
                          className="w-full p-3 border rounded-xl"
                          placeholder="1234"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={editingAddress.country || 'Philippines'}
                          onChange={(e) => setEditingAddress({...editingAddress, country: e.target.value})}
                          className="w-full p-3 border rounded-xl"
                          placeholder="Philippines"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingAddress.is_default || false}
                          onChange={(e) => setEditingAddress({...editingAddress, is_default: e.target.checked})}
                          className="mr-2"
                        />
                        <span className="text-sm">Set as default address</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingAddress.is_pickup_address || false}
                          onChange={(e) => setEditingAddress({...editingAddress, is_pickup_address: e.target.checked})}
                          className="mr-2"
                        />
                        <span className="text-sm">Set as pickup address</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => {
                        setShowEditAddress(false);
                        setEditingAddress(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateAddress}
                      disabled={addressesLoading || !editingAddress.label || !editingAddress.address_line1 || !editingAddress.city}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {addressesLoading ? 'Updating...' : 'Update Address'}
                    </Button>
                  </div>
                </div>
              </div>
                        )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Address</h3>
                  
                  <div className="mb-6">
                    <p className="text-gray-700">
                      Are you sure you want to delete this address? This action cannot be undone.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setAddressToDelete(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmDeleteAddress}
                      disabled={addressesLoading}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                      {addressesLoading ? 'Deleting...' : 'Delete Address'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      </div>
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="w-[90vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop your profile picture</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-72 bg-gray-100">
            {/* Suppress TS error for Cropper JSX usage */}
            {/* @ts-ignore */}
            <Cropper
              image={originalImageUrl || previewUrl || undefined}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              minZoom={1}
              maxZoom={3}
              zoomSpeed={0.1}
              restrictPosition={true}
              objectFit="contain"
            />
          </div>
          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(1, zoom - 0.02))}
              disabled={zoom <= 1}
            >
              Zoom Out
            </Button>
            <div className="flex items-center gap-2 min-w-[200px]">
              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-sm text-gray-600 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(3, zoom + 0.02))}
              disabled={zoom >= 3}
            >
              Zoom In
            </Button>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCropModal(false)}>Cancel</Button>
            <Button onClick={handleCropSave}>Crop</Button>
          </div>
        </DialogContent>
      </Dialog>
    </ClientDashboardLayout>
  );
} 