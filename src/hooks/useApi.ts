// src/shared/hooks/useApi.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { api } from '../../app/api/supabase';
import {
  Event,
  Profile,
  EventRegistration,
  Speaker,
  CoworkingService,
  RentSettings,
  AboutData,
  Favorite,
  CreateEventData,
  UpdateEventData,
  CreateRegistrationData,
  CreateSpeakerData,
  UpdateSpeakerData,
  QueryOptions,
  PaginatedResponse
} from '../../app/api/types';

// Ключи для кэширования
export const queryKeys = {
  events: {
    all: ['events'] as const,
    lists: () => [...queryKeys.events.all, 'list'] as const,
    list: (filters: QueryOptions) => [...queryKeys.events.lists(), filters] as const,
    details: () => [...queryKeys.events.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.events.details(), id] as const,
    upcoming: () => [...queryKeys.events.all, 'upcoming'] as const,
    past: () => [...queryKeys.events.all, 'past'] as const,
    search: (query: string) => [...queryKeys.events.all, 'search', query] as const,
  },
  users: {
    all: ['users'] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
    registrations: (userId: string) => [...queryKeys.users.all, 'registrations', userId] as const,
  },
  speakers: {
    all: ['speakers'] as const,
    lists: () => [...queryKeys.speakers.all, 'list'] as const,
    details: () => [...queryKeys.speakers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.speakers.details(), id] as const,
  },
  coworking: {
    all: ['coworking'] as const,
    services: () => [...queryKeys.coworking.all, 'services'] as const,
    activeServices: () => [...queryKeys.coworking.all, 'services', 'active'] as const,
  },
  rent: {
    all: ['rent'] as const,
    settings: () => [...queryKeys.rent.all, 'settings'] as const,
  },
  about: {
    all: ['about'] as const,
    data: () => [...queryKeys.about.all, 'data'] as const,
  },
  favorites: {
    all: ['favorites'] as const,
    user: (userId: string) => [...queryKeys.favorites.all, 'user', userId] as const,
    check: (userId: string, eventId: string) => [...queryKeys.favorites.all, 'check', userId, eventId] as const,
  },
  registrations: {
    all: ['registrations'] as const,
    event: (eventId: string) => [...queryKeys.registrations.all, 'event', eventId] as const,
  },
};

// Хуки для событий
export const useEvents = (options: QueryOptions = {}) => {
  return useQuery({
    queryKey: queryKeys.events.list(options),
    queryFn: () => api.events.getAll(options),
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
};

export const useEvent = (id: string, options?: UseQueryOptions<Event>) => {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => api.events.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useUpcomingEvents = (limit = 10) => {
  return useQuery({
    queryKey: queryKeys.events.upcoming(),
    queryFn: () => api.events.getUpcoming(limit),
    staleTime: 2 * 60 * 1000, // 2 минуты для актуальных событий
  });
};

export const usePastEvents = (limit = 10) => {
  return useQuery({
    queryKey: queryKeys.events.past(),
    queryFn: () => api.events.getPast(limit),
    staleTime: 10 * 60 * 1000, // 10 минут для прошедших событий
  });
};

export const useSearchEvents = (query: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.events.search(query),
    queryFn: () => api.events.search(query),
    enabled: enabled && query.length > 2,
    staleTime: 30 * 1000, // 30 секунд для поиска
  });
};

// Мутации для событий
export const useCreateEvent = (options?: UseMutationOptions<Event, Error, CreateEventData>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventData: CreateEventData) => api.events.create(eventData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      toast.success('Событие успешно создано');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при создании события');
    },
    ...options,
  });
};

export const useUpdateEvent = (options?: UseMutationOptions<Event, Error, { id: string; data: UpdateEventData }>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventData }) => api.events.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.events.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
      toast.success('Событие успешно обновлено');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при обновлении события');
    },
    ...options,
  });
};

export const useDeleteEvent = (options?: UseMutationOptions<void, Error, string>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.events.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.events.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.lists() });
      toast.success('Событие успешно удалено');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при удалении события');
    },
    ...options,
  });
};

// Хуки для пользователей
export const useProfile = (options?: UseQueryOptions<Profile | null>) => {
  return useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => api.users.getProfile(),
    staleTime: 10 * 60 * 1000, // 10 минут
    ...options,
  });
};

export const useUpdateProfile = (options?: UseMutationOptions<Profile, Error, any>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileData) => api.users.updateProfile(profileData),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.users.profile(), data);
      toast.success('Профиль успешно обновлен');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при обновлении профиля');
    },
    ...options,
  });
};

// Хуки для регистраций
export const useEventRegistrations = (eventId: string) => {
  return useQuery({
    queryKey: queryKeys.registrations.event(eventId),
    queryFn: () => api.registrations.getByEventId(eventId),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
};

export const useUserRegistrations = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.users.registrations(userId),
    queryFn: () => api.registrations.getByUserId(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateRegistration = (options?: UseMutationOptions<EventRegistration, Error, CreateRegistrationData>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (registrationData: CreateRegistrationData) => api.registrations.create(registrationData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrations.event(data.event_id) });
      if (data.user_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.registrations(data.user_id) });
      }
      toast.success('Регистрация успешно создана');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при регистрации');
    },
    ...options,
  });
};

