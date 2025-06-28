-- supabase/migrations/20250628_simplify_registrations.sql
-- Упрощение системы регистраций

-- 1. Создаем новую упрощенную таблицу регистраций
CREATE TABLE IF NOT EXISTS simple_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Основная информация о регистрации
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  tickets INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Статусы
  registration_status TEXT NOT NULL DEFAULT 'active' CHECK (registration_status IN ('active', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'venue' CHECK (payment_status IN ('free', 'donation', 'venue', 'online_pending', 'online_paid')),
  
  -- QR код для проверки
  qr_code TEXT NOT NULL,
  
  -- Метаданные
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Индексы
  UNIQUE(qr_code),
  INDEX idx_simple_registrations_event_id (event_id),
  INDEX idx_simple_registrations_email (email),
  INDEX idx_simple_registrations_qr_code (qr_code),
  INDEX idx_simple_registrations_status (registration_status, payment_status)
);

-- 2. Добавляем упрощенные поля к таблице events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS simple_payment_type TEXT DEFAULT 'free' CHECK (simple_payment_type IN ('free', 'donation', 'paid')),
ADD COLUMN IF NOT EXISTS online_payment_url TEXT,
ADD COLUMN IF NOT EXISTS online_payment_type TEXT CHECK (online_payment_type IN ('link', 'oblakkarte')),
ADD COLUMN IF NOT EXISTS max_registrations INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_registrations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT true;

-- 3. Создаем функцию для автоматического обновления счетчиков
CREATE OR REPLACE FUNCTION update_event_registration_count()
RETURNS TRIGGER AS $$
BEGIN
  -- При добавлении регистрации
  IF TG_OP = 'INSERT' AND NEW.registration_status = 'active' THEN
    UPDATE events 
    SET current_registrations = current_registrations + NEW.tickets
    WHERE id = NEW.event_id;
    
  -- При изменении статуса регистрации
  ELSIF TG_OP = 'UPDATE' THEN
    -- Если регистрация была активной и стала неактивной
    IF OLD.registration_status = 'active' AND NEW.registration_status != 'active' THEN
      UPDATE events 
      SET current_registrations = current_registrations - OLD.tickets
      WHERE id = OLD.event_id;
    
    -- Если регистрация была неактивной и стала активной
    ELSIF OLD.registration_status != 'active' AND NEW.registration_status = 'active' THEN
      UPDATE events 
      SET current_registrations = current_registrations + NEW.tickets
      WHERE id = NEW.event_id;
    
    -- Если изменилось количество билетов у активной регистрации
    ELSIF OLD.registration_status = 'active' AND NEW.registration_status = 'active' AND OLD.tickets != NEW.tickets THEN
      UPDATE events 
      SET current_registrations = current_registrations - OLD.tickets + NEW.tickets
      WHERE id = NEW.event_id;
    END IF;
    
  -- При удалении активной регистрации
  ELSIF TG_OP = 'DELETE' AND OLD.registration_status = 'active' THEN
    UPDATE events 
    SET current_registrations = current_registrations - OLD.tickets
    WHERE id = OLD.event_id;
  END IF;
  
  -- Обновляем updated_at для new записи
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Создаем триггер для автоматического обновления счетчиков
DROP TRIGGER IF EXISTS trigger_update_registration_count ON simple_registrations;
CREATE TRIGGER trigger_update_registration_count
  BEFORE INSERT OR UPDATE OR DELETE ON simple_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_registration_count();

-- 5. Функция для миграции данных из старой системы
CREATE OR REPLACE FUNCTION migrate_old_registrations()
RETURNS void AS $$
DECLARE
  event_record RECORD;
  reg_item JSONB;
  migrated_count INTEGER := 0;
BEGIN
  -- Перебираем все события с регистрациями
  FOR event_record IN 
    SELECT id, registrations, registrations_list, max_registrations, payment_type
    FROM events 
    WHERE registrations IS NOT NULL OR registrations_list IS NOT NULL
  LOOP
    
    -- Обрабатываем новую структуру registrations
    IF event_record.registrations IS NOT NULL AND event_record.registrations->'reg_list' IS NOT NULL THEN
      FOR reg_item IN SELECT * FROM jsonb_array_elements(event_record.registrations->'reg_list')
      LOOP
        INSERT INTO simple_registrations (
          event_id,
          full_name,
          email,
          phone,
          tickets,
          total_amount,
          registration_status,
          payment_status,
          qr_code,
          created_at
        ) VALUES (
          event_record.id,
          reg_item->>'full_name',
          reg_item->>'email',
          COALESCE(reg_item->>'phone', ''),
          COALESCE((reg_item->>'adult_tickets')::INTEGER, 0) + COALESCE((reg_item->>'child_tickets')::INTEGER, 0),
          COALESCE((reg_item->>'total_amount')::DECIMAL, 0),
          CASE WHEN (reg_item->>'status')::BOOLEAN THEN 'active' ELSE 'cancelled' END,
          CASE 
            WHEN event_record.payment_type = 'free' THEN 'free'
            WHEN event_record.payment_type = 'donation' THEN 'donation'
            ELSE 'venue'
          END,
          COALESCE(reg_item->>'qr_code', event_record.id::TEXT || '-' || (reg_item->>'id')),
          COALESCE((reg_item->>'created_at')::TIMESTAMPTZ, now())
        ) ON CONFLICT (qr_code) DO NOTHING;
        
        migrated_count := migrated_count + 1;
      END LOOP;
      
    -- Обрабатываем старую структуру registrations_list
    ELSIF event_record.registrations_list IS NOT NULL THEN
      FOR reg_item IN SELECT * FROM jsonb_array_elements(event_record.registrations_list)
      LOOP
        INSERT INTO simple_registrations (
          event_id,
          full_name,
          email,
          phone,
          tickets,
          total_amount,
          registration_status,
          payment_status,
          qr_code,
          created_at
        ) VALUES (
          event_record.id,
          reg_item->>'full_name',
          reg_item->>'email',
          COALESCE(reg_item->>'phone', ''),
          COALESCE((reg_item->>'adult_tickets')::INTEGER, 0) + COALESCE((reg_item->>'child_tickets')::INTEGER, 0),
          COALESCE((reg_item->>'total_amount')::DECIMAL, 0),
          CASE WHEN (reg_item->>'status')::BOOLEAN THEN 'active' ELSE 'cancelled' END,
          CASE 
            WHEN event_record.payment_type = 'free' THEN 'free'
            WHEN event_record.payment_type = 'donation' THEN 'donation'
            ELSE 'venue'
          END,
          COALESCE(reg_item->>'qr_code', event_record.id::TEXT || '-' || (reg_item->>'id')),
          COALESCE((reg_item->>'created_at')::TIMESTAMPTZ, now())
        ) ON CONFLICT (qr_code) DO NOTHING;
        
        migrated_count := migrated_count + 1;
      END LOOP;
    END IF;
    
    -- Обновляем упрощенные поля события
    UPDATE events SET
      simple_payment_type = CASE 
        WHEN payment_type = 'free' THEN 'free'
        WHEN payment_type = 'donation' THEN 'donation'
        WHEN payment_type IN ('cost', 'paid') THEN 'paid'
        ELSE 'free'
      END,
      online_payment_url = CASE 
        WHEN oblakkarte_data_event_id IS NOT NULL THEN oblakkarte_data_event_id
        WHEN payment_link IS NOT NULL THEN payment_link
        ELSE NULL
      END,
      online_payment_type = CASE 
        WHEN oblakkarte_data_event_id IS NOT NULL THEN 'oblakkarte'
        WHEN payment_link IS NOT NULL THEN 'link'
        ELSE NULL
      END,
      max_registrations = CASE
        WHEN registrations IS NOT NULL AND registrations->'max_regs' IS NOT NULL THEN 
          (registrations->>'max_regs')::INTEGER
        WHEN max_registrations IS NOT NULL THEN max_registrations
        ELSE 50
      END,
      registration_enabled = COALESCE(registration_enabled, true)
    WHERE id = event_record.id;
    
  END LOOP;
  
  -- Пересчитываем текущее количество регистраций для всех событий
  UPDATE events SET current_registrations = (
    SELECT COALESCE(SUM(tickets), 0)
    FROM simple_registrations 
    WHERE event_id = events.id AND registration_status = 'active'
  );
  
  RAISE NOTICE 'Migrated % registrations', migrated_count;
END;
$ LANGUAGE plpgsql;

-- 6. Настройка RLS (Row Level Security) для новой таблицы
ALTER TABLE simple_registrations ENABLE ROW LEVEL SECURITY;

-- Публичный доступ для чтения (нужно для отображения количества регистраций)
CREATE POLICY "Public can view registration counts"
  ON simple_registrations
  FOR SELECT
  TO public
  USING (true);

-- Аутентифицированные пользователи могут создавать регистрации
CREATE POLICY "Authenticated users can create registrations"
  ON simple_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Пользователи могут редактировать свои регистрации
CREATE POLICY "Users can update own registrations"
  ON simple_registrations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Администраторы могут управлять всеми регистрациями
CREATE POLICY "Admins can manage all registrations"
  ON simple_registrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'Admin'
    )
  );

