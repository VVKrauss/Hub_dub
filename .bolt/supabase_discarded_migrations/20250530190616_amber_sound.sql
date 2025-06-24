/*
  # Add RLS policies for coworking_header table

  1. Changes
    - Enable RLS on coworking_header table
    - Add policy for authenticated users to insert records
    - Add policy for authenticated users to update records

  2. Security
    - Enable RLS on coworking_header table
    - Add policies to allow authenticated users to manage header data
    - Maintain existing public read access
*/

-- Enable RLS
ALTER TABLE coworking_header ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert records
CREATE POLICY "Authenticated users can insert coworking header"
ON coworking_header
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update records
CREATE POLICY "Authenticated users can update coworking header"
ON coworking_header
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);