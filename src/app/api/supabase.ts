// src/app/api/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Database,
  Event,
  Profile,
  EventRegistration,
  Speaker,
  RentSettings,
  CoworkingService,
  AboutData,
  Favorite,
  CreateEventData,
  UpdateEventData,
  CreateProfileData,
  UpdateProfileData,
  CreateRegistrationData,
  CreateSpeakerData,
  UpdateSpeakerData,
  CreateCoworkingServiceData,
  UpdateCoworkingServiceData,
  QueryOptions,
  PaginatedResponse,
  ApiResponse,
  NotFoundError,
  ValidationError
} from './types';

export class SupabaseAPI {
  private client: SupabaseClient<Database>;

  constructor() {
    this.client = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  // Получить клиент для прямого использования (если нужно)
  getClient() {
    return this.client;
  }

  // Аутентификация
  auth = {
    signUp: async (email: string, password: string, metadata?: any) => {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      if (error) throw error;
      return data;
    },

    signIn: async (email: string, password: string) => {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    },

    signOut: async () => {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
    },

    getCurrentUser: () => {
      return this.client.auth.getUser();
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      return this.client.auth.onAuthStateChange(callback);
    }
  };

  // События
  events = {
    getAll: async (options: QueryOptions = {}): Promise<PaginatedResponse<Event>> => {
      const { page = 1, limit = 10, orderBy = 'created_at', orderDirection = 'desc', filters = {} } = options;
      
      let query = this.client
        .from('events')
        .select('*', { count: 'exact' });

      // Применяем фильтры
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Применяем сортировку и пагинацию
      const { data, error, count } = await query
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        hasMore: (count || 0) > page * limit
      };
    },

    getById: async (id: string): Promise<Event> => {
      const { data, error } = await this.client
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Event', id);
        }
        throw error;
      }