// Хуки для спикеров
export const useSpeakers = (options?: UseQueryOptions<Speaker[]>) => {
  return useQuery({
    queryKey: queryKeys.speakers.lists(),
    queryFn: () => api.speakers.getAll(),
    staleTime: 10 * 60 * 1000, // 10 минут
    ...options,
  });
};

export const useSpeaker = (id: string, options?: UseQueryOptions<Speaker>) => {
  return useQuery({
    queryKey: queryKeys.speakers.detail(id),
    queryFn: () => api.speakers.getById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

export const useCreateSpeaker = (options?: UseMutationOptions<Speaker, Error, CreateSpeakerData>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (speakerData: CreateSpeakerData) => api.speakers.create(speakerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.speakers.lists() });
      toast.success('Спикер успешно добавлен');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при добавлении спикера');
    },
    ...options,
  });
};

export const useUpdateSpeaker = (options?: UseMutationOptions<Speaker, Error, { id: string; data: UpdateSpeakerData }>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSpeakerData }) => api.speakers.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.speakers.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.speakers.lists() });
      toast.success('Спикер успешно обновлен');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при обновлении спикера');
    },
    ...options,
  });
};

export const useDeleteSpeaker = (options?: UseMutationOptions<void, Error, string>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.speakers.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.speakers.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.speakers.lists() });
      toast.success('Спикер успешно удален');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при удалении спикера');
    },
    ...options,
  });
};

// Хуки для коворкинга
export const useCoworkingServices = (activeOnly = false) => {
  return useQuery({
    queryKey: activeOnly ? queryKeys.coworking.activeServices() : queryKeys.coworking.services(),
    queryFn: () => activeOnly ? api.coworking.getActive() : api.coworking.getAll(),
    staleTime: 10 * 60 * 1000,
  });
};

// Хуки для аренды
export const useRentSettings = () => {
  return useQuery({
    queryKey: queryKeys.rent.settings(),
    queryFn: () => api.rent.getSettings(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useUpdateRentSettings = (options?: UseMutationOptions<RentSettings, Error, Partial<RentSettings>>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settingsData: Partial<RentSettings>) => api.rent.updateSettings(settingsData),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.rent.settings(), data);
      toast.success('Настройки аренды обновлены');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при обновлении настроек');
    },
    ...options,
  });
};

// Хуки для страницы "О нас"
export const useAboutData = () => {
  return useQuery({
    queryKey: queryKeys.about.data(),
    queryFn: () => api.about.get(),
    staleTime: 15 * 60 * 1000, // 15 минут
  });
};

export const useUpdateAboutData = (options?: UseMutationOptions<AboutData, Error, Partial<AboutData>>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (aboutData: Partial<AboutData>) => api.about.update(aboutData),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.about.data(), data);
      toast.success('Информация "О нас" обновлена');
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при обновлении информации');
    },
    ...options,
  });
};

// Хуки для избранного
export const useFavorites = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.favorites.user(userId),
    queryFn: () => api.favorites.getByUserId(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useIsFavorite = (userId: string, eventId: string) => {
  return useQuery({
    queryKey: queryKeys.favorites.check(userId, eventId),
    queryFn: () => api.favorites.check(userId, eventId),
    enabled: !!userId && !!eventId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, eventId, isFavorite }: { userId: string; eventId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await api.favorites.remove(userId, eventId);
        return false;
      } else {
        await api.favorites.add(userId, eventId);
        return true;
      }
    },
    onSuccess: (newState, variables) => {
      // Обновляем кэш для проверки избранного
      queryClient.setQueryData(
        queryKeys.favorites.check(variables.userId, variables.eventId),
        newState
      );
      // Инвалидируем список избранного пользователя
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.favorites.user(variables.userId) 
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при обновлении избранного');
    },
  });
};

// Хуки для загрузки файлов
export const useUploadImage = () => {
  return useMutation({
    mutationFn: ({ bucket, path, file }: { bucket: string; path: string; file: File }) =>
      api.storage.uploadImage(bucket, path, file),
    onError: (error) => {
      toast.error(error.message || 'Ошибка при загрузке изображения');
    },
  });
};

// Утилиты для работы с кэшем
export const useCacheUtils = () => {
  const queryClient = useQueryClient();

  return {
    // Очистить весь кэш
    clearAll: () => queryClient.clear(),
    
    // Очистить кэш для конкретной сущности
    clearEvents: () => queryClient.removeQueries({ queryKey: queryKeys.events.all }),
    clearSpeakers: () => queryClient.removeQueries({ queryKey: queryKeys.speakers.all }),
    clearProfile: () => queryClient.removeQueries({ queryKey: queryKeys.users.profile() }),
    
    // Предзагрузка данных
    prefetchEvent: (id: string) => 
      queryClient.prefetchQuery({
        queryKey: queryKeys.events.detail(id),
        queryFn: () => api.events.getById(id),
        staleTime: 5 * 60 * 1000,
      }),
    
    prefetchUpcomingEvents: () =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.events.upcoming(),
        queryFn: () => api.events.getUpcoming(),
        staleTime: 2 * 60 * 1000,
      }),
  };
};