// src/shared/ui/Image/OptimizedImage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  quality?: number;
  fallback?: string;
  lazy?: boolean;
  className?: string;
}

// Утилита для создания размытого placeholder
const createBlurDataURL = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.toDataURL();
};

// Утилита для генерации Supabase URL с трансформациями
export const getOptimizedSupabaseUrl = (
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): string => {
  if (!originalUrl || !originalUrl.includes('supabase.co')) {
    return originalUrl;
  }

  const { width, height, quality = 80, format = 'webp' } = options;
  
  // Добавляем параметры трансформации к Supabase URL
  const url = new URL(originalUrl);
  const params = new URLSearchParams();
  
  if (width) params.append('width', width.toString());
  if (height) params.append('height', height.toString());
  if (quality) params.append('quality', quality.toString());
  if (format) params.append('format', format);
  
  if (params.toString()) {
    url.search = params.toString();
  }
  
  return url.toString();
};

export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  quality = 80,
  fallback,
  lazy = true,
  className,
  ...props
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Генерируем оптимизированный URL
  const optimizedSrc = getOptimizedSupabaseUrl(src, { width, height, quality });
  
  // Создаем placeholder
  const placeholderSrc = blurDataURL || 
    (placeholder === 'blur' && width && height ? createBlurDataURL(width, height) : '');

  useEffect(() => {
    if (priority || !lazy) {
      setImageSrc(optimizedSrc);
      return;
    }

    // Intersection Observer для lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(optimizedSrc);
            observer.unobserve(entry.target);
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [optimizedSrc, priority, lazy]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
    if (fallback) {
      setImageSrc(fallback);
    }
  };

  return (
    <div 
      ref={imgRef}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {isLoading && placeholder === 'blur' && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}
      
      {/* Loading skeleton */}
      {isLoading && placeholder === 'empty' && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}

      {/* Main image */}
      {imageSrc && !error && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          {...props}
        />
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-400 dark:text-gray-600">
            <svg className="mx-auto h-8 w-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <p className="text-xs">Изображение не загружено</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Компонент аватара с оптимизацией
export interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fallback?: string;
  className?: string;
}

const avatarSizes = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
  '2xl': 'h-20 w-20',
};

const avatarPixelSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80,
};

export const Avatar = ({ 
  src, 
  alt, 
  size = 'md', 
  fallback, 
  className 
}: AvatarProps) => {
  const pixelSize = avatarPixelSizes[size];
  
  // Генерируем инициалы из имени
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn(
      'relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700',
      avatarSizes[size],
      className
    )}>
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={pixelSize}
          height={pixelSize}
          className="w-full h-full"
          fallback={fallback}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-medium">
          {getInitials(alt)}
        </div>
      )}
    </div>
  );
};

// Хук для предзагрузки изображений
export const useImagePreload = (urls: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    urls.forEach(url => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(url));
      };
      img.src = url;
    });
  }, [urls]);

  return loadedImages;
};

// Компонент галереи изображений
export interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  aspectRatio?: 'square' | 'video' | 'photo';
  className?: string;
}

const galleryGrids = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

const galleryGaps = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const aspectRatios = {
  square: 'aspect-square',
  video: 'aspect-video',
  photo: 'aspect-[4/3]',
};

export const ImageGallery = ({
  images,
  columns = 3,
  gap = 'md',
  aspectRatio = 'square',
  className,
}: ImageGalleryProps) => {
  return (
    <div className={cn(
      'grid',
      galleryGrids[columns],
      galleryGaps[gap],
      className
    )}>
      {images.map((image, index) => (
        <div key={index} className="group">
          <div className={cn(
            'relative overflow-hidden rounded-lg',
            aspectRatios[aspectRatio]
          )}>
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              className="w-full h-full transition-transform duration-300 group-hover:scale-105"
              width={400}
              height={400}
            />
          </div>
          {image.caption && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {image.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};