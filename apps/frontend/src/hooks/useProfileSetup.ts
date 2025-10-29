// apps/frontend/src/hooks/useProfileSetup.ts
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ProfileSetupStatus {
  needsSetup: boolean
  needsPasswordChange: boolean
  needsProfileInfo: boolean
  loading: boolean
}

export function useProfileSetup() {
  const router = useRouter()
  const [status, setStatus] = useState<ProfileSetupStatus>({
    needsSetup: false,
    needsPasswordChange: false,
    needsProfileInfo: false,
    loading: true,
  })

  useEffect(() => {
    checkProfileSetup()
  }, [])

  async function checkProfileSetup() {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setStatus({ needsSetup: false, needsPasswordChange: false, needsProfileInfo: false, loading: false })
      return
    }

    try {
      // Call the database function to check setup status
      const { data, error } = await supabase.rpc('needs_profile_setup', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Error checking profile setup:', error)
        setStatus({ needsSetup: false, needsPasswordChange: false, needsProfileInfo: false, loading: false })
        return
      }

      if (data && data.length > 0) {
        const setupStatus = data[0]
        setStatus({
          needsSetup: setupStatus.needs_setup || false,
          needsPasswordChange: setupStatus.needs_password_change || false,
          needsProfileInfo: setupStatus.needs_profile_info || false,
          loading: false,
        })

        // Redirect to setup if needed and not already there
        if (setupStatus.needs_setup && window.location.pathname !== '/profile-setup') {
          router.push('/profile-setup')
        }
      } else {
        setStatus({ needsSetup: false, needsPasswordChange: false, needsProfileInfo: false, loading: false })
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setStatus({ needsSetup: false, needsPasswordChange: false, needsProfileInfo: false, loading: false })
    }
  }

  return { ...status, refresh: checkProfileSetup }
}