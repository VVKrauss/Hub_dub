// src/services/SimpleRegistrationService.ts
import { supabase } from '../lib/supabase';

export interface SimpleRegistration {
  id: string;
  event_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  tickets: number;
  total_amount: number;
  registration_status: 'active' | 'cancelled';
  payment_status: 'free' | 'donation' | 'venue' | 'online_pending' | 'online_paid';
  qr_code: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRegistrationData {
  eventId: string;
  fullName: string;
  email: string;
  phone?: string;
  tickets: number;
}

export interface RegistrationResponse {
  success: boolean;
  registration?: SimpleRegistration;
  error?: string;
}

export interface EventWithRegistrationStats {
  id: string;
  title: string;
  start_at: string;
  simple_payment_type: 'free' | 'donation' | 'paid';
  price: number;
  currency: string;
  max_registrations: number;
  current_registrations: number;
  registration_enabled: boolean;
  registration_deadline?: string;
  online_payment_url?: string;
  online_payment_type?: 'link' | 'oblakkarte';
  available_spots: number;
  registration_available: boolean;
}

export class SimpleRegistrationService {
  
  /**
   * Создает новую регистрацию
   */
  static async createRegistration(data: CreateRegistrationData): Promise<RegistrationResponse> {
    try {
      const { data: result, error } = await supabase.rpc('create_simple_registration', {
        p_event_id: data.eventId,
        p_full_name: data.fullName,
        p_email: data.email,
        p_phone: data.phone || '',
        p_tickets: data.tickets
      });

      if (error) {
        console.error('Registration error:', error);
        return {
          success: false,
          error: this.getErrorMessage(error.message)
        };
      }

      // Получаем созданную регистрацию
      const { data: registration, error: fetchError } = await supabase
        .from('simple_registrations')
        .select('*')
        .eq('id', result)
        .single();

      if (fetchError) {
        console.error('Fetch registration error:', fetchError);
        return {
          success: false,
          error: 'Регистрация создана, но не удалось получить данные'
        };
      }

      return {
        success: true,
        registration: registration
      };

    } catch (error) {
      console.error('Unexpected registration error:', error);
      return {
        success: false,
        error: 'Произошла неожиданная ошибка'
      };
    }
  }

  /**
   * Отменяет регистрацию
   */
  static async cancelRegistration(registrationId: string): Promise<RegistrationResponse> {
    try {
      const { data: result, error } = await supabase.rpc('cancel_registration', {
        p_registration_id: registrationId
      });

      if (error) {
        console.error('Cancel registration error:', error);
        return {
          success: false,
          error: this.getErrorMessage(error.message)
        };
      }

      if (!result) {
        return {
          success: false,
          error: 'Регистрация не найдена'
        };
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Unexpected cancel error:', error);
      return {
        success: false,
        error: 'Произошла неожиданная ошибка'
      };
    }
  }

  /**
   * Получает события с информацией о регистрациях
   */
  static async getEventsWithRegistrations(): Promise<EventWithRegistrationStats[]> {
    try {
      const { data, error } = await supabase
        .from('events_with_simple_registrations')
        .select(`
          id,
          title,
          start_at,
          simple_payment_type,
          price,
          currency,
          max_registrations,
          current_registrations,
          registration_enabled,
          registration_deadline,
          online_payment_url,
          online_payment_type,
          available_spots,
          registration_available
        `)
        .order('start_at', { ascending: true });

      if (error) {
        console.error('Fetch events error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Unexpected fetch events error:', error);
      return [];
    }
  }

  /**
   * Получает событие с информацией о регистрациях
   */
  static async getEventWithRegistrations(eventId: string): Promise<EventWithRegistrationStats | null> {
    try {
      const { data, error } = await supabase
        .from('events_with_simple_registrations')
        .select(`
          id,
          title,
          start_at,
          end_at,
          location,
          description,
          simple_payment_type,
          price,
          currency,
          max_registrations,
          current_registrations,
          registration_enabled,
          registration_deadline,
          online_payment_url,
          online_payment_type,
          available_spots,
          registration_available
        `)
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Fetch event error:', error);
        return null;
      }

      return data;

    } catch (error) {
      console.error('Unexpected fetch event error:', error);
      return null;
    }
  }

  /**
   * Получает регистрации пользователя
   */
  static async getUserRegistrations(userId: string): Promise<SimpleRegistration[]> {
    try {
      const { data, error } = await supabase
        .from('simple_registrations')
        .select(`
          *,
          event:events(id, title, start_at, location)
        `)
        .eq('user_id', userId)
        .eq('registration_status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch user registrations error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Unexpected fetch user registrations error:', error);
      return [];
    }
  }

  /**
   * Получает регистрации события (только для админов)
   */
  static async getEventRegistrations(eventId: string): Promise<SimpleRegistration[]> {
    try {
      const { data, error } = await supabase.rpc('get_event_registrations', {
        p_event_id: eventId
      });

      if (error) {
        console.error('Fetch event registrations error:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Unexpected fetch event registrations error:', error);
      return [];
    }
  }

  /**
   * Проверяет QR код
   */
  static async verifyQRCode(qrCode: string) {
    try {
      const { data, error } = await supabase.rpc('verify_qr_code', {
        p_qr_code: qrCode
      });

      if (error) {
        console.error('Verify QR error:', error);
        return null;
      }

      return data?.[0] || null;

    } catch (error) {
      console.error('Unexpected verify QR error:', error);
      return null;
    }
  }

  /**
   * Обновляет статус оплаты регистрации
   */
  static async updatePaymentStatus(
    registrationId: string, 
    paymentStatus: 'free' | 'donation' | 'venue' | 'online_pending' | 'online_paid'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('simple_registrations')
        .update({ payment_status: paymentStatus })
        .eq('id', registrationId);

      if (error) {
        console.error('Update payment status error:', error);
        return false;
      }

      return true;

    } catch (error) {
      console.error('Unexpected update payment status error:', error);
      return false;
    }
  }

  /**
   * Ищет регистрацию по email и событию
   */
  static async findRegistrationByEmail(
    eventId: string, 
    email: string
  ): Promise<SimpleRegistration | null> {
    try {
      const { data, error } = await supabase
        .from('simple_registrations')
        .select('*')
        .eq('event_id', eventId)
        .ilike('email', email.toLowerCase().trim())
        .eq('registration_status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Find registration by email error:', error);
        return null;
      }

      return data;

    } catch (error) {
      console.error('Unexpected find registration error:', error);
      return null;
    }
  }

