import { useState, useEffect } from 'react';
import { Mail, Phone, User, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatRussianDate, formatTimeFromTimestamp } from '../../utils/dateTimeUtils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { syncUserRegistration } from '../../utils/registrationSync';
import { Modal } from '../../shared/ui/Modal/Modal';
import { Button } from '../../shared/ui/Button/Button';
import { EventRegistrations } from '../../pages/admin/constants';

// Типы для виджета Oblakkarte
declare global {
  interface Window {
    OblakWidget?: {
      open: (options: { eventId: string; lang: string }) => void;
    };
  }
}

// Обновленный тип пропсов для RegistrationModal
type RegistrationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    start_at: string;
    location: string;
    price: number;
    currency: string;
    payment_type: string;
    payment_link?: string;
    payment_widget_id?: string;
    widget_chooser?: boolean;
    oblakkarte_data_event_id?: string;
    couple_discount?: number;
    child_half_price?: boolean;
    age_category: string;
    registrations?: EventRegistrations;
  };
  onRegistrationSuccess?: () => void;
};

type RegistrationDetails = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  adultTickets: number;
  childTickets: number;
  total: number;
};

const RegistrationModal = ({ isOpen, onClose, event, onRegistrationSuccess }: RegistrationModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<RegistrationDetails | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    adultTickets: 1,
    childTickets: 0,
    additionalInfo: ''
  });

  const isAdultsOnly = event.age_category === '18+';
  const isFreeOrDonation = event.payment_type === 'free' || event.payment_type === 'donation';

  useEffect(() => {
    if (user && isOpen) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        fullName: user.user_metadata?.full_name || ''
      }));
    }
  }, [user, isOpen]);

  const resetForm = () => {
    setFormData({
      fullName: user?.user_metadata?.full_name || '',
      email: user?.email || '',
      phone: '',
      adultTickets: 1,
      childTickets: 0,
      additionalInfo: ''
    });
    setRegistrationSuccess(false);
    setRegistrationDetails(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const calculatePrice = () => {
    if (isFreeOrDonation) return 0;
    
    const adultPrice = event.price || 0;
    const childPrice = event.child_half_price ? adultPrice / 2 : adultPrice;
    
    let total = formData.adultTickets * adultPrice;
    if (!isAdultsOnly) {
      total += formData.childTickets * childPrice;
    }

    // Применяем скидку для пар
    if (event.couple_discount && formData.adultTickets >= 2) {
      const discountAmount = (event.couple_discount / 100) * total;
      total -= discountAmount;
    }

    return Math.max(0, total);
  };

  const calculateTotal = () => {
    return calculatePrice().toFixed(2);
  };

  const getPriceDetails = () => {
    if (isFreeOrDonation) return [];

    const details = [];
    const adultPrice = event.price || 0;
    const childPrice = event.child_half_price ? adultPrice / 2 : adultPrice;

    if (formData.adultTickets > 0) {
      details.push(
        <div key="adult" className="flex justify-between">
          <span>Взрослые билеты ({formData.adultTickets}x):</span>
          <span>{(formData.adultTickets * adultPrice).toFixed(2)} {event.currency}</span>
        </div>
      );
    }

    if (!isAdultsOnly && formData.childTickets > 0) {
      details.push(
        <div key="child" className="flex justify-between">
          <span>Детские билеты ({formData.childTickets}x):</span>
          <span>{(formData.childTickets * childPrice).toFixed(2)} {event.currency}</span>
        </div>
      );
    }

    if (event.couple_discount && formData.adultTickets >= 2) {
      const subtotal = formData.adultTickets * adultPrice + (isAdultsOnly ? 0 : formData.childTickets * childPrice);
      const discountAmount = (event.couple_discount / 100) * subtotal;
      details.push(
        <div key="discount" className="flex justify-between text-green-600">
          <span>Скидка для пар ({event.couple_discount}%):</span>
          <span>-{discountAmount.toFixed(2)} {event.currency}</span>
        </div>
      );
    }

    return details;
  };

  const handlePaymentRedirect = () => {
    if (event.widget_chooser && event.oblakkarte_data_event_id) {
      if (window.OblakWidget) {
        window.OblakWidget.open({
          eventId: event.oblakkarte_data_event_id,
          lang: 'ru'
        });
      } else {
        console.error('Виджет Oblakkarte не загружен');
        toast.error('Ошибка при загрузке виджета оплаты');
      }
    } else if (event.payment_link) {
      window.open(event.payment_link, '_blank');
    } else {
      toast.error('Способ оплаты не настроен');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email) {
      toast.error('Заполните обязательные поля');
      return;
    }

    if (formData.adultTickets <= 0 && (isAdultsOnly || formData.childTickets <= 0)) {
      toast.error('Выберите количество билетов');
      return;
    }

    try {
      setLoading(true);

      const total = calculatePrice();
      
      const registrationData = {
        event_id: event.id,
        user_id: user?.id || null,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        adult_tickets: formData.adultTickets,
        child_tickets: isAdultsOnly ? 0 : formData.childTickets,
        total_amount: total,
        currency: event.currency || 'RUB',
        payment_status: isFreeOrDonation ? 'completed' : 'pending',
        additional_info: formData.additionalInfo,
        status: true
      };

      const { data, error } = await supabase
        .from('user_event_registrations')
        .insert([registrationData])
        .select()
        .single();

      if (error) throw error;

      // Синхронизация с пользователем если авторизован
      if (user?.id) {
        await syncUserRegistration(user.id, event.id, {
          adult_tickets: formData.adultTickets,
          child_tickets: isAdultsOnly ? 0 : formData.childTickets,
          total_amount: total
        });
      }

      // Вызываем callback если есть
      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }

      setRegistrationDetails({
        id: data.id,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        adultTickets: formData.adultTickets,
        childTickets: isAdultsOnly ? 0 : formData.childTickets,
        total: total
      });

      setRegistrationSuccess(true);
      toast.success('Регистрация прошла успешно!');

      // Обработка оплаты после успешной регистрации
      if (event.payment_type === 'cost') {
        // Небольшая задержка чтобы пользователь увидел сообщение об успехе
        setTimeout(() => {
          handlePaymentRedirect();
        }, 1000);
      }

    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Ошибка при регистрации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={registrationSuccess ? "Регистрация завершена!" : `Регистрация на "${event.title}"`}
      size="lg"
      closeOnOverlayClick={!loading}
      closeOnEsc={!loading}
    >
      {registrationSuccess && registrationDetails ? (
        <>
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Регистрация завершена!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Ваша регистрация на мероприятие "{event.title}" прошла успешно
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium mb-3">Детали регистрации:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>ID регистрации:</span>
                  <span className="font-mono">{registrationDetails.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Имя:</span>
                  <span>{registrationDetails.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span>{registrationDetails.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Билетов (взрослые):</span>
                  <span>{registrationDetails.adultTickets}</span>
                </div>
                {!isAdultsOnly && registrationDetails.childTickets > 0 && (
                  <div className="flex justify-between">
                    <span>Билетов (дети):</span>
                    <span>{registrationDetails.childTickets}</span>
                  </div>
                )}
                {!isFreeOrDonation && (
                  <div className="flex justify-between font-medium">
                    <span>Итого:</span>
                    <span>{registrationDetails.total} {event.currency}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Кнопки для оплаты или закрытия */}
            <div className="space-y-3">
              {event.payment_type === 'cost' && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handlePaymentRedirect}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {event.widget_chooser ? 'Открыть виджет оплаты' : 'Перейти к оплате'}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={onClose}
              >
                {event.payment_type === 'cost' ? 'Оплатить позже' : 'Закрыть'}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Информация о мероприятии */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-medium mb-2">Информация о мероприятии:</h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><strong>Дата:</strong> {formatRussianDate(event.start_at)}</p>
              <p><strong>Время:</strong> {formatTimeFromTimestamp(event.start_at)}</p>
              {event.location && <p><strong>Место:</strong> {event.location}</p>}
              <p><strong>Стоимость:</strong> {isFreeOrDonation ? 'Бесплатно' : `${event.price} ${event.currency}`}</p>
              {event.age_category && <p><strong>Возрастные ограничения:</strong> {event.age_category}</p>}
            </div>
          </div>

          {/* Форма регистрации */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Личные данные */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <User className="inline w-4 h-4 mr-1" />
                  Полное имя *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="form-input"
                  placeholder="Введите ваше полное имя"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="form-input"
                  placeholder="Введите ваш email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Phone className="inline w-4 h-4 mr-1" />
                  Телефон
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="form-input"
                  placeholder="Введите ваш номер телефона"
                />
              </div>
            </div>

            {/* Выбор количества билетов */}
            <div className="space-y-4">
              <h4 className="font-medium">Количество билетов:</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Взрослые билеты
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.adultTickets}
                  onChange={(e) => setFormData(prev => ({ ...prev, adultTickets: parseInt(e.target.value) || 1 }))}
                  className="form-input"
                />
              </div>

              {!isAdultsOnly && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Детские билеты {event.child_half_price && '(50% скидка)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.childTickets}
                    onChange={(e) => setFormData(prev => ({ ...prev, childTickets: parseInt(e.target.value) || 0 }))}
                    className="form-input"
                  />
                </div>
              )}
            </div>

            {/* Дополнительная информация */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Дополнительная информация
              </label>
              <textarea
                value={formData.additionalInfo}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                className="form-textarea"
                rows={3}
                placeholder="Укажите особые пожелания или дополнительную информацию"
              />
            </div>

            {/* Расчет стоимости */}
            {!isFreeOrDonation && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2">Расчет стоимости:</h4>
                <div className="space-y-1 text-sm">
                  {getPriceDetails()}
                  <div className="border-t pt-2 font-medium">
                    <div className="flex justify-between">
                      <span>Итого:</span>
                      <span>{calculateTotal()} {event.currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                fullWidth
                disabled={loading}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
              >
                {loading ? 'Регистрация...' : 'Подтвердить регистрацию'}
              </Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
};

export default RegistrationModal;