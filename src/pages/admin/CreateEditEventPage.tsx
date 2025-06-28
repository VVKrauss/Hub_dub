// src/pages/admin/CreateEditEventPage.tsx - Унифицированная версия
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Save, 
  Loader2, 
  Calendar,
  Info, 
  Upload, 
  Trash2, 
  AlertTriangle,
  Eye,
  ArrowLeft,
  Users,
  Clock,
  MapPin,
  DollarSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import EventSpeakersSection from '../../components/admin/EventSpeakersSection';
import EventFestivalProgramSection from '../../components/admin/EventFestivalProgramSection';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// === ТИПЫ ===
interface CreateEventForm {
  title: string;
  short_description: string;
  description: string;
  event_type: string;
  bg_image: string;
  start_at: string;
  end_at: string;
  location: string;
  age_category: string;
  price: string;
  price_comment: string;
  currency: string;
  status: string;
  payment_type: string;
  payment_link: string;
  oblakkarte_data_event_id: string;
  widget_chooser: boolean;
  max_registrations: number;
  child_half_price: boolean;
  languages: string[];
  speakers: string[];
  festival_program: any[];
  video_url: string;
  photo_gallery: string[];
  couple_discount: string;
  hide_speakers_gallery: boolean;
}

interface Speaker {
  id: string;
  name: string;
  field_of_expertise: string;
  photos: any[];
}

// === КОНСТАНТЫ ===
const eventTypes = [
  'lecture', 'workshop', 'conference', 'seminar', 'meetup', 'webinar',
  'training', 'course', 'festival', 'exhibition', 'discussion', 'other'
];

const ageCategories = [
  { value: '0+', label: '0+ (для всех)' },
  { value: '6+', label: '6+ (от 6 лет)' },
  { value: '12+', label: '12+ (от 12 лет)' },
  { value: '16+', label: '16+ (от 16 лет)' },
  { value: '18+', label: '18+ (только взрослые)' }
];

const paymentTypes = [
  { value: 'free', label: 'Бесплатное' },
  { value: 'cost', label: 'Платное' },
  { value: 'donation', label: 'По донации' }
];

const statuses = [
  { value: 'draft', label: 'Черновик' },
  { value: 'active', label: 'Активное' },
  { value: 'past', label: 'Прошедшее' }
];

const availableLanguages = ['Русский', 'Английский', 'Сербский', 'Испанский', 'Французский'];

// === ФУНКЦИИ УТИЛИТЫ ===
const createInitialEventState = (): CreateEventForm => ({
  title: '',
  short_description: '',
  description: '',
  event_type: 'lecture',
  bg_image: '',
  start_at: '',
  end_at: '',
  location: '',
  age_category: '0+',
  price: '',
  price_comment: '',
  currency: 'RUB',
  status: 'draft',
  payment_type: 'free',
  payment_link: '',
  oblakkarte_data_event_id: '',
  widget_chooser: false,
  max_registrations: 40,
  child_half_price: false,
  languages: [],
  speakers: [],
  festival_program: [],
  video_url: '',
  photo_gallery: [],
  couple_discount: '',
  hide_speakers_gallery: false
});

const formatDateTimeForInput = (timestamp: string): string => {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16);
  } catch (e) {
    console.error('Error formatting datetime for input:', e);
    return '';
  }
};

