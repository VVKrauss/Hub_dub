-- Add end_timestamp column to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS end_timestamp timestamptz;

-- Update existing records by combining date and end_time
UPDATE public.events
SET end_timestamp = to_timestamp(date || ' ' || end_time, 'YYYY-MM-DD HH24:MI')
WHERE date IS NOT NULL AND end_time IS NOT NULL;

-- Add a trigger to automatically update end_timestamp when date or end_time changes
CREATE OR REPLACE FUNCTION update_event_end_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.end_timestamp := to_timestamp(NEW.date || ' ' || NEW.end_time, 'YYYY-MM-DD HH24:MI');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_event_end_timestamp_trigger ON public.events;

CREATE TRIGGER update_event_end_timestamp_trigger
  BEFORE INSERT OR UPDATE OF date, end_time
  ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_event_end_timestamp();

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS hourly_event_archiver_trigger() CASCADE;
DROP FUNCTION IF EXISTS event_archiver() CASCADE;

-- Create new event_archiver function using end_timestamp
CREATE OR REPLACE FUNCTION event_archiver()
RETURNS void AS $$
DECLARE
  event_record RECORD;
BEGIN
  FOR event_record IN 
    SELECT id, title 
    FROM events 
    WHERE status = 'active' 
    AND end_timestamp < CURRENT_TIMESTAMP
  LOOP
    UPDATE events 
    SET status = 'past'
    WHERE id = event_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create new hourly_event_archiver_trigger function
CREATE OR REPLACE FUNCTION hourly_event_archiver_trigger()
RETURNS void AS $$
BEGIN
  PERFORM event_archiver();
END;
$$ LANGUAGE plpgsql;