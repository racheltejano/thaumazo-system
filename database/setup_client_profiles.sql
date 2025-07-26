-- Setup client_profiles table with missing pieces
-- The client_profiles table already exists, we just need to add triggers, indexes, and RLS

-- 1. Add updated_at trigger for client_profiles (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_client_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_client_profiles_updated_at ON public.client_profiles;
CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_client_profiles_updated_at();

-- 2. Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_client_profiles_email ON public.client_profiles(email);
CREATE INDEX IF NOT EXISTS idx_client_profiles_can_login ON public.client_profiles(can_login);
CREATE INDEX IF NOT EXISTS idx_client_profiles_last_login ON public.client_profiles(last_login);

-- 3. Add RLS (Row Level Security) policies for client_profiles
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can update own client profile" ON public.client_profiles;
DROP POLICY IF EXISTS "Users can insert own client profile" ON public.client_profiles;

-- Create new policies
CREATE POLICY "Users can view own client profile" ON public.client_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own client profile" ON public.client_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own client profile" ON public.client_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.client_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 5. Add comments for documentation
COMMENT ON TABLE public.client_profiles IS 'Stores client user profile information, separate from staff profiles';
COMMENT ON COLUMN public.client_profiles.id IS 'References auth.users(id)';
COMMENT ON COLUMN public.client_profiles.can_login IS 'Whether the client account is enabled for login';
COMMENT ON COLUMN public.client_profiles.last_login IS 'Timestamp of last successful login'; 