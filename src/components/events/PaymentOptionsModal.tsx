import { useState, useEffect } from 'react';
import { CreditCard, MapPin, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';

type PaymentOptionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'online' | 'venue') => void;
  hasOnlinePayment: boolean;
  paymentType: string; // 'widget' | 'link'
  paymentLink?: string;
  oblakkarteDataEventId?: string; // ID события для виджета
};

// Типы для виджета Oblakkarte
declare global {
  interface Window {
    OblakWidget?: {
      open: (options: { eventId: string; lang: string }) => void;
    };
  }
}

const PaymentOptionsModal = ({
  isOpen,
  onClose,
  onSelectOption,
  hasOnlinePayment,
  paymentType,
  paymentLink,
  oblakkarteDataEventId
}: PaymentOptionsModalProps) => {
  const [isWidgetLoading, setIsWidgetLoading] = useState(false);
  const [isWidgetReady, setIsWidgetReady] = useState(false);

  // Загружаем скрипт виджета один раз при монтировании компонента
  useEffect(() => {
    if (!isOpen) return;
    
    // Проверяем, не загружен ли уже скрипт и не доступен ли уже виджет
    if (window.OblakWidget) {
      setIsWidgetReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://widget.oblakkarte.rs/widget.js"]');
    if (existingScript) {
      // Если скрипт уже существует, проверяем доступность виджета
      checkWidgetAvailability();
      return;
    }

    // Загружаем скрипт только если он нужен
    if (paymentType === 'widget' && oblakkarteDataEventId) {
      setIsWidgetLoading(true);
      
      // Создаем и загружаем скрипт виджета
      const script = document.createElement('script');
      script.src = 'https://widget.oblakkarte.rs/widget.js';
      script.async = true;
      script.setAttribute('data-organizer-public-token', 'Yi0idjZg');
      
      // Обработчик успешной загрузки скрипта
      script.onload = () => {
        checkWidgetAvailability();
      };

      // Обработчик ошибки загрузки
      script.onerror = () => {
        console.error('Не удалось загрузить скрипт виджета Oblakkarte');
        setIsWidgetLoading(false);
      };
      
      document.head.appendChild(script);
    }
  }, [isOpen, paymentType, oblakkarteDataEventId]);

  // Функция для проверки доступности виджета
  const checkWidgetAvailability = () => {
    let attempts = 0;
    const maxAttempts = 50; // Максимум 5 секунд (50 * 100ms)
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.OblakWidget) {
        clearInterval(checkInterval);
        setIsWidgetReady(true);
        setIsWidgetLoading(false);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        setIsWidgetLoading(false);
        console.error('Не удалось загрузить виджет Oblakkarte после нескольких попыток');
      }
    }, 100);
  };

  const handleOnlinePayment = () => {
    if (paymentType === 'widget' && oblakkarteDataEventId) {
      if (window.OblakWidget) {
        try {
          window.OblakWidget.open({
            eventId: oblakkarteDataEventId,
            lang: 'ru'
          });
          onClose();
        } catch (error) {
          console.error('Ошибка при открытии виджета Oblakkarte:', error);
          alert('Произошла ошибка при открытии виджета оплаты. Пожалуйста, попробуйте позже.');
        }
      } else {
        console.error('Виджет Oblakkarte не загружен');
        alert('Виджет оплаты не загрузился. Пожалуйста, обновите страницу и попробуйте снова.');
      }
    } else if (paymentType === 'link' && paymentLink) {
      // Переход по ссылке
      window.open(paymentLink, '_blank');
      onClose();
    } else {
      onSelectOption('online');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Выберите способ оплаты"
      size="md"
    >
      <div className="space-y-4">
        {hasOnlinePayment && (
          <>
            {paymentType === 'widget' && oblakkarteDataEventId ? (
              // Кнопка виджета
              <button
                onClick={handleOnlinePayment}
                disabled={isWidgetLoading && !isWidgetReady}
                className={`w-full p-4 border-2 border-primary-500 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center gap-4 text-left ${
                  isWidgetLoading && !isWidgetReady ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                  {isWidgetLoading && !isWidgetReady ? (
                    <Loader2 className="h-6 w-6 text-primary-600 dark:text-primary-400 animate-spin" />
                  ) : (
                    <CreditCard className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 dark:text-white">Купить билет онлайн</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isWidgetLoading && !isWidgetReady 
                      ? 'Загрузка виджета оплаты...' 
                      : 'Оплатите сейчас картой или электронным кошельком'}
                  </p>
                </div>
              </button>
            ) : (
              // Обычная кнопка для ссылки
              <button
                onClick={handleOnlinePayment}
                className="w-full p-4 border-2 border-primary-500 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center gap-4"
              >
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                  <CreditCard className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Онлайн оплата</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Оплатите сейчас картой или электронным кошельком
                  </p>
                </div>
              </button>
            )}
          </>
        )}
        
        <button
          onClick={() => onSelectOption('venue')}
          className="w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors flex items-center gap-4"
        >
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
            <MapPin className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium">Оплата на месте</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Оплатите при посещении мероприятия
            </p>
          </div>
        </button>
      </div>
      
      <button
        onClick={onClose}
        className="mt-6 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
      >
        Отмена
      </button>
    </Modal>
  );
};

export default PaymentOptionsModal;