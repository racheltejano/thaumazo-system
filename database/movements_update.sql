-- Update inventory_items_movements table to include stock tracking and pricing
-- This will provide better audit trail and accurate change calculations

-- Add new columns to track stock changes and pricing
ALTER TABLE public.inventory_items_movements 
ADD COLUMN old_stock integer NOT NULL DEFAULT 0,
ADD COLUMN new_stock integer NOT NULL DEFAULT 0,
ADD COLUMN price_at_movement numeric;

-- Add comments for documentation
COMMENT ON COLUMN public.inventory_items_movements.old_stock IS 'Stock level before this movement';
COMMENT ON COLUMN public.inventory_items_movements.new_stock IS 'Stock level after this movement';
COMMENT ON COLUMN public.inventory_items_movements.price_at_movement IS 'Price (cost or selling) at the time of movement';

-- Create index for better query performance
CREATE INDEX idx_inventory_movements_stock_changes ON public.inventory_items_movements(old_stock, new_stock);

-- Update existing movements to populate the new fields
-- This is a data migration script for existing records
UPDATE public.inventory_items_movements 
SET 
  old_stock = CASE 
    WHEN movement_type = 'stock_in' THEN new_stock - quantity
    WHEN movement_type = 'stock_out' THEN new_stock + quantity
    ELSE 0
  END,
  new_stock = CASE 
    WHEN movement_type = 'stock_in' THEN old_stock + quantity
    WHEN movement_type = 'stock_out' THEN old_stock - quantity
    ELSE 0
  END,
  price_at_movement = CASE 
    WHEN movement_type = 'stock_in' THEN (
      SELECT cost_price 
      FROM public.inventory_items_variants 
      WHERE id = variant_id
    )
    WHEN movement_type = 'stock_out' THEN (
      SELECT selling_price 
      FROM public.inventory_items_variants 
      WHERE id = variant_id
    )
    ELSE NULL
  END
WHERE old_stock = 0 AND new_stock = 0;

-- Add constraint to ensure stock changes are logical
ALTER TABLE public.inventory_items_movements 
ADD CONSTRAINT check_stock_changes 
CHECK (
  (movement_type = 'stock_in' AND new_stock = old_stock + quantity) OR
  (movement_type = 'stock_out' AND new_stock = old_stock - quantity)
);

-- Add constraint to ensure stock doesn't go negative
ALTER TABLE public.inventory_items_movements 
ADD CONSTRAINT check_non_negative_stock 
CHECK (new_stock >= 0); 