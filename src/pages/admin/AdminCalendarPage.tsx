// src/pages/admin/AdminCalendarPage.tsx
import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, setHours, setMinutes, startOfMonth, endOfMonth, isSameMonth, isSameDay, isAfter, isBefore, startOfDay, endOfDay, addWeeks, subWeeks, addMonths, subMonths, eachDayOfInterval, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Grid, List, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

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

type ViewMode = 'day' | 'week' | 'month';

const WORKING_HOURS = { start: 9, end: 22 };
const VIEW_MODES: ViewMode[] = ['day', 'week', 'month'];
const WEEK_OPTIONS = { weekStartsOn: 1 as const };

const AdminCalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSlot, setEditSlot] = useState<TimeSlot | null>(null);

  // Format time helper
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm');
  };

  // Check if slot is in the past
  const isSlotPast = (endTimestamp: string) => {
    return new Date(endTimestamp) < new Date();
  };

  // Get slot color classes
  const getSlotColorClasses = (type: string, status?: string, isPast: boolean = false) => {
    if (isPast) return 'bg-gray-100/50 dark:bg-gray-800 border-l-4 border-gray-400 opacity-70';
    if (status === 'draft') return 'bg-gray-50 dark:bg-gray-700/50 border-l-4 border-gray-400 opacity-80';
    
    switch (type) {
      case 'event': return 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500';
      case 'rent': return 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500';
      case 'booking': return 'bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500';
      default: return 'bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-400';
    }
  };

  // Navigation
  const navigate = (direction: 'prev' | 'next') => { 
    setCurrentDate(prevDate => {
      switch (viewMode) {
        case 'day': return direction === 'next' ? addDays(prevDate, 1) : addDays(prevDate, -1);
        case 'week': return direction === 'next' ? addWeeks(prevDate, 1) : subWeeks(prevDate, 1);
        case 'month': return direction === 'next' ? addMonths(prevDate, 1) : subMonths(prevDate, 1);
        default: return prevDate;
      }
    });
  };

  // Load slots
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

  // Handlers
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

  useEffect(() => {
    loadSlots();
  }, [currentDate, viewMode]);

  // Render helpers
  const renderDayView = () => {
    const daySlots = slots.filter(slot => isSameDay(new Date(slot.start_at), currentDate));
    const timeSlots = Array.from({ length: WORKING_HOURS.end - WORKING_HOURS.start }, (_, i) => WORKING_HOURS.start + i);

    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          {format(currentDate, 'EEEE, d MMMM yyyy', { locale: ru })}
        </div>
        
        <div className="space-y-2">
          {timeSlots.map(hour => {
            const hourSlots = daySlots.filter(slot => {
              const slotHour = new Date(slot.start_at).getHours();
              return slotHour === hour;
            });

            return (
              <div key={hour} className="grid grid-cols-12 gap-4">
                <div className="col-span-1 text-sm text-gray-500 dark:text-gray-400 pt-2">
                  {hour}:00
                </div>
                <div className="col-span-11 space-y-2">
                  {hourSlots.length > 0 ? (
                    hourSlots.map(slot => (
                      <div
                        key={slot.id}
                        className={`p-3 rounded-lg ${getSlotColorClasses(
                          slot.slot_details.type,
                          slot.slot_details.status,
                          isSlotPast(slot.end_at)
                        )}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {slot.slot_details.title || 'Без названия'}
                              {slot.slot_details.status === 'draft' && (
                                <span className="text-xs text-gray-500 ml-2">(черновик)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {formatTime(new Date(slot.start_at))} - {formatTime(new Date(slot.end_at))}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditSlot(slot)}
                              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-gray-400 dark:text-gray-500">
                      Нет событий
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, WEEK_OPTIONS);
    const weekEnd = endOfWeek(currentDate, WEEK_OPTIONS);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const timeSlots = Array.from({ length: WORKING_HOURS.end - WORKING_HOURS.start }, (_, i) => WORKING_HOURS.start + i);

    return (
      <div className="space-y-4">
        <div className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM yyyy')}
        </div>
        
        <div className="grid grid-cols-8 gap-1">
          {/* Time column */}
          <div className="col-span-1">
            <div className="h-12"></div>
            {timeSlots.map(hour => (
              <div key={hour} className="h-16 text-xs text-gray-500 dark:text-gray-400 pr-2 text-right">
                {hour}:00
              </div>
            ))}
          </div>
          
          {/* Day columns */}
          {days.map(day => {
            const daySlots = slots.filter(slot => isSameDay(new Date(slot.start_at), day));
            
            return (
              <div key={day.toString()} className="col-span-1">
                <div className={`h-12 text-center p-2 ${isToday(day) ? 'bg-blue-50 dark:bg-blue-900/20 rounded' : ''}`}>
                  <div className="text-sm font-medium">
                    {format(day, 'EEE', { locale: ru })}
                  </div>
                  <div className={`text-xs ${isToday(day) ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                <div className="space-y-1">
                  {timeSlots.map(hour => {
                    const hourSlots = daySlots.filter(slot => {
                      const slotHour = new Date(slot.start_at).getHours();
                      return slotHour === hour;
                    });

                    return (
                      <div key={hour} className="h-16 p-1">
                        {hourSlots.map(slot => (
                          <div
                            key={slot.id}
                            className={`p-1 text-xs rounded ${getSlotColorClasses(
                              slot.slot_details.type,
                              slot.slot_details.status,
                              isSlotPast(slot.end_at)
                            )}`}
                            onClick={() => handleEditSlot(slot)}
                          >
                            <div className="truncate font-medium">
                              {slot.slot_details.title?.substring(0, 15) || '...'}
                            </div>
                            <div className="truncate">
                              {formatTime(new Date(slot.start_at))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, WEEK_OPTIONS);
    const endDate = endOfWeek(monthEnd, WEEK_OPTIONS);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks = [];
    
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="space-y-4">
        <div className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          {format(currentDate, 'MMMM yyyy', { locale: ru })}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 p-2">
              {day}
            </div>
          ))}
          
          {/* Calendar cells */}
          {days.map(day => {
            const daySlots = slots.filter(slot => isSameDay(new Date(slot.start_at), day));
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div
                key={day.toString()}
                className={`min-h-24 p-1 border rounded ${
                  isToday(day) 
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700'
                } ${
                  isCurrentMonth 
                    ? 'bg-white dark:bg-gray-800' 
                    : 'bg-gray-50 dark:bg-gray-900/50'
                }`}
              >
                <div className={`text-right text-sm p-1 ${
                  isToday(day) 
                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                    : isCurrentMonth 
                      ? 'text-gray-800 dark:text-gray-200' 
                      : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {daySlots.slice(0, 3).map(slot => (
                    <div
                      key={slot.id}
                      className={`text-xs p-1 rounded truncate ${getSlotColorClasses(
                        slot.slot_details.type,
                        slot.slot_details.status,
                        isSlotPast(slot.end_at)
                      )}`}
                      onClick={() => handleEditSlot(slot)}
                    >
                      {formatTime(new Date(slot.start_at))} {slot.slot_details.title?.substring(0, 10) || '...'}
                    </div>
                  ))}
                  
                  {daySlots.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      +{daySlots.length - 3} ещё
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 dark:border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка календаря...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                <Calendar className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Календарь слотов</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Date navigation */}
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
              
              {/* View mode toggle */}
              <div className="flex rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-700">
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-2 text-sm flex items-center gap-2 transition-colors font-medium ${
                      viewMode === mode 
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white' 
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
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500 rounded-sm" />
              <span className="text-gray-600 dark:text-gray-300">Мероприятия</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-500 rounded-sm" />
              <span className="text-gray-600 dark:text-gray-300">Аренда</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border-l-4 border-purple-500 rounded-sm" />
              <span className="text-gray-600 dark:text-gray-300">Бронирования</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-l-4 border-gray-400 rounded-sm" />
              <span className="text-gray-600 dark:text-gray-300">Черновики</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100/50 border-l-4 border-gray-400 rounded-sm opacity-70" />
              <span className="text-gray-600 dark:text-gray-300">Прошедшие</span>
            </div>
          </div>

          {/* Calendar content */}
          <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-4 min-h-[400px]">
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendarPage;