-- Add end_timestamp column to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS end_timestamp timestamptz;

-- Update existing records by combining date and end_time
UPDATE public.events
SET end_timestamp = (date || ' ' || end_time)::timestamptz
WHERE date IS NOT NULL AND end_time IS NOT NULL;

-- Add a trigger to automatically update end_timestamp when date or end_time changes
CREATE OR REPLACE FUNCTION update_event_end_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    NEW.end_timestamp := (NEW.date || ' ' || NEW.end_time)::timestamptz;
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