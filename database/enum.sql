-- Inventory Movement Type Enum
CREATE TYPE inventory_movement_type_enum AS ENUM (
  'stock_in',
  'stock_out'
);

-- Inventory Reference Type Enum
CREATE TYPE inventory_reference_type_enum AS ENUM (
  'purchase_order',
  'customer_sale',
  'adjustment',
  'manual_correction',
  'initial_stock'
);