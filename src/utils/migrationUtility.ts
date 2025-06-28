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
   * Проверяет консистентность данных между старой и новой системами
   */
  static async validateMigration(): Promise<MigrationStatus> {
    try {
      console.log('🔍 Проверяем консистентность данных...');

      // Получаем события из старой системы
      const { data: oldEvents, error: oldError } = await supabase
        .from('events')
        .select('id, title, registrations, registrations_list, current_registration_count')
        .or('registrations.not.is.null,registrations_list.not.is.null');

      if (oldError) {
        throw oldError;
      }

      // Проверяем каждое событие
      const validationResults = [];
      
      for (const event of oldEvents || []) {
        try {
          // Получаем данные из новой системы
          const newEventData = await SimpleRegistrationService.getEventWithRegistrations(event.id);
          const stats = await SimpleRegistrationService.getRegistrationStats(event.id);

          // Подсчитываем регистрации в старой системе
          let oldActiveCount = 0;
          if (event.registrations?.reg_list) {
            oldActiveCount = event.registrations.reg_list.filter((r: any) => r.status === true).length;
          } else if (event.registrations_list) {
            oldActiveCount = event.registrations_list.filter((r: any) => r.status === true).length;
          }

          const validation = {
            eventId: event.id,
            eventTitle: event.title,
            oldActiveRegistrations: oldActiveCount,
            newActiveRegistrations: stats?.active || 0,
            consistent: oldActiveCount === (stats?.active || 0)
          };

          validationResults.push(validation);
          
          if (validation.consistent) {
            console.log(`✅ ${event.title}: ${oldActiveCount} = ${stats?.active || 0}`);
          } else {
            console.log(`⚠️ ${event.title}: ${oldActiveCount} ≠ ${stats?.active || 0}`);
          }

        } catch (error) {
          console.error(`❌ Ошибка проверки события ${event.id}:`, error);
          validationResults.push({
            eventId: event.id,
            eventTitle: event.title,
            oldActiveRegistrations: 0,
            newActiveRegistrations: 0,
            consistent: false,
            error: error
          });
        }
      }

      const totalEvents = validationResults.length;
      const consistentEvents = validationResults.filter(r => r.consistent).length;
      const inconsistentEvents = totalEvents - consistentEvents;

      console.log(`\n📊 Результаты проверки:`);
      console.log(`Всего событий: ${totalEvents}`);
      console.log(`Консистентных: ${consistentEvents}`);
      console.log(`Несовпадений: ${inconsistentEvents}`);

      return {
        success: inconsistentEvents === 0,
        message: inconsistentEvents === 0 
          ? `Все ${totalEvents} событий прошли проверку консистентности`
          : `Найдено ${inconsistentEvents} несовпадений из ${totalEvents} событий`,
        details: validationResults
      };

    } catch (error) {
      console.error('❌ Ошибка валидации:', error);
      return {
        success: false,
        message: 'Ошибка при валидации данных',
        details: error
      };
    }
  }

  /**
   * Тестирует создание регистрации в новой системе
   */
  static async testRegistrationFlow(eventId: string): Promise<MigrationStatus> {
    try {
      console.log('🧪 Тестируем создание регистрации...');

      const testEmail = `test+${Date.now()}@example.com`;
      const testData = {
        eventId: eventId,
        fullName: 'Тестовый Пользователь',
        email: testEmail,
        phone: '+381123456789',
        tickets: 1
      };

      // Создаем тестовую регистрацию
      const result = await SimpleRegistrationService.createRegistration(testData);

      if (!result.success) {
        return {
          success: false,
          message: `Ошибка создания регистрации: ${result.error}`,
        };
      }

      console.log('✅ Регистрация создана:', result.registration?.id);

      // Проверяем QR код
      if (result.registration?.qr_code) {
        const qrResult = await SimpleRegistrationService.verifyQRCode(result.registration.qr_code);
        if (!qrResult) {
          return {
            success: false,
            message: 'QR код не работает'
          };
        }
        console.log('✅ QR код работает');
      }

      // Отменяем тестовую регистрацию
      if (result.registration?.id) {
        const cancelResult = await SimpleRegistrationService.cancelRegistration(result.registration.id);
        if (cancelResult.success) {
          console.log('✅ Регистрация отменена');
        }
      }

      return {
        success: true,
        message: 'Тест регистрации прошел успешно',
        details: result.registration
      };

    } catch (error) {
      console.error('❌ Ошибка теста:', error);
      return {
        success: false,
        message: 'Ошибка при тестировании регистрации',
        details: error
      };
    }
  }

  /**
   * Получает статистику по новой системе
   */
  static async getSystemStats(): Promise<MigrationStatus> {
    try {
      // Статистика по таблице simple_registrations
      const { data: regStats, error: regError } = await supabase
        .from('simple_registrations')
        .select('registration_status, payment_status');

      if (regError) throw regError;

      // Статистика по событиям
      const { data: eventStats, error: eventError } = await supabase
        .from('events')
        .select('simple_payment_type, registration_enabled, max_registrations, current_registrations');

      if (eventError) throw eventError;

      const stats = {
        registrations: {
          total: regStats?.length || 0,
          active: regStats?.filter(r => r.registration_status === 'active').length || 0,
          cancelled: regStats?.filter(r => r.registration_status === 'cancelled').length || 0,
          paymentStatusBreakdown: {
            free: regStats?.filter(r => r.payment_status === 'free').length || 0,
            donation: regStats?.filter(r => r.payment_status === 'donation').length || 0,
            venue: regStats?.filter(r => r.payment_status === 'venue').length || 0,
            online_pending: regStats?.filter(r => r.payment_status === 'online_pending').length || 0,
            online_paid: regStats?.filter(r => r.payment_status === 'online_paid').length || 0,
          }
        },
        events: {
          total: eventStats?.length || 0,
          withNewPaymentType: eventStats?.filter(e => e.simple_payment_type).length || 0,
          registrationEnabled: eventStats?.filter(e => e.registration_enabled).length || 0,
          paymentTypeBreakdown: {
            free: eventStats?.filter(e => e.simple_payment_type === 'free').length || 0,
            donation: eventStats?.filter(e => e.simple_payment_type === 'donation').length || 0,
            paid: eventStats?.filter(e => e.simple_payment_type === 'paid').length || 0,
          }
        }
      };

      return {
        success: true,
        message: 'Статистика получена успешно',
        details: stats
      };

    } catch (error) {
      return {
        success: false,
        message: 'Ошибка получения статистики',
        details: error
      };
    }
  }

  /**
   * Выполняет полную диагностику системы
   */
  static async runFullDiagnostic(): Promise<MigrationStatus> {
    try {
      console.log('🔧 Запуск полной диагностики системы...\n');

      const results = {
        systemAvailability: await this.checkNewSystemAvailability(),
        stats: await this.getSystemStats(),
        validation: null as MigrationStatus | null
      };

      // Если система доступна, проверяем валидацию
      if (results.systemAvailability.success) {
        results.validation = await this.validateMigration();
      }

      console.log('\n📋 Результаты диагностики:');
      console.log('- Доступность новой системы:', results.systemAvailability.success ? '✅' : '❌');
      
      if (results.stats.success) {
        const stats = results.stats.details;
        console.log(`- Всего регистраций в новой системе: ${stats.registrations.total}`);
        console.log(`- Активных регистраций: ${stats.registrations.active}`);
        console.log(`- Событий с новыми полями: ${stats.events.withNewPaymentType}/${stats.events.total}`);
      }

      if (results.validation) {
        console.log('- Консистентность данных:', results.validation.success ? '✅' : '⚠️');
      }

      const overallSuccess = results.systemAvailability.success && 
                           results.stats.success && 
                           (!results.validation || results.validation.success);

      return {
        success: overallSuccess,
        message: overallSuccess ? 'Система работает корректно' : 'Обнаружены проблемы',
        details: results
      };

    } catch (error) {
      console.error('❌ Ошибка диагностики:', error);
      return {
        success: false,
        message: 'Ошибка при выполнении диагностики',
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

      // Тестируем регистрацию на это событие
      const registrationTest = await this.testRegistrationFlow(data.id);

      return {
        success: registrationTest.success,
        message: registrationTest.success 
          ? `Тестовое событие создано и протестировано (ID: ${data.id})`
          : `Тестовое событие создано, но регистрация не работает: ${registrationTest.message}`,
        details: {
          event: data,
          registrationTest: registrationTest
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

  /**
   * Получает список существующих событий для тестирования
   */
  static async getAvailableEvents(): Promise<MigrationStatus> {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, start_at, simple_payment_type, max_registrations, current_registrations')
        .eq('status', 'active')
        .order('start_at', { ascending: true })
        .limit(10);

      if (error) throw error;

      return {
        success: true,
        message: `Найдено ${events?.length || 0} активных событий`,
        details: events
      };

    } catch (error) {
      return {
        success: false,
        message: 'Ошибка получения списка событий',
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

      // 2. Получаем статистику
      const stats = await this.getSystemStats();
      if (!stats.success) {
        return stats;
      }

      // 3. Проверяем события
      const events = await this.getAvailableEvents();
      if (!events.success) {
        return events;
      }

      console.log('✅ Быстрая проверка завершена');
      return {
        success: true,
        message: 'Система работает корректно',
        details: {
          stats: stats.details,
          eventsCount: events.details?.length || 0
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
}

// Добавляем утилиты в глобальную область видимости для использования в консоли
if (typeof window !== 'undefined') {
  (window as any).MigrationUtility = MigrationUtility;
  
  // Добавляем удобные алиасы для консоли
  (window as any).checkSystem = () => MigrationUtility.checkNewSystemAvailability();
  (window as any).runMigration = () => MigrationUtility.runMigration();
  (window as any).validateData = () => MigrationUtility.validateMigration();
  (window as any).getStats = () => MigrationUtility.getSystemStats();
  (window as any).fullDiagnostic = () => MigrationUtility.runFullDiagnostic();
  (window as any).quickCheck = () => MigrationUtility.quickCheck();
  
  console.log('🔧 Migration utilities loaded! Available commands:');
  console.log('- checkSystem() - проверить доступность новой системы');
  console.log('- runMigration() - запустить миграцию данных');
  console.log('- validateData() - проверить консистентность');
  console.log('- getStats() - получить статистику');
  console.log('- fullDiagnostic() - полная диагностика');
  console.log('- quickCheck() - быстрая проверка');
}

export default MigrationUtility;