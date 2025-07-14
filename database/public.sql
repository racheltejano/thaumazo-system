-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tracking_id text NOT NULL UNIQUE,
  contact_person text NOT NULL,
  contact_number text NOT NULL,
  email text,
  pickup_address text NOT NULL,
  landmark text,
  pickup_area text,
  created_at timestamp without time zone DEFAULT now(),
  client_pin text,
  business_name text,
  client_type text CHECK (client_type = ANY (ARRAY['first_time'::text, 'returning'::text])),
  pickup_latitude double precision,
  pickup_longitude double precision,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.driver_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  driver_id uuid,
  title text NOT NULL,
  start_time timestamp without time zone NOT NULL,
  end_time timestamp without time zone NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT driver_availability_pkey PRIMARY KEY (id),
  CONSTRAINT driver_availability_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  latitude double precision,
  longitude double precision,
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.order_dropoffs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  dropoff_name text,
  dropoff_address text,
  dropoff_contact text,
  dropoff_phone text,
  latitude double precision,
  longitude double precision,
  sequence integer,
  estimated_duration_mins integer,
  CONSTRAINT order_dropoffs_pkey PRIMARY KEY (id),
  CONSTRAINT order_dropoffs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  file_url text NOT NULL,
  type text CHECK (type = ANY (ARRAY['pickup'::text, 'dropoff'::text, 'pod'::text, 'other'::text])),
  uploaded_at timestamp without time zone DEFAULT now(),
  CONSTRAINT order_files_pkey PRIMARY KEY (id),
  CONSTRAINT order_files_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_pricing_components (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  label text NOT NULL,
  amount numeric NOT NULL,
  CONSTRAINT order_pricing_components_pkey PRIMARY KEY (id),
  CONSTRAINT order_pricing_components_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  quantity integer NOT NULL,
  product_id uuid,
  CONSTRAINT order_products_pkey PRIMARY KEY (id),
  CONSTRAINT order_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT order_products_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_status_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  status text,
  description text,
  timestamp timestamp without time zone DEFAULT now(),
  CONSTRAINT order_status_logs_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  status text DEFAULT 'order_placed'::text CHECK (status = ANY (ARRAY['order_placed'::text, 'driver_assigned'::text, 'truck_left_warehouse'::text, 'arrived_at_pickup'::text, 'delivered'::text, 'cancelled'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone,
  pickup_date date,
  pickup_time time without time zone,
  vehicle_type text,
  tail_lift_required boolean,
  special_instructions text,
  estimated_cost numeric,
  driver_id uuid,
  delivery_window_start time without time zone,
  delivery_window_end time without time zone,
  priority_level text CHECK (priority_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  tracking_id text UNIQUE,
  estimated_total_duration integer,
  estimated_end_time time without time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  weight numeric,
  volume numeric,
  is_fragile boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'driver'::text, 'inventory_staff'::text, 'dispatcher'::text])),
  contact_number text,
  created_at timestamp without time zone DEFAULT now(),
  first_name text,
  last_name text,
  profile_pic text,
  can_login boolean DEFAULT true,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  login_time timestamp without time zone DEFAULT now(),
  logout_time timestamp without time zone,
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);