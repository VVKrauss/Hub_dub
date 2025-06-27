// src/pages/admin/AdminEventStatistics.tsx - Часть 1 (импорты и начало)
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Clock, 
  ChevronDown, 
  Loader2, 
  Star, 
  TrendingUp, 
  Award, 
  BarChart3, 
  DollarSign, 
  Eye, 
  Grid3X3, 
  List, 
  CalendarDays, 
  Gift, 
  CreditCard,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';

type ExportType = 'visitors' | 'full_stats';

// Функции форматирования
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Дата не указана';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric' 
    });
  } catch (error) {
    return 'Некорректная дата';
  }
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '--:--';
  try {
    return new Date(timeStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '--:--';
  }
};

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return 'Дата не указана';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    return 'Некорректная дата';
  }
};

const getEventTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    conference: 'Конференция',
    workshop: 'Мастер-класс',
    meetup: 'Встреча',
    seminar: 'Семинар',
    webinar: 'Вебинар',
    training: 'Тренинг'
  };
  return types[type] || type;
};

const getEventTypeIcon = (type: string) => {
  switch(type) {
    case 'conference': return <Award className="w-3 h-3" />;
    case 'workshop': return <Star className="w-3 h-3" />;
    case 'meetup': return <Users className="w-3 h-3" />;
    default: return <Calendar className="w-3 h-3" />;
  }
};

