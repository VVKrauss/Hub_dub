// src/pages/admin/AdminOblakkarteStats.tsx
import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Activity, Calendar, Eye, Clock, TrendingUp, MapPin, Users, ExternalLink, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Простые компоненты Card
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-dark-800 rounded-lg shadow-md border border-gray-200 dark:border-dark-700 ${className}`}>
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

interface TicketData {
  uuid: string;
  ticket_type: {
    id: number;
    name: string;
  };
  price_paid: {
    amount: string;
    currency: {
      code: string;
    };
  };
  info?: {
    device_type?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
  purchased_at: string;
}

interface TicketsResponse {
  data: TicketData[];
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
  draftEvents: number;
  totalReservations: number;
  totalCalendars: number;
  eventsByType: Record<string, number>;
  eventsByCity: Record<string, number>;
  eventsByCategory: Record<string, number>;
  averageCreationTime?: string;
}

const AdminOblakkarteStats: React.FC = () => {
  const [events, setEvents] = useState<OblakkarteEvent[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    publishedEvents: 0,
    draftEvents: 0,
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
      
      if (!apiKey) {
        setError('API ключ Oblakkarte не настроен. Добавьте VITE_OBLAKARTE_API_KEY в переменные окружения.');
        return;
      }

      let allEvents: OblakkarteEvent[] = [];
      let currentPage = 1;
      let totalPages = 1;

      // Получаем все события с пагинацией
      do {
        const response = await fetch(`https://api.oblakkarte.com/v1/events?page=${currentPage}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
        }

        const data: OblakkarteResponse = await response.json();
        allEvents = [...allEvents, ...data.data];
        totalPages = data.meta.last_page;
        currentPage++;
      } while (currentPage <= totalPages);

      setEvents(allEvents);
      calculateStats(allEvents);
      setLastUpdated(new Date());
      
      toast.success(`Загружено ${allEvents.length} событий`);
    } catch (error) {
      console.error('Error fetching Oblakkarte data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setError(errorMessage);
      toast.error('Ошибка загрузки данных Oblakkarte');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (eventsData: OblakkarteEvent[]) => {
    const totalEvents = eventsData.length;
    const publishedEvents = eventsData.filter(e => e.is_published && e.organizer_publish_status).length;
    const draftEvents = eventsData.filter(e => !e.is_published || !e.organizer_publish_status).length;
    const totalReservations = eventsData.reduce((sum, e) => sum + e.reservations_count, 0);
    const totalCalendars = eventsData.reduce((sum, e) => sum + e.calendars_count, 0);

    // Группировка по типам
    const eventsByType = eventsData.reduce((acc, event) => {
      const type = event.event_type.name;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Группировка по городам
    const eventsByCity = eventsData.reduce((acc, event) => {
      const city = event.city.name;
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Группировка по категориям
    const eventsByCategory = eventsData.reduce((acc, event) => {
      event.categories.forEach(category => {
        acc[category.name] = (acc[category.name] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    setStats({
      totalEvents,
      publishedEvents,
      draftEvents,
      totalReservations,
      totalCalendars,
      eventsByType,
      eventsByCity,
      eventsByCategory
    });
  };

  const fetchEventDetails = async (eventUuid: string) => {
    try {
      setLoadingDetails(true);
      const apiKey = import.meta.env.VITE_OBLAKARTE_API_KEY;
      
      const response = await fetch(`https://api.oblakkarte.com/v1/events/${eventUuid}/tickets`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status}`);
      }

      const data: TicketsResponse = await response.json();
      setEventDetails(data);
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error('Ошибка загрузки деталей события');
    } finally {
      setLoadingDetails(false);
    }
  };

  const exportToCSV = () => {
    try {
      const csvContent = [
        'UUID,Название,Город,Тип,Место,Опубликовано,Резервации,Календари,Дата создания',
        ...events.map(event => [
          event.uuid,
          `"${event.name}"`,
          `"${event.city.name}"`,
          `"${event.event_type.name}"`,
          `"${event.place.name}"`,
          event.is_published && event.organizer_publish_status ? 'Да' : 'Нет',
          event.reservations_count,
          event.calendars_count,
          new Date(event.created_at).toLocaleDateString('ru-RU')
        ].join(','))
      ].join('\n');

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
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Ошибка экспорта данных');
    }
  };

  useEffect(() => {
    fetchOblakkarteData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-2">
            Статистика Oblakkarte
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Аналитика событий из системы Oblakkarte
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Последнее обновление: {lastUpdated.toLocaleString('ru-RU')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
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
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего событий</CardTitle>
            <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-700 dark:text-primary-300">{stats.totalEvents}</div>
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
              {stats.totalEvents > 0 ? 
                Math.round((stats.publishedEvents / stats.totalEvents) * 100) : 0}% от общего числа
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-800/20 border-warning-200 dark:border-warning-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ожидают публикации</CardTitle>
            <Clock className="h-4 w-4 text-warning-600 dark:text-warning-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-700 dark:text-warning-300">{stats.draftEvents}</div>
            <p className="text-xs text-warning-600 dark:text-warning-400">
              Черновики и неопубликованные
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/20 dark:to-secondary-800/20 border-secondary-200 dark:border-secondary-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего резерваций</CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-700 dark:text-secondary-300">{stats.totalReservations}</div>
            <p className="text-xs text-secondary-600 dark:text-secondary-400">
              {stats.totalCalendars} календарей
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Event Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-600" />
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
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Загрузка событий...</span>
            </div>
          ) : events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-600">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Название</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Город</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Тип</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Статус</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Резервации</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.uuid} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {event.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {event.place.name}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {event.city.name}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {event.event_type.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.is_published && event.organizer_publish_status
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300'
                        }`}>
                          {event.is_published && event.organizer_publish_status ? 'Опубликовано' : 'Черновик'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {event.reservations_count}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            fetchEventDetails(event.uuid);
                          }}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium flex items-center gap-1"
                        >
                          <Info className="h-4 w-4" />
                          Детали
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Нет событий</h3>
              <p className="text-gray-500 dark:text-gray-400">
                События не найдены или произошла ошибка загрузки
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Детали события: {selectedEvent.name}
                </h2>
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setEventDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <ExternalLink className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Event Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Информация о событии</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">UUID:</span> {selectedEvent.uuid}</div>
                    <div><span className="font-medium">Город:</span> {selectedEvent.city.name}</div>
                    <div><span className="font-medium">Тип:</span> {selectedEvent.event_type.name}</div>
                    <div><span className="font-medium">Место:</span> {selectedEvent.place.name}</div>
                    <div><span className="font-medium">Адрес:</span> {selectedEvent.place.address}</div>
                    <div><span className="font-medium">Валюта:</span> {selectedEvent.currency.code}</div>
                    <div><span className="font-medium">Создано:</span> {new Date(selectedEvent.created_at).toLocaleString('ru-RU')}</div>
                    <div><span className="font-medium">Обновлено:</span> {new Date(selectedEvent.updated_at).toLocaleString('ru-RU')}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Статистика</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Резервации:</span> {selectedEvent.reservations_count}</div>
                    <div><span className="font-medium">Календари:</span> {selectedEvent.calendars_count}</div>
                    <div><span className="font-medium">Опубликовано:</span> {selectedEvent.is_published ? 'Да' : 'Нет'}</div>
                    <div><span className="font-medium">Статус организатора:</span> {selectedEvent.organizer_publish_status ? 'Активно' : 'Неактивно'}</div>
                    <div><span className="font-medium">Есть будущие даты:</span> {selectedEvent.has_future_dates ? 'Да' : 'Нет'}</div>
                  </div>
                </div>
              </div>

              {/* Categories and Languages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Категории</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.categories.map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Языки</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.languages.map((language) => (
                      <span
                        key={language.id}
                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-300"
                      >
                        {language.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tickets Details */}
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-300">Загрузка деталей билетов...</span>
                </div>
              ) : eventDetails && eventDetails.data.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Проданные билеты ({eventDetails.meta.total})
                  </h3>
                  
                  {/* Tickets Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {eventDetails.meta.total}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Всего билетов</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {eventDetails.data.reduce((sum, ticket) => sum + parseFloat(ticket.price_paid.amount), 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Общая выручка ({eventDetails.data[0]?.price_paid.currency.code || 'RSD'})
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
                          {(eventDetails.data.reduce((sum, ticket) => sum + parseFloat(ticket.price_paid.amount), 0) / eventDetails.data.length).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Средняя цена билета</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tickets by Type */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Билеты по типам</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(
                          eventDetails.data.reduce((acc: any, ticket) => {
                            const type = ticket.ticket_type.name;
                            if (!acc[type]) {
                              acc[type] = { count: 0, revenue: 0 };
                            }
                            acc[type].count += 1;
                            acc[type].revenue += parseFloat(ticket.price_paid.amount);
                            return acc;
                          }, {})
                        ).map(([type, data]: [string, any]) => (
                          <div key={type} className="flex justify-between items-center">
                            <div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{type}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                ({data.count} шт.)
                              </span>
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {data.revenue.toFixed(2)} {eventDetails.data[0]?.price_paid.currency.code || 'RSD'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analytics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Device Analytics */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Статистика по устройствам</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(
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
                      </CardContent>
                    </Card>

                    {/* Traffic Sources */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Источники трафика</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(
                            eventDetails.data.reduce((acc: any, ticket) => {
                              const source = ticket.info?.utm_source || 'Прямой переход';
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
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Нет данных о билетах</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Для этого события пока нет проданных билетов
                  </p>
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