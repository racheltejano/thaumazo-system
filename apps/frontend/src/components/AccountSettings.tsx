"use client";
import React, { useState, useEffect, ChangeEvent } from 'react';
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

const sidebarLinks = [
  { label: 'Profile', key: 'profile' },
  { label: 'Account', key: 'account' },
];

export default function AccountSettings() {
  const auth = useAuth();
  const user = auth?.user;
  const role = auth?.role;
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Account state
  const [email, setEmail] = useState(user?.email || '');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);

  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

  // Fetch profile from Supabase (like DashboardLayout)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_pic, first_name, last_name, role')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPreviewUrl(data.profile_pic || null);
      }
      setEmail(user.email || '');
    };
    fetchProfile();
  }, [user]);

  // Profile logic
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      setPreviewUrl(URL.createObjectURL(file));
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

  const handleCropSave = async () => {
    if (!previewUrl || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(previewUrl, croppedAreaPixels);
    setCroppedImage(cropped);
    setPreviewUrl(cropped);
    setShowCropModal(false);
  };

  // In handleProfileUpdate, use croppedImage if available
  const handleProfileUpdate = async () => {
    if (!firstName || !lastName) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (!userId) {
      toast.error('User not authenticated.');
      return;
    }
    setProfileLoading(true);
    let uploadedImageUrl: string | null = previewUrl;
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
    }
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        profile_pic: uploadedImageUrl,
      })
      .eq('id', userId);
    setProfileLoading(false);
    if (dbError) {
      toast.error('❌ Failed to save profile.');
    } else {
      toast.success('✅ Profile updated!');
      setProfilePicFile(null);
      setCroppedImage(null);
      if (auth && typeof auth.refresh === 'function') {
        auth.refresh(); // Refresh sidebar/profile context
      }
    }
  };

  const handleEditPhotoClick = () => setShowPhotoMenu((v) => !v);
  const handleUploadPhotoClick = () => {
    setShowPhotoMenu(false);
    fileInputRef.current?.click();
  };
  const handleRemovePhoto = async () => {
    setShowPhotoMenu(false);
    setProfileLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ profile_pic: null })
      .eq('id', userId);
    setProfileLoading(false);
    if (!error) setPreviewUrl(null);
  };

  // Account logic
  const handleEmailChange = async () => {
    if (!newEmail || newEmail === email) return;
    setAccountLoading(true);
    const { error: emailError } = await supabase.auth.updateUser({ email: newEmail });
    setAccountLoading(false);
    if (emailError) {
      toast.error(`⚠️ Failed to update email: ${emailError.message}`);
    } else {
      setEmail(newEmail);
      setNewEmail('');
      toast.success('📧 Email updated. A verification link has been sent to your new address.');
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
      toast.success('🔐 Password updated! You’ll be signed out shortly.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        supabase.auth.signOut();
        window.location.href = '/login';
      }, 3000);
    }
  };

  // Sidebar user info
  const firstNameDisplay = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';
  const lastNameDisplay = user?.user_metadata?.last_name || '';
  const profilePic = user?.user_metadata?.profile_pic || '';
  const initial = firstNameDisplay.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col items-center py-8 px-4">
        <div className="flex flex-row items-center mb-8 w-full gap-4">
          {/* Profile Picture Column */}
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300 flex items-center justify-center bg-gray-200">
            {previewUrl ? (
              <Image src={previewUrl} alt="Profile" width={64} height={64} className="object-cover w-full h-full" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-2xl font-bold text-white bg-orange-500">{firstName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {/* Name and Role Column */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="text-lg font-semibold text-gray-900 truncate">{firstName} {lastName}</div>
            <div className="text-xs text-gray-500 capitalize mt-1 truncate">{role || 'User'}</div>
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
          <div className="flex max-w-4xl mx-auto gap-4">
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
              <Button onClick={handleProfileUpdate} disabled={profileLoading} className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-2">
                {profileLoading ? 'Saving...' : 'Save Profile'}
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
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    className="bg-white border border-gray-300 rounded-full px-4 py-2 shadow hover:bg-gray-50 flex items-center gap-1"
                    onClick={handleEditPhotoClick}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Edit</span>
                  </button>
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
          <div className="max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold text-zinc-800 mb-4">Account Settings</h1>
            <div className="bg-white shadow-md rounded-2xl p-6 space-y-8">
          {/* Change Email */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-zinc-700">Change Email</h2>
                <input className="w-full p-3 border rounded-xl bg-gray-100 text-gray-700" disabled value={email} />
                <input className="w-full p-3 border rounded-xl" placeholder="New email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                <Button onClick={handleEmailChange} className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={accountLoading}>Update Email</Button>
              </div>
          {/* Change Password */}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-zinc-700">Change Password</h2>
                <input className="w-full p-3 border rounded-xl" type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                <input className="w-full p-3 border rounded-xl" type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <input className="w-full p-3 border rounded-xl" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                <Button onClick={handlePasswordChange} className="w-full bg-orange-500 hover:bg-orange-600 text-white" disabled={accountLoading}>Update Password</Button>
              </div>
        </div>
      </div>
        )}
      </main>
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="w-[90vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop your profile picture</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-72 bg-gray-100">
            {/* Suppress TS error for Cropper JSX usage */}
            {/* @ts-ignore */}
            <Cropper
              image={previewUrl || undefined}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCropModal(false)}>Cancel</Button>
            <Button onClick={handleCropSave}>Crop</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 