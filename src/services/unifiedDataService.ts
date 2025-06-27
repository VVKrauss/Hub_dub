// src/services/unifiedDataService.ts
import { supabase } from '../lib/supabase';
import { oblakkarteApi } from '../lib/oblakkarteApi';

// Типы данных
export interface LocalEvent {
  id: string;
  title: string;
  start_at: string;
  end_at?: string;
  location?: string;
  event_type: string;
  status: string;
  oblakkarte_uuid?: string;
  registrations?: {
    current: number;
    current_adults: number;
    current_children: number;
    reg_list: Array<{
      id: string;
      full_name: string;
      email: string;
      adult_tickets: number;
      child_tickets: number;
      total_amount: number;
      status: boolean;
    }>;
  };
}

export interface OblakkarteEvent {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  city: { name: string };
  event_type: { name: string };
  currency: { code: string };
  place: { name: string; address: string };
  is_published: boolean;
  calendars_count: number;
  reservations_count: number;
  categories: Array<{ name: string }>;
  languages: Array<{ name: string }>;
}

export interface UnifiedEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
  participants: number;
  revenue: number;
  source: 'site' | 'oblakkarte' | 'both';
  status: string;
  oblakkarte_uuid?: string;
  sync_status?: 'synced' | 'pending' | 'error';
  last_sync?: string;
  details: {
    site?: LocalEvent;
    oblakkarte?: OblakkarteEvent;
  };
}

export interface UnifiedStats {
  totalEvents: number;
  totalParticipants: number;
  totalRevenue: number;
  siteEvents: number;
  oblakkarteEvents: number;
  linkedEvents: number;
  eventsByType: Record<string, number>;
  eventsBySource: Record<string, number>;
  revenueBySource: Record<string, number>;
}

class UnifiedDataService {
  
  /**
   * Загружает события из локальной базы данных
   */
  async loadSiteEvents(): Promise<LocalEvent[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error loading site events:', error);
      throw new Error('Ошибка загрузки событий с сайта');
    }
  }

  /**
   * Загружает события из Oblakkarte API
   */
  async loadOblakkarteEvents(): Promise<OblakkarteEvent[]> {
    try {
      const response = await oblakkarteApi.getEvents(1,