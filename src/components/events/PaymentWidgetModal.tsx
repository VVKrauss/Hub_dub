import { useEffect, useRef } from 'react';
import { Modal } from '../../shared/ui/Modal/Modal';

type PaymentWidgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  widgetId: string;
};

const PaymentWidgetModal = ({ isOpen, onClose, widgetId }: PaymentWidgetModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && widgetId && containerRef.current) {
      const script = document.createElement('script');
      script.src = 'https://widget.oblakkarte.rs/widget.js';
      script.setAttribute('data-organizer-public-token', widgetId);
      containerRef.current.appendChild(script);

      return () => {
        if (containerRef.current?.contains(script)) {
          containerRef.current.removeChild(script);
        }
      };
    }
  }, [isOpen, widgetId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Оплата билета"
      size="lg"
      showCloseButton={true}
      closeOnOverlayClick={false}
      closeOnEsc={true}
    >
      <div className="min-h-[400px] flex items-center justify-center">
        <div ref={containerRef} className="w-full" />
        {!widgetId && (
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Виджет оплаты не настроен
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PaymentWidgetModal;