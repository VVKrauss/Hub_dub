// src/components/ui/Modal.tsx
// DEPRECATED: Используйте Modal из shared/ui/Modal/Modal
import { ReactNode } from 'react';
import { Modal as NewModal } from '../../shared/ui/Modal/Modal';

/**
 * @deprecated Используйте Modal из shared/ui/Modal/Modal
 * Этот компонент оставлен для обратной совместимости
 */
type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  console.warn('DEPRECATED: Используйте Modal из shared/ui/Modal/Modal вместо components/ui/Modal');
  
  return (
    <NewModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
    >
      {children}
    </NewModal>
  );
};

export default Modal;