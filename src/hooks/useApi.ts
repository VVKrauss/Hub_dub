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
    queryKey: queryKeys.events.list(