// src/app/api/types.ts
export interface Database {
  public: {
    Tables: {
      events: {
        Row: Event;
        Insert: CreateEventData;
        Update: UpdateEventData;
      };
      profiles: {
        Row: Profile;
        Insert: CreateProfileData;
        Update: UpdateProfileData;
      };
      event_registrations: {
        Row: EventRegistration;
        Insert: CreateRegistrationData;
        Update: UpdateRegistrationData;
      };
      speakers: {
        Row: Speaker;
        Insert: CreateSpeakerData;
        Update: UpdateSpeakerData;
      };
      rent_info_settings: {
        Row: RentSettings;
        Insert: CreateRentSettingsData;
        Update: UpdateRentSettingsData;
      };
      coworking_services: {
        Row: CoworkingService;
        Insert: CreateCoworkingServiceData;
        Update: UpdateCoworkingServiceData;
      };
      about_table: {
        Row: AboutData;
        Insert: CreateAboutData;
        Update: UpdateAboutData;
      };
      favorites: {
        Row: Favorite;
        Insert: CreateFavoriteData;
        Update: UpdateFavoriteData;
      };
    };
  };
}

// Основные типы данных
export interface Event {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  start_at: string;
  end_at?: string;
  location: string;
  price: number;
  currency: string;
  event_type: string;
  bg_image?: string;
  languages?: string[];
  age_category: string;
  max_participants?: number;
  created_at: string;
  updated_at: string;
  payment_type?: string;
  payment_link?: string;
  payment_widget_id?: string;
  widget_chooser?: boolean;
  oblakkarte_data_event_id?: string;
  couple_discount?: number;
  child_half_price?: boolean;
  speakers?: string[];
  tags?: string[];
  status: 'draft' | 'published' | 'cancelled';
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  telegram?: string;
  instagram?: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id?: string;
  user_email: string;
  user_name: string;
  user_phone?: string;
  registration_date: string;
  attendance_status?: 'registered' | 'attended' | 'no_show';
  payment_status?: 'pending' | 'paid' | 'cancelled';
  created_at: string;
}

export interface Speaker {
  id: string;
  name: string;
  bio?: string;
  photo?: string;
  company?: string;
  position?: string;
  social_links?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface RentSettings {
  id: number;
  title: string;
  description?: string;
  photos?: string[];
  pricelist: PriceItem[];
  contacts?: {
    address: string;
    phone: string;
    email: string;
    map_link: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PriceItem {
  id: string;
  name: string;
  price: number;
  duration: 'hour' | 'day' | 'week' | 'month';
  description?: string;
}

export interface CoworkingService {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'euro' | 'кофе';
  period: 'час' | 'день' | 'месяц';
  active: boolean;
  image_url?: string;
  main_service: boolean;
  created_at: string;
  updated_at: string;
}

export interface AboutData {
  id: number;
  title: string;
  description: string;
  mission?: string;
  team: TeamMember[];
  contributors: Contributor[];
  support_platforms: SupportPlatform[];
  contacts: {
    email: string;
    phone: string;
    address: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  name: string;
  role: string;
  photo: string;
}

export interface Contributor {
  name: string;
  photo: string;
}

export interface SupportPlatform {
  url: string;
  platform: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
}

// Create типы (для вставки новых записей)
export type CreateEventData = Omit<Event, 'id' | 'created_at' | 'updated_at'>;
export type CreateProfileData = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
export type CreateRegistrationData = Omit<EventRegistration, 'id' | 'created_at'>;
export type CreateSpeakerData = Omit<Speaker, 'id' | 'created_at' | 'updated_at'>;
export type CreateRentSettingsData = Omit<RentSettings, 'id' | 'created_at' | 'updated_at'>;
export type CreateCoworkingServiceData = Omit<CoworkingService, 'id' | 'created_at' | 'updated_at'>;
export type CreateAboutData = Omit<AboutData, 'id' | 'created_at' | 'updated_at'>;
export type CreateFavoriteData = Omit<Favorite, 'id' | 'created_at'>;

// Update типы (для обновления записей)
export type UpdateEventData = Partial<CreateEventData>;
export type UpdateProfileData = Partial<CreateProfileData>;
export type UpdateRegistrationData = Partial<CreateRegistrationData>;
export type UpdateSpeakerData = Partial<CreateSpeakerData>;
export type UpdateRentSettingsData = Partial<CreateRentSettingsData>;
export type UpdateCoworkingServiceData = Partial<CreateCoworkingServiceData>;
export type UpdateAboutData = Partial<CreateAboutData>;
export type UpdateFavoriteData = Partial<CreateFavoriteData>;

// Утилитарные типы
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Типы для статистики
export interface EventStats {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  totalRegistrations: number;
  averageAttendance: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
}

// Типы для навигации
export interface NavItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order?: number;
  badge?: number;
  icon?: string;
}

export interface TopBarSettings {
  alignment: 'left' | 'center' | 'right' | 'space-between';
  style: 'classic' | 'modern' | 'minimal' | 'rounded';
  spacing: 'compact' | 'normal' | 'relaxed';
  height: 'compact' | 'normal' | 'large';
  showBorder: boolean;
  showShadow: boolean;
  backgroundColor: 'white' | 'transparent' | 'blur';
  animation: 'none' | 'slide' | 'fade' | 'bounce';
  mobileCollapse: boolean;
  showIcons: boolean;
  showBadges: boolean;
  stickyHeader: boolean;
  maxWidth: 'container' | 'full' | 'screen-xl';
}

// Типы ошибок
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}