// src/utils/migrationUtility.ts
import { supabase } from '../lib/supabase';
import SimpleRegistrationService from '../services/SimpleRegistrationService';

export interface MigrationStatus {
  success: boolean;
  message: string;
  details?: any;
}

export class MigrationUtility {
  
  /**
   * Проверяет, доступна ли новая система регистраций
   */
  static async checkNewSystemAvailability(): Promise<MigrationStatus> {
    try {
      // Проверяем существование таблицы simple_registrations
      const { data, error } = await supabase
        .from('simple_registrations')
        .select('id')
        .limit(1);

      if (error) {
        return {
          success: false,
          message: 'Новая система недоступна. Необходимо применить миграцию.',
          details: error
        };
      }

      return {
        success: true,
        message: 'Новая система регистраций доступна'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Ошибка при проверке новой системы',
        details: error
      };
    }
  }

  /**
   * Запускает миграцию старых данных в новую систему
   */
  static async runMigration(): Promise<MigrationStatus> {
    try {
      console.log('🚀 Начинаем миграцию старых регистраций...');

      const { error } = await supabase.rpc('migrate_old_registrations');
      
      if (error) {
        return {
          success: false,
          message: `Ошибка миграции: ${error.message}`,
          details: error
        };
      }

      console.log('✅ Миграция завершена успешно');
      return {
        success: true,
        message: 'Миграция старых данных завершена успешно'
      };

    } catch (error) {
      console.error('❌ Ошибка миграции:', error);
      return {
        success: false,
        message: 'Произошла ошибка при миграции',
        details: error
      };
    }
  }

  /**
   * Быстрая проверка основных функций
   */
  static async quickCheck(): Promise<MigrationStatus> {
    try {
      console.log('⚡ Быстрая проверка системы...');

      // 1. Проверяем доступность
      const availability = await this.checkNewSystemAvailability();
      if (!availability.success) {
        return availability;
      }

      // 2. Получаем список событий
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_at, simple_payment_type, max_registrations, current_registrations')
        .eq('status', 'active')
        .order('start_at', { ascending: true })
        .limit(5);

      if (eventsError) {
        return {
          success: false,
          message: 'Ошибка получения списка событий',
          details: eventsError
        };
      }

      console.log('✅ Быстрая проверка завершена');
      return {
        success: true,
        message: `Система работает корректно. Найдено ${events?.length || 0} активных событий`,
        details: {
          eventsCount: events?.length || 0,
          events: events
        }
      };

    } catch (error) {
      console.error('❌ Ошибка быстрой проверки:', error);
      return {
        success: false,
        message: 'Ошибка при быстрой проверке',
        details: error
      };
    }
  }

  /**
   * Создает тестовое событие для проверки системы
   */
  static async createTestEvent(): Promise<MigrationStatus> {
    try {
      console.log('🧪 Создаем тестовое событие...');

      const testEvent = {
        title: `Тестовое событие ${new Date().toISOString()}`,
        description: 'Это тестовое событие для проверки новой системы регистраций',
        event_type: 'workshop',
        start_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // завтра
        end_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        location: 'Тестовая локация',
        age_category: '0+',
        price: 100,
        currency: 'RSD',
        status: 'active',
        
        // Новые поля
        simple_payment_type: 'paid',
        max_registrations: 10,
        current_registrations: 0,
        registration_enabled: true,
        
        // Старые поля для совместимости
        payment_type: 'paid',
        languages: ['Serbian', 'English']
      };

      const { data, error } = await supabase
        .from('events')
        .insert(testEvent)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Тестовое событие создано:', data.id);

      return {
        success: true,
        message: `Тестовое событие создано (ID: ${data.id})`,
        details: {
          event: data
        }
      };

    } catch (error) {
      console.error('❌ Ошибка создания тестового события:', error);
      return {
        success: false,
        message: 'Ошибка при создании тестового события',
        details: error
      };
    }
  }

  /**
   * Удаляет тестовые данные
   */
  static async cleanupTestData(): Promise<MigrationStatus> {
    try {
      console.log('🧹 Очистка тестовых данных...');

      // Удаляем тестовые регистрации
      const { error: regError } = await supabase
        .from('simple_registrations')
        .delete()
        .like('email', 'test+%@example.com');

      // Удаляем тестовые события
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .like('title', 'Тестовое событие%');

      if (regError || eventError) {
        throw regError || eventError;
      }

      console.log('✅ Тестовые данные удалены');

      return {
        success: true,
        message: 'Тестовые данные успешно удалены'
      };

    } catch (error) {
      console.error('❌ Ошибка очистки:', error);
      return {
        success: false,
        message: 'Ошибка при удалении тестовых данных',
        details: error
      };
    }
  }
}

// Добавляем утилиты в глобальную область видимости для использования в консоли
if (typeof window !== 'undefined') {
  (window as any).MigrationUtility = MigrationUtility;
  
  // Добавляем удобные алиасы для консоли
  (window as any).checkSystem = () => MigrationUtility.checkNewSystemAvailability();
  (window as any).runMigration = () => MigrationUtility.runMigration();
  (window as any).quickCheck = () => MigrationUtility.quickCheck();
  (window as any).createTestEvent = () => MigrationUtility.createTestEvent();
  (window as any).cleanupTestData = () => MigrationUtility.cleanupTestData();
  
  console.log('🔧 Migration utilities loaded! Available commands:');
  console.log('- checkSystem() - проверить доступность новой системы');
  console.log('- runMigration() - запустить миграцию данных');
  console.log('- quickCheck() - быстрая проверка');
  console.log('- createTestEvent() - создать тестовое событие');
  console.log('- cleanupTestData() - очистить тестовые данные');
}

export default MigrationUtility;