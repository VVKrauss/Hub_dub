/*
  # Create Speakers Table

  1. New Tables
    - `speakers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `field_of_expertise` (text)
      - `description` (text)
      - `photos` (jsonb)
      - `date_of_birth` (date)
      - `contact_info` (jsonb)
      - `google_drive_link` (text)
      - `active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for public read access
    - Add policies for authenticated users to manage speakers
*/

-- Create speakers table
CREATE TABLE IF NOT EXISTS speakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  field_of_expertise text,
  description text,
  photos jsonb DEFAULT '[]'::jsonb,
  date_of_birth date,
  contact_info jsonb,
  google_drive_link text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to active speakers"
ON speakers FOR SELECT
TO public
USING (active = true);

CREATE POLICY "Allow authenticated users to manage speakers"
ON speakers FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON speakers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();