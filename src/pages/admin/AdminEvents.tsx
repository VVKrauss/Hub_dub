// src/pages/admin/AdminEvents.tsx - Часть 1 (до 500 строк)
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Calendar, 
  Users, 
  MapPin, 
  Trash2, 
  Filter, 
  Loader2,
  X,
  Archive,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { Event, EventRegistrations } from './constants';
import { 
  formatRussianDate,
  formatTimeFromTimestamp, 
  formatTimeRange,
  isPastEvent,
  formatDateTimeForDisplay 
} from '../../utils/dateTimeUtils';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'chronological';
type FilterStatus = 'active' | 'draft' | 'past';

const statusColors = {
  active: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400',
  draft: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-400',
  past: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900/30 dark:to-gray-800/30 dark:text-gray-400'
};

const formatEventTitle = (title: string) => {
  const maxLength = 50;
  const maxLineLength = 30;
  
  if (title.length <= maxLength) {
    const words = title.split(' ');
    if (words.length <= 2) {
      return {
        line1: words[0] || ' ',
        line2: words[1] || ' '
      };
    }
    
    const middle = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, middle).join(' '),
      line2: words.slice(middle).join(' ')
    };
  }
  
  return {
    line1: title.substring(0, maxLineLength),
    line2: title.substring(maxLineLength, maxLength - 3) + '...'
  };
};

const AdminEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('chronological');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [sortBy, statusFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Получаем события с их временными слотами
      let query = supabase
        .from('events')
        .select(`
          *,
          time_slot:time_slots_table!fk_time_slots_event(
            id,
            start_at,
            end_at
          )
        `);

      // Фильтрация по статусу
      if (statusFilter === 'past') {
        // Получаем все события со статусом past ИЛИ активные которые уже прошли
        query = query.or('status.eq.past,status.eq.active');
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Обогащаем события временными данными
      const enrichedEvents = (data || []).map(event => ({
        ...event,
        start_at: event.time_slot?.[0]?.start_at || event.start_at,
        end_at: event.time_slot?.[event.time_slot?.length - 1]?.end_at || event.end_at
      }));

      // Фильтрация прошедших событий
      let filteredEvents = enrichedEvents;
      if (statusFilter === 'past') {
        filteredEvents = enrichedEvents.filter(event => 
          event.status === 'past' || (event.end_at && isPastEvent(event.end_at))
        );
      } else if (statusFilter === 'active') {
        filteredEvents = enrichedEvents.filter(event => 
          event.status === 'active' && (!event.end_at || !isPastEvent(event.end_at))
        );
      }

      // Сортировка
      filteredEvents.sort((a, b) => {
        switch (sortBy) {
          case 'chronological':
            if (!a.start_at && !b.start_at) return 0;
            if (!a.start_at) return 1;
            if (!b.start_at) return -1;
            return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
          
          case 'date-asc':
            if (!a.start_at && !b.start_at) return 0;
            if (!a.start_at) return 1;
            if (!b.start_at) return -1;
            return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
          
          case 'date-desc':
            if (!a.start_at && !b.start_at) return 0;
            if (!a.start_at) return 1;
            if (!b.start_at) return -1;
            return new Date(b.start_at).getTime() - new Date(a.start_at).getTime();
          
          case 'title-asc':
            return (a.title || '').localeCompare(b.title || '');
          
          case 'title-desc':
            return (b.title || '').localeCompare(a.title || '');
          
          default:
            return 0;
        }
      });

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Ошибка при загрузке мероприятий');
    } finally {
      setLoading(false);
    }
  };

  // Функции для работы с регистрациями
  const getCurrentRegistrationCount = (event: Event): number => {
    if (typeof event.registrations === 'object' && event.registrations !== null) {
      return parseInt(event.registrations.current || '0') || 0;
    }
    if (typeof event.current_registration_count === 'number') {
      return event.current_registration_count;
    }
    if (Array.isArray(event.registrations_list)) {
      return event.registrations_list.length;
    }
    return 0;
  };

  const getMaxRegistrations = (event: Event): number | null => {
    if (typeof event.registrations === 'object' && event.registrations !== null) {
      const maxRegs = parseInt(event.registrations.max_registrations || event.registrations.max_regs || '0');
      return maxRegs > 0 ? maxRegs : null;
    }
    if (typeof event.max_registrations === 'number' && event.max_registrations > 0) {
      return event.max_registrations;
    }
    return null;
  };

  const getEventPrice = (event: Event): string => {
    if (event.payment_type === 'free') {
      return 'Бесплатно';
    } else if (event.payment_type === 'cost' && event.price) {
      const price = typeof event.price === 'string' ? parseFloat(event.price) : event.price;
      return price > 0 ? `${price} ${event.currency || 'RUB'}` : 'Бесплатно';
    } else {
      return 'Бесплатно';
    }
  };

  // Проверяет, нужно ли показывать информацию о регистрациях
  const shouldShowRegistrations = (event: Event): boolean => {
    const currentCount = getCurrentRegistrationCount(event);
    const maxRegs = getMaxRegistrations(event);
    
    return (
      currentCount > 0 || // Есть регистрации
      maxRegs !== null || // Установлен лимит
      event.payment_type !== 'free' || // Платное мероприятие
      event.status === 'active' // Активное мероприятие
    );
  };

  // Проверяет, есть ли система регистраций в мероприятии
  const hasRegistrationSystem = (event: Event): boolean => {
    return !!(event.registrations || event.registrations_list || event.current_registration_count !== undefined);
  };

  // Функция для отображения даты и времени
  const formatEventDateTime = (event: Event): string => {
    if (!event.start_at) return 'Время не указано';
    
    const dateStr = formatRussianDate(event.start_at);
    const timeStr = event.end_at 
      ? formatTimeRange(event.start_at, event.end_at)
      : formatTimeFromTimestamp(event.start_at);
    
    return `${dateStr} • ${timeStr}`;
  };

  // Обработчики событий
  const toggleEventSelection = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const clearSelection = () => {
    setSelectedEvents([]);
  };

  const handleBulkStatusChange = async (newStatus: 'active' | 'draft') => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .in('id', selectedEvents);

      if (error) throw error;

      toast.success(`Статус ${selectedEvents.length} мероприятий изменен на "${newStatus}"`);
      setSelectedEvents([]);
      fetchEvents();
    } catch (error) {
      console.error('Error updating events status:', error);
      toast.error('Ошибка при изменении статуса мероприятий');
    }
  };

  const handleBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      const { error } = await supabase
        .from('events')
        .delete()
        .in('id', selectedEvents);

      if (error) throw error;

      toast.success(`Удалено ${selectedEvents.length} мероприятий`);
      setSelectedEvents([]);
      setShowBulkDeleteModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting events:', error);
      toast.error('Ошибка при удалении мероприятий');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleEventDelete = async (eventId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Мероприятие удалено');
      setShowDetailsModal(false);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Ошибка при удалении мероприятия');
    }
  };

  // Фильтрация событий по поисковому запросу
  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  });

  const tabs = [
    { id: 'active', label: 'Активные', count: events.filter(e => e.status === 'active' && (!e.end_at || !isPastEvent(e.end_at))).length },
    { id: 'past', label: 'Прошедшие', count: events.filter(e => e.status === 'past' || (e.end_at && isPastEvent(e.end_at))).length },
    { id: 'draft', label: 'Черновики', count: events.filter(e => e.status === 'draft').length }
  ];

  // src/pages/admin/AdminEvents.tsx - Часть 2 (основной интерфейс)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-dark-900 dark:via-dark-900 dark:to-dark-800 py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-4 font-heading">
            Управление мероприятиями
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Создавайте, редактируйте и управляйте своими мероприятиями
          </p>
        </div>

        {/* Кнопка создания */}
        <div className="flex justify-center mb-10">
          <Link to="/admin/events/new" className="inline-block">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="h-5 w-5" />}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Создать мероприятие
            </Button>
          </Link>
        </div>

        {/* Панель поиска и фильтров */}
        <div className="mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Поиск */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Поиск мероприятий..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                />
              </div>

              {/* Сортировка */}
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="form-select pl-12 pr-8 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all duration-200"
                >
                  <option value="chronological">Хронологически</option>
                  <option value="date-desc">Сначала новые</option>
                  <option value="date-asc">Сначала старые</option>
                  <option value="title-asc">По названию (А-Я)</option>
                  <option value="title-desc">По названию (Я-А)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Панель массовых действий */}
        {selectedEvents.length > 0 && (
          <div className="mb-8 p-4 bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Выбрано: {selectedEvents.length} мероприятий
              </span>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  leftIcon={<X className="h-4 w-4" />}
                >
                  Отменить выбор
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkStatusChange('draft')}
                  leftIcon={<Archive className="h-4 w-4" />}
                >
                  В черновики
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleBulkStatusChange('active')}
                  leftIcon={<CheckCircle className="h-4 w-4" />}
                >
                  Активировать
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowBulkDeleteModal(true)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Вкладки статусов */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-center">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mx-6 my-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as FilterStatus)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 font-heading ${
                    statusFilter === tab.id
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                      statusFilter === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Список мероприятий */}
        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                  Загрузка мероприятий...
                </p>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/20 dark:to-primary-800/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-12 h-12 text-primary-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {searchQuery ? 'Мероприятия не найдены' : 'Пока нет мероприятий'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {searchQuery 
                  ? 'Попробуйте изменить поисковый запрос или фильтры'
                  : 'Создайте первое мероприятие, чтобы начать работу'
                }
              </p>
              {!searchQuery && (
                <Link to="/admin/events/new" className="inline-block">
                  <Button
                    variant="primary"
                    size="lg"
                    leftIcon={<Plus className="h-5 w-5" />}
                  >
                    Создать мероприятие
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredEvents.map((event) => {
                const { line1, line2 } = formatEventTitle(event.title || 'Без названия');
                const currentRegistrationCount = getCurrentRegistrationCount(event);
                const maxRegistrations = getMaxRegistrations(event);
                const progressPercentage = maxRegistrations && maxRegistrations > 0 
                  ? (currentRegistrationCount / maxRegistrations) * 100 : 0;
                const isEventPast = event.end_at ? isPastEvent(event.end_at) : false;
                
                return (
                  <div 
                    key={event.id} 
                    className="group relative bg-white dark:bg-dark-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600 cursor-pointer"
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowDetailsModal(true);
                    }}
                  >
                    {/* Чекбокс */}
                    <div className="absolute top-4 left-4 z-10">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.id)}
                        onChange={(e) => e.stopPropagation()}
                        onClick={(e) => toggleEventSelection(event.id, e)}
                        className="form-checkbox h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:checked:bg-primary-600 shadow-lg"
                      />
                    </div>
                    
                    {/* Изображение мероприятия */}
                    <div 
                      className="h-48 bg-cover bg-center relative"
                      style={{ 
                        backgroundImage: event.bg_image 
                          ? `url(${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${event.bg_image})`
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    >
                      {/* Градиентная полоска сверху */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"></div>
                      
                      {/* Кнопки действий */}
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Link
                          to={`/events/${event.id}`}
                          className="p-2 bg-white/90 hover:bg-white dark:bg-dark-700/90 dark:hover:bg-dark-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 transform hover:scale-110"
                          title="Просмотреть страницу"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Eye className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        </Link>
                        <Link
                          to={`/admin/events/${event.id}/edit`}
                          className="p-2 bg-white/90 hover:bg-white dark:bg-dark-700/90 dark:hover:bg-dark-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 transform hover:scale-110"
                          title="Редактировать"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                        </Link>
                      </div>
                      
                      {/* Статус мероприятия */}
                      <div className="absolute bottom-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                          isEventPast 
                            ? statusColors.past
                            : statusColors[event.status as keyof typeof statusColors]
                        }`}>
                          {isEventPast ? 'Прошло' : 
                           event.status === 'active' ? 'Активно' : 
                           event.status === 'draft' ? 'Черновик' : 'Прошло'}
                        </span>
                      </div>
                    </div>

                    {/* Контент карточки */}
                    <div className="p-6">
                      {/* Заголовок */}
                      <div className="h-[4rem] mb-4 overflow-hidden">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white font-heading group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {line1}
                          {line2 && (
                            <>
                              <br />
                              {line2}
                            </>
                          )}
                        </h3>
                      </div>

                      // src/pages/admin/AdminEvents.tsx - Часть 3 (карточки событий и модальные окна)

                      {/* Детали мероприятия */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                            <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <span className="truncate font-medium">{formatEventDateTime(event)}</span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                              <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            </div>
                            <span className="truncate font-medium">{event.location}</span>
                          </div>
                        )}
                        
                        {/* Информация о регистрациях */}
                        {shouldShowRegistrations(event) && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-600 dark:text-gray-300">
                                <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mr-3">
                                  <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                </div>
                                <span className="font-medium">
                                  {hasRegistrationSystem(event) 
                                    ? `${currentRegistrationCount}${maxRegistrations ? `/${maxRegistrations}` : ''} участников`
                                    : getEventPrice(event)
                                  }
                                </span>
                              </div>
                            </div>
                            
                            {/* Прогресс-бар для регистраций */}
                            {maxRegistrations && maxRegistrations > 0 && (
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    progressPercentage >= 90 ? 'bg-red-500' :
                                    progressPercentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Цена мероприятия */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-lg font-bold">
                          {getEventPrice(event)}
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/admin/events/${event.id}/edit`} onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Edit className="h-4 w-4" />}
                            >
                              Редактировать
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Модальное окно подтверждения удаления */}
        <Modal
          isOpen={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          title="Подтверждение удаления"
          size="md"
          closeOnOverlayClick={!bulkDeleting}
          closeOnEsc={!bulkDeleting}
        >
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300">
              Вы уверены, что хотите удалить {selectedEvents.length} выбранных мероприятий? 
              Это действие нельзя отменить.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteModal(false)}
              disabled={bulkDeleting}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={handleBulkDelete}
              loading={bulkDeleting}
            >
              {bulkDeleting ? 'Удаление...' : 'Удалить все'}
            </Button>
          </div>
        </Modal>

        {/* Модальное окно деталей мероприятия */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={selectedEvent?.title || 'Детали мероприятия'}
          size="lg"
        >
          {selectedEvent && (
            <div className="space-y-6">
              {/* Изображение */}
              {selectedEvent.bg_image && (
                <div className="w-full h-48 bg-cover bg-center rounded-lg" 
                     style={{ 
                       backgroundImage: `url(${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${selectedEvent.bg_image})`
                     }}
                />
              )}

              {/* Основная информация */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Тип мероприятия</h4>
                  <p className="text-gray-600 dark:text-gray-300 capitalize">{selectedEvent.event_type}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Статус</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    statusColors[selectedEvent.status as keyof typeof statusColors]
                  }`}>
                    {selectedEvent.status === 'active' ? 'Активно' : 
                     selectedEvent.status === 'draft' ? 'Черновик' : 'Прошло'}
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Дата и время</h4>
                  <p className="text-gray-600 dark:text-gray-300">{formatEventDateTime(selectedEvent)}</p>
                </div>

                {selectedEvent.location && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Место проведения</h4>
                    <p className="text-gray-600 dark:text-gray-300">{selectedEvent.location}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Стоимость</h4>
                  <p className="text-gray-600 dark:text-gray-300">{getEventPrice(selectedEvent)}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Возрастная категория</h4>
                  <p className="text-gray-600 dark:text-gray-300">{selectedEvent.age_category || '0+'}</p>
                </div>
              </div>

              {/* Описание */}
              {selectedEvent.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Описание</h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Регистрации */}
              {shouldShowRegistrations(selectedEvent) && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Регистрации</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Зарегистрировано участников
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {getCurrentRegistrationCount(selectedEvent)}
                        {getMaxRegistrations(selectedEvent) && ` / ${getMaxRegistrations(selectedEvent)}`}
                      </span>
                    </div>
                    {getMaxRegistrations(selectedEvent) && (
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min((getCurrentRegistrationCount(selectedEvent) / getMaxRegistrations(selectedEvent)!) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Действия */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-600">
                <div className="flex gap-3">
                  <Link to={`/events/${selectedEvent.id}`} className="inline-block">
                    <Button
                      variant="outline"
                      leftIcon={<ExternalLink className="h-4 w-4" />}
                    >
                      Просмотреть
                    </Button>
                  </Link>
                  <Link to={`/admin/events/${selectedEvent.id}/edit`} className="inline-block">
                    <Button
                      variant="primary"
                      leftIcon={<Edit className="h-4 w-4" />}
                    >
                      Редактировать
                    </Button>
                  </Link>
                </div>
                
                <Button
                  variant="danger"
                  onClick={() => handleEventDelete(selectedEvent.id)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                >
                  Удалить
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default AdminEvents;