-- RLS Policies for Profiles Table with last_login

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all profiles (for driver management)
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Allow users to update their own profile (including last_login)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Allow users to update their own last_login
CREATE POLICY "Users can update own last_login" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- RLS Policies for Orders Table

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all orders (for statistics)
CREATE POLICY "Admins can read all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- Allow drivers to read their assigned orders
CREATE POLICY "Drivers can read assigned orders" ON orders
  FOR SELECT USING (
    driver_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'driver'
    )
  );

-- Allow dispatchers to read all orders
CREATE POLICY "Dispatchers can read all orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'dispatcher'
    )
  ); 