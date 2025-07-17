import { supabase } from './supabase';

class ActivityTracker {
  private lastUpdate: number = 0;
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private isTracking = false;

  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    
    // Update on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      const now = Date.now();
      if (now - this.lastUpdate > this.UPDATE_INTERVAL) {
        this.updateLastLogin();
        this.lastUpdate = now;
      }
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Also update on page visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updateActivity();
      }
    });
  }

  stopTracking() {
    this.isTracking = false;
    // Remove event listeners if needed
  }

  private async updateLastLogin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);
      }
    } catch (error) {
      console.warn('Failed to update last_login:', error);
    }
  }
}

export const activityTracker = new ActivityTracker(); 