-- supabase/migrations/add_oblakkarte_integration.sql
-- Добавление поля для интеграции с Oblakkarte

-- Добавляем поле oblakkarte_uuid в таблицу events
ALTER TABLE events 
ADD COLUMN oblakkarte_uuid VARCHAR(255) UNIQUE;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_events_oblakkarte_uuid 
ON events(oblakkarte_uuid) 
WHERE oblakkarte_uuid IS NOT NULL;

-- Добавляем комментарий для документации
COMMENT ON COLUMN events.oblakkarte_uuid IS 'UUID события в системе Oblakkarte для синхронизации данных';

-- Создаем таблицу для кэширования данных Oblakkarte (опционально)
CREATE TABLE IF NOT EXISTS oblakkarte_cache (
  id BIGSERIAL PRIMARY KEY,
  event_uuid VARCHAR(255) NOT NULL UNIQUE,
  event_data JSONB NOT NULL,
  tickets_data JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Индекс для кэша
CREATE INDEX IF NOT EXISTS idx_oblakkarte_cache_event_uuid 
ON oblakkarte_cache(event_uuid);

CREATE INDEX IF NOT EXISTS idx_oblakkarte_cache_last_updated 
ON oblakkarte_cache(last_updated);

-- RLS политики для кэша (только для админов)
ALTER TABLE oblakkarte_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read oblakkarte cache" ON oblakkarte_cache
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admins can modify oblakkarte cache" ON oblakkarte_cache
  FOR ALL 
  USING (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE role = 'admin'
    )
  );

-- Функция для автоматического обновления last_updated
CREATE OR REPLACE FUNCTION update_oblakkarte_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления last_updated
CREATE TRIGGER update_oblakkarte_cache_updated_at_trigger
  BEFORE UPDATE ON oblakkarte_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_oblakkarte_cache_updated_at();