  /**
   * Проверяет, может ли пользователь зарегистрироваться на событие
   */
  static async canUserRegister(
    eventId: string, 
    email: string, 
    tickets: number
  ): Promise<{ canRegister: boolean; reason?: string }> {
    try {
      // Получаем информацию о событии из нового представления
      const { data: event, error } = await supabase
        .from('events_with_simple_registrations')
        .select('registration_available, available_spots, registration_enabled, registration_deadline')
        .eq('id', eventId)
        .single();
      
      if (error || !event) {
        return { canRegister: false, reason: 'Событие не найдено' };
      }

      if (!event.registration_available) {
        return { canRegister: false, reason: 'Регистрация недоступна' };
      }

      if (event.available_spots < tickets) {
        return { 
          canRegister: false, 
          reason: `Недостаточно мест. Доступно: ${event.available_spots}` 
        };
      }

      // Проверяем, не зарегистрирован ли уже пользователь
      const existingRegistration = await this.findRegistrationByEmail(eventId, email);
      if (existingRegistration) {
        return { 
          canRegister: false, 
          reason: 'Вы уже зарегистрированы на это событие' 
        };
      }

      return { canRegister: true };

    } catch (error) {
      console.error('Can user register check error:', error);
      return { canRegister: false, reason: 'Ошибка проверки' };
    }
  }

  /**
   * Экспортирует регистрации события в CSV
   */
  static async exportEventRegistrations(eventId: string): Promise<string> {
    try {
      const registrations = await this.getEventRegistrations(eventId);
      
      if (registrations.length === 0) {
        return '';
      }

      // Создаем CSV заголовки
      const headers = [
        'Имя',
        'Email',
        'Телефон',
        'Билетов',
        'Сумма',
        'Статус регистрации',
        'Статус оплаты',
        'QR код',
        'Дата регистрации'
      ];

      // Создаем CSV строки
      const csvRows = [
        headers.join(','),
        ...registrations.map(reg => [
          `"${reg.full_name}"`,
          `"${reg.email}"`,
          `"${reg.phone}"`,
          reg.tickets,
          reg.total_amount,
          `"${reg.registration_status}"`,
          `"${reg.payment_status}"`,
          `"${reg.qr_code}"`,
          `"${new Date(reg.created_at).toLocaleString('ru-RU')}"`
        ].join(','))
      ];

      return csvRows.join('\n');

    } catch (error) {
      console.error('Export registrations error:', error);
      return '';
    }
  }

  /**
   * Получает статистику регистраций
   */
  static async getRegistrationStats(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('simple_registrations')
        .select('registration_status, payment_status, tickets')
        .eq('event_id', eventId);

      if (error) {
        console.error('Get registration stats error:', error);
        return null;
      }

      const stats = {
        total: data.length,
        active: data.filter(r => r.registration_status === 'active').length,
        cancelled: data.filter(r => r.registration_status === 'cancelled').length,
        totalTickets: data
          .filter(r => r.registration_status === 'active')
          .reduce((sum, r) => sum + r.tickets, 0),
        paymentStats: {
          free: data.filter(r => r.payment_status === 'free').length,
          donation: data.filter(r => r.payment_status === 'donation').length,
          venue: data.filter(r => r.payment_status === 'venue').length,
          online_paid: data.filter(r => r.payment_status === 'online_paid').length,
          online_pending: data.filter(r => r.payment_status === 'online_pending').length
        }
      };

      return stats;

    } catch (error) {
      console.error('Unexpected stats error:', error);
      return null;
    }
  }

  /**
   * Мигрирует старые регистрации в новую систему
   */
  static async migrateOldRegistrations(): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.rpc('migrate_old_registrations');

      if (error) {
        console.error('Migration error:', error);
        return {
          success: false,
          message: `Ошибка миграции: ${error.message}`
        };
      }

      return {
        success: true,
        message: 'Миграция успешно выполнена'
      };

    } catch (error) {
      console.error('Unexpected migration error:', error);
      return {
        success: false,
        message: 'Произошла неожиданная ошибка при миграции'
      };
    }
  }

  /**
   * Преобразует сообщение об ошибке в понятный для пользователя текст
   */
  private static getErrorMessage(errorMessage: string): string {
    if (errorMessage.includes('Not enough spots available')) {
      return 'Недостаточно свободных мест';
    }
    if (errorMessage.includes('Registration is disabled')) {
      return 'Регистрация отключена для этого события';
    }
    if (errorMessage.includes('Registration deadline has passed')) {
      return 'Срок регистрации истек';
    }
    if (errorMessage.includes('Event not found')) {
      return 'Событие не найдено';
    }
    if (errorMessage.includes('Access denied')) {
      return 'Доступ запрещен';
    }
    
    return 'Произошла ошибка при регистрации';
  }
}

export default SimpleRegistrationService;