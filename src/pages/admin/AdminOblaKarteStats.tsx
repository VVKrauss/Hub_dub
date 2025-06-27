// src/pages/admin/AdminOblaKarteStats.tsx

import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  Ticket, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Smartphone, 
  Monitor,
  RotateCcw,
  Download,
  Filter,
  Search,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Types
type OblakKarteTicket = {
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
  };
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
  };
  info: {
    device_type: 'desktop' | 'mobile';
    interface_language: string;
    country_code: string;
  };
};

type OblakKarteResponse = {
  data: OblakKarteTicket[];
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
    total: number;
  };
};

type StatsData = {
  totalTickets: number;
  totalRevenue: number;
  totalEvents: number;
  avgTicketPrice: number;
  promocodeUsage: number;
  deviceStats: {
    desktop: number;
    mobile: number;
  };
  countryStats: Record<string, number>;
  revenueByEvent: Array<{ name: string; revenue: number; tickets: number }>;
  salesByDate: Array<{ date: string; tickets: number; revenue: number }>;
};

const AdminOblaKarteStats = () => {
  const [tickets, setTickets] = useState<OblakKarteTicket[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEventUuid, setSelectedEventUuid] = useState<string>('');
  const [uniqueEvents, setUniqueEvents] = useState<Array<{ uuid: string; name: string }>>([]);
  const [dateFilter, setDateFilter] = useState({
    from: '',
    to: ''
  });

  // Загрузка данных с API
  const fetchTickets = async (page: number = 1, eventUuid: string = '', loadMore: boolean = false) => {
    try {
      setLoading(true);

      // Получаем API ключ из Supabase
      const { data: secretData, error: secretError } = await supabase
        .rpc('get_secret', { secret_name: 'OBLAKARTE_API_KEY' });

      if (secretError || !secretData) {
        throw new Error('Не удалось получить API ключ');
      }

      // Строим URL для запроса
      const url = new URL('https://tic.rs/api/organizer/v1/tickets');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('per_page', '50');
      
      if (eventUuid) {
        url.searchParams.append('event_uuid', eventUuid);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'X-Api-Key': secretData,
          'X-Language': 'sr',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status}`);
      }

      const data: OblakKarteResponse = await response.json();

      if (loadMore) {
        setTickets(prev => [...prev, ...data.data]);
      } else {
        setTickets(data.data);
      }

      setCurrentPage(data.meta.current_page);
      setTotalPages(data.meta.last_page);

      toast.success(`Загружено ${data.data.length} билетов`);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Ошибка загрузки данных: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  // Загрузка всех данных для полной статистики
  const fetchAllTickets = async () => {
    try {
      setLoading(true);
      const allTickets: OblakKarteTicket[] = [];
      let page = 1;
      let hasMore = true;

      const { data: secretData, error: secretError } = await supabase
        .rpc('get_secret', { secret_name: 'OBLAKARTE_API_KEY' });

      if (secretError || !secretData) {
        throw new Error('Не удалось получить API ключ');
      }

      while (hasMore && page <= 20) { // Ограничиваем 20 страницами для безопасности
        const url = new URL('https://tic.rs/api/organizer/v1/tickets');
        url.searchParams.append('page', page.toString());
        url.searchParams.append('per_page', '100');

        const response = await fetch(url.toString(), {
          headers: {
            'X-Api-Key': secretData,
            'X-Language': 'sr',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Ошибка API: ${response.status}`);
        }

        const data: OblakKarteResponse = await response.json();
        allTickets.push(...data.data);

        hasMore = page < data.meta.last_page;
        page++;
      }

      return allTickets;
    } catch (error) {
      console.error('Error fetching all tickets:', error);
      toast.error('Ошибка загрузки полной статистики');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Вычисление статистики
  const calculateStats = (ticketsData: OblakKarteTicket[]): StatsData => {
    const stats: StatsData = {
      totalTickets: ticketsData.length,
      totalRevenue: 0,
      totalEvents: 0,
      avgTicketPrice: 0,
      promocodeUsage: 0,
      deviceStats: { desktop: 0, mobile: 0 },
      countryStats: {},
      revenueByEvent: [],
      salesByDate: []
    };

    // Подсчет базовой статистики
    const eventMap = new Map<string, { name: string; revenue: number; tickets: number }>();
    const dateMap = new Map<string, { tickets: number; revenue: number }>();

    ticketsData.forEach(ticket => {
      // Общая статистика
      stats.totalRevenue += ticket.price_paid.amount;
      
      if (ticket.promocode) {
        stats.promocodeUsage++;
      }

      // Статистика устройств
      stats.deviceStats[ticket.info.device_type]++;

      // Статистика по странам
      const country = ticket.info.country_code || 'Unknown';
      stats.countryStats[country] = (stats.countryStats[country] || 0) + 1;

      // Статистика по событиям
      const eventKey = ticket.event.uuid;
      if (!eventMap.has(eventKey)) {
        eventMap.set(eventKey, {
          name: ticket.event.name,
          revenue: 0,
          tickets: 0
        });
      }
      const eventStats = eventMap.get(eventKey)!;
      eventStats.revenue += ticket.price_paid.amount;
      eventStats.tickets++;

      // Статистика по датам
      const date = ticket.purchase_date.split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, { tickets: 0, revenue: 0 });
      }
      const dateStats = dateMap.get(date)!;
      dateStats.tickets++;
      dateStats.revenue += ticket.price_paid.amount;
    });

    stats.totalEvents = eventMap.size;
    stats.avgTicketPrice = stats.totalTickets > 0 ? stats.totalRevenue / stats.totalTickets : 0;
    stats.revenueByEvent = Array.from(eventMap.values()).sort((a, b) => b.revenue - a.revenue);
    stats.salesByDate = Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchTickets();
  }, []);

  // Получение уникальных событий
  useEffect(() => {
    const events = tickets.reduce((acc, ticket) => {
      const existing = acc.find(e => e.uuid === ticket.event.uuid);
      if (!existing) {
        acc.push({
          uuid: ticket.event.uuid,
          name: ticket.event.name
        });
      }
      return acc;
    }, [] as Array<{ uuid: string; name: string }>);
    
    setUniqueEvents(events);
  }, [tickets]);

  // Обновление статистики при изменении билетов
  useEffect(() => {
    if (tickets.length > 0) {
      setStats(calculateStats(tickets));
    }
  }, [tickets]);

  const handleLoadFullStats = async () => {
    const allTickets = await fetchAllTickets();
    if (allTickets.length > 0) {
      setTickets(allTickets);
      setStats(calculateStats(allTickets));
    }
  };

  const handleFilterByEvent = (eventUuid: string) => {
    setSelectedEventUuid(eventUuid);
    setCurrentPage(1);
    fetchTickets(1, eventUuid);
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages) {
      fetchTickets(currentPage + 1, selectedEventUuid, true);
    }
  };

  const exportData = () => {
    if (tickets.length === 0) return;

    const csvHeaders = [
      'Дата покупки',
      'Событие',
      'Клиент',
      'Email',
      'Телефон',
      'Промокод',
      'Сумма',
      'Валюта',
      'Устройство',
      'Страна'
    ];

    const csvData = tickets.map(ticket => [
      ticket.purchase_date,
      ticket.event.name,
      ticket.customer.name,
      ticket.customer.email,
      ticket.customer.phone,
      ticket.promocode || '',
      ticket.price_paid.amount,
      ticket.price_paid.currency.code,
      ticket.info.device_type,
      ticket.info.country_code
    ]);

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `oblakkarte_stats_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Статистика OblaKarte.rs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Анализ продаж билетов и статистика событий
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => fetchTickets(1, selectedEventUuid)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Обновить
          </button>
          
          <button
            onClick={handleLoadFullStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <TrendingUp className="h-4 w-4" />
            Полная статистика
          </button>
          
          <button
            onClick={exportData}
            disabled={tickets.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Экспорт
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Фильтр по событию
            </label>
            <select
              value={selectedEventUuid}
              onChange={(e) => handleFilterByEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
            >
              <option value="">Все события</option>
              {uniqueEvents.map(event => (
                <option key={event.uuid} value={event.uuid}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Всего билетов</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTickets}</p>
            </div>
            <Ticket className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Общая выручка</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalRevenue.toLocaleString()} RSD
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Событий</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEvents}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Средняя цена</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.avgTicketPrice.toFixed(0)} RSD
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Stats */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Статистика устройств
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Desktop', value: stats.deviceStats.desktop, color: '#3B82F6' },
                  { name: 'Mobile', value: stats.deviceStats.mobile, color: '#10B981' }
                ]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {[
                  { name: 'Desktop', value: stats.deviceStats.desktop, color: '#3B82F6' },
                  { name: 'Mobile', value: stats.deviceStats.mobile, color: '#10B981' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Event */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Выручка по событиям (Топ 5)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.revenueByEvent.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${Number(value).toLocaleString()} RSD`, 'Выручка']}
              />
              <Bar dataKey="revenue" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Timeline */}
      {stats.salesByDate.length > 0 && (
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Динамика продаж
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.salesByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="tickets" fill="#3B82F6" name="Билеты" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" name="Выручка (RSD)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Tickets Table */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Последние билеты ({tickets.length} из {totalPages > 1 ? `${currentPage * 50}+` : tickets.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Дата покупки
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Событие
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Клиент
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Устройство
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Промокод
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.map((ticket, index) => (
                <tr key={`${ticket.event.uuid}-${index}`} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(ticket.purchase_date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div className="max-w-xs truncate" title={ticket.event.name}>
                      {ticket.event.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div>
                      <div className="font-medium">{ticket.customer.name}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">{ticket.customer.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {ticket.price_paid.amount.toLocaleString()} {ticket.price_paid.currency.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center gap-1">
                      {ticket.info.device_type === 'desktop' ? (
                        <Monitor className="h-4 w-4" />
                      ) : (
                        <Smartphone className="h-4 w-4" />
                      )}
                      {ticket.info.device_type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {ticket.promocode ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {ticket.promocode}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {currentPage < totalPages && (
          <div className="p-6 text-center border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Загрузка...' : 'Загрузить еще'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOblaKarteStats;