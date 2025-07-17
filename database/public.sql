-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.clients (
  client_pin text,
  business_name text,
  client_type text CHECK (client_type = ANY (ARRAY['first_time'::text, 'returning'::text])),
  pickup_latitude double precision,
  pickup_longitude double precision,
  tracking_id text NOT NULL UNIQUE,
  contact_person text NOT NULL,
  contact_number text NOT NULL,
  email text,
  pickup_address text NOT NULL,
  landmark text,
  pickup_area text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.driver_availability (
  driver_id uuid,
  title text NOT NULL,
  start_time timestamp without time zone NOT NULL,
  end_time timestamp without time zone NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT driver_availability_pkey PRIMARY KEY (id),
  CONSTRAINT driver_availability_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.driver_time_slots (
  driver_id uuid NOT NULL,
  driver_availability_id uuid NOT NULL,
  order_id uuid,
  start_time timestamp without time zone NOT NULL,
  end_time timestamp without time zone NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'break'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT driver_time_slots_pkey PRIMARY KEY (id),
  CONSTRAINT driver_time_slots_availability_fkey FOREIGN KEY (driver_availability_id) REFERENCES public.driver_availability(id),
  CONSTRAINT driver_time_slots_order_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT driver_time_slots_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.inventory (
  latitude double precision,
  longitude double precision,
  product_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quantity integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.order_dropoffs (
  order_id uuid,
  dropoff_name text,
  dropoff_address text,
  dropoff_contact text,
  dropoff_phone text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  latitude double precision,
  longitude double precision,
  sequence integer,
  estimated_duration_mins integer,
  CONSTRAINT order_dropoffs_pkey PRIMARY KEY (id),
  CONSTRAINT order_dropoffs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_files (
  order_id uuid,
  file_url text NOT NULL,
  type text CHECK (type = ANY (ARRAY['pickup'::text, 'dropoff'::text, 'pod'::text, 'other'::text])),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  uploaded_at timestamp without time zone DEFAULT now(),
  CONSTRAINT order_files_pkey PRIMARY KEY (id),
  CONSTRAINT order_files_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_pricing_components (
  order_id uuid,
  label text NOT NULL,
  amount numeric NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT order_pricing_components_pkey PRIMARY KEY (id),
  CONSTRAINT order_pricing_components_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.order_products (
  order_id uuid,
  quantity integer NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  CONSTRAINT order_products_pkey PRIMARY KEY (id),
  CONSTRAINT order_products_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.order_status_logs (
  order_id uuid,
  status text,
  description text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  timestamp timestamp without time zone DEFAULT now(),
  CONSTRAINT order_status_logs_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.orders (
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
  client_id uuid,
  updated_at timestamp without time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text DEFAULT 'order_placed'::text CHECK (status = ANY (ARRAY['order_placed'::text, 'driver_assigned'::text, 'truck_left_warehouse'::text, 'arrived_at_pickup'::text, 'delivered'::text, 'cancelled'::text])),
  created_at timestamp without time zone DEFAULT now(),
  estimated_total_duration integer,
  estimated_end_time time without time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.products (
  name text NOT NULL,
  weight numeric,
  volume numeric,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_fragile boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  first_name text,
  last_name text,
  profile_pic text,
  id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'driver'::text, 'inventory_staff'::text, 'dispatcher'::text])),
  contact_number text,
  created_at timestamp without time zone DEFAULT now(),
  last_login timestamp with time zone,
  email text,
  can_login boolean DEFAULT true,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_sessions (
  user_id uuid,
  logout_time timestamp without time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  login_time timestamp without time zone DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);