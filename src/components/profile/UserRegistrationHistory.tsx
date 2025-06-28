// src/components/profile/UserRegistrationHistory.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, ExternalLink, QrCode, CreditCard, Users, Filter, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getSupabaseImageUrl } from '../../utils/imageUtils';
import UserRegistrationQR from './UserRegistrationQR';

interface RegistrationData {
  id: string;
  event_id: string;
  registration_id: string;
  full_name: string;
  email: string;
  adult_tickets: number;
  child_tickets: number;
  total_amount: number;
  payment_status: string;
  status: string;
  registration_date: string;
  event?: {
    id: string;
    title: string;
    start_at?: string;
    location?: string;
    event_type?: string;
    bg_image?: string;
  };
}

interface UserRegistrationHistoryProps {
  userId: string;
}

const UserRegistrationHistory: React.FC<UserRegistrationHistoryProps> = ({ userId }) => {
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'past'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'free'>('all');
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationData | null>(null);
  const [showQR, setShowQR] = useState(false);

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
          event:events(
            id,
            title,
            start_at,
            end_at,
            location,
            event_type,
            bg_image,
            status
          )
        `)
        .eq('user_id', userId)
        .order('registration_date', { ascending: false });

      if (error) throw error;

      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRegistrationStatus = (registration: RegistrationData) => {
    if (registration.status === 'cancelled') return 'cancelled';
    if (!registration.event?.start_at) return 'active';
    
    const eventDate = new Date(registration.event.start_at);
    const now = new Date();
    
    if (eventDate < now) return 'past';
    return 'active';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'past':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активная';
      case 'past':
        return 'Прошедшее';
      case 'cancelled':
        return 'Отменена';
      default:
        return 'Неизвестно';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400';
      case 'free':
        return 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Оплачено';
      case 'pending':
        return 'Ожидает оплаты';
      case 'free':
        return 'Бесплатно';
      default:
        return 'Неизвестно';
    }
  };

  const filteredRegistrations = registrations.filter(registration => {
    const matchesSearch = registration.event?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.event?.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const registrationStatus = getRegistrationStatus(registration);
    const matchesStatusFilter = statusFilter === 'all' || registrationStatus === statusFilter;
    
    const matchesPaymentFilter = paymentFilter === 'all' || registration.payment_status === paymentFilter;
    
    return matchesSearch && matchesStatusFilter && matchesPaymentFilter;
  });

  const openQRModal = (registration: RegistrationData) => {
    setSelectedRegistration(registration);
    setShowQR(true);
  };

  const closeQRModal = () => {
    setSelectedRegistration(null);
    setShowQR(false);
  };

  // Статистика
  const stats = {
    total: registrations.length,
    active: registrations.filter(r => getRegistrationStatus(r) === 'active').length,
    past: registrations.filter(r => getRegistrationStatus(r) === 'past').length,
    cancelled: registrations.filter(r => getRegistrationStatus(r) === 'cancelled').length,
    paid: registrations.filter(r => r.payment_status === 'paid').length,
    pending: registrations.filter(r => r.payment_status === 'pending').length,
    free: registrations.filter(r => r.payment_status === 'free').length,
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-dark-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-dark-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Мои регистрации
            </h3>
            <p className="text-primary-100 text-sm mt-1">
              История регистраций на мероприятия
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-primary-100 text-xs">всего регистраций</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.active}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Активные</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-600 dark:text-gray-400">{stats.past}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Прошедшие</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.paid}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Оплачено</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-warning-600 dark:text-warning-400">{stats.pending}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">К оплате</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-600">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Поиск по названию или месту..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="past">Прошедшие</option>
            <option value="cancelled">Отмененные</option>
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Все оплаты</option>
            <option value="paid">Оплачено</option>
            <option value="pending">Ожидает оплаты</option>
            <option value="free">Бесплатно</option>
          </select>
        </div>
      </div>

      {/* Registrations List */}
      <div className="p-4">
        {filteredRegistrations.length > 0 ? (
          filteredRegistrations.map((registration) => {
            const status = getRegistrationStatus(registration);
            
            return (
              <div
                key={registration.id}
                className="border border-gray-200 dark:border-dark-600 rounded-lg p-4 mb-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Event Image and Title */}
                    <div className="flex items-start gap-4">
                      {registration.event?.bg_image && (
                        <img
                          src={getSupabaseImageUrl(registration.event.bg_image)}
                          alt={registration.event.title}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <Link
                            to={`/events/${registration.event_id}`}
                            className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2"
                          >
                            {registration.event?.title}
                            <ExternalLink className="h-4 w-4 opacity-60" />
                          </Link>
                        </div>

                        {/* Event Details */}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {registration.event?.start_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(registration.event.start_at).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                          
                          {registration.event?.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{registration.event.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Ticket Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>
                              {registration.adult_tickets > 0 && `${registration.adult_tickets} взрослых`}
                              {registration.child_tickets > 0 && `, ${registration.child_tickets} детских`}
                            </span>
                          </div>
                          
                          {registration.total_amount > 0 && (
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-4 w-4" />
                              <span>{registration.total_amount} RSD</span>
                            </div>
                          )}
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                            {getStatusText(status)}
                          </span>
                          
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(registration.payment_status)}`}>
                            {getPaymentStatusText(registration.payment_status)}
                          </span>
                          
                          {registration.event?.event_type && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              {registration.event.event_type}
                            </span>
                          )}
                        </div>

                        {/* Registration Details */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <span>ID регистрации: {registration.registration_id}</span>
                          <span className="mx-2">•</span>
                          <span>Зарегистрирован: {new Date(registration.registration_date).toLocaleDateString('ru-RU')}</span>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {registration.full_name} • {registration.email}
                          </div>
                          
                          <button
                            onClick={() => openQRModal(registration)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <QrCode className="h-4 w-4" />
                            Показать QR-код
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Нет регистраций
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' || paymentFilter !== 'all'
                ? 'Попробуйте изменить фильтры поиска'
                : 'Вы еще не зарегистрировались ни на одно мероприятие'
              }
            </p>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {selectedRegistration && (
        <UserRegistrationQR
          registration={selectedRegistration}
          isOpen={showQR}
          onClose={closeQRModal}
        />
      )}
    </div>
  );
};

export default UserRegistrationHistory;