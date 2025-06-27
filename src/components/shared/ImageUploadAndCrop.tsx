import { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { supabase } from '../../lib/supabase';
import { compressImage, generateUniqueFilename } from '../../utils/imageUtils';
import { Button } from '../../shared/ui/Button/Button';
import { Modal } from '../../shared/ui/Modal/Modal';

interface ImageUploadAndCropProps {
  aspectRatio?: number;
  targetWidth?: number;
  targetHeight?: number;
  storageBucket?: string;
  storagePathPrefix: string;
  onUploadSuccess: (url: string, path: string) => void;
  initialImageUrl?: string;
  onRemoveImage?: () => void;
  recommendedText?: string;
  className?: string;
  buttonText?: string;
}

const ImageUploadAndCrop = ({
  aspectRatio = 1,
  targetWidth = 800,
  targetHeight = 800,
  storageBucket = 'images',
  storagePathPrefix,
  onUploadSuccess,
  initialImageUrl,
  onRemoveImage,
  recommendedText = 'Рекомендуемый размер: 800x800px',
  className = '',
  buttonText = 'Загрузить изображение'
}: ImageUploadAndCropProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cropper, setCropper] = useState<Cropper | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения');
      return;
    }

    // Проверка размера файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    try {
      const compressedFile = await compressImage(file, {
        maxWidthOrHeight: 2000,
        maxSizeMB: 5,
        useWebWorker: true
      });

      setImageFile(compressedFile);
      setShowCropper(true);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Ошибка при обработке изображения');
    }
  };

  const handleCrop = useCallback(async () => {
    if (!cropper || !imageFile) return;

    try {
      setUploading(true);
      setUploadProgress(10);

      // Получаем обрезанное изображение
      const canvas = cropper.getCroppedCanvas({
        width: targetWidth,
        height: targetHeight,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });

      if (!canvas) {
        throw new Error('Не удалось обрезать изображение');
      }

      setUploadProgress(30);

      // Конвертируем в blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Не удалось создать blob'));
            }
          },
          'image/jpeg',
          0.9
        );
      });

      setUploadProgress(50);

      // Генерируем уникальное имя файла
      const fileName = generateUniqueFilename(imageFile, storagePathPrefix);
      const filePath = `${storagePathPrefix}/${fileName}`;

      setUploadProgress(70);

      // Загружаем в Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(90);

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(filePath);

      setUploadProgress(100);

      // Вызываем callback
      onUploadSuccess(publicUrl, filePath);

      // Сбрасываем состояние
      setShowCropper(false);
      setImageFile(null);
      setUploadProgress(0);

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка при загрузке изображения');
    } finally {
      setUploading(false);
    }
  }, [cropper, imageFile, targetWidth, targetHeight, storagePathPrefix, storageBucket, onUploadSuccess]);

  const handleCancel = () => {
    setShowCropper(false);
    setImageFile(null);
    setUploadProgress(0);
  };

  const handleRemove = () => {
    if (onRemoveImage) {
      onRemoveImage();
    }
  };

  // Модальное окно с кроппером
  if (showCropper && imageFile) {
    return (
      <Modal
        isOpen={showCropper}
        onClose={handleCancel}
        title="Обрезать изображение"
        size="lg"
        closeOnOverlayClick={!uploading}
        closeOnEsc={!uploading}
      >
        <div className="space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <Cropper
              src={URL.createObjectURL(imageFile)}
              style={{ height: 400, width: '100%' }}
              aspectRatio={aspectRatio}
              guides={true}
              background={false}
              responsive={true}
              autoCropArea={1}
              checkOrientation={false}
              onInitialized={(instance) => setCropper(instance)}
              viewMode={1}
              dragMode="move"
              scalable={true}
              zoomable={true}
              rotatable={true}
            />
          </div>

          {/* Прогресс загрузки */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">
                  Загрузка изображения...
                </span>
                <span className="text-primary-600 font-medium">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {recommendedText}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={uploading}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={handleCrop}
                loading={uploading}
                leftIcon={!uploading ? <Check className="h-4 w-4" /> : undefined}
              >
                {uploading ? 'Загрузка...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Превью загруженного изображения
  if (initialImageUrl) {
    return (
      <div className={`relative group ${className}`}>
        <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-600">
          <img
            src={initialImageUrl}
            alt="Uploaded preview"
            className="w-full h-48 object-cover"
          />
          
          {/* Оверлей с кнопкой удаления */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemove}
              leftIcon={<X className="h-4 w-4" />}
            >
              Удалить
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Компонент загрузки
  return (
    <div className={`${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      
      <div 
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors duration-200 cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              {buttonText}
            </Button>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {recommendedText}
            </p>
            
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Поддерживаются: JPG, PNG, GIF (до 10MB)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadAndCrop;