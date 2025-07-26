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

  // Photo editing state
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    };
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setOriginalImageUrl(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    // For now, convert to data URL instead of uploading to Cloudinary
    // This will work immediately without needing Cloudinary setup
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log('Converted file to data URL');
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const handleCropSave = async () => {
    if (originalImageUrl && croppedAreaPixels) {
      const croppedImage = await getCroppedImg(originalImageUrl, croppedAreaPixels);
      setCroppedImage(croppedImage);
      setPreviewUrl(croppedImage);
      setShowCropModal(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user?.id) return;
    
    setProfileLoading(true);
    try {
      let profilePicUrl = savedProfilePic;
      
      // Upload new profile picture if there's a cropped image
      if (croppedImage && croppedImage !== savedProfilePic) {
        console.log('Starting profile picture upload...');
        const response = await fetch(croppedImage);
        const blob = await response.blob();
        const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
        profilePicUrl = await uploadToCloudinary(file);
        console.log('Uploaded profile picture URL:', profilePicUrl);
      } else {
        console.log('No new profile picture to upload, using existing:', savedProfilePic);
      }

      // Check if client_profiles record exists, if not create it
      const { data: existingProfile, error: checkError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      console.log('Profile picture URL to save:', profilePicUrl);
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
            profile_pic: profilePicUrl,
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
            profile_pic: profilePicUrl,
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
      setSavedProfilePic(profilePicUrl);
      setCroppedImage(null);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleEditPhotoClick = () => setShowPhotoMenu((v) => !v);
  const handleUploadPhotoClick = () => {
    fileInputRef.current?.click();
    setShowPhotoMenu(false);
  };
  const handleRecropClick = () => {
    if (originalImageUrl) {
      setShowCropModal(true);
    }
  };
  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    setSavedProfilePic(null);
    setCroppedImage(null);
    setOriginalImageUrl(null);
    setProfilePicFile(null);
    setShowPhotoMenu(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail || newEmail === email) return;
    
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        toast.error('Failed to update email');
        return;
      }
      
      setEmail(newEmail);
      setNewEmail('');
      setShowManageEmail(false);
      toast.success('Email updated successfully');
    } catch (error) {
      toast.error('Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      toast.error('Please fill all fields correctly');
      return;
    }
    
    setAccountLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error('Failed to update password');
        return;
      }
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowManagePassword(false);
      toast.success('Password updated successfully');
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setAccountLoading(false);
    }
  };

  const handlePhoneChange = async () => {
    if (!user?.id || !newPhoneNumber || newPhoneNumber === phoneNumber) return;
    
    setPhoneLoading(true);
    try {
      const { error } = await supabase
        .from('client_profiles')
        .update({ contact_number: newPhoneNumber })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to update phone number');
        return;
      }
      
      setPhoneNumber(newPhoneNumber);
      setNewPhoneNumber('');
      setShowManagePhone(false);
      toast.success('Phone number updated successfully');
    } catch (error) {
      toast.error('Failed to update phone number');
    } finally {
      setPhoneLoading(false);
    }
  };

  // Format role for display
  const formatRole = (role: string | null | undefined) => {
    if (!role) return 'Client';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (auth?.loading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-64">
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
            <div className="max-w-4xl">
              <h1 className="text-2xl font-bold text-zinc-800 mb-1">Account</h1>
              <div className="h-1 w-16 bg-orange-500 mb-6" />
              
              {/* Email Section */}
              <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Address</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{email}</p>
                  </div>
                  <button
                    onClick={() => setShowManageEmail(!showManageEmail)}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    {showManageEmail ? 'Cancel' : 'Change'}
                  </button>
                </div>
                {showManageEmail && (
                  <div className="mt-4 space-y-4">
                    <input
                      type="email"
                      placeholder="New email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full p-3 border rounded-xl"
                    />
                    <Button
                      onClick={handleEmailChange}
                      disabled={emailLoading || !newEmail}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {emailLoading ? 'Updating...' : 'Update Email'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Phone Section */}
              <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Phone Number</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{phoneNumber || 'Not set'}</p>
                  </div>
                  <button
                    onClick={() => setShowManagePhone(!showManagePhone)}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    {showManagePhone ? 'Cancel' : 'Change'}
                  </button>
                </div>
                {showManagePhone && (
                  <div className="mt-4 space-y-4">
                    <input
                      type="tel"
                      placeholder="New phone number"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      className="w-full p-3 border rounded-xl"
                    />
                    <Button
                      onClick={handlePhoneChange}
                      disabled={phoneLoading || !newPhoneNumber}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {phoneLoading ? 'Updating...' : 'Update Phone'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Password Section */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Password</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">••••••••</p>
                  </div>
                  <button
                    onClick={() => setShowManagePassword(!showManagePassword)}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    {showManagePassword ? 'Cancel' : 'Change'}
                  </button>
                </div>
                {showManagePassword && (
                  <div className="mt-4 space-y-4">
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full p-3 border rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showCurrentPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-3 border rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showNewPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 border rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <Button
                      onClick={handlePasswordChange}
                      disabled={accountLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {accountLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Crop Modal */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="relative h-96">
            <Cropper
              image={originalImageUrl || undefined}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={onCropChange}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <label className="text-sm font-medium">Zoom:</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="slider flex-1"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCropModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCropSave} className="bg-orange-500 hover:bg-orange-600">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ClientDashboardLayout>
  );
} 