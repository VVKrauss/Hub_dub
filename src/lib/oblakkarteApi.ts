// src/lib/oblakkarteApi.ts
export interface OblakkarteEvent {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  city: {
    id: number;
    name: string;
  };
  event_type: {
    id: number;
    name: string;
  };
  currency: {
    id: number;
    code: string;
  };
  place: {
    id: number;
    name: string;
    address: string;
  };
  is_published: boolean;
  organizer_publish_status: boolean;
  has_future_dates: boolean;
  calendars_count: number;
  reservations_count: number;
  categories: Array<{
    id: number;
    name: string;
  }>;
  languages: Array<{
    id: number;
    name: string;
  }>;
}

export interface OblakkarteResponse {
  data: OblakkarteEvent[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}

export class OblakkarteApi {
  private apiKey: string;

  constructor() {
    // Используем встроенный secret из Supabase
    this.apiKey = import.meta.env.VITE_OBLAKARTE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('OBLAKARTE_API_KEY не найден в переменных окружения');
    }
  }

  async getEvents(page: number = 1, perPage: number = 10, eventUuid?: string): Promise<OblakkarteResponse> {
    if (!this.apiKey) {
      throw new Error('API ключ Oblakkarte не настроен. Проверьте переменные окружения.');
    }

    const url = new URL('https://tic.rs/api/organizer/v1/events');
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', perPage.toString());
    
    if (eventUuid) {
      url.searchParams.append('event_uuid', eventUuid);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': this.apiKey,
        'X-Language': 'ru',  // Изменено на русский язык
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  }

  async getTickets(eventUuid: string, page: number = 1, perPage: number = 10) {
    if (!this.apiKey) {
      throw new Error('API ключ Oblakkarte не настроен');
    }

    const url = new URL('https://tic.rs/api/organizer/v1/tickets');
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', perPage.toString());
    url.searchParams.append('event_uuid', eventUuid);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': this.apiKey,
        'X-Language': 'ru',  // Изменено на русский язык
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  }
}

export const oblakkarteApi = new OblakkarteApi();