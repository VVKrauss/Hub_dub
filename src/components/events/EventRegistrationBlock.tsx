// src/components/events/EventRegistrationBlock.tsx
import { useState, useEffect } from 'react';
import { Mail, Phone, User, CreditCard, MapPin, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatRussianDate, formatTimeFromTimestamp } from '../../utils/dateTimeUtils';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../shared/ui/Button/Button';
import SimpleRegistrationService from '../../services/SimpleRegistrationService';

declare global {
  interface Window {
    OblakWidget?: {
      open: (options: { eventId: string; lang: string }) => void;
    };
  }
}

type EventRegistrationBlockProps = {
  event: {
    id: string;
    title: string;
    start_at: string;
    location: string;
    price: number;
    currency: string;
    simple_payment_type: 'free' | 'donation' | 'paid';
    online_payment_url?: string;
    online_payment_type?: 'link' | 'oblakkarte';
    max_registrations: number;
    current_registrations: number;
    registration_enabled: boolean;
    registration_deadline?: string;
  };
  onRegistrationSuccess?: () => void;
};

type RegistrationMethod = 'none' | 'site' | 'online';

const EventRegistrationBlock = ({ event, onRegistrationSuccess }: EventRegistrationBlockProps) => {
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<RegistrationMethod>('none');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    tickets: 1
  });

  // Загружаем скрипт Oblakkarte виджета если нужно
  useEffect(() => {
    if (event.online_payment_type === 'oblakkarte' && event.online_payment_url && 
        !document.querySelector('script[src="https://widget.oblakkarte.rs/widget.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://widget.oblakkarte.rs/widget.js';
      script.async = true;
      script.setAttribute('data-organizer-public-token', 'Yi0idjZg');
      document.head.appendChild(script);
    }
  }, [event.online_payment_type, event.online_payment_url]);

  // Заполняем форму данными пользователя
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || ''
      }));
    }
  }, [user]);

  const isFree = event.simple_payment_type === 'free';
  const isDonation = event.simple_payment_type === 'donation';
  const isPaid = event.simple_payment_type === 'paid';
  
  const hasOnlinePayment = event.online_payment_url;
  const canRegisterOnSite = event.registration_enabled;

  // Проверяем доступность мест
  const spotsLeft = event.max_registrations - event.current_registrations;
  const isFull = spotsLeft <= 0;

  // Проверяем дедлайн регистрации
  const isDeadlinePassed = event.registration_deadline ? 
    new Date() > new Date(event.registration_deadline) : false;

  const handleSiteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email) {
      toast.error('Заполните обязательные поля');
      return;
    }

    setLoading(true);

    try {
      // Проверяем, можно ли зарегистрироваться
      const canRegister = await SimpleRegistrationService.canUserRegister(
        event.id, 
        formData.email, 
        formData.tickets
      );

      if (!canRegister.canRegister) {
        toast.error(canRegister.reason || 'Невозможно зарегистрироваться');
        return;
      }

      // Создаем регистрацию
      const result = await SimpleRegistrationService.createRegistration({
        eventId: event.id,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        tickets: formData.tickets
      });

      if (!result.success) {
        toast.error(result.error || 'Ошибка при регистрации');
        return;
      }

      setRegistrationDetails(result.registration);
      setRegistrationSuccess(true);
      toast.success('Регистрация прошла успешно!');
      
      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }

    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Ошибка при регистрации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnlinePayment = () => {
    if (event.online_payment_type === 'oblakkarte' && event.online_payment_url && window.OblakWidget) {
      window.OblakWidget.open({
        eventId: event.online_payment_url,
        lang: 'ru'
      });
    } else if (event.online_payment_type === 'link' && event.online_payment_url) {
      window.open(event.online_payment_url, '_blank');
    } else {
      toast.error('Онлайн оплата недоступна');
    }
  };

  if (registrationSuccess && registrationDetails) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
            Регистрация успешна!
          </h3>
        </div>
        <div className="text-green-700 dark:text-green-300 space-y-2">
          <p><strong>Имя:</strong> {registrationDetails.full_name}</p>
          <p><strong>Email:</strong> {registrationDetails.email}</p>
          {registrationDetails.phone && <p><strong>Телефон:</strong> {registrationDetails.phone}</p>}
          <p><strong>Билетов:</strong> {registrationDetails.tickets}</p>
          <p><strong>QR-код:</strong> <code className="bg-green-100 dark:bg-green-800 px-2 py-1 rounded text-xs">{registrationDetails.qr_code}</code></p>
          {isPaid && (
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              <strong>К оплате на месте: {registrationDetails.total_amount} {event.currency}</strong>
              <p className="text-sm mt-1">Оплата производится при посещении мероприятия</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Мест нет
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            К сожалению, все места на это мероприятие заняты
          </p>
        </div>
      </div>
    );
  }

  if (isDeadlinePassed) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Регистрация закрыта
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Срок регистрации на это мероприятие истек
          </p>
        </div>
      </div>
    );
  }

  if (!event.registration_enabled) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Регистрация отключена
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Регистрация на это мероприятие временно недоступна
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Регистрация на мероприятие
        </h3>
        
        {/* Информация о мероприятии */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 space-y-2 text-sm">
          <p><strong>Дата:</strong> {formatRussianDate(event.start_at)}</p>
          <p><strong>Время:</strong> {formatTimeFromTimestamp(event.start_at)}</p>
          {event.location && <p><strong>Место:</strong> {event.location}</p>}
          <p><strong>Стоимость:</strong> {
            isFree ? 'Бесплатно' : 
            isDonation ? 'Донат' : 
            `${event.price} ${event.currency}`
          }</p>
          {spotsLeft > 0 && (
            <p><strong>Свободных мест:</strong> {spotsLeft} из {event.max_registrations}</p>
          )}
        </div>

        {/* Методы регистрации */}
        <div className="space-y-4">
          {/* Онлайн оплата */}
          {hasOnlinePayment && (isPaid || isDonation) && (
            <div className="border border-primary-200 dark:border-primary-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="h-5 w-5 text-primary-600" />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Оплата онлайн
                </h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Оплатите сейчас картой или электронным кошельком
              </p>
              <Button
                onClick={handleOnlinePayment}
                variant="primary"
                size="sm"
                leftIcon={<ExternalLink className="h-4 w-4" />}
              >
                Перейти к оплате
              </Button>
            </div>
          )}

          {/* Регистрация на сайте */}
          {canRegisterOnSite && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {isFree ? 'Регистрация' : isPaid ? 'Регистрация с оплатой на месте' : 'Регистрация с донатом'}
                </h4>
              </div>
              
              {selectedMethod !== 'site' ? (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {isFree ? 'Зарегистрируйтесь бесплатно' : 
                     isPaid ? 'Зарегистрируйтесь и оплатите при посещении' :
                     'Зарегистрируйтесь и поддержите донатом'}
                  </p>
                  <Button
                    onClick={() => setSelectedMethod('site')}
                    variant="outline"
                    size="sm"
                    leftIcon={<User className="h-4 w-4" />}
                  >
                    Заполнить форму
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSiteRegistration} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Полное имя *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Введите ваше имя"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Введите ваш email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Телефон
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="+381..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Количество билетов
                      </label>
                      <select
                        value={formData.tickets}
                        onChange={(e) => setFormData(prev => ({ ...prev, tickets: parseInt(e.target.value) }))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {Array.from({ length: Math.min(5, spotsLeft) }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isPaid && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>Итого к оплате на месте: {event.price * formData.tickets} {event.currency}</strong>
                          <p className="mt-1">Оплата производится при посещении мероприятия</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={loading}
                      leftIcon={<CheckCircle className="h-4 w-4" />}
                    >
                      {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedMethod('none')}
                    >
                      Отмена
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventRegistrationBlock;