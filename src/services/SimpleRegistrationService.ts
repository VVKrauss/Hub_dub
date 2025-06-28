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