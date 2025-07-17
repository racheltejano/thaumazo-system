'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { activityTracker } from '@/lib/activityTracker';

export default function ActivityTracker() {
  const auth = useAuth();

  useEffect(() => {
    if (auth?.user && !auth.loading) {
      // Start tracking when user is logged in
      activityTracker.startTracking();
      
      return () => {
        // Stop tracking when component unmounts
        activityTracker.stopTracking();
      };
    }
  }, [auth?.user, auth?.loading]);

  // This component doesn't render anything
  return null;
} 