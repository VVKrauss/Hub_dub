-- Добавляем поле topbar_settings в таблицу site_settings
-- Файл: supabase/migrations/[timestamp]_add_topbar_settings.sql

-- Добавляем поле topbar_settings если его еще нет
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS topbar_settings jsonb DEFAULT '{
  "alignment": "center",
  "style": "classic", 
  "spacing": "normal",
  "showBorder": true,
  "showShadow": true,
  "backgroundColor": "white",
  "animation": "slide",
  "mobileCollapse": true,
  "showIcons": false,
  "showBadges": true,
  "stickyHeader": true,
  "maxWidth": "container"
}';

-- Обновляем структуру footer_settings для поддержки Instagram вместо VK
UPDATE site_settings 
SET footer_settings = jsonb_set(
  jsonb_set(
    COALESCE(footer_settings, '{}'::jsonb),
    '{socialLinks,instagram}',
    COALESCE((footer_settings->'socialLinks'->>'vk')::text, '""')::jsonb
  ),
  '{socialLinks}',
  (COALESCE(footer_settings, '{}'::jsonb)->'socialLinks')::jsonb #- '{vk}'
)
WHERE footer_settings IS NOT NULL;

-- Обновляем существующие записи navigation_items, добавляя поле order если его нет
UPDATE site_settings 
SET navigation_items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'order' THEN item
      ELSE item || jsonb_build_object('order', row_number() OVER () - 1)
    END ORDER BY 
      CASE WHEN item ? 'order' THEN (item->>'order')::int ELSE row_number() OVER () - 1 END
  )
  FROM jsonb_array_elements(navigation_items) AS item
)
WHERE navigation_items IS NOT NULL AND navigation_items != '[]'::jsonb;

-- Обновляем существующие записи, добавляя значения по умолчанию для topbar_settings
UPDATE site_settings 
SET topbar_settings = '{
  "alignment": "center",
  "style": "classic", 
  "spacing": "normal",
  "showBorder": true,
  "showShadow": true,
  "backgroundColor": "white",
  "animation": "slide",
  "mobileCollapse": true,
  "showIcons": false,
  "showBadges": true,
  "stickyHeader": true,
  "maxWidth": "container"
}'::jsonb
WHERE topbar_settings IS NULL;

-- Добавляем комментарий к новому полю
COMMENT ON COLUMN site_settings.topbar_settings IS 'JSON настройки внешнего вида и поведения топбара (выравнивание, стиль, анимации и т.д.)';

-- Создаем индекс для быстрого поиска настроек топбара
CREATE INDEX IF NOT EXISTS idx_site_settings_topbar ON site_settings USING gin (topbar_settings);

-- Создаем RLS политики если их еще нет
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'site_settings' 
        AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON site_settings
        FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'site_settings' 
        AND policyname = 'Allow authenticated update access'
    ) THEN
        CREATE POLICY "Allow authenticated update access" ON site_settings
        FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'site_settings' 
        AND policyname = 'Allow authenticated insert access'
    ) THEN
        CREATE POLICY "Allow authenticated insert access" ON site_settings
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

-- Включаем RLS если он не включен
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;