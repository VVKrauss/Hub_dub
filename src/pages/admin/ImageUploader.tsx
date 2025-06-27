import { useState, useRef } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import imageCompression from 'browser-image-compression';
import { Upload, Trash2 } from 'lucide-react';
import { Button } from '../../shared/ui/Button/Button';

export const ImageUploader = ({
  onUploadComplete,
  aspectRatio = 3,
  previewUrl,
  onRemove,
  recommendedText = "Рекомендуемый размер: 1200x400px"
}: {
  onUploadComplete: (croppedPath: string, originalPath: string) => void;
  aspectRatio?: number;
  previewUrl?: string | null;
  onRemove: () => void;
  recommendedText?: string;
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cropper, setCropper] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await imageCompression(file, {
        maxWidthOrHeight: 2000,
        useWebWorker: true
      });

      setImageFile(compressedFile);
      setShowCropper(true);
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Ошибка при обработке изображения');
    }
  };

  const handleCrop = async () => {
    if (!cropper || !imageFile) return;

    try {
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 1200,
        height: 400
      });

      if (!croppedCanvas) {
        throw new Error('Cropping failed');
      }

      const croppedBlob = await new Promise<Blob>((resolve) => {
        croppedCanvas.toBlob((blob: Blob | null) => {
          if (!blob) {
            throw new Error('Failed to create blob');
          }
          resolve(blob);
        }, 'image/jpeg', 0.9);
      });

      const croppedFile = new File([croppedBlob], imageFile.name, {
        type: 'image/jpeg'
      });

      const timestamp = Date.now();
      const fileExt = 'jpg';
      
      const originalPath = `events/original_${timestamp}.${fileExt}`;
      const croppedPath = `events/cropped_${timestamp}.${fileExt}`;

      onUploadComplete(croppedPath, originalPath);
      setShowCropper(false);
    } catch (error) {
      console.error('Error uploading images:', error);
      throw new Error('Ошибка при загрузке изображений');
    }
  };

  if (showCropper && imageFile) {
    return (
      <div className="space-y-4">
        <Cropper
          src={URL.createObjectURL(imageFile)}
          style={{ height: 400, width: '100%' }}
          aspectRatio={aspectRatio}
          guides={true}
          onInitialized={instance => setCropper(instance)}
        />
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => setShowCropper(false)}
          >
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleCrop}
          >
            Обрезать и сохранить
          </Button>
        </div>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="relative">
        <img
          src={previewUrl}
          alt="Preview"
          className="w-full h-48 object-cover rounded-lg"
        />
        <Button
          variant="danger"
          size="sm"
          onClick={onRemove}
          className="absolute top-2 right-2 rounded-full"
          leftIcon={<Trash2 className="h-4 w-4" />}
        >
        </Button>
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-8 text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        leftIcon={<Upload className="h-5 w-5" />}
      >
        Загрузить изображение
      </Button>
      <p className="mt-2 text-sm text-dark-500">
        {recommendedText}
      </p>
    </div>
  );
};