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

      const result = await SimpleRegistrationService.migrateOldRegistrations();
      
      if (!result.success) {
        return {
          success: false,
          message: result.message
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
        success