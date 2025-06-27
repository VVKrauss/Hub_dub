import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatRussianDate, formatTimeFromTimestamp } from '../../utils/dateTimeUtils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { syncUserRegistration } from '../../utils/registrationSync';
import Modal from '../ui/Modal';
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
    oblakkarte_data_event_id?: string; // Добавляем поле для ID события Oblakkarte
    couple_discount?: number;
    child_half_price?: boolean;
    age_category: string; // Используем возрастную категорию вместо adults_only
    registrations?: EventRegistrations;
  };
};

// Внутри компонента RegistrationModal добавляем функцию для проверки
const RegistrationModal = ({ isOpen, onClose, event }: RegistrationModalProps) => {
  const { user: currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    comment: '',
    adultTickets: 1,
    childTickets: 0,
  });
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<{
    id: string;
    fullName: string;
    email: string;
    adultTickets: number;
    childTickets: number;
    total: number;
  } | null>(null);

  // Заполняем данные пользователя при открытии модального окна
  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || currentUser.name || '',
        contact: prev.contact || currentUser.email || ''
      }));
    }
  }, [isOpen, currentUser]);

  // Загружаем скрипт виджета Oblakkarte при открытии модального окна
  useEffect(() => {
    if (isOpen && event.widget_chooser && event.oblakkarte_data_event_id) {
      // Проверяем, не загружен ли уже скрипт
      if (document.querySelector('script[src="https://widget.oblakkarte.rs/widget.js"]')) {
        return;
      }

      // Создаем и загружаем скрипт виджета
      const script = document.createElement('script');
      script.src = 'https://widget.oblakkarte.rs/widget.js';
      script.async = true;
      script.setAttribute('data-organizer-public-token', 'Yi0idjZg');
      
      document.head.appendChild(script);
    }
  }, [isOpen, event.widget_chooser, event.oblakkarte_data_event_id]);

  const isFreeOrDonation = event.payment_type === 'free' || event.payment_type === 'donation';
  
  // Функция для определения, только ли для взрослых мероприятие
  const isAdultsOnly = event.age_category === '18+';
  
  const roundUpToHundred = (num: number) => Math.ceil(num / 100) * 100;

  // Обновленная функция расчета стоимости
  const calculateTotal = () => {
    if (isFreeOrDonation) return 0;

    let adultTotal = 0;
    let childTotal = 0;

    if (event.couple_discount && formData.adultTickets >= 2) {
      const pairs = Math.floor(formData.adultTickets / 2);
      const single = formData.adultTickets % 2;
      
      const discountedPairPrice = event.price * 2 * (1 - event.couple_discount / 100);
      adultTotal = pairs * roundUpToHundred(discountedPairPrice) + single * event.price;
    } else {
      adultTotal = formData.adultTickets * event.price;
    }

    // Детские билеты только если НЕ 18+
    if (!isAdultsOnly) {
      const childPrice = event.child_half_price ? event.price / 2 : event.price;
      childTotal = formData.childTickets * childPrice;
    }

    return adultTotal + childTotal;
  };

  // Обновленная функция получения деталей цены
  const getPriceDetails = () => {
    if (isFreeOrDonation) return null;

    const details = [];
    const totalAdult = formData.adultTickets;
    const totalChild = isAdultsOnly ? 0 : formData.childTickets;

    // Детали для взрослых билетов
    if (event.couple_discount && totalAdult >= 2) {
      const pairs = Math.floor(totalAdult / 2);
      const single = totalAdult % 2;
      
      const regularPrice = single * event.price;
      const pairPrice = event.price * 2 * (1 - event.couple_discount / 100);
      const roundedPairPrice = roundUpToHundred(pairPrice);

      details.push(
        <div key="adult" className="flex justify-between">
          <span>
            Взрослые ({totalAdult}×)
            {pairs > 0 && (
              <span className="text-xs text-green-500 dark:text-green-400 ml-1">
                ({pairs}×2 со скидкой {event.couple_discount}%)
              </span>
            )}
          </span>
          <span>
            {pairs > 0 && (
              <span className="text-xs line-through text-gray-500 dark:text-gray-400 mr-1">
                {event.price * 2 * pairs}
              </span>
            )}
            {pairs * roundedPairPrice + regularPrice} {event.currency}
          </span>
        </div>
      );
    } else {
      details.push(
        <div key="adult" className="flex justify-between">
          <span>Взрослые ({totalAdult}×)</span>
          <span>{totalAdult * event.price} {event.currency}</span>
        </div>
      );
    }

    // Детали для детских билетов (только если НЕ 18+)
    if (!isAdultsOnly && totalChild > 0) {
      const childPrice = event.child_half_price ? event.price / 2 : event.price;
      details.push(
        <div key="child" className="flex justify-between">
          <span>
            Дети ({totalChild}×)
            {event.child_half_price && (
              <span className="text-xs text-green-500 dark:text-green-400 ml-1">
                (50% скидка)
              </span>
            )}
          </span>
          <span>{childPrice * totalChild} {event.currency}</span>
        </div>
      );
    }

    return details;
  };

  // Функция для открытия платежного виджета или ссылки
  const handlePaymentRedirect = () => {
    if (event.widget_chooser && event.oblakkarte_data_event_id) {
      // Для виджета создаем программный клик по элементу с data-oblak-widget
      const widgetButton = document.querySelector(`[data-event-id="${event.oblakkarte_data_event_id}"]`);
      if (widgetButton) {
        (widgetButton as HTMLElement).click();
      } else {
        // Fallback: открываем виджет программно через глобальный объект
        if (window.OblakWidget) {
          window.OblakWidget.open({
            eventId: event.oblakkarte_data_event_id,
            lang: 'ru'
          });
        } else {
          console.error('Виджет Oblakkarte не загружен');
          toast.error('Ошибка загрузки платежного виджета');
        }
      }
    } else if (event.payment_link) {
      // Для обычной ссылки
      window.open(event.payment_link, '_blank');
    }
  };

  const resetForm = () => {
    setFormData({
      name: currentUser?.name || '',
      contact: currentUser?.email || '',
      phone: '',
      comment: '',
      adultTickets: 1,
      childTickets: 0,
    });
    setRegistrationSuccess(false);
    setRegistrationDetails(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Обновленная функция отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const total = calculateTotal();
      const registrationId = crypto.randomUUID();
      
      const registrationData = {
        id: registrationId,
        full_name: formData.name,
        email: formData.contact,
        phone: formData.phone,
        comment: formData.comment,
        adult_tickets: Number(formData.adultTickets),
        child_tickets: Number(isAdultsOnly ? 0 : formData.childTickets), // Исправлено: используем isAdultsOnly
        total_amount: total,
        status: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: currentUser?.id || null,
          ...registrationData
        })
        .select()
        .single();

      if (error) throw error;

      const { data, error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: event.id,
          user_id: currentUser?.id || null,
          ...registrationData
        })
        .select()
        .single();

      if (error) throw error;

      await syncUserRegistration(event.id, registrationData);

      setRegistrationDetails({
        id: registrationId,
        fullName: formData.name,
        email: formData.contact,
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

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
                  <>
                    {event.widget_chooser && event.oblakkarte_data_event_id ? (
                      // Скрытая кнопка для виджета (будет программно активирована)
                      <a
                        href="#"
                        data-oblak-widget
                        data-event-id={event.oblakkarte_data_event_id}
                        data-lang="ru"
                        style={{ display: 'none' }}
                        onClick={(e) => e.preventDefault()}
                      >
                        Widget Button
                      </a>
                    ) : null}
                    
                    <button
                      onClick={handlePaymentRedirect}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      {event.widget_chooser ? 'Открыть виджет оплаты' : 'Перейти к оплате'}
                    </button>
                  </>
                )}
                
                <button
                  onClick={onClose}
                  className="w-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  {event.payment_type === 'cost' ? 'Оплачу позже' : 'Закрыть'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Регистрация на мероприятие
              </h2>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">{event.title}</h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatRussianDate(event.start_at)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatTimeFromTimestamp(event.start_at)}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {event.location}
                  </div>
                  {!isFreeOrDonation && (
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {event.price} {event.currency}
                    </div>
                  )}
                </div>
              </div>

              {/* Информация о возрастных ограничениях */}
              {isAdultsOnly && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm mb-6">
                  <p className="text-amber-800 dark:text-amber-200">
                    <strong>Возрастное ограничение:</strong> Данное мероприятие предназначено только для лиц старше 18 лет
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Полное имя *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Введите ваше полное имя"
                  />
                </div>

                <div>
                  <label htmlFor="contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="contact"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Введите ваш email"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Введите ваш номер телефона"
                  />
                </div>

                {/* В JSX части для выбора билетов: */}
                {!isFreeOrDonation && (
                  <div className={`flex gap-2 ${isAdultsOnly ? 'justify-center' : ''}`}>
                    <div className={isAdultsOnly ? 'w-full' : 'flex-1'}>
                      <label className="block text-xs font-medium mb-1">Взрослых билетов</label>
                      <select
                        value={formData.adultTickets}
                        onChange={(e) => setFormData({ ...formData, adultTickets: Number(e.target.value) })}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700"
                      >
                        {generateOptions(10, 1).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>

                    {!isAdultsOnly && (
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">Детских билетов</label>
                        <select
                          value={formData.childTickets}
                          onChange={(e) => setFormData({ ...formData, childTickets: Number(e.target.value) })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700"
                        >
                          {generateOptions(10, 0).map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Комментарий
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={formData.comment}
                    onChange={(e) => setFormData({...formData, comment: e.target.value})}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Дополнительная информация (необязательно)"
                  />
                </div>
              </div>

              {!isFreeOrDonation && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '...' : 'Подтвердить'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RegistrationModal; 