-- 7. Функция для создания новой регистрации
CREATE OR REPLACE FUNCTION create_simple_registration(
  p_event_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT '',
  p_tickets INTEGER DEFAULT 1
)
RETURNS UUID AS $
DECLARE
  v_registration_id UUID;
  v_event RECORD;
  v_qr_code TEXT;
  v_total_amount DECIMAL(10,2);
  v_payment_status TEXT;
BEGIN
  -- Получаем информацию о событии
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  
  -- Проверяем доступность мест
  IF v_event.current_registrations + p_tickets > v_event.max_registrations THEN
    RAISE EXCEPTION 'Not enough spots available';
  END IF;
  
  -- Проверяем, включена ли регистрация
  IF NOT v_event.registration_enabled THEN
    RAISE EXCEPTION 'Registration is disabled for this event';
  END IF;
  
  -- Проверяем дедлайн регистрации
  IF v_event.registration_deadline IS NOT NULL AND now() > v_event.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;
  
  -- Генерируем ID и QR код
  v_registration_id := gen_random_uuid();
  v_qr_code := p_event_id::TEXT || '-' || v_registration_id::TEXT;
  
  -- Рассчитываем сумму и статус оплаты
  CASE v_event.simple_payment_type
    WHEN 'free' THEN
      v_total_amount := 0;
      v_payment_status := 'free';
    WHEN 'donation' THEN
      v_total_amount := 0;
      v_payment_status := 'donation';
    WHEN 'paid' THEN
      v_total_amount := v_event.price * p_tickets;
      v_payment_status := 'venue';
    ELSE
      v_total_amount := 0;
      v_payment_status := 'free';
  END CASE;
  
  -- Создаем регистрацию
  INSERT INTO simple_registrations (
    id,
    event_id,
    user_id,
    full_name,
    email,
    phone,
    tickets,
    total_amount,
    registration_status,
    payment_status,
    qr_code
  ) VALUES (
    v_registration_id,
    p_event_id,
    auth.uid(),
    p_full_name,
    LOWER(TRIM(p_email)),
    p_phone,
    p_tickets,
    v_total_amount,
    'active',
    v_payment_status,
    v_qr_code
  );
  
  RETURN v_registration_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Функция для отмены регистрации
CREATE OR REPLACE FUNCTION cancel_registration(p_registration_id UUID)
RETURNS BOOLEAN AS $
DECLARE
  v_registration RECORD;
BEGIN
  -- Получаем регистрацию
  SELECT * INTO v_registration 
  FROM simple_registrations 
  WHERE id = p_registration_id;
  
  IF v_registration IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Проверяем права доступа (свою регистрацию или админ)
  IF v_registration.user_id != auth.uid() AND NOT EXISTS(
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Отменяем регистрацию
  UPDATE simple_registrations 
  SET registration_status = 'cancelled'
  WHERE id = p_registration_id;
  
  RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Функция для получения регистраций события
CREATE OR REPLACE FUNCTION get_event_registrations(p_event_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  tickets INTEGER,
  total_amount DECIMAL(10,2),
  registration_status TEXT,
  payment_status TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ
) AS $
BEGIN
  -- Проверяем права доступа (только админы могут видеть все регистрации)
  IF NOT EXISTS(
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    sr.id,
    sr.full_name,
    sr.email,
    sr.phone,
    sr.tickets,
    sr.total_amount,
    sr.registration_status,
    sr.payment_status,
    sr.qr_code,
    sr.created_at
  FROM simple_registrations sr
  WHERE sr.event_id = p_event_id
  ORDER BY sr.created_at DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Функция для проверки QR кода
CREATE OR REPLACE FUNCTION verify_qr_code(p_qr_code TEXT)
RETURNS TABLE (
  registration_id UUID,
  event_id UUID,
  event_title TEXT,
  full_name TEXT,
  email TEXT,
  tickets INTEGER,
  payment_status TEXT,
  is_valid BOOLEAN
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.event_id,
    e.title,
    sr.full_name,
    sr.email,
    sr.tickets,
    sr.payment_status,
    (sr.registration_status = 'active') as is_valid
  FROM simple_registrations sr
  JOIN events e ON e.id = sr.event_id
  WHERE sr.qr_code = p_qr_code;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Создаем представление для упрощенного доступа к данным событий
CREATE OR REPLACE VIEW events_with_simple_registrations AS
SELECT 
  e.*,
  -- Подсчитываем активные регистрации
  COALESCE(active_regs.count, 0) as active_registrations_count,
  COALESCE(active_regs.total_tickets, 0) as active_tickets_count,
  -- Подсчитываем все регистрации
  COALESCE(all_regs.count, 0) as total_registrations_count,
  -- Рассчитываем доступные места
  (e.max_registrations - COALESCE(active_regs.total_tickets, 0)) as available_spots,
  -- Проверяем доступность регистрации
  (
    e.registration_enabled = true AND
    (e.registration_deadline IS NULL OR e.registration_deadline > now()) AND
    (e.max_registrations - COALESCE(active_regs.total_tickets, 0)) > 0
  ) as registration_available
FROM events e
LEFT JOIN (
  SELECT 
    event_id,
    COUNT(*) as count,
    SUM(tickets) as total_tickets
  FROM simple_registrations 
  WHERE registration_status = 'active'
  GROUP BY event_id
) active_regs ON active_regs.event_id = e.id
LEFT JOIN (
  SELECT 
    event_id,
    COUNT(*) as count
  FROM simple_registrations 
  GROUP BY event_id
) all_regs ON all_regs.event_id = e.id;

-- 12. Комментарии для документации
COMMENT ON TABLE simple_registrations IS 'Упрощенная таблица регистраций на события';
COMMENT ON COLUMN simple_registrations.tickets IS 'Количество билетов (объединяет взрослые и детские)';
COMMENT ON COLUMN simple_registrations.payment_status IS 'Статус оплаты: free, donation, venue, online_pending, online_paid';
COMMENT ON COLUMN simple_registrations.registration_status IS 'Статус регистрации: active, cancelled';

COMMENT ON COLUMN events.simple_payment_type IS 'Упрощенный тип оплаты: free, donation, paid';
COMMENT ON COLUMN events.online_payment_url IS 'URL для онлайн оплаты или ID виджета Oblakkarte';
COMMENT ON COLUMN events.online_payment_type IS 'Тип онлайн оплаты: link или oblakkarte';

-- 13. Запускаем миграцию данных (раскомментировать при необходимости)
-- SELECT migrate_old_registrations();