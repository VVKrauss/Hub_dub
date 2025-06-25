// src/components/admin/QRScanner.tsx - обновленная версия processQRCode

const processQRCode = async (qrData: string) => {
  try {
    const parsed = JSON.parse(qrData);
    
    // Обработка QR-кода пользователя для посещений
    if (parsed.type === 'user_attendance' && parsed.userId && parsed.qrToken) {
      // Проверяем валидность токена
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, email, qr_token')
        .eq('id', parsed.userId)
        .eq('qr_token', parsed.qrToken)
        .single();

      if (error || !profile) {
        throw new Error('QR-код недействителен или устарел');
      }

      setScannedUser({
        userId: profile.id,
        userName: profile.name || profile.email.split('@')[0],
        userEmail: profile.email,
        qrToken: profile.qr_token
      });

      stopCamera();
      return;
    }
    
    // Обработка QR-кода регистрации на мероприятие
    if (parsed.type === 'event_registration' && parsed.registrationId && parsed.eventId) {
      // Проверяем валидность регистрации
      const { data: registration, error } = await supabase
        .from('user_event_registrations')
        .select(`
          *,
          event:events(id, title, start_at, location),
          profile:profiles(id, name, email)
        `)
        .eq('registration_id', parsed.registrationId)
        .eq('event_id', parsed.eventId)
        .eq('status', 'active')
        .single();

      if (error || !registration) {
        throw new Error('Регистрация не найдена или неактивна');
      }

      // Проверяем соответствие данных в QR-коде
      if (registration.full_name !== parsed.fullName || 
          registration.email !== parsed.email) {
        throw new Error('Данные в QR-коде не соответствуют регистрации');
      }

      // Устанавливаем данные как для обычного пользователя, но с дополнительной информацией о регистрации
      setScannedUser({
        userId: registration.user_id,
        userName: registration.full_name,
        userEmail: registration.email,
        qrToken: parsed.registrationId, // Используем ID регистрации как токен
        registrationData: {
          registrationId: registration.registration_id,
          eventId: registration.event_id,
          eventTitle: registration.event?.title,
          adultTickets: registration.adult_tickets,
          childTickets: registration.child_tickets,
          totalAmount: registration.total_amount,
          paymentStatus: registration.payment_status
        }
      });

      stopCamera();
      return;
    }
    
    throw new Error('Неверный формат QR-кода');
    
  } catch (error) {
    console.error('Error processing QR code:', error);
    toast.error(error instanceof Error ? error.message : 'Ошибка обработки QR-кода');
  }
};// src/components/admin/QRScanner.tsx - обновленная версия processQRCode

const processQRCode = async (qrData: string) => {
  try {
    const parsed = JSON.parse(qrData);
    
    // Обработка QR-кода пользователя для посещений
    if (parsed.type === 'user_attendance' && parsed.userId && parsed.qrToken) {
      // Проверяем валидность токена
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, email, qr_token')
        .eq('id', parsed.userId)
        .eq('qr_token', parsed.qrToken)
        .single();

      if (error || !profile) {
        throw new Error('QR-код недействителен или устарел');
      }

      setScannedUser({
        userId: profile.id,
        userName: profile.name || profile.email.split('@')[0],
        userEmail: profile.email,
        qrToken: profile.qr_token
      });

      stopCamera();
      return;
    }
    
    // Обработка QR-кода регистрации на мероприятие
    if (parsed.type === 'event_registration' && parsed.registrationId && parsed.eventId) {
      // Проверяем валидность регистрации
      const { data: registration, error } = await supabase
        .from('user_event_registrations')
        .select(`
          *,
          event:events(id, title, start_at, location),
          profile:profiles(id, name, email)
        `)
        .eq('registration_id', parsed.registrationId)
        .eq('event_id', parsed.eventId)
        .eq('status', 'active')
        .single();

      if (error || !registration) {
        throw new Error('Регистрация не найдена или неактивна');
      }

      // Проверяем соответствие данных в QR-коде
      if (registration.full_name !== parsed.fullName || 
          registration.email !== parsed.email) {
        throw new Error('Данные в QR-коде не соответствуют регистрации');
      }

      // Устанавливаем данные как для обычного пользователя, но с дополнительной информацией о регистрации
      setScannedUser({
        userId: registration.user_id,
        userName: registration.full_name,
        userEmail: registration.email,
        qrToken: parsed.registrationId, // Используем ID регистрации как токен
        registrationData: {
          registrationId: registration.registration_id,
          eventId: registration.event_id,
          eventTitle: registration.event?.title,
          adultTickets: registration.adult_tickets,
          childTickets: registration.child_tickets,
          totalAmount: registration.total_amount,
          paymentStatus: registration.payment_status
        }
      });

      stopCamera();
      return;
    }
    
    throw new Error('Неверный формат QR-кода');
    
  } catch (error) {
    console.error('Error processing QR code:', error);
    toast.error(error instanceof Error ? error.message : 'Ошибка обработки QR-кода');
  }
};