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


  