// Компонент карточки мероприятия
const EventCard = ({ event, isPast = false, isCompact = false }: { event: any, isPast?: boolean, isCompact?: boolean }) => {
  const [speakers, setSpeakers] = useState<any[]>([]);

  useEffect(() => {
    const loadSpeakers = async () => {
      if (!event.speakers || !Array.isArray(event.speakers)) return;
      
      try {
        const speakerIds = event.speakers.filter((speaker: any) => 
          typeof speaker === 'string' && speaker.length > 0
        );
        
        if (speakerIds.length === 0) return;

        const { data, error } = await supabase
          .from('speakers')
          .select('id, name, photos')
          .in('id', speakerIds)
          .eq('active', true);

        if (error) throw error;
        setSpeakers(data || []);
      } catch (error) {
        console.error('Error loading speakers:', error);
      }
    };

    loadSpeakers();
  }, [event.speakers]);

  // Используем поле registrations как JSONB объект
  const registrations = event.registrations || {};
  const currentRegs = parseInt(registrations.current || '0') || 0;
  const maxRegs = parseInt(registrations.max_registrations || registrations.max_regs || '0') || 0;
  const fillPercentage = maxRegs > 0 ? (currentRegs / maxRegs) * 100 : 0;

  const getStatusColor = () => {
    if (fillPercentage >= 90) return 'text-error-500';
    if (fillPercentage >= 70) return 'text-warning-500';
    return 'text-primary-500';
  };

  const getSpeakerPhoto = (speaker: any) => {
    if (!speaker.photos || !Array.isArray(speaker.photos)) return null;
    const mainPhoto = speaker.photos.find((photo: any) => photo.isMain) || speaker.photos[0];
    return mainPhoto?.url ? getSupabaseImageUrl(mainPhoto.url) : null;
  };

  return (
    <div className={`group relative bg-white dark:bg-dark-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 ${isCompact ? 'p-4' : 'p-6'}`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"></div>
      
      <div className={isCompact ? 'mt-2' : 'mt-4'}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-md text-xs font-medium">
                {getEventTypeIcon(event.event_type)}
                <span className="ml-1">{getEventTypeLabel(event.event_type)}</span>
              </span>
            </div>
            <h3 className={`font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${isCompact ? 'text-lg' : 'text-xl'}`}>
              {event.title || 'Без названия'}
            </h3>
          </div>
          <div className="text-right ml-4">
            {event.price > 0 ? (
              <div className="flex items-center gap-1 text-success-600 dark:text-success-400">
                <CreditCard className="w-3 h-3" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {event.price.toLocaleString()} {event.currency || 'RUB'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Gift className="w-3 h-3 text-success-600" />
                <span className="font-medium text-success-600">Бесплатно</span>
              </div>
            )}
          </div>
        </div>

        {/* Информация о мероприятии */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
            <div className="flex items-center justify-center w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-md mr-2">
              <Calendar className="w-3 h-3 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="font-medium">
              {formatDateShort(event.start_at)} в {formatTime(event.start_at)}
            </span>
          </div>

          {currentRegs > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-center w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-md mr-2">
                  <Users className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="font-medium">
                  {currentRegs} {maxRegs > 0 ? `/ ${maxRegs}` : ''} участников
                </span>
              </div>
              {maxRegs > 0 && (
                <span className={`text-xs font-bold ${getStatusColor()}`}>
                  {Math.round(fillPercentage)}%
                </span>
              )}
            </div>
          )}

          {maxRegs > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  fillPercentage >= 90 ? 'bg-red-500' :
                  fillPercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
              />
            </div>
          )}

          {/* Спикеры */}
          {speakers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {speakers.slice(0, 3).map((speaker, index) => {
                  const photo = getSpeakerPhoto(speaker);
                  return (
                    <div
                      key={speaker.id}
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden"
                      title={speaker.name}
                    >
                      {photo ? (
                        <img src={photo} alt={speaker.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {speakers.length === 1 ? speakers[0].name : `${speakers.length} спикера`}
              </span>
            </div>
          )}
        </div>

        {/* Дополнительные действия для прошедших мероприятий */}
        {isPast && currentRegs > 0 && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Подробнее
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// src/pages/admin/AdminEventStatistics.tsx - Часть 2 (главный компонент)

// Компонент карточки статистики
const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }: { title: string, value: string | number, subtitle?: string, icon: any, color?: string }) => {
  return (
    <div className="bg-white dark:bg-dark-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-6 h-6 bg-${color}-100 dark:bg-${color}-900/30 rounded-md flex items-center justify-center`}>
          <Icon className={`w-3 h-3 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

// Компонент загрузки
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="relative">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      <div className="absolute inset-0 w-8 h-8 border-2 border-primary-200 dark:border-primary-800 rounded-full"></div>
    </div>
    <span className="ml-3 text-gray-600 dark:text-gray-300 font-medium">Загрузка данных...</span>
  </div>
);

// Компонент тумблера переключения вида
const ViewToggle = ({ isListView, onToggle }: { isListView: boolean, onToggle: (value: boolean) => void }) => (
  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
    <Button
      variant={!isListView ? "primary" : "ghost"}
      size="sm"
      onClick={() => onToggle(false)}
      leftIcon={<Grid3X3 className="w-4 h-4" />}
    >
    </Button>
    <Button
      variant={isListView ? "primary" : "ghost"}
      size="sm"
      onClick={() => onToggle(true)}
      leftIcon={<List className="w-4 h-4" />}
    >
    </Button>
  </div>
);

// Главный компонент
const EventsStatistics = () => {
  // Состояния
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [events, setEvents] = useState({
    nearest: [],
    upcoming: [],
    past: []
  });
  const [loading, setLoading] = useState({
    nearest: false,
    upcoming: false,
    past: false
  });
  const [loadingMore, setLoadingMore] = useState({
    upcoming: false,
    past: false
  });
  const [pagination, setPagination] = useState({
    upcoming: { offset: 0, hasMore: true },
    past: { offset: 0, hasMore: true }
  });
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalParticipants: 0,
    totalRevenue: 0,
    avgParticipants: 0,
    completionRate: 0
  });

  // Состояния для модального окна экспорта
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('visitors');
  const [isListView, setIsListView] = useState(false);

  // Функция загрузки событий из Supabase
  const loadEventsFromSupabase = async (type: string, offset: number, limit: number) => {
    try {
      let query = supabase
        .from('events')
        .select('*');

      const now = new Date().toISOString();

      if (type === 'nearest') {
        query = query
          .gte('start_at', now)
          .order('start_at', { ascending: true })
          .limit(1);
      } else if (type === 'upcoming') {
        query = query
          .gte('start_at', now)
          .order('start_at', { ascending: true })
          .range(offset, offset + limit - 1);
      } else if (type === 'past') {
        query = query
          .lt('start_at', now)
          .order('start_at', { ascending: false })
          .range(offset, offset + limit - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        hasMore: (data?.length || 0) === limit,
        total: count || 0
      };
    } catch (error) {
      console.error(`Error loading ${type} events:`, error);
      return { data: [], hasMore: false, total: 0 };
    }
  };

  // Функция расчета статистики
  const calculateStats = async () => {
    try {
      const allEvents = [...events.nearest, ...events.upcoming, ...events.past];
      
      let filteredEvents = allEvents;
      
      // Применяем фильтр по времени
      if (timeFilter !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (timeFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'custom':
            if (customDateRange.start && customDateRange.end) {
              const start = new Date(customDateRange.start);
              const end = new Date(customDateRange.end);
              filteredEvents = allEvents.filter(event => {
                const eventDate = new Date(event.start_at);
                return eventDate >= start && eventDate <= end;
              });
            }
            break;
          default:
            startDate = new Date(0);
        }

        if (timeFilter !== 'custom') {
          filteredEvents = allEvents.filter(event => 
            new Date(event.start_at) >= startDate
          );
        }
      }

      const totalEvents = filteredEvents.length;
      const completedEvents = filteredEvents.filter(event => 
        new Date(event.start_at) < new Date()
      ).length;

      let totalParticipants = 0;
      let totalRevenue = 0;

      filteredEvents.forEach(event => {
        const registrations = event.registrations || {};
        const currentRegs = parseInt(registrations.current || '0') || 0;
        totalParticipants += currentRegs;

        if (event.price && event.price > 0) {
          totalRevenue += currentRegs * event.price;
        }
      });

      setStats({
        totalEvents,
        totalParticipants,
        totalRevenue,
        avgParticipants: totalEvents > 0 ? Math.round(totalParticipants / totalEvents) : 0,
        completionRate: totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  // Функция экспорта только посетителей
  const exportVisitors = async () => {
    try {
      const registrationsMap = new Map<string, { full_name: string; count: number }>();
      
      const eventTypes = ['nearest', 'upcoming', 'past'] as const;
      
      for (const type of eventTypes) {
        for (const event of events[type]) {
          const registrations = event.registrations || {};
          if (registrations.reg_list && Array.isArray(registrations.reg_list)) {
            registrations.reg_list.forEach((reg: any) => {
              if (reg.email && reg.full_name) {
                const email = reg.email.toLowerCase().trim();
                const current = registrationsMap.get(email);
                
                if (current) {
                  registrationsMap.set(email, {
                    full_name: current.full_name,
                    count: current.count + 1
                  });
                } else {
                  registrationsMap.set(email, {
                    full_name: reg.full_name,
                    count: 1
                  });
                }
              }
            });
          }
        }
      }

      // Конвертируем в CSV
      const csvHeader = 'Имя,Email,Количество посещений\n';
      const csvData = Array.from(registrationsMap.entries())
        .map(([email, data]) => `"${data.full_name}","${email}",${data.count}`)
        .join('\n');

      const csvContent = csvHeader + csvData;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `visitors_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting visitors:', error);
    }
  };

  // Функция экспорта полной статистики
  const exportFullStats = async () => {
    try {
      const eventTypes = ['nearest', 'upcoming', 'past'] as const;
      const allData: any[] = [];
      
      for (const type of eventTypes) {
        for (const event of events[type]) {
          const registrations = event.registrations || {};
          const currentRegs = parseInt(registrations.current || '0') || 0;
          const revenue = event.price && event.price > 0 ? currentRegs * event.price : 0;
          
          allData.push({
            title: event.title || 'Без названия',
            date: formatDate(event.start_at),
            participants: currentRegs,
            revenue: revenue,
            currency: event.currency || 'RUB',
            type: getEventTypeLabel(event.event_type),
            status: type === 'past' ? 'Завершено' : type === 'nearest' ? 'Ближайшее' : 'Предстоящее'
          });
        }
      }

      const csvHeader = 'Мероприятие,Дата,Участников,Выручка,Валюта,Тип,Статус\n';
      const csvData = allData
        .map(row => `"${row.title}","${row.date}",${row.participants},${row.revenue},"${row.currency}","${row.type}","${row.status}"`)
        .join('\n');

      const csvContent = csvHeader + csvData;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `events_stats_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting full stats:', error);
    }
  };

  // Обработчики
  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  const handleExportConfirm = async () => {
    setIsExportModalOpen(false);
    
    if (exportType === 'visitors') {
      await exportVisitors();
    } else {
      await exportFullStats();
    }
  };

  // Начальная загрузка данных
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading({ nearest: true, upcoming: true, past: true });
      
      try {
        const [nearestResult, upcomingResult, pastResult] = await Promise.all([
          loadEventsFromSupabase('nearest', 0, 1),
          loadEventsFromSupabase('upcoming', 0, 6),
          loadEventsFromSupabase('past', 0, 10)
        ]);

        setEvents({
          nearest: nearestResult.data,
          upcoming: upcomingResult.data,
          past: pastResult.data
        });

        setPagination({
          upcoming: { offset: 6, hasMore: upcomingResult.hasMore },
          past: { offset: 10, hasMore: pastResult.hasMore }
        });

        await calculateStats();
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading({ nearest: false, upcoming: false, past: false });
      }
    };

    loadInitialData();
  }, []);

  // Пересчет статистики при изменении фильтра времени
  useEffect(() => {
    calculateStats();
  }, [timeFilter, customDateRange]);

  // Функция загрузки дополнительных данных
  const loadMore = async (type: string) => {
    if (!pagination[type as keyof typeof pagination].hasMore) return;

    setLoadingMore(prev => ({ ...prev, [type]: true }));

    try {
      const result = await loadEventsFromSupabase(type, pagination[type as keyof typeof pagination].offset, 10);
      
      setEvents(prev => ({
        ...prev,
        [type]: [...prev[type as keyof typeof prev], ...result.data]
      }));

      setPagination(prev => ({
        ...prev,
        [type]: {
          offset: prev[type as keyof typeof prev].offset + 10,
          hasMore: result.hasMore
        }
      }));
    } catch (error) {
      console.error(`Error loading more ${type} events:`, error);
    } finally {
      setLoadingMore(prev => ({ ...prev, [type]: false }));
    }
  };

  // Константы для фильтров и вкладок
  const timeFilters = [
    { id: 'all', label: 'Все время', icon: CalendarDays },
    { id: 'today', label: 'Сегодня', icon: Calendar },
    { id: 'week', label: 'Неделя', icon: Calendar },
    { id: 'month', label: 'Месяц', icon: Calendar },
    { id: 'custom', label: 'Период', icon: CalendarDays }
  ];

  const tabs = [
    { id: 'dashboard', label: 'Дашборд', icon: BarChart3 },
    { id: 'upcoming', label: 'Предстоящие', count: events.upcoming.length, icon: Calendar },
    { id: 'past', label: 'Прошедшие', count: events.past.length, icon: Clock }
  ];

  // src/pages/admin/AdminEventStatistics.tsx - Часть 3 (интерфейс и модальные окна)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4">
            Статистика мероприятий
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Аналитика и отчеты по вашим мероприятиям
          </p>
        </div>

        {/* Навигационные вкладки */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "primary" : "ghost"}
                    onClick={() => setActiveTab(tab.id)}
                    leftIcon={<IconComponent className="w-5 h-5" />}
                    className={`${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-dark-700'
                    }`}
                  >
                    {tab.label}
                    {tab.count && tab.count > 0 && (
                      <span className={`ml-3 px-2 py-1 text-sm rounded-full font-bold ${
                        activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Контент вкладок */}
        <div className="space-y-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Объединенный блок статистики и фильтра */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Статистика с фильтром */}
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-dark-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-6">
                    {/* Фильтр по времени */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2 text-primary-500" />
                          Статистика
                        </h3>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleExportClick}
                          leftIcon={<Download className="h-4 w-4" />}
                        >
                          Экспорт
                        </Button>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Период:</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {timeFilters.map((filter) => {
                            const IconComponent = filter.icon;
                            return (
                              <Button
                                key={filter.id}
                                variant={timeFilter === filter.id ? "primary" : "outline"}
                                size="sm"
                                onClick={() => setTimeFilter(filter.id)}
                                leftIcon={<IconComponent className="w-3 h-3" />}
                                className="text-xs"
                              >
                                {filter.label}
                              </Button>
                            );
                          })}
                        </div>

                        {/* Кастомный диапазон дат */}
                        {timeFilter === 'custom' && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Начальная дата
                              </label>
                              <input
                                type="date"
                                value={customDateRange.start}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="form-input text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Конечная дата
                              </label>
                              <input
                                type="date"
                                value={customDateRange.end}
                                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="form-input text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Карточки статистики */}
                    <div className="grid grid-cols-1 gap-4">
                      <StatCard 
                        title="Мероприятий" 
                        value={stats.totalEvents} 
                        icon={Calendar}
                        color="primary"
                      />
                      <StatCard 
                        title="Участников" 
                        value={stats.totalParticipants} 
                        icon={Users}
                        color="success"
                      />
                      <StatCard 
                        title="Выручка" 
                        value={`${stats.totalRevenue.toLocaleString()} ₽`} 
                        icon={DollarSign}
                        color="warning"
                      />
                      <StatCard 
                        title="Средн. участников" 
                        value={stats.avgParticipants} 
                        icon={TrendingUp}
                        color="info"
                      />
                    </div>
                  </div>
                </div>

                {/* Ближайшее мероприятие */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-dark-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Star className="w-5 h-5 mr-2 text-primary-500" />
                      Ближайшее мероприятие
                    </h3>
                    
                    {loading.nearest ? (
                      <LoadingSpinner />
                    ) : events.nearest.length > 0 ? (
                      <EventCard event={events.nearest[0]} />
                    ) : (
                      <div className="text-center py-12">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          Нет запланированных мероприятий
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Вкладка предстоящих мероприятий */}
          {activeTab === 'upcoming' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Предстоящие мероприятия
                </h2>
                <ViewToggle isListView={isListView} onToggle={setIsListView} />
              </div>

              {loading.upcoming ? (
                <LoadingSpinner />
              ) : events.upcoming.length > 0 ? (
                <div className={isListView ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'}>
                  {events.upcoming.map((event, index) => (
                    <EventCard 
                      key={event.id || index} 
                      event={event} 
                      isCompact={isListView}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Calendar className="w-24 h-24 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Нет предстоящих мероприятий
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Создайте новое мероприятие, чтобы увидеть его здесь
                  </p>
                </div>
              )}

              {/* Кнопка "Загрузить еще" */}
              {pagination.upcoming.hasMore && (
                <div className="text-center pt-6">
                  <Button
                    variant="outline"
                    onClick={() => loadMore('upcoming')}
                    loading={loadingMore.upcoming}
                    leftIcon={!loadingMore.upcoming ? <ChevronDown className="w-5 h-5" /> : undefined}
                  >
                    {loadingMore.upcoming ? 'Загрузка...' : 'Показать еще 10 мероприятий'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Вкладка прошедших мероприятий */}
          {activeTab === 'past' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Прошедшие мероприятия
                </h2>
                <ViewToggle isListView={isListView} onToggle={setIsListView} />
              </div>

              {loading.past ? (
                <LoadingSpinner />
              ) : events.past.length > 0 ? (
                <div className={isListView ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'}>
                  {events.past.map((event, index) => (
                    <EventCard 
                      key={event.id || index} 
                      event={event} 
                      isPast={true}
                      isCompact={isListView}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-12 h-12 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Нет прошедших мероприятий
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Здесь появится история ваших завершенных мероприятий
                  </p>
                </div>
              )}

              {/* Кнопка "Загрузить еще" */}
              {pagination.past.hasMore && (
                <div className="text-center pt-6">
                  <Button
                    variant="outline"
                    onClick={() => loadMore('past')}
                    loading={loadingMore.past}
                    leftIcon={!loadingMore.past ? <ChevronDown className="w-5 h-5" /> : undefined}
                  >
                    {loadingMore.past ? 'Загрузка...' : 'Показать еще 10 мероприятий'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Модальное окно экспорта */}
        <Modal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title="Экспорт данных"
          size="md"
        >
          <div className="space-y-6">
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Выберите тип данных для экспорта:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <input
                    id="visitors-export"
                    name="export-type"
                    type="radio"
                    checked={exportType === 'visitors'}
                    onChange={() => setExportType('visitors')}
                    className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="visitors-export" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Только посетители</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Содержит: Имя, Email, Количество посещений
                    </p>
                  </label>
                </div>
                
                <div className="flex items-start">
                  <input
                    id="fullstats-export"
                    name="export-type"
                    type="radio"
                    checked={exportType === 'full_stats'}
                    onChange={() => setExportType('full_stats')}
                    className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="fullstats-export" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Полная статистика</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      Содержит: Мероприятие, Дата, Участников, Выручка
                    </p>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsExportModalOpen(false)}
                fullWidth
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleExportConfirm}
                fullWidth
              >
                Экспортировать
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default EventsStatistics;