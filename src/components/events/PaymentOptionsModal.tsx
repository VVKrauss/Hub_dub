import { CreditCard, MapPin } from 'lucide-react';
import { useEffect } from 'react';
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

  // Загружаем скрипт виджета один раз при монтировании компонента
  useEffect(() => {
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

    // Очистка при размонтировании компонента
    return () => {
      const existingScript = document.querySelector('script[src="https://widget.oblakkarte.rs/widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const handleOnlinePayment = () => {
    if (paymentType === 'widget' && oblakkarteDataEventId) {
      // Открываем виджет напрямую через API
      if (window.OblakWidget) {
        window.OblakWidget.open({
          eventId: oblakkarteDataEventId,
          lang: 'ru'
        });
      } else {
        console.error('Виджет Oblakkarte не загружен');
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