/*
  # Create missing admin tables

  1. New Tables
    - `coworking_settings` - Settings for coworking page management
    - `navigation_items` - Navigation menu items management  
    - `about_settings` - About page content settings
    - `calendar_slots` - Calendar time slots for bookings
    - `rent_info` - Rental information (alias for rent_info_settings)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage data
    - Add policies for public users to read data
*/

-- Create coworking_settings table
CREATE TABLE IF NOT EXISTS coworking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT '',
  description text DEFAULT '',
  features jsonb DEFAULT '[]'::jsonb,
  services jsonb DEFAULT '[]'::jsonb,
  contact_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE coworking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view coworking settings"
  ON coworking_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage coworking settings"
  ON coworking_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create navigation_items table
CREATE TABLE IF NOT EXISTS navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  path text NOT NULL,
  visible boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for ordering
CREATE INDEX IF NOT EXISTS idx_navigation_items_order ON navigation_items(order_index);

ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view visible navigation items"
  ON navigation_items
  FOR SELECT
  TO public
  USING (visible = true);

CREATE POLICY "Authenticated users can manage navigation items"
  ON navigation_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create about_settings table
CREATE TABLE IF NOT EXISTS about_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_title text DEFAULT '',
  main_description text DEFAULT '',
  sections jsonb DEFAULT '[]'::jsonb,
  team_section jsonb DEFAULT '{"enabled": true, "title": "", "description": ""}'::jsonb,
  mission_section jsonb DEFAULT '{"enabled": true, "title": "", "description": ""}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE about_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view about settings"
  ON about_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage about settings"
  ON about_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create calendar_slots table
CREATE TABLE IF NOT EXISTS calendar_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  slot_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_slots_start_at ON calendar_slots(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_slots_end_at ON calendar_slots(end_at);
CREATE INDEX IF NOT EXISTS idx_calendar_slots_event_id ON calendar_slots(event_id);

ALTER TABLE calendar_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view calendar slots"
  ON calendar_slots
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage calendar slots"
  ON calendar_slots
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add foreign key constraint to events table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    ALTER TABLE calendar_slots 
    ADD CONSTRAINT fk_calendar_slots_event 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create rent_info as an alias/view to rent_info_settings if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rent_info_settings' AND table_schema = 'public') THEN
    -- Create a view that aliases rent_info_settings as rent_info
    CREATE OR REPLACE VIEW rent_info AS 
    SELECT * FROM rent_info_settings;
  ELSE
    -- Create rent_info table if rent_info_settings doesn't exist
    CREATE TABLE IF NOT EXISTS rent_info (
      id serial PRIMARY KEY,
      title varchar(255) NOT NULL,
      description text,
      photos text[],
      pricelist jsonb,
      contacts jsonb,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE rent_info ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Public can view rent info"
      ON rent_info
      FOR SELECT
      TO public
      USING (true);

    CREATE POLICY "Authenticated users can manage rent info"
      ON rent_info
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Insert default data for coworking_settings
INSERT INTO coworking_settings (title, description, features, services, contact_info)
VALUES (
  'Коворкинг пространство',
  'Современное пространство для работы и творчества',
  '["Высокоскоростной интернет", "Комфортные рабочие места", "Переговорные комнаты", "Кухня и зона отдыха"]'::jsonb,
  '[]'::jsonb,
  '{"phone": "+381 11 123 4567", "email": "info@sciencehub.rs", "address": "Белград, Сербия"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Insert default navigation items
INSERT INTO navigation_items (label, path, visible, order_index)
VALUES 
  ('Главная', '/', true, 1),
  ('События', '/events', true, 2),
  ('Спикеры', '/speakers', true, 3),
  ('Коворкинг', '/coworking', true, 4),
  ('Аренда', '/rent', true, 5),
  ('О нас', '/about', true, 6)
ON CONFLICT (id) DO NOTHING;

-- Insert default about settings
INSERT INTO about_settings (main_title, main_description, sections, team_section, mission_section)
VALUES (
  'О нас',
  'Science Hub - это уникальное пространство для науки, образования и инноваций.',
  '[]'::jsonb,
  '{"enabled": true, "title": "Наша команда", "description": "Команда профессионалов, объединенных общей целью развития науки и образования."}'::jsonb,
  '{"enabled": true, "title": "Наша миссия", "description": "Создание инновационной экосистемы для развития научных исследований и образовательных проектов."}'::jsonb
)
ON CONFLICT (id) DO NOTHING;