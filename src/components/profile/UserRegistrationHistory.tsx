// src/components/profile/UserRegistrationHistory.tsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, Clock, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getSupabaseImageUrl } from '../../utils/imageUtils';

type RegistrationStatus = 'active' | 'cancelled' | 'pending';
type PaymentStatus = 'pending' | 'paid' | 'free';

type UserRegistration = {
  id: string;
  event_id: string;
  registration_id: string;
  full_name: string;
  email: string;
  adult_tickets: number;
  child_tickets: number;
  total_amount: number;
  status: RegistrationStatus;
  qr_code?: string;
  payment_status: PaymentStatus;
  registration_date: string;
  event?: {
    id: string;
    title: string;
    start_at?: string;
    end_at?: string;
    location?: string;
    bg_image?: string;
    event_type?: string;
    price?: number;
    currency?: string;
  };
};

type UserRegistrationHistoryProps = {
  userId: string;
};

const UserRegistrationHistory = ({ userId }: UserRegistrationHistoryProps) => {
  const [registrations, setRegistrations] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');

  useEffect(() => {
    fetchRegistrations();
  }, [userId]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_event_registrations')
        .select(`
          *,
          events (
            id,
            title,
            start_at,
            end_at,
            location,
            bg_image,
            event_type,
            price,
            currency
          )
        `)
        .eq('user_id', userId)
        .order('registration_date', { ascending: false });

      if (error) throw error;

      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Ошибка загрузки истории регистраций');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: RegistrationStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: RegistrationStatus) => {
    switch (status) {
      case 'active':
        return 'Активна';
      case 'cancelled':
        return 'Отменена';
      case 'pending':
        return 'Ожидает';
      default:
        return 'Неизвестно';
    }
  };

  const getPaymentStatusIcon = (paymentStatus: PaymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'free':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPaymentStatusText = (paymentStatus: PaymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return 'Оплачено';
      case 'free':
        return 'Бесплатно';
      case 'pending':
        return 'Ожидает оплаты';
      default:
        return 'Неизвестно';
    }
  };

  const isEventPast = (eventDate?: string) => {
    if (!eventDate) return false;
    return new Date(eventDate) < new Date();
  };

  const filteredRegistrations = registrations.filter(registration => {
    switch (filter) {
      case 'upcoming':
        return registration.status === 'active' && !isEventPast(registration.event?.start_at);
      case 'past':
        return registration.status === 'active' && isEventPast(registration.event?.start_at);
      case 'cancelled':
        return registration.status === 'cancelled';
      default:
        return true;
    }
  });

  const totalTickets = (reg: UserRegistration) => reg.adult_tickets + reg.child_tickets;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Все', count: registrations.length },
          { key: 'upcoming', label: 'Предстоящие', count: registrations.filter(r => r.status === 'active' && !isEventPast(r.event?.start_at)).length },
          { key: 'past', label: 'Прошедшие', count: registrations.filter(r => r.status === 'active' && isEventPast(r.event?.start_at)).length },
          { key: 'cancelled', label: 'Отмененные', count: registrations.filter(r => r.status === 'cancelled').length }
        ].map(filterOption => (
          <button
            key={filterOption.key}
            onClick={() => setFilter(filterOption.key as any)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === filterOption.key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }`}
          >
            {filterOption.label} ({filterOption.count})
          </button>
        ))}
      </div>

      {/* Список регистраций */}
      {filteredRegistrations.length > 0 ? (
        <div className="space-y-4">
          {filteredRegistrations.map((registration) => (
            <div
              key={registration.id}
              className="bg-white dark:bg-dark-800 rounded-lg shadow-md border border-gray-200 dark:border-dark-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row">
                {/* Изображение мероприятия */}
                {registration.event?.bg_image && (
                  <div className="md:w-32 h-32 md:h-auto bg-gray-200 dark:bg-dark-700 flex-shrink-0">
                    <img
                      src={getSupabaseImageUrl(registration.event.bg_image)}
                      alt={registration.event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Содержимое */}
                <div className="flex-1 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        <Link
                          to={`/events/${registration.event_id}`}
                          className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {registration.event?.title || 'Мероприятие'}
                          <ExternalLink className="h-4 w-4 inline ml-1" />
                        </Link>
                      </h3>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {registration.event?.start_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(registration.event.start_at).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                        
                        {registration.event?.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {registration.event.location}
                          </div>
                        )}

                        {registration.event?.event_type && (
                          <span className="inline-block bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                            {registration.event.event_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Статусы */}
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(registration.status)}
                        <span className="text-sm">{getStatusText(registration.status)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {getPaymentStatusIcon(registration.payment_status)}
                        <span className="text-sm">{getPaymentStatusText(registration.payment_status)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Детали регистрации */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-gray-200 dark:border-dark-700">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {totalTickets(registration)} билет{totalTickets(registration) === 1 ? '' : totalTickets(registration) < 5 ? 'а' : 'ов'}
                      </span>
                    </div>

                    {registration.total_amount > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {registration.total_amount} {registration.event?.currency || 'RUB'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {new Date(registration.registration_date).toLocaleDateString('ru-RU')}
                      </span>
                    </div>

                    {registration.qr_code && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-600 dark:text-green-400">
                          QR-код: есть
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Детали билетов */}
                  {(registration.adult_tickets > 0 || registration.child_tickets > 0) && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {registration.adult_tickets > 0 && (
                        <span>Взрослых: {registration.adult_tickets}</span>
                      )}
                      {registration.adult_tickets > 0 && registration.child_tickets > 0 && <span> • </span>}
                      {registration.child_tickets > 0 && (
                        <span>Детей: {registration.child_tickets}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">
            {filter === 'all' ? 'Нет регистраций' : 
             filter === 'upcoming' ? 'Нет предстоящих мероприятий' :
             filter === 'past' ? 'Нет прошедших мероприятий' :
             'Нет отмененных регистраций'}
          </h3>
          <p className="text-sm">
            {filter === 'all' 
              ? 'Вы пока не регистрировались ни на одно мероприятие'
              : 'В этой категории пока нет регистраций'
            }
          </p>
          {filter === 'all' && (
            <Link
              to="/events"
              className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Посмотреть мероприятия
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default UserRegistrationHistory;