      return data;
    },

    getUpcoming: async (limit = 10): Promise<Event[]> => {
      const { data, error } = await this.client
        .from('events')
        .select('*')
        .gte('start_at', new Date().toISOString())
        .eq('status', 'published')
        .order('start_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },

    getPast: async (limit = 10): Promise<Event[]> => {
      const { data, error } = await this.client
        .from('events')
        .select('*')
        .lt('start_at', new Date().toISOString())
        .eq('status', 'published')
        .order('start_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },

    create: async (eventData: CreateEventData): Promise<Event> => {
      this.validateEventData(eventData);

      const { data, error } = await this.client
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id: string, eventData: UpdateEventData): Promise<Event> => {
      const { data, error } = await this.client
        .from('events')
        .update(eventData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Event', id);
        }
        throw error;
      }

      return data;
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await this.client
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    search: async (query: string, limit = 10): Promise<Event[]> => {
      const { data, error } = await this.client
        .from('events')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('status', 'published')
        .limit(limit);

      if (error) throw error;
      return data || [];
    }
  };

  // Пользователи и профили
  users = {
    getProfile: async (): Promise<Profile | null> => {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return null;

      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Профиль не найден
        }
        throw error;
      }

      return data;
    },

    updateProfile: async (profileData: UpdateProfileData): Promise<Profile> => {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.client
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    createProfile: async (profileData: CreateProfileData): Promise<Profile> => {
      const { data, error } = await this.client
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };

  // Регистрации на события
  registrations = {
    getByEventId: async (eventId: string): Promise<EventRegistration[]> => {
      const { data, error } = await this.client
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    getByUserId: async (userId: string): Promise<EventRegistration[]> => {
      const { data, error } = await this.client
        .from('event_registrations')
        .select('*, events(*)')
        .eq('user_id', userId)
        .order('registration_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    create: async (registrationData: CreateRegistrationData): Promise<EventRegistration> => {
      const { data, error } = await this.client
        .from('event_registrations')
        .insert(registrationData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    updateAttendanceStatus: async (id: string, status: 'attended' | 'no_show'): Promise<EventRegistration> => {
      const { data, error } = await this.client
        .from('event_registrations')
        .update({ attendance_status: status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };

  // Спикеры
  speakers = {
    getAll: async (): Promise<Speaker[]> => {
      const { data, error } = await this.client
        .from('speakers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },

    getById: async (id: string): Promise<Speaker> => {
      const { data, error } = await this.client
        .from('speakers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Speaker', id);
        }
        throw error;
      }

      return data;
    },

    create: async (speakerData: CreateSpeakerData): Promise<Speaker> => {
      const { data, error } = await this.client
        .from('speakers')
        .insert(speakerData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id: string, speakerData: UpdateSpeakerData): Promise<Speaker> => {
      const { data, error } = await this.client
        .from('speakers')
        .update(speakerData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await this.client
        .from('speakers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
  };

  // Коворкинг услуги
  coworking = {
    getAll: async (): Promise<CoworkingService[]> => {
      const { data, error } = await this.client
        .from('coworking_services')
        .select('*')
        .order('main_service', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    getActive: async (): Promise<CoworkingService[]> => {
      const { data, error } = await this.client
        .from('coworking_services')
        .select('*')
        .eq('active', true)
        .order('main_service', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    create: async (serviceData: CreateCoworkingServiceData): Promise<CoworkingService> => {
      const { data, error } = await this.client
        .from('coworking_services')
        .insert(serviceData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (id: string, serviceData: UpdateCoworkingServiceData): Promise<CoworkingService> => {
      const { data, error } = await this.client
        .from('coworking_services')
        .update(serviceData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };

  // Аренда
  rent = {
    getSettings: async (): Promise<RentSettings | null> => {
      const { data, error } = await this.client
        .from('rent_info_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    },

    updateSettings: async (settingsData: Partial<RentSettings>): Promise<RentSettings> => {
      const { data, error } = await this.client
        .from('rent_info_settings')
        .update(settingsData)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };

  // О нас
  about = {
    get: async (): Promise<AboutData | null> => {
      const { data, error } = await this.client
        .from('about_table')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    },

    update: async (aboutData: Partial<AboutData>): Promise<AboutData> => {
      const { data, error } = await this.client
        .from('about_table')
        .update(aboutData)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };

  // Избранное
  favorites = {
    getByUserId: async (userId: string): Promise<Favorite[]> => {
      const { data, error } = await this.client
        .from('favorites')
        .select('*, events(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    add: async (userId: string, eventId: string): Promise<Favorite> => {
      const { data, error } = await this.client
        .from('favorites')
        .insert({ user_id: userId, event_id: eventId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    remove: async (userId: string, eventId: string): Promise<void> => {
      const { error } = await this.client
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

      if (error) throw error;
    },

    check: async (userId: string, eventId: string): Promise<boolean> => {
      const { data, error } = await this.client
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    }
  };

  // Загрузка файлов
  storage = {
    uploadImage: async (bucket: string, path: string, file: File): Promise<string> => {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = this.client.storage
        .from(bucket)
        .getPublicUrl(path);

      return urlData.publicUrl;
    },

    deleteImage: async (bucket: string, path: string): Promise<void> => {
      const { error } = await this.client.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
    },

    getPublicUrl: (bucket: string, path: string): string => {
      const { data } = this.client.storage
        .from(bucket)
        .getPublicUrl(path);

      return data.publicUrl;
    }
  };

  // Валидация данных
  private validateEventData(eventData: CreateEventData | UpdateEventData): void {
    if (!eventData.title?.trim()) {
      throw new ValidationError('Title is required', 'title');
    }

    if (!eventData.description?.trim()) {
      throw new ValidationError('Description is required', 'description');
    }

    if (eventData.start_at && new Date(eventData.start_at) < new Date()) {
      throw new ValidationError('Start date cannot be in the past', 'start_at');
    }

    if (eventData.price !== undefined && eventData.price < 0) {
      throw new ValidationError('Price cannot be negative', 'price');
    }

    if (eventData.max_participants !== undefined && eventData.max_participants < 1) {
      throw new ValidationError('Max participants must be at least 1', 'max_participants');
    }
  }
}

// Создаем единственный экземпляр API
export const api = new SupabaseAPI();

// Экспортируем клиент отдельно для backward compatibility
export const supabase = api.getClient();