// === ОСНОВНОЙ КОМПОНЕНТ ===
const CreateEditEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Состояния
  const [event, setEvent] = useState<CreateEventForm>(createInitialEventState());
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Загрузка спикеров
        const { data: speakersData, error: speakersError } = await supabase
          .from('speakers')
          .select('*')
          .order('name');

        if (speakersError) throw speakersError;
        setSpeakers(speakersData || []);

        // Загрузка события если редактирование
        if (id) {
          const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', id)
            .single();

          if (eventError) throw eventError;

          if (eventData) {
            setEvent({
              ...eventData,
              price: eventData.price?.toString() || '',
              couple_discount: eventData.couple_discount?.toString() || '',
              start_at: formatDateTimeForInput(eventData.start_at) || '',
              end_at: formatDateTimeForInput(eventData.end_at) || '',
              short_description: eventData.short_description || '',
              price_comment: eventData.price_comment || '',
              child_half_price: eventData.child_half_price || false,
              languages: eventData.languages || [],
              speakers: eventData.speakers || [],
              festival_program: eventData.festival_program || [],
              photo_gallery: Array.isArray(eventData.photo_gallery) 
                ? eventData.photo_gallery 
                : [],
              oblakkarte_data_event_id: eventData.oblakkarte_data_event_id || '',
              widget_chooser: eventData.widget_chooser || false,
              hide_speakers_gallery: eventData.hide_speakers_gallery || false
            });
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // === ОБРАБОТЧИКИ ===
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setEvent(prev => ({ ...prev, [name]: checked }));
    } else {
      setEvent(prev => ({ ...prev, [name]: value }));
    }
    
    // Очистка ошибки при изменении поля
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleLanguageChange = (language: string) => {
    setEvent(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const handleSpeakerToggle = (speakerId: string) => {
    setEvent(prev => ({
      ...prev,
      speakers: prev.speakers.includes(speakerId)
        ? prev.speakers.filter(id => id !== speakerId)
        : [...prev.speakers, speakerId]
    }));
  };

  const handleFestivalProgramChange = (program: any[]) => {
    setEvent(prev => ({ ...prev, festival_program: program }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `event_${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setEvent(prev => ({ ...prev, bg_image: fileName }));
      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setIsUploading(false);
    }
  };

  // === ВАЛИДАЦИЯ ===
  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!event.title?.trim()) newErrors.title = true;
    if (!event.description?.trim()) newErrors.description = true;
    if (!event.start_at) newErrors.start_at = true;
    if (!event.end_at) newErrors.end_at = true;
    if (!event.location?.trim()) newErrors.location = true;

    // Проверка времени
    if (event.start_at && event.end_at) {
      const startDate = new Date(event.start_at);
      const endDate = new Date(event.end_at);
      
      if (endDate <= startDate) {
        newErrors.end_at = true;
        toast.error('Время окончания должно быть позже времени начала');
      }
    }

    // Валидация оплаты
    if (event.payment_type === 'cost') {
      if (!event.price || parseFloat(event.price) <= 0) {
        newErrors.price = true;
      }
      
      if (event.widget_chooser) {
        if (!event.oblakkarte_data_event_id?.trim()) {
          newErrors.oblakkarte_data_event_id = true;
        }
      } else {
        if (!event.payment_link?.trim()) {
          newErrors.payment_link = true;
        }
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  // === СОХРАНЕНИЕ ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }
    
    try {
      setSaving(true);
      
      // Подготовка данных
      const eventData = {
        ...event,
        price: event.payment_type === 'cost' && event.price ? parseFloat(event.price) : null,
        couple_discount: event.couple_discount ? parseFloat(event.couple_discount) : null,
        registrations: {
          max_regs: event.max_registrations || 40,
          current: 0,
          current_adults: 0,
          current_children: 0,
          reg_list: []
        }
      };

      // Очистка полей в зависимости от типа оплаты
      if (eventData.payment_type === 'free') {
        eventData.price = null;
        eventData.payment_link = null;
        eventData.oblakkarte_data_event_id = null;
        eventData.widget_chooser = false;
        eventData.child_half_price = false;
      }

      const isNew = !id;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ eventData, isNew })
        }
      );
      
      if (!response.ok) {
        throw new Error('Ошибка сохранения');
      }
      
      toast.success(isNew ? 'Мероприятие создано!' : 'Мероприятие обновлено!');
      navigate('/admin/events');
      
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Ошибка при сохранении мероприятия');
    } finally {
      setSaving(false);
    }
  };

  // === УДАЛЕНИЕ ===
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            eventData: { id },
            action: 'delete'
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Ошибка удаления');
      }
      
      toast.success('Мероприятие удалено');
      navigate('/admin/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Ошибка при удалении мероприятия');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // === СОСТОЯНИЕ ЗАГРУЗКИ ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка...</p>
        </div>
      </div>
    );
  }

  // === РЕНДЕР ===
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {id ? 'Редактирование мероприятия' : 'Создание мероприятия'}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  {id ? 'Обновите информацию о мероприятии' : 'Заполните детали нового мероприятия'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/admin/events')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад
              </button>
              
              {id && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </button>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Сохранить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Основная информация */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Основная информация</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Название */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название мероприятия *
                </label>
                <input
                  type="text"
                  name="title"
                  value={event.title}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                    errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                  placeholder="Введите название мероприятия"
                />
              </div>

              {/* Тип мероприятия */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Тип мероприятия
                </label>
                <select
                  name="event_type"
                  value={event.event_type}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Возрастная категория */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Возрастная категория
                </label>
                <select
                  name="age_category"
                  value={event.age_category}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  {ageCategories.map(category => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>

              {/* Статус */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус
                </label>
                <select
                  name="status"
                  value={event.status}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  {statuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              {/* Краткое описание */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Краткое описание
                </label>
                <textarea
                  name="short_description"
                  value={event.short_description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  placeholder="Краткое описание для превью"
                />
              </div>

              {/* Полное описание */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Полное описание *
                </label>
                <textarea
                  name="description"
                  value={event.description}
                  onChange={handleInputChange}
                  rows={6}
                  className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                  placeholder="Подробное описание мероприятия"
                />
              </div>
            </div>
          </div>

          {/* Время и место */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Время и место</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Начало */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Время начала *
                </label>
                <input
                  type="datetime-local"
                  name="start_at"
                  value={event.start_at}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                    errors.start_at ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                />
              </div>

              {/* Окончание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Время окончания *
                </label>
                <input
                  type="datetime-local"
                  name="end_at"
                  value={event.end_at}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                    errors.end_at ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                />
              </div>

              {/* Место проведения */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Место проведения *
                </label>
                <input
                  type="text"
                  name="location"
                  value={event.location}
                  onChange={handleInputChange}
                  className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                    errors.location ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                  placeholder="Адрес или название места"
                />
              </div>

              {/* Максимальное количество участников */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Максимум участников
                </label>
                <input
                  type="number"
                  name="max_registrations"
                  value={event.max_registrations}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Оплата */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Настройки оплаты</h3>
            </div>
            
            <div className="space-y-4">
              {/* Тип оплаты */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Тип оплаты
                </label>
                <select
                  name="payment_type"
                  value={event.payment_type}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  {paymentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Поля для платного мероприятия */}
              {event.payment_type === 'cost' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Цена *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={event.price}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                        errors.price ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Парная скидка
                    </label>
                    <input
                      type="number"
                      name="couple_discount"
                      value={event.couple_discount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Комментарий к цене
                    </label>
                    <input
                      type="text"
                      name="price_comment"
                      value={event.price_comment}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="Дополнительная информация о цене"
                    />
                  </div>

                  {/* Настройки онлайн оплаты */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        name="widget_chooser"
                        checked={event.widget_chooser}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Использовать виджет Oblakkarte (вместо ссылки)
                      </label>
                    </div>

                    {event.widget_chooser ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          ID события Oblakkarte *
                        </label>
                        <input
                          type="text"
                          name="oblakkarte_data_event_id"
                          value={event.oblakkarte_data_event_id}
                          onChange={handleInputChange}
                          className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                            errors.oblakkarte_data_event_id ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                          }`}
                          placeholder="Например: DoYnhURt"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Ссылка на оплату *
                        </label>
                        <input
                          type="url"
                          name="payment_link"
                          value={event.payment_link}
                          onChange={handleInputChange}
                          className={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                            errors.payment_link ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                          }`}
                          placeholder="https://..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Детская скидка */}
                  {event.age_category !== '18+' && (
                    <div className="lg:col-span-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="child_half_price"
                          checked={event.child_half_price}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Детская скидка 50%
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Изображение */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Изображение мероприятия</h3>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            
            {event.bg_image ? (
              <div className="relative">
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${event.bg_image}`}
                  alt="Event background"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setEvent(prev => ({ ...prev, bg_image: '' }))}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
              >
                {isUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Нажмите для загрузки изображения
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Языки */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Языки мероприятия</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {availableLanguages.map(language => (
                <label key={language} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={event.languages.includes(language)}
                    onChange={() => handleLanguageChange(language)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{language}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Спикеры */}
          <EventSpeakersSection
            selectedSpeakerIds={event.speakers}
            hideSpeakersGallery={event.hide_speakers_gallery}
            onSpeakerToggle={handleSpeakerToggle}
            onHideGalleryChange={(hidden) => setEvent(prev => ({ ...prev, hide_speakers_gallery: hidden }))}
            allSpeakers={speakers}
          />

          {/* Программа фестиваля */}
          {event.event_type === 'festival' && (
            <EventFestivalProgramSection
              eventType={event.event_type}
              festivalProgram={event.festival_program}
              allSpeakers={speakers}
              onFestivalProgramChange={handleFestivalProgramChange}
            />
          )}

          {/* Дополнительно */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Дополнительные настройки</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ссылка на видео (YouTube, Vimeo)
              </label>
              <input
                type="url"
                name="video_url"
                value={event.video_url}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
        </form>
      </div>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Подтверждение удаления</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Вы уверены, что хотите удалить это мероприятие? Это действие нельзя отменить.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEditEventPage;