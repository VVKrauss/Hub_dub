// src/pages/EventDetailsPage.tsx - Обновленная верс// src/pages/EventDetailsPage.tsx - Обновленная версия с новым API
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Calendar, Clock, MapPin, Users, Globe, Share2, ArrowLeft } from 'lucide-react';
import Layout from '../components/layout/Layout';
import EventRegistrationBlock from '../components/events/EventRegistrationBlock';
import SimpleRegistrationService from '../services/SimpleRegistrationService';
import { toast } from 'react-hot-toast';
import { 
  formatRussianDate, 
  formatTimeFromTimestamp, 
  isPastEvent 
} from '../utils/dateTimeUtils';
import MigrationUtility from '../utils/migrationUtility';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Speaker {
  id: string;
  name: string;
  field_of_expertise: string;
  description: string;
  photos: { url: string; isMain?: boolean }[];
}

interface Event { 
  id: string;
  title: string;
  description: string;
  event_type: string;
  bg_image: string;
  start_at: string;
  end_at: string;
  location?: string;
  age_category: string;
  price: number | null;
  currency?: string;
  status: string;
  
  // Новые упрощенные поля из миграции
  simple_payment_type?: 'free' | 'donation' | 'paid';
  online_payment_url?: string;
  online_payment_type?: 'link' | 'oblakkarte';
  max_registrations?: number;
  current_registrations?: number;
  registration_enabled?: boolean;
  registration_deadline?: string;
  
  // Старые поля для обратной совместимости
  payment_type?: string;
  payment_link?: string;
  oblakkarte_data_event_id?: string;
  registrations?: any;
  
  languages: string[];
  speakers: string[];
  video_url?: string;
  photo_gallery?: string[] | string;
}

// Helper function to safely parse photo gallery
const parsePhotoGallery = (photoGallery: string[] | string | null | undefined): string[] => {
  if (!photoGallery) {
    return [];
  }
  
  if (Array.isArray(photoGallery)) {
    return photoGallery;
  }
  
  if (typeof photoGallery === 'string') {
    try {
      const parsed = JSON.parse(photoGallery);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing photo_gallery JSON:', e);
      return [];
    }
  }
  
  return [];
};

const renderDescriptionWithLinks = (description: string) => {
  if (!description) {
    return <p className="text-gray-500 dark:text-gray-400">Описание отсутствует</p>;
  }

  const parts = [];
  let lastIndex = 0;
  let match;
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1(?:[^>]*?)>(.*?)<\/a>/gi;

  while ((match = linkRegex.exec(description)) !== null) {
    if (match.index > lastIndex) {
      parts.push(description.slice(lastIndex, match.index));
    }
    
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline"
      >
        {match[3]}
      </a>
    );
    
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < description.length) {
    parts.push(description.slice(lastIndex));
  }

  return <div className="whitespace-pre-line">{parts.length > 0 ? parts : description}</div>;
};

const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventData(id);
    }
  }, [id]);

  const fetchEventData = async (eventId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Пытаемся получить событие с новыми полями через представление
      let eventData: Event | null = null;
      
      try {
        const simpleEvent = await SimpleRegistrationService.getEventWithRegistrations(eventId);
        if (simpleEvent) {
          // Получаем остальные данные события
          const { data: fullEventData, error: fullEventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

          if (fullEventError) throw fullEventError;

          // Объединяем данные
          eventData = {
            ...fullEventData,
            simple_payment_type: simpleEvent.simple_payment_type,
            online_payment_url: simpleEvent.online_payment_url,
            online_payment_type: simpleEvent.online_payment_type,
            max_registrations: simpleEvent.max_registrations,
            current_registrations: simpleEvent.current_registrations,
            registration_enabled: simpleEvent.registration_enabled,
            registration_deadline: simpleEvent.registration_deadline
          };
        }
      } catch (simpleError) {
        console.log('Новая система недоступна, используем старую:', simpleError);
      }

      // Fallback на старую систему если новая недоступна
      if (!eventData) {
        const { data: oldEventData, error: oldEventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (oldEventError) throw oldEventError;
        eventData = oldEventData;
      }

      if (!eventData) throw new Error('Мероприятие не найдено');

      setEvent(eventData);

      if (eventData.speakers?.length) {
        const { data: speakersData, error: speakersError } = await supabase
          .from('speakers')
          .select('*')
          .in('id', eventData.speakers);

        if (speakersError) throw speakersError;
        setSpeakers(speakersData || []);
      }
    } catch (err) {
      console.error('Error fetching event data:', err);
      setError('Не удалось загрузить мероприятие');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const eventDate = event?.start_at ? formatRussianDate(event.start_at) : '';
    const text = `${event?.title} - ${eventDate}`;

    switch (platform) {
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
        break;
      case 'vk':
        window.open(`https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`);
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Ссылка скопирована');
        } catch (err) {
          toast.error('Не удалось скопировать ссылку');
        }
        break;
    }

    setShowShareMenu(false);
  };

  const handleRegistrationSuccess = () => {
    // Обновляем данные события после успешной регистрации
    if (id) {
      fetchEventData(id);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Загрузка мероприятия...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error || 'Мероприятие не найдено'}
            </h1>
            <Link 
              to="/events" 
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              ← Вернуться к мероприятиям
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Проверяем является ли событие прошедшим
  const isEventPast = event?.end_at ? isPastEvent(event.end_at) : false;
  const photoGallery = parsePhotoGallery(event.photo_gallery);

  // Подготавливаем данные для компонента регистрации
  const registrationEventData = {
    id: event.id,
    title: event.title,
    start_at: event.start_at,
    location: event.location || '',
    price: event.price || 0,
    currency: event.currency || 'RSD',
    
    // Используем новые поля если есть, иначе конвертируем старые
    simple_payment_type: event.simple_payment_type || 
      (event.payment_type === 'free' ? 'free' as const : 
       event.payment_type === 'donation' ? 'donation' as const : 'paid' as const),
       
    online_payment_url: event.online_payment_url || 
      event.oblakkarte_data_event_id || 
      event.payment_link,
      
    online_payment_type: event.online_payment_type || 
      (event.oblakkarte_data_event_id ? 'oblakkarte' as const : 
       event.payment_link ? 'link' as const : undefined),
       
    max_registrations: event.max_registrations || 
      event.registrations?.max_regs || 50,
      
    current_registrations: event.current_registrations || 
      event.registrations?.current || 0,
      
    registration_enabled: event.registration_enabled !== false,
    registration_deadline: event.registration_deadline
  };

  return (
    <Layout>
      <main className="min-h-screen">
        <div className="relative">
          {/* Hero секция с изображением */}
          {event.bg_image && (
            <div className="relative h-64 md:h-96 overflow-hidden">
              <img
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${event.bg_image}`}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              
              {/* Навигация */}
              <div className="absolute top-4 left-4">
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  К мероприятиям
                </Link>
              </div>

              {/* Заголовок */}
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  {event.title}
                </h1>
                <div className="flex flex-wrap gap-4 text-white text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatRussianDate(event.start_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTimeFromTimestamp(event.start_at)}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Основной контент */}
          <div className="container py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Левая колонка - основная информация */}
              <div className="lg:col-span-2 space-y-8">
                {/* Описание */}
                <div className="card p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    О мероприятии
                  </h2>
                  <div className="prose dark:prose-invert max-w-none">
                    {renderDescriptionWithLinks(event.description)}
                  </div>
                </div>

                {/* Спикеры */}
                {speakers.length > 0 && (
                  <div className="card p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Спикеры
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {speakers.map((speaker) => {
                        const mainPhoto = speaker.photos?.find(p => p.isMain) || speaker.photos?.[0];
                        return (
                          <Link
                            key={speaker.id}
                            to={`/speakers/${speaker.id}`}
                            className="group block"
                          >
                            <div className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                              {mainPhoto && (
                                <img
                                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${mainPhoto.url}`}
                                  alt={speaker.name}
                                  className="w-16 h-16 object-cover rounded-full flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                  {speaker.name}
                                </h3>
                                <p className="text-sm text-primary-600 dark:text-primary-400 mb-2">
                                  {speaker.field_of_expertise}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                  {speaker.description}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Фотогалерея */}
                {photoGallery.length > 0 && (
                  <div className="card p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Фотогалерея
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photoGallery.slice(0, 8).map((photo, index) => (
                        <div key={index} className="aspect-square overflow-hidden rounded-lg">
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${photo}`}
                            alt={`Фото ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => window.open(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${photo}`, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                    {photoGallery.length > 8 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                        И еще {photoGallery.length - 8} фото...
                      </p>
                    )}
                  </div>
                )}

                {/* Видео */}
                {event.video_url && (
                  <div className="card p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Видео
                    </h2>
                    <div className="aspect-video rounded-lg overflow-hidden">
                      {event.video_url.includes('youtube.com') || event.video_url.includes('youtu.be') ? (
                        <iframe
                          src={event.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                          title="Видео мероприятия"
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={event.video_url}
                          controls
                          className="w-full h-full"
                        >
                          Ваш браузер не поддерживает видео.
                        </video>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Правая колонка - информация и регистрация */}
              <div className="space-y-6">
                {/* Информация о мероприятии */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Детали мероприятия
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{formatRussianDate(event.start_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{formatTimeFromTimestamp(event.start_at)}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{event.age_category}</span>
                    </div>
                    {event.languages?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <span>{event.languages.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Поделиться */}
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="relative">
                      <button
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <Share2 className="h-4 w-4" />
                        Поделиться
                      </button>
                      
                      {showShareMenu && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => handleShare('telegram')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg"
                          >
                            Telegram
                          </button>
                          <button
                            onClick={() => handleShare('vk')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            VKontakte
                          </button>
                          <button
                            onClick={() => handleShare('copy')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 last:rounded-b-lg"
                          >
                            Копировать ссылку
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Блок регистрации */}
                {!isEventPast && (
                  <EventRegistrationBlock
                    event={registrationEventData}
                    onRegistrationSuccess={handleRegistrationSuccess}
                  />
                )}

                {/* Информация о прошедшем событии */}
                {isEventPast && (
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                    <div className="text-center">
                      <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Мероприятие завершено
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Это мероприятие уже прошло. Следите за нашими новыми событиями!
                      </p>
                      <Link
                        to="/events"
                        className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                      >
                        Смотреть другие мероприятия
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default EventDetailsPage;