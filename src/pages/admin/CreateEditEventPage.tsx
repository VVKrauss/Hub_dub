// src/pages/admin/CreateEditEventPage.tsx - Часть 1
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Info, Calendar, MapPin, Users, Globe, Save, Loader2, 
  Upload, Image as ImageIcon, X, Trash2, AlertTriangle,
  DollarSign, Tag, Play
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import EventSpeakersSection from '../../components/admin/EventSpeakersSection';
import EventFestivalProgramSection from '../../components/admin/EventFestivalProgramSection';
import PhotoGallerySection from '../../components/admin/PhotoGallerySection';

// Константы
const TITLE_MAX_LENGTH = 100;
const SHORT_DESC_MAX_LENGTH = 150;
const DESC_MAX_LENGTH = 2000;

// Типы
interface FestivalProgramItem {
  title: string;
  description: string;
  image_url: string;
  start_time: string;
  end_time: string;
  lecturer_id: string;
}

interface Speaker {
  id: string;
  name: string;
  field_of_expertise: string;
  description: string;
  photos: { url: string; isMain?: boolean }[];
}

interface CreateEventForm {
  id?: string;
  title: string;
  description: string;
  event_type: string;
  bg_image: string;
  start_at: string;
  end_at: string;
  location: string;
  age_category: string;
  price: string;
  currency: string;
  status: string;
  payment_type: string;
  payment_link: string;
  oblakkarte_data_event_id: string; // Новое поле для ID события
  widget_chooser: boolean; // true = виджет, false = ссылка
  max_registrations: number; // Максимальное количество участников
  languages: string[];
  speakers: string[];
  festival_program: FestivalProgramItem[];
  video_url: string;
  photo_gallery: string[];
  couple_discount: string;
  hide_speakers_gallery: boolean;
  original_bg_image?: string | null;
}

// Опции для выбора
const eventTypes = [
  'lecture', 'workshop', 'conference', 'seminar', 'meetup', 'webinar',
  'training', 'course', 'festival', 'exhibition', 'discussion', 'other'
];

const ageCategories = ['adult', 'children', 'family', 'all'];
const paymentTypes = ['free', 'cost', 'donation'];
const statuses = ['draft', 'active', 'past'];
const availableLanguages = ['Русский', 'Английский', 'Сербский', 'Испанский', 'Французский'];

// Функция создания начального состояния
const createInitialEventState = (): CreateEventForm => ({
  title: '',
  description: '',
  event_type: 'lecture',
  bg_image: '',
  start_at: '',
  end_at: '',
  location: '',
  age_category: 'adult',
  price: '',
  currency: 'RUB',
  status: 'draft',
  payment_type: 'free',
  payment_link: '',
  oblakkarte_data_event_id: '',
  widget_chooser: false,
  max_registrations: 40,
  languages: [],
  speakers: [],
  festival_program: [],
  video_url: '',
  photo_gallery: [],
  couple_discount: '',
  hide_speakers_gallery: false
});

// Функции утилиты
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

const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(imagePath);
    
  return data.publicUrl;
};

// src/pages/admin/CreateEditEventPage.tsx - Часть 2
const CreateEditEventPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [event, setEvent] = useState<CreateEventForm>(createInitialEventState());
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Загрузка данных при монтировании
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
              start_at: eventData.start_at || '',
              end_at: eventData.end_at || '',
              languages: eventData.languages || [],
              speakers: eventData.speakers || [],
              festival_program: eventData.festival_program || [],
              photo_gallery: Array.isArray(eventData.photo_gallery) 
                ? eventData.photo_gallery 
                : [],
              oblakkarte_data_event_id: eventData.oblakkarte_data_event_id || '',
              widget_chooser: eventData.widget_chooser || false,
              max_registrations: eventData.registrations?.max_regs || 
                               eventData.max_registrations || 40,
              original_bg_image: eventData.bg_image
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

  // Обработчики
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'title' && value.length > TITLE_MAX_LENGTH) return;
    if (name === 'description' && value.length > DESC_MAX_LENGTH) return;
    
    setEvent(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name in errors) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  const handleDateTimeChange = (field: 'start_at' | 'end_at', value: string) => {
    if (!value) return;
    
    const timestamp = new Date(value).toISOString();
    
    setEvent(prev => ({
      ...prev,
      [field]: timestamp
    }));
    
    setErrors(prev => ({
      ...prev,
      [field]: false
    }));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    if (checked) {
      setEvent(prev => ({
        ...prev,
        languages: [...prev.languages, value]
      }));
    } else {
      setEvent(prev => ({
        ...prev,
        languages: prev.languages.filter(lang => lang !== value)
      }));
    }
  };

  const handleSpeakerToggle = (speakerId: string) => {
    setEvent(prev => {
      const speakers = [...prev.speakers];
      
      if (speakers.includes(speakerId)) {
        return {
          ...prev,
          speakers: speakers.filter(id => id !== speakerId)
        };
      } else {
        return {
          ...prev,
          speakers: [...speakers, speakerId]
        };
      }
    });
  };

  const handleHideSpeakersGalleryChange = (hide: boolean) => {
    setEvent(prev => ({
      ...prev,
      hide_speakers_gallery: hide
    }));
  };

  const handleFestivalProgramChange = (program: FestivalProgramItem[]) => {
    setEvent(prev => ({
      ...prev,
      festival_program: program
    }));
  };

  const handlePhotoGalleryChange = (photos: string[]) => {
    setEvent(prev => ({
      ...prev,
      photo_gallery: Array.isArray(photos) ? photos : []
    }));
  };

  // src/pages/admin/CreateEditEventPage.tsx - Часть 3

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!event.title.trim()) newErrors.title = true;
    if (!event.description.trim()) newErrors.description = true;
    if (!event.start_at) newErrors.start_at = true;
    if (!event.end_at) newErrors.end_at = true;
    if (!event.location.trim()) newErrors.location = true;

    // Валидация полей оплаты
    if (event.status === 'active') {
      if (event.payment_type === 'cost') {
        if (!event.price || parseFloat(event.price) <= 0) {
          newErrors.price = true;
          toast.error('Для платных мероприятий необходимо указать цену');
        }
        
        // Проверяем настройки онлайн оплаты
        if (event.widget_chooser) {
          // Для виджета нужен ID события
          if (!event.oblakkarte_data_event_id?.trim()) {
            newErrors.oblakkarte_data_event_id = true;
            toast.error('Для виджета оплаты необходимо указать ID события Oblakkarte');
          }
        } else {
          // Для ссылки нужна ссылка на оплату
          if (!event.payment_link?.trim()) {
            newErrors.payment_link = true;
            toast.error('Для ссылки на оплату необходимо указать URL');
          }
        }
      }
    }

    // Валидация количества участников
    if (event.max_registrations && event.max_registrations < 1) {
      newErrors.max_registrations = true;
      toast.error('Количество участников должно быть больше 0');
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  // Загрузка файла изображения
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `events/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
      
      if (error) throw error;
      
      setEvent(prev => ({
        ...prev,
        bg_image: filePath,
        original_bg_image: prev.bg_image || null
      }));
      
      toast.success('Изображение успешно загружено');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Ошибка при загрузке файла');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Подготовка данных для отправки
  const prepareEventData = () => {
    const eventData = {
      ...event,
      price: event.price ? parseFloat(event.price) : null,
      couple_discount: event.couple_discount ? parseFloat(event.couple_discount) : null,
      photo_gallery: Array.isArray(event.photo_gallery) ? event.photo_gallery : [],
      
      // Настраиваем регистрации
      registrations: {
        max_regs: event.max_registrations || 40,
        current: 0,
        current_adults: 0,
        current_children: 0,
        reg_list: []
      },
      
      // Удаляем неиспользуемые поля
      payment_widget_id: undefined, // Устаревшее поле
      
      // Удаляем legacy поля
      date: undefined,
      start_time: undefined,
      end_time: undefined,
      original_bg_image: undefined
    };
    
    // Очищаем поля в зависимости от типа оплаты
    if (eventData.payment_type === 'free') {
      eventData.price = null;
      eventData.payment_link = null;
      eventData.oblakkarte_data_event_id = null;
      eventData.widget_chooser = false;
    } else if (eventData.payment_type === 'cost') {
      if (!eventData.widget_chooser) {
        // Для ссылки очищаем ID события
        eventData.oblakkarte_data_event_id = null;
      } else {
        // Для виджета очищаем ссылку
        eventData.payment_link = null;
      }
    }
    
    // Удаляем undefined значения
    Object.keys(eventData).forEach(key => {
      if (eventData[key] === undefined) {
        delete eventData[key];
      }
    });
    
    return eventData;
  };

  // src/pages/admin/CreateEditEventPage.tsx - Часть 4

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }
    
    try {
      setSaving(true);
      
      const eventData = prepareEventData();
      const isNew = !id;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            eventData,
            isNew
          })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        if (result.code === 'PG_NET_EXTENSION_MISSING') {
          console.warn('Database notification extension (pg_net) is not enabled. Notifications will not be sent.');
        } else {
          throw new Error(result.error || 'Error saving event');
        }
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

  // Удаление мероприятия
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
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error deleting event');
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

  // Отображение загрузки
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Основной JSX - начало
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {id ? 'Редактирование мероприятия' : 'Создание мероприятия'}
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {id && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
              Удалить
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>

      {/* Статус мероприятия */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary-600" />
          Статус мероприятия
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {statuses.map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setEvent(prev => ({ ...prev, status }))}
              className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                event.status === status
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-500'
              }`}
            >
              <div className="font-semibold text-lg mb-1">
                {status === 'active' ? '🟢 Активное' : 
                 status === 'draft' ? '📝 Черновик' : 
                 '⏹️ Прошедшее'}
              </div>
              <div className="text-sm opacity-75">
                {status === 'active' ? 'Видно пользователям' : 
                 status === 'draft' ? 'Скрыто от пользователей' : 
                 'Архивное событие'}
              </div>
            </button>
          ))}
        </div>
      </div>

  // src/pages/admin/CreateEditEventPage.tsx - Часть 5

      {/* Основная форма */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary-600" />
            Основная информация
          </h2>
          
          <div className="space-y-6">
            {/* Название */}
            <div className="form-group">
              <label htmlFor="title" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Название мероприятия <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={event.title}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.title 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                placeholder="Введите название мероприятия"
              />
              <p className="text-gray-500 text-sm text-right mt-2">
                {event.title.length}/{TITLE_MAX_LENGTH}
              </p>
            </div>
            
            {/* Описание */}
            <div className="form-group">
              <label htmlFor="description" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Полное описание <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={event.description}
                onChange={handleInputChange}
                rows={6}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.description 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 resize-vertical`}
                placeholder="Подробное описание мероприятия"
              />
              <p className="text-gray-500 text-sm text-right mt-2">
                {event.description.length}/{DESC_MAX_LENGTH}
              </p>
            </div>
            
            {/* Тип мероприятия и возрастная категория */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label htmlFor="event_type" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Тип мероприятия
                </label>
                <select
                  id="event_type"
                  name="event_type"
                  value={event.event_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                >
                  {eventTypes.map(type => (
                    <option key={type} value={type}>
                      {type === 'lecture' ? 'Лекция' :
                       type === 'workshop' ? 'Воркшоп' :
                       type === 'conference' ? 'Конференция' :
                       type === 'seminar' ? 'Семинар' :
                       type === 'meetup' ? 'Митап' :
                       type === 'webinar' ? 'Вебинар' :
                       type === 'training' ? 'Тренинг' :
                       type === 'course' ? 'Курс' :
                       type === 'festival' ? 'Фестиваль' :
                       type === 'exhibition' ? 'Выставка' :
                       type === 'discussion' ? 'Дискуссия' :
                       'Другое'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="age_category" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Возрастная категория
                </label>
                <select
                  id="age_category"
                  name="age_category"
                  value={event.age_category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                >
                  {ageCategories.map(category => (
                    <option key={category} value={category}>
                      {category === 'adult' ? 'Взрослые' :
                       category === 'children' ? 'Дети' :
                       category === 'family' ? 'Семейное' :
                       'Для всех'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Локация */}
            <div className="form-group">
              <label htmlFor="location" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Место проведения <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={event.location}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.location 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                placeholder="Адрес или название места"
              />
            </div>
            
            {/* Видео URL */}
            <div className="form-group">
              <label htmlFor="video_url" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Ссылка на видео (YouTube, Vimeo)
              </label>
              <input
                type="url"
                id="video_url"
                name="video_url"
                value={event.video_url}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
        </div>

        {/* Дата и время */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            Дата и время
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label htmlFor="start_at" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Начало мероприятия <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="start_at"
                value={formatDateTimeForInput(event.start_at)}
                onChange={(e) => handleDateTimeChange('start_at', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.start_at 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="end_at" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Окончание мероприятия <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="end_at"
                value={formatDateTimeForInput(event.end_at)}
                onChange={(e) => handleDateTimeChange('end_at', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.end_at 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
              />
            </div>
          </div>
        </div>

// src/pages/admin/CreateEditEventPage.tsx - Часть 6

        {/* Обложка мероприятия */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary-600" />
            Обложка мероприятия
          </h2>
          
          <div className="space-y-4">
            {event.bg_image && (
              <div className="relative inline-block">
                <img
                  src={getImageUrl(event.bg_image)}
                  alt="Обложка мероприятия"
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/400x200?text=Image+not+found';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setEvent(prev => ({ ...prev, bg_image: '' }))}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Upload className="h-5 w-5" />
                {isUploading ? 'Загрузка...' : 'Загрузить изображение'}
              </button>
              
              {isUploading && (
                <div className="flex-1 bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Языки */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary-600" />
            Языки проведения
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {availableLanguages.map(language => (
              <label
                key={language}
                className="flex items-center gap-2 p-3 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  value={language}
                  checked={event.languages.includes(language)}
                  onChange={handleLanguageChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium">{language}</span>
              </label>
            ))}
          </div>
        </div>

// src/pages/admin/CreateEditEventPage.tsx - Часть 6

        {/* Обложка мероприятия */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary-600" />
            Обложка мероприятия
          </h2>
          
          <div className="space-y-4">
            {event.bg_image && (
              <div className="relative inline-block">
                <img
                  src={getImageUrl(event.bg_image)}
                  alt="Обложка мероприятия"
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/400x200?text=Image+not+found';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setEvent(prev => ({ ...prev, bg_image: '' }))}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Upload className="h-5 w-5" />
                {isUploading ? 'Загрузка...' : 'Загрузить изображение'}
              </button>
              
              {isUploading && (
                <div className="flex-1 bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Языки */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary-600" />
            Языки проведения
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {availableLanguages.map(language => (
              <label
                key={language}
                className="flex items-center gap-2 p-3 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  value={language}
                  checked={event.languages.includes(language)}
                  onChange={handleLanguageChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium">{language}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Галерея фотографий */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary-600" />
            Галерея фотографий
          </h2>
          
          <div className="space-y-4">
            {Array.isArray(event.photo_gallery) && event.photo_gallery.map((photo, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-gray-300 dark:border-dark-600 rounded-lg">
                <input
                  type="url"
                  value={photo}
                  onChange={(e) => {
                    const newGallery = [...event.photo_gallery];
                    newGallery[index] = e.target.value;
                    setEvent(prev => ({
                      ...prev,
                      photo_gallery: newGallery
                    }));
                  }}
                  className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                  placeholder="URL фотографии"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newGallery = event.photo_gallery.filter((_, i) => i !== index);
                    setEvent(prev => ({
                      ...prev,
                      photo_gallery: newGallery
                    }));
                  }}
                  className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  title="Удалить фотографию"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => {
                setEvent(prev => ({
                  ...prev,
                  photo_gallery: [...(Array.isArray(prev.photo_gallery) ? prev.photo_gallery : []), '']
                }));
              }}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors w-full"
            >
              <Plus className="h-4 w-4" />
              Добавить фотографию
            </button>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Вставьте прямую ссылку на изображение (например, из облачного хранилища)
            </p>
            
            {Array.isArray(event.photo_gallery) && event.photo_gallery.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {event.photo_gallery
                  .filter(photo => typeof photo === 'string' && photo.trim() !== '')
                  .map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/150x100?text=Не+найдено';
                        }}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        
        // src/pages/admin/CreateEditEventPage.tsx - Часть 7

        {/* Информация об оплате */}
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary-600" />
            Информация об оплате
          </h2>
          
          <div className="space-y-6">
            {/* Тип оплаты */}
            <div className="form-group">
              <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">
                Тип оплаты
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {paymentTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEvent(prev => ({ ...prev, payment_type: type }))}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      event.payment_type === type
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-500'
                    }`}
                  >
                    <div className="font-semibold text-lg mb-1">
                      {type === 'cost' ? '💰 Платное' : 
                       type === 'free' ? '🆓 Бесплатное' : 
                       '💝 Донейшн'}
                    </div>
                    <div className="text-sm opacity-75">
                      {type === 'cost' ? 'Фиксированная цена' : 
                       type === 'free' ? 'Без оплаты' : 
                       'Добровольные взносы'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Цена и валюта для платных мероприятий */}
            {event.payment_type === 'cost' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label htmlFor="price" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Цена
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={event.price || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 pr-16 rounded-lg border transition-colors ${
                        errors.price 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                      } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-gray-500 font-medium">{event.currency}</span>
                    </div>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="currency" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Валюта
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={event.currency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                  >
                    <option value="RUB">RUB (₽)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* Настройки онлайн оплаты */}
            {event.payment_type !== 'free' && (
              <>
                <div className="form-group">
                  <label className="block font-medium mb-3 text-gray-700 dark:text-gray-300">
                    Онлайн оплата
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEvent(prev => ({ ...prev, widget_chooser: false }))}
                      className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                        !event.widget_chooser
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-500'
                      }`}
                    >
                      <div className="font-semibold text-lg mb-1">🔗 Ссылка</div>
                      <div className="text-sm opacity-75">Переход по ссылке</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setEvent(prev => ({ ...prev, widget_chooser: true }))}
                      className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                        event.widget_chooser
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-dark-500'
                      }`}
                    >
                      <div className="font-semibold text-lg mb-1">🛠️ Виджет</div>
                      <div className="text-sm opacity-75">Встроенная форма</div>
                    </button>
                  </div>
                </div>
                
                {!event.widget_chooser ? (
                  // Поле для ссылки на оплату
                  <div className="form-group">
                    <label htmlFor="payment_link" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Ссылка на оплату
                    </label>
                    <input
                      type="url"
                      id="payment_link"
                      name="payment_link"
                      value={event.payment_link || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                        errors.payment_link 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                      } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                      placeholder="https://..."
                    />
                  </div>
                ) : (
                  // Поле для ID события Oblakkarte
                  <div className="form-group">
                    <label htmlFor="oblakkarte_data_event_id" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                      ID события Oblakkarte
                    </label>
                    <input
                      type="text"
                      id="oblakkarte_data_event_id"
                      name="oblakkarte_data_event_id"
                      value={event.oblakkarte_data_event_id || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                        errors.oblakkarte_data_event_id 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                      } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                      placeholder="Например: DoYnhURt"
                    />
                    <p className="text-gray-500 text-sm mt-2">
                      ID события из панели Oblakkarte для интеграции виджета оплаты
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* Количество возможных регистраций */}
            <div className="form-group">
              <label htmlFor="max_registrations" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                Максимальное количество участников
              </label>
              <input
                type="number"
                id="max_registrations"
                name="max_registrations"
                value={event.max_registrations || 40}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                  errors.max_registrations 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 dark:border-dark-600 focus:border-primary-500'
                } bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800`}
                placeholder="40"
                min="1"
                step="1"
              />
              <p className="text-gray-500 text-sm mt-2">
                Максимальное количество участников для регистрации на мероприятие
              </p>
            </div>

            {/* Скидка для пар */}
            {event.payment_type === 'cost' && (
              <div className="form-group">
                <label htmlFor="couple_discount" className="block font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Скидка для пар ({event.currency})
                </label>
                <input
                  type="number"
                  id="couple_discount"
                  name="couple_discount"
                  value={event.couple_discount || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                  placeholder="0"
                  min="0"
                  step="50"
                />
              </div>
            )}
          </div>
        </div>

// src/pages/admin/CreateEditEventPage.tsx - Часть 8 (Финальная часть)

        {/* Секция спикеров */}
        <EventSpeakersSection
          selectedSpeakerIds={event.speakers}
          hideSpeakersGallery={event.hide_speakers_gallery}
          onSpeakerToggle={handleSpeakerToggle}
          onHideGalleryChange={handleHideSpeakersGalleryChange}
          allSpeakers={speakers}
        />
        
        {/* Секция программы фестиваля */}
        <EventFestivalProgramSection
          eventType={event.event_type}
          festivalProgram={event.festival_program}
          allSpeakers={speakers}
          onFestivalProgramChange={handleFestivalProgramChange}
        />
        
        {/* Кнопки действий */}
        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200 dark:border-dark-600">
          <button
            type="button"
            onClick={() => navigate('/admin/events')}
            className="px-6 py-3 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Сохранить
              </>
            )}
          </button>
        </div>
      </form>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Подтверждение удаления</h3>
            </div>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Вы уверены, что хотите удалить это мероприятие? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEditEventPage;
        