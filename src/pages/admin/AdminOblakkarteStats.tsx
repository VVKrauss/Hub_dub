// src/pages/admin/AdminOblakkarteStats.tsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Eye, 
  EyeOff, 
  Globe, 
  Ticket,
  BarChart3,
  RefreshCw,
  Download,
  Clock,
  TrendingUp,
  Activity,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

// Интерфейсы для данных билетов
interface TicketData {
  purchase_date: string;
  event: {
    uuid: string;
    name: string;
    date: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
  } | null;
  promocode: string | null;
  price_paid: {
    amount: number;
    currency: {
      id: number;
      code: string;
    };
  };
  utm: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    term: string | null;
  } | null;
  info: {
    device_type: string;
    interface_language: string;
    country_code: string;
  } | null;
}

interface TicketsResponse {
  data: TicketData[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pb-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

interface OblakkarteEvent {
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

interface OblakkarteResponse {
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

interface Stats {
  totalEvents: number;
  publishedEvents: number;
  totalReservations: number;
  totalCalendars: number;
  eventsByType: Record<string, number>;
  eventsByCity: Record<string, number>;
  eventsByCategory: Record<string, number>;
}

const AdminOblakkarteStats: React.FC = () => {
  const [events, setEvents] = useState<OblakkarteEvent[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    publishedEvents: 0,
    totalReservations: 0,
    totalCalendars: 0,
    eventsByType: {},
    eventsByCity: {},
    eventsByCategory: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<OblakkarteEvent | null>(null);
  const [eventDetails, setEventDetails] = useState<TicketsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchOblakkarteData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Проверяем есть ли API ключ
      const apiKey = import.meta.env.VITE_OBLAKARTE_API_KEY;
      
      if (apiKey) {
        try {
          // Пытаемся получить реальные данные
          const url = new URL('https://tic.rs/api/organizer/v1/events');
          url.searchParams.append('page', '1');
          url.searchParams.append('per_page', '50');

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'X-Api-Key': apiKey,
              'X-Language': 'ru',  // Изменено на русский
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            setEvents(data.data);
            calculateStats(data.data);
            setLastUpdated(new Date());
            return;
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (apiError) {
          console.warn('Failed to fetch real data:', apiError);
          setError(`Ошибка API: ${apiError instanceof Error ? apiError.message : 'Неизвестная ошибка'}`);
        }
      } else {
        setError('API ключ не настроен. Добавьте VITE_OBLAKARTE_API_KEY в переменные окружения.');
      }
      
      // Используем моковые данные для демонстрации
      const mockData: OblakkarteResponse = {
        "data": [
          {
            "uuid": "EIAFMRB",
            "name": "Aliquid et eum.",
            "created_at": "2025-06-11T20:30:36+02:00",
            "updated_at": "2025-06-16T07:08:22+02:00",
            "city": { "id": 1, "name": "Beograd" },
            "event_type": { "id": 121, "name": "Humanitarna večera" },
            "currency": { "id": 1, "code": "RSD" },
            "place": {
              "id": 419,
              "name": "Pozorište lutaka Pinokio",
              "address": "Bulevar Mihajla Pupina 66, Beograd, Serbia"
            },
            "is_published": true,
            "organizer_publish_status": true,
            "has_future_dates": true,
            "calendars_count": 5,
            "reservations_count": 0,
            "categories": [{ "id": 41, "name": "Biznis" }],
            "languages": [
              { "id": 1, "name": "Русский" },
              { "id": 2, "name": "English" },
              { "id": 3, "name": "Srpski" },
              { "id": 4, "name": "Deutsch" }
            ]
          },
          {
            "uuid": "GTQYHQXN",
            "name": "Voluptates ducimus dignissimos beatae.",
            "created_at": "2025-06-11T10:29:22+02:00",
            "updated_at": "2025-06-27T01:49:52+02:00",
            "city": { "id": 1, "name": "Beograd" },
            "event_type": { "id": 2, "name": "Koncert" },
            "currency": { "id": 1, "code": "RSD" },
            "place": {
              "id": 2,
              "name": "Ben Akiba",
              "address": "Браће Крсмановић 6, Београд 11000, Сербия"
            },
            "is_published": true,
            "organizer_publish_status": false,
            "has_future_dates": false,
            "calendars_count": 0,
            "reservations_count": 0,
            "categories": [{ "id": 7, "name": "Skijaški centar" }],
            "languages": [{ "id": 5, "name": "Türkçe" }]
          },
          {
            "uuid": "UXTPAGTL",
            "name": "Quo cumque enim vel doloribus.",
            "created_at": "2025-06-01T20:15:58+02:00",
            "updated_at": "2025-06-11T20:30:26+02:00",
            "city": { "id": 1, "name": "Beograd" },
            "event_type": { "id": 121, "name": "Humanitarna večera" },
            "currency": { "id": 1, "code": "RSD" },
            "place": {
              "id": 419,
              "name": "Pozorište lutaka Pinokio",
              "address": "Bulevar Mihajla Pupina 66, Beograd, Serbia"
            },
            "is_published": false,
            "organizer_publish_status": false,
            "has_future_dates": true,
            "calendars_count": 3,
            "reservations_count": 0,
            "categories": [{ "id": 41, "name": "Biznis" }],
            "languages": [{ "id": 4, "name": "Deutsch" }]
          },
          {
            "uuid": "WFHFYAQ",
            "name": "Et quaerat dolores dolorem.",
            "created_at": "2025-04-24T15:48:30+02:00",
            "updated_at": "2025-06-27T04:24:02+02:00",
            "city": { "id": 1, "name": "Beograd" },
            "event_type": { "id": 121, "name": "Humanitarna večera" },
            "currency": { "id": 1, "code": "RSD" },
            "place": {
              "id": 67,
              "name": "SILOSI",
              "address": "Dunavski kej 46, Београд 11158, Сербия"
            },
            "is_published": true,
            "organizer_publish_status": true,
            "has_future_dates": true,
            "calendars_count": 1,
            "reservations_count": 12,
            "categories": [{ "id": 41, "name": "Biznis" }],
            "languages": [
              { "id": 1, "name": "Русский" },
              { "id": 2, "name": "English" },
              { "id": 3, "name": "Srpski" },
              { "id": 4, "name": "Deutsch" }
            ]
          },
          {
            "uuid": "PZHIIA",
            "name": "Unde est dolor provident.",
            "created_at": "2025-03-28T14:28:48+01:00",
            "updated_at": "2025-06-26T22:04:28+02:00",
            "city": { "id": 1, "name": "Beograd" },
            "event_type": { "id": 43, "name": "Karting trke" },
            "currency": { "id": 1, "code": "RSD" },
            "place": {
              "id": 356,
              "name": "Karting - KartLand Ada Huja Beograd",
              "address": "Put Za Ada Huju bb, Beograd 11000, Serbia"
            },
            "is_published": true,
            "organizer_publish_status": true,
            "has_future_dates": false,
            "calendars_count": 1,
            "reservations_count": 0,
            "categories": [{ "id": 29, "name": "Za odrasle" }],
            "languages": [{ "id": 1, "name": "Русский" }]
          }
        ],
        "meta": {
          "current_page": 1,
          "from": 1,
          "last_page": 1,
          "per_page": 10,
          "to": 5,
          "total": 5
        }
      };

      setEvents(mockData.data);
      calculateStats(mockData.data);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error in fetchOblakkarteData:', error);
      setError(`Ошибка загрузки данных: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (eventsData: OblakkarteEvent[]) => {
    const stats: Stats = {
      totalEvents: eventsData.length,
      publishedEvents: eventsData.filter(e => e.is_published).length,
      totalReservations: eventsData.reduce((sum, e) => sum + e.reservations_count, 0),
      totalCalendars: eventsData.reduce((sum, e) => sum + e.calendars_count, 0),
      eventsByType: {},
      eventsByCity: {},
      eventsByCategory: {}
    };

    // Группировка по типам
    eventsData.forEach(event => {
      const type = event.event_type.name;
      stats.eventsByType[type] = (stats.eventsByType[type] || 0) + 1;
    });

    // Группировка по городам
    eventsData.forEach(event => {
      const city = event.city.name;
      stats.eventsByCity[city] = (stats.eventsByCity[city] || 0) + 1;
    });

    // Группировка по категориям
    eventsData.forEach(event => {
      event.categories.forEach(category => {
        stats.eventsByCategory[category.name] = (stats.eventsByCategory[category.name] || 0) + 1;
      });
    });

    setStats(stats);
  };

  // Функция загрузки детальной информации о мероприятии
  const fetchEventDetails = async (eventUuid: string) => {
    try {
      setLoadingDetails(true);
      const apiKey = import.meta.env.VITE_OBLAKARTE_API_KEY;
      
      if (!apiKey) {
        throw new Error('API ключ не настроен');
      }

      // Получаем билеты для мероприятия
      const ticketsUrl = new URL('https://tic.rs/api/organizer/v1/tickets');
      ticketsUrl.searchParams.append('event_uuid', eventUuid);
      ticketsUrl.searchParams.append('per_page', '1000');

      const ticketsResponse = await fetch(ticketsUrl.toString(), {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'X-Language': 'ru',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (ticketsResponse.ok) {
        const ticketsData: TicketsResponse = await ticketsResponse.json();
        setEventDetails(ticketsData);
      } else {
        throw new Error(`Ошибка загрузки билетов: ${ticketsResponse.status}`);
      }

    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error('Не удалось загрузить детальную информацию о мероприятии');
      // Устанавливаем моковые данные для демонстрации
      const mockTicketsData: TicketsResponse = {
        data: [
          {
            purchase_date: "2025-06-27T04:34:43+02:00",
            event: {
              uuid: eventUuid,
              name: "Тестовое мероприятие",
              date: "2026-01-31T15:00:00+01:00"
            },
            customer: {
              name: "Иван Иванов",
              email: "ivan@example.com",
              phone: "+7 900 123-45-67"
            },
            promocode: null,
            price_paid: {
              amount: 1500,
              currency: {
                id: 1,
                code: "RUB"
              }
            },
            utm: {
              source: null,
              medium: null,
              campaign: null,
              content: null,
              term: null
            },
            info: {
              device_type: "desktop",
              interface_language: "ru",
              country_code: "RU"
            }
          },
          {
            purchase_date: "2025-06-25T01:07:49+02:00",
            event: {
              uuid: eventUuid,
              name: "Тестовое мероприятие",
              date: "2026-01-31T15:00:00+01:00"
            },
            customer: {
              name: "Мария Петрова",
              email: "maria@example.com",
              phone: "+7 900 987-65-43"
            },
            promocode: "VIP10",
            price_paid: {
              amount: 2700,
              currency: {
                id: 1,
                code: "RUB"
              }
            },
            utm: {
              source: "facebook",
              medium: "social",
              campaign: "summer2025",
              content: null,
              term: null
            },
            info: {
              device_type: "mobile",
              interface_language: "ru",
              country_code: "RU"
            }
          },
          {
            purchase_date: "2025-06-24T19:15:27+02:00",
            event: {
              uuid: eventUuid,
              name: "Тестовое мероприятие",
              date: "2026-01-31T15:00:00+01:00"
            },
            customer: {
              name: "Алексей Сидоров",
              email: "alex@example.com",
              phone: "+7 900 555-12-34"
            },
            promocode: "STUDENT",
            price_paid: {
              amount: 750,
              currency: {
                id: 1,
                code: "RUB"
              }
            },
            utm: {
              source: "google",
              medium: "cpc",
              campaign: "education",
              content: null,
              term: "билеты мероприятие"
            },
            info: {
              device_type: "desktop",
              interface_language: "ru",
              country_code: "RU"
            }
          }
        ],
        links: {
          first: "https://tic.rs/api/organizer/v1/tickets?page=1",
          last: "https://tic.rs/api/organizer/v1/tickets?page=1",
          prev: null,
          next: null
        },
        meta: {
          current_page: 1,
          from: 1,
          last_page: 1,
          per_page: 10,
          to: 3,
          total: 3
        }
      };
      setEventDetails(mockTicketsData);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Закрытие модального окна
  const closeEventDetails = () => {
    setSelectedEvent(null);
    setEventDetails(null);
  };
  const handleEventClick = (event: OblakkarteEvent) => {
    setSelectedEvent(event);
    fetchEventDetails(event.uuid);
  };

  // Вспомогательная функция для безопасного преобразования в число
  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const exportToCSV = () => {
    const headers = [
      'UUID',
      'Название',
      'Тип события',
      'Город',
      'Место проведения',
      'Адрес',
      'Опубликовано',
      'Статус организатора',
      'Есть будущие даты',
      'Количество календарей',
      'Количество резерваций',
      'Категории',
      'Языки',
      'Дата создания',
      'Дата обновления'
    ];

    const csvData = events.map(event => [
      event.uuid,
      event.name,
      event.event_type.name,
      event.city.name,
      event.place.name,
      event.place.address,
      event.is_published ? 'Да' : 'Нет',
      event.organizer_publish_status ? 'Да' : 'Нет',
      event.has_future_dates ? 'Да' : 'Нет',
      event.calendars_count,
      event.reservations_count,
      event.categories.map(c => c.name).join('; '),
      event.languages.map(l => l.name).join('; '),
      new Date(event.created_at).toLocaleDateString('ru-RU'),
      new Date(event.updated_at).toLocaleDateString('ru-RU')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `oblakkarte_events_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Данные экспортированы в CSV');
  };

  useEffect(() => {
    fetchOblakkarteData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Статистика Oblakkarte
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Аналитика регистраций с сайта oblakkarte.rs
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Последнее обновление: {lastUpdated.toLocaleString('ru-RU')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchOblakkarteData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          <button
            onClick={exportToCSV}
            disabled={loading || events.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4" />
            Экспорт CSV
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <Activity className="h-5 w-5" />
            <span className="font-medium">Ошибка загрузки данных</span>
          </div>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего событий</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalEvents}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Опубликовано</CardTitle>
            <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.publishedEvents}</div>
            <p className="text-xs text-green-600 dark:text-green-400">
              {stats.totalEvents > 0 ? Math.round((stats.publishedEvents / stats.totalEvents) * 100) : 0}% от общего количества
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Резервации</CardTitle>
            <Ticket className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.totalReservations}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Календари</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.totalCalendars}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600" />
              По типам событий
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.eventsByType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(stats.eventsByType).length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Нет данных</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary-600" />
              По городам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.eventsByCity).map(([city, count]) => (
                <div key={city} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{city}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(stats.eventsByCity).length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Нет данных</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              По категориям
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.eventsByCategory).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{category}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(stats.eventsByCategory).length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Нет данных</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список событий</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-300">Загрузка...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Название</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Тип</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Место</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Статус</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Резервации</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Обновлено</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr 
                      key={event.uuid} 
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => handleEventClick(event)}
                    >
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{event.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{event.uuid}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{event.event_type.name}</td>
                      <td className="py-3 px-2">
                        <div>
                          <div className="text-gray-900 dark:text-white">{event.place.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{event.city.name}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            event.is_published 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                          }`}>
                            {event.is_published ? (
                              <><Eye className="h-3 w-3 mr-1" />Опубликовано</>
                            ) : (
                              <><EyeOff className="h-3 w-3 mr-1" />Не опубликовано</>
                            )}
                          </span>
                          {event.has_future_dates && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                              Будущие даты
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-medium">{event.reservations_count}</td>
                      <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{formatDate(event.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {events.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Нет данных для отображения</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Модальное окно с детальной статистикой */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Заголовок модального окна */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedEvent.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {selectedEvent.event_type.name} • {selectedEvent.place.name} • {selectedEvent.city.name}
                </p>
              </div>
              <button
                onClick={closeEventDetails}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Содержимое модального окна */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
                  <span className="ml-2 text-gray-600 dark:text-gray-300">Загрузка детальной информации...</span>
                </div>
              ) : eventDetails ? (
                <div className="space-y-6">
                  {/* Статистика мероприятия */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <Ticket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Всего билетов</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                              {eventDetails.meta?.total || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Подтверждено</p>
                            <p className="text-xl font-bold text-green-700 dark:text-green-300">
                              {eventDetails.data?.length || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">С промокодом</p>
                            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                              {eventDetails.data?.filter(ticket => ticket.promocode).length || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Общая выручка</p>
                            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                              {eventDetails.data?.reduce((sum, ticket) => sum + safeNumber(ticket.price_paid.amount), 0).toLocaleString()} {eventDetails.data?.[0]?.price_paid.currency.code || 'RSD'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Статистика по промокодам */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Продажи по промокодам</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {eventDetails.data && Object.entries(
                          eventDetails.data.reduce((acc: any, ticket) => {
                            const promo = ticket.promocode || 'Без промокода';
                            if (!acc[promo]) {
                              acc[promo] = { count: 0, revenue: 0 };
                            }
                            acc[promo].count += 1;
                            acc[promo].revenue += safeNumber(ticket.price_paid.amount);
                            return acc;
                          }, {})
                        ).map(([promo, stats]: [string, any]) => (
                          <div key={promo} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">{promo}</span>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{stats.count} билетов</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {stats.revenue.toLocaleString()} {eventDetails.data?.[0]?.price_paid.currency.code || 'RSD'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Статистика по устройствам */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Статистика по устройствам и каналам</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* По устройствам */}
                        <div>
                          <h4 className="font-medium mb-3 text-gray-900 dark:text-white">По устройствам</h4>
                          <div className="space-y-2">
                            {eventDetails.data && Object.entries(
                              eventDetails.data.reduce((acc: any, ticket) => {
                                const device = ticket.info?.device_type || 'Неизвестно';
                                acc[device] = (acc[device] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([device, count]: [string, any]) => (
                              <div key={device} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{device}</span>
                                <span className="font-semibold">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* По UTM источникам */}
                        <div>
                          <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Источники трафика</h4>
                          <div className="space-y-2">
                            {eventDetails.data && Object.entries(
                              eventDetails.data.reduce((acc: any, ticket) => {
                                const source = ticket.utm?.source || 'Прямой переход';
                                acc[source] = (acc[source] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([source, count]: [string, any]) => (
                              <div key={source} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-300">{source}</span>
                                <span className="font-semibold">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Список покупателей */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Список покупателей</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Покупатель</th>
                              <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Контакты</th>
                              <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Промокод</th>
                              <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Цена</th>
                              <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Устройство</th>
                              <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Источник</th>
                              <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Дата покупки</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventDetails.data?.map((ticket, index) => (
                              <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="py-3 px-2">
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {ticket.customer?.name || 'Не указано'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {ticket.info?.country_code || 'Не указано'}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-2">
                                  <div>
                                    <div className="text-gray-900 dark:text-white text-xs">
                                      {ticket.customer?.email || 'Не указано'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {ticket.customer?.phone || 'Не указано'}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-2">
                                  {ticket.promocode ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                      {ticket.promocode}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-center font-medium">
                                  {safeNumber(ticket.price_paid.amount).toLocaleString()} {ticket.price_paid.currency.code}
                                </td>
                                <td className="py-3 px-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 capitalize">
                                    {ticket.info?.device_type || 'Неизвестно'}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-gray-600 dark:text-gray-300 text-xs">
                                  {ticket.utm?.source || 'Прямой'}
                                  {ticket.utm?.medium && ` / ${ticket.utm.medium}`}
                                </td>
                                <td className="py-3 px-2 text-gray-600 dark:text-gray-300 text-xs">
                                  {formatDate(ticket.purchase_date)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {(!eventDetails.data || eventDetails.data.length === 0) && (
                          <div className="text-center py-8">
                            <Ticket className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">Нет данных о билетах</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Не удалось загрузить данные</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOblakkarteStats;