import { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';

type PaymentWidgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  widgetId: string;
};

const PaymentWidgetModal = ({ isOpen, onClose, widgetId }: PaymentWidgetModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && widgetId && containerRef.current) {
      setIsLoading(true);
      setError(null);
      
      try {
        // Проверяем, загружен ли уже скрипт
        const existingScript = document.querySelector('script[src="https://widget.oblakkarte.rs/widget.js"]');
        
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://widget.oblakkarte.rs/widget.js';
          script.setAttribute('data-organizer-public-token', widgetId);
          script.async = true;
          
          script.onload = () => {
            setIsLoading(false);
          };
          
          script.onerror = () => {
            setError('Не удалось загрузить платежный виджет');
            setIsLoading(false);
          };
          
          containerRef.current.appendChild(script);
        } else {
          // Если скрипт уже загружен, просто обновляем атрибут
          existingScript.setAttribute('data-organizer-public-token', widgetId);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Ошибка при инициализации виджета:', err);
        setError('Произошла ошибка при загрузке платежного виджета');
        setIsLoading(false);
      }
    }

    return () => {
      // Очистка не нужна, так как скрипт должен оставаться на странице
    };
  }, [isOpen, widgetId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Оплата билета"
      size="lg"
    >
      <div ref={containerRef} className="p-6 min-h-[300px] flex flex-col items-center justify-center">
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Загрузка платежного виджета...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">{error}</p>
            <p className="text-gray-600 dark:text-gray-400">
              Пожалуйста, обновите страницу или попробуйте позже
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PaymentWidgetModal;