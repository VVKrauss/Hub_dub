// src/components/favorites/FavoriteButton.tsx
import React from 'react';
import { Heart } from 'lucide-react';
import { Button } from '../../shared/ui/Button/Button';
import { cn } from '../../shared/utils/cn';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onClick,
  loading = false,
  className = '',
  size = 'md',
  showText = false
}) => {
  const heartSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <Button
      variant={isFavorite ? 'primary' : 'outline'}
      size={size}
      onClick={onClick}
      loading={loading}
      className={cn(
        'transition-all duration-200',
        isFavorite && 'bg-red-500 hover:bg-red-600 border-red-500 text-white',
        !isFavorite && 'border-gray-300 hover:border-red-300 text-gray-600 hover:text-red-500',
        className
      )}
      leftIcon={
        <Heart 
          className={cn(
            heartSizes[size],
            isFavorite ? 'fill-current' : '',
            'transition-all duration-200'
          )} 
        />
      }
    >
      {showText && (isFavorite ? 'В избранном' : 'В избранное')}
    </Button>
  );
};

export default FavoriteButton;