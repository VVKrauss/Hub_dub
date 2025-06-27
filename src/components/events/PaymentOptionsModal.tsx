import { CreditCard, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
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

const PaymentOptionsModal = ({
  isOpen,
  onClose,
  onSelectOption,
  hasOnlinePayment,
  paymentType,
  paymentLink,
  oblakkarteDataEventId
}: PaymentOptionsModalProps) => {
  const [isOblakkarteWidgetLoaded, setIsOblakkarteWidgetLoaded] = useState(false);

  // Загружаем скрипт виджета один раз при монтировании компонента
  useEffect(() => {
    // Проверяем, не загружен ли уже скрипт
    const existingScript = document.querySelector('script[src="https://widget.oblakkarte.rs/widget.js"]');
    
    if (existingScript) {
      // Если скрипт уже существует, проверяем доступность виджета
      checkWidgetAvailability();
      return;
    }

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
      setIsOblakkarteWidgetLoaded(false);
    };
    
    document.head.appendChild(script);

    // Очистка при размонтировании компонента
    return () => {
      const scriptToRemove = document.querySelector('script[src="https://widget.oblakkarte.rs/widget.js"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  // Функция для проверки доступности виджета
  const checkWidgetAvailability = () => {
    // Проверяем доступность виджета с небольшой задержкой
    const checkWidget = () => {
      if (window.OblakWidget) {
        setIsOblakkarteWidgetLoaded(true);
      } else {
        // Повторяем проверку через 100мс, максимум 50 раз (5 секунд)
        setTimeout(() => {
          if (window.OblakWidget) {
            setIsOblakkarteWidgetLoaded(true);
          }
        }, 100);
      }
    };

    // Небольшая задержка для инициализации виджета после загрузки скрипта
    setTimeout(checkWidget, 50);
  };

  const handleOnlinePayment = () => {
    if (paymentType === 'widget' && oblakkarteDataEventId) {
      if (!isOblakkarteWidgetLoaded) {
        // Показываем уведомление пользователю
        alert('Виджет оплаты загружается, пожалуйста, подождите несколько секунд и попробуйте снова.');
        return;
      }

      // Открываем виджет напрямую через API
      if (window.OblakWidget) {
        window.OblakWidget.open({
          eventId: oblakkarteDataEventId,
          lang: 'ru'
        });
      } else {
        console.error('Виджет Oblakkarte не загружен');
        alert('Произошла ошибка при загрузке виджета оплаты. Пожалуйста, обновите страницу и попробуйте снова.');
      }
      onClose();
    } else if (paymentType === 'link' && paymentLink) {
      // Переход по ссылке
      window.open(paymentLink, '_blank');
      onClose();
    } else {
      onSelectOption('online');
    }
  };

  const isWidgetPaymentDisabled = paymentType === 'widget' && !isOblakkarteWidgetLoaded;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Выберите способ оплаты"
      size="md"
    >
      <div className="space-y-4">
        {hasOnlinePayment && (
          <button
            onClick={handleOnlinePayment}
            disabled={isWidgetPaymentDisabled}
            className={`w-full p-4 border-2 rounded-lg transition-colors flex items-center gap-4 ${
              isWidgetPaymentDisabled
                ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60'
                : 'border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
            }`}
          >
            <div className={`p-2 rounded-full ${
              isWidgetPaymentDisabled
                ? 'bg-gray-200 dark:bg-gray-600'
                : 'bg-primary-100 dark:bg-primary-900/30'
            }`}>
              <CreditCard className={`h-6 w-6 ${
                isWidgetPaymentDisabled
                  ? 'text-gray-400 dark:text-gray-500'
                  : 'text-primary-600 dark:text-primary-400'
              }`} />
            </div>
            <div className="text-left">
              <h3 className="font-medium">Онлайн оплата</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isWidgetPaymentDisabled && paymentType === 'widget'
                  ? 'Загрузка виджета оплаты...'
                  : 'Оплатите сейчас картой или электронным кошельком'
                }
              </p>
            </div>
          </button>
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