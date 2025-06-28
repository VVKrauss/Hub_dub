// src/pages/admin/AdminCalendarPage.tsx - Унифицированная версия
import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addDays, setHours, setMinutes, startOfMonth, endOfMonth, getDate, isSameMonth, isSameDay, isAfter, isBefore, startOfDay, endOfDay, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Users, Clock, MapPin, Grid, List, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
// Удаляем импорт useTimeUtils

// === ТИПЫ ===
interface TimeSlot {
  id: string;
  start_at: string;
  end_at: string;
  slot_details: {
    title?: string;
    description?: string;
    user_name?: string;
    type: 'event' | 'rent' | 'booking';
    status?: string;
  };
}

interface GroupedSlot {
  id: string;
  slots: TimeSlot[];
  start_at: string;
  end_at: string;
  title: string;
  type: 'event' | 'rent' | 'booking';
  status?: string;
}

type ViewMode = 'day' | 'week' | 'month';

// === КОНСТАНТЫ ===
const WORKING_HOURS = { start: 9, end: 22 };
const VIEW_MODES: ViewMode[] = ['day', 'week', 'month'];
const WEEK_OPTIONS = { weekStartsOn: 1 as const };

// === КОМПОНЕНТ ===
const AdminCalendarPage: React.FC = () => {
  // Состояния
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSlot, setEditSlot] = useState<TimeSlot | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState<Date | null>(null);
  const [newSlotHour, setNewSlotHour] = useState<number | null>(null);

  // === УТИЛИТЫ ===
  const formatSlotTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('sr-RS', {
      timeZone: 'Europe/Belgrade',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const isSlotPast = (endTimestamp: string): boolean => {
    return new Date(endTimestamp) < new Date();
  };

  const getSlotColorClasses = (type: string, status?: string, isPast: boolean = false) => {
    if (isPast) {
      return 'bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-400 opacity-60';
    }
    
    if (status === 'draft') {
      return 'bg-gray-50 dark:bg-gray-700/50 border-l-4 border-gray-300 opacity-80';
    }

    switch (type) {
      case 'event': return 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500';
      case 'rent': return 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500';
      case 'booking': return 'bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500';
      default: return 'bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-300';
    }
  };

  const generateTimeSlots = (date: Date) => {
    const slots = [];
    for (let hour = WORKING_HOURS.start; hour < WORKING_HOURS.end; hour++) {
      slots.push({
        time: setMinutes(setHours(date, hour), 0),
        label: `${hour}:00`
      });
    }
    return slots;
  };

  // === НАВИГАЦИЯ ===
  const navigate = (direction: 'prev' | 'next') => { 
    setCurrentDate(prevDate => {
      switch (viewMode) {
        case 'day':
          return direction === 'next' ? addDays(prevDate, 1) : addDays(prevDate, -1);
        case 'week':
          return direction === 'next' ? addWeeks(prevDate, 1) : subWeeks(prevDate, 1);
        case 'month':
          return direction === 'next' ? addMonths(prevDate, 1) : subMonths(prevDate, 1);
        default:
          return prevDate;
      }
    });
  };

  // === ЗАГРУЗКА ДАННЫХ ===
  const loadSlots = async () => {
    try {
      setLoading(true);
      
      let startDate: Date, endDate: Date;
      
      switch (viewMode) {
        case 'day':
          startDate = startOfDay(currentDate);
          endDate = endOfDay(currentDate);
          break;
        case 'week':
          startDate = startOfDay(startOfWeek(currentDate, WEEK_OPTIONS));
          endDate = endOfDay(endOfWeek(currentDate, WEEK_OPTIONS));
          break;
        case 'month':
          startDate = startOfDay(startOfMonth(currentDate));
          endDate = endOfDay(endOfMonth(currentDate));
          break;
      }

      const { data, error } = await supabase
        .from('time_slots_table')
        .select('*')
        .gte('start_at', startDate.toISOString())
        .lte('start_at', endDate.toISOString())
        .order('start_at');

      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error('Error loading slots:', error);
      toast.error('Ошибка при загрузке слотов');
    } finally {
      setLoading(false);
    }
  };

  // === ОБРАБОТЧИКИ ===
  const handleTimeSlotClick = (date: Date, hour: number) => {
    setNewSlotDate(date);
    setNewSlotHour(hour);
    setShowCreateForm(true);
  };

  const handleEditSlot = (slot: TimeSlot) => {
    setEditSlot(slot);
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Удалить слот?')) return;
    
    try {
      const { error } = await supabase
        .from('time_slots_table')
        .delete()
        .eq('id', slotId);

      if (error) throw error;
      
      toast.success('Слот удален');
      loadSlots();
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Ошибка при удалении слота');
    }
  };

  // === ЭФФЕКТЫ ===
  useEffect(() => {
    loadSlots();
  }, [currentDate, viewMode]);

  // === КОМПОНЕНТЫ СЛОТОВ ===
  const SlotComponent = ({ 
    slot, 
    groupedSlot, 
    onEdit, 
    onDelete, 
    style,
    className = ""
  }: {
    slot: TimeSlot;
    groupedSlot?: GroupedSlot;
    onEdit: (slot: TimeSlot) => void;
    onDelete: (id: string, type?: string) => void;
    style?: React.CSSProperties;
    className?: string;
  }) => {
    const isPastSlot = isSlotPast(slot.end_at);
    
    const firstSlot = groupedSlot?.slots[0] || slot;
    const lastSlot = groupedSlot?.slots[groupedSlot?.slots.length - 1] || slot;
    
    return (
      <div
        className={`p-2 rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 ${getSlotColorClasses(
          slot.slot_details?.type || 'event', 
          slot.slot_details?.status, 
          isPastSlot
        )} ${className}`}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          if (slot.slot_details?.type === 'rent' || slot.slot_details?.type === 'booking') {
            onEdit(slot);
          }
        }}
      >
        <div className="font-medium truncate text-sm">
          {formatSlotTime(firstSlot.start_at)} {slot.slot_details?.title && `- ${slot.slot_details.title}`}
          {slot.slot_details?.status === 'draft' && <span className="text-xs text-gray-500 ml-1">(черновик)</span>}
          {isPastSlot && <span className="text-xs text-gray-500 ml-1">(прошло)</span>}
        </div>
        
        {slot.slot_details?.description && (
          <div className="text-xs truncate opacity-75 mt-1">
            {slot.slot_details.description}
          </div>
        )}
        
        {(slot.slot_details?.type === 'rent' || slot.slot_details?.type === 'booking') && !isPastSlot && (
          <div className="flex items-center gap-1 mt-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(slot);
              }}
              className="p-1 rounded bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 transition-colors"
              title="Редактировать"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(slot.id, slot.slot_details?.type);
              }}
              className="p-1 rounded bg-white/80 hover:bg-white text-red-600 hover:text-red-800 transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // === РЕНДЕР ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка календаря...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Унифицированный заголовок */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Календарь слотов</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Навигация по датам */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate('prev')}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="text-sm font-medium min-w-[180px] text-center text-gray-800 dark:text-gray-200 px-3">
                  {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: ru })}
                  {viewMode === 'week' && `${format(startOfWeek(currentDate, WEEK_OPTIONS), 'd MMM')} - ${format(endOfWeek(currentDate, WEEK_OPTIONS), 'd MMM yyyy')}`}
                  {viewMode === 'day' && format(currentDate, 'd MMMM yyyy', { locale: ru })}
                </div>
                
                <button 
                  onClick={() => navigate('next')}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {/* Переключатель режимов */}
              <div className="flex rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-700">
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-2 text-sm flex items-center gap-2 transition-colors font-medium ${
                      viewMode === mode 
                        ? 'bg-primary-600 text-white' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {mode === 'day' && <Calendar className="w-4 h-4" />}
                    {mode === 'week' && <List className="w-4 h-4" />}
                    {mode === 'month' && <Grid className="w-4 h-4" />}
                    {mode === 'day' && 'День'}
                    {mode === 'week' && 'Неделя'}
                    {mode === 'month' && 'Месяц'}
                  </button>
                ))}
              </div>

              {/* Кнопка создания */}
              <button
                onClick={() => handleTimeSlotClick(currentDate, 10)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Создать</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Индикатор временной зоны */}
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Время отображается по Белграду (Europe/Belgrade)</span>
            </div>
          </div>

          {/* Легенда статусов */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 border-l-4 border-green-500 rounded-sm" />
              <span className="text-gray-600 dark:text-gray-300">Мероприятия</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 border-l-4 border-blue-500 rounded-sm" />
              <span className="text-gray-600 dark:text-gray-300">Аренда</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-200 border-l-4 border-purple-500 rounded-sm" />
              <span className="text-gray-600 dark:text-gray-300">Бронирования</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-l-4 border-gray-300 rounded-sm" />
              <span className="text-gray-600 dark:text-gray-300">Черновики</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 border-l-4 border-gray-400 rounded-sm opacity-60" />
              <span className="text-gray-600 dark:text-gray-300">Прошедшие</span>
            </div>
          </div>

          {/* Основной календарь */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[400px]">
            {slots.length > 0 ? (
              <div className="space-y-3">
                {slots.map((slot) => (
                  <SlotComponent
                    key={slot.id}
                    slot={slot}
                    onEdit={handleEditSlot}
                    onDelete={handleDeleteSlot}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Нет запланированных событий
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  На выбранный период событий не найдено
                </p>
                <button
                  onClick={() => handleTimeSlotClick(currentDate, 10)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Создать событие 
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendarPage;