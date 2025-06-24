/*
  # Add order column to coworking_info_table

  1. Changes
    - Add 'order' column to coworking_info_table with integer type
    - Set default value to ensure existing rows get an order
    - Update existing rows to have sequential order based on creation time

  2. Notes
    - Uses a window function to assign sequential order to existing rows
    - New rows will get order = 1 by default if not specified
*/

-- Add order column with default value
ALTER TABLE coworking_info_table 
ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 1;

-- Update existing rows with sequential order based on creation time
WITH ordered_services AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as new_order
  FROM coworking_info_table
)
UPDATE coworking_info_table
SET "order" = ordered_services.new_order
FROM ordered_services
WHERE coworking_info_table.id = ordered_services.id;