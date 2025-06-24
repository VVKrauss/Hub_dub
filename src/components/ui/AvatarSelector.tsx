import { useState } from 'react';
import { Check, X, Shuffle } from 'lucide-react';
import { toast } from 'react-hot-toast';

type AvatarSelectorProps = {
  currentAvatar?: string;
  onAvatarSelect: (avatarUrl: string) => void;
  onClose: () => void;
};

const AVAILABLE_AVATARS = Array.from({ length: 90 }, (_, i) => `${i + 1}.png`);

const BASE_AVATAR_URL = 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/avatars/';

const AvatarSelector = ({ currentAvatar, onAvatarSelect, onClose }: AvatarSelectorProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '');
  const [loading, setLoading] = useState(false);

  const getRandomAvatar = () => {
    const randomIndex = Math.floor(Math.random() * AVAILABLE_AVATARS.length);
    const randomAvatar = BASE_AVATAR_URL + AVAILABLE_AVATARS[randomIndex];
    setSelectedAvatar(randomAvatar);
  };

  const handleSave = async () => {
    if (!selectedAvatar) {
      toast.error('Выберите аватар');
      return;
    }

    setLoading(true);
    try {
      await onAvatarSelect(selectedAvatar);
      onClose();
    } catch (error) {
      console.error('Error saving avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Выбор аватара
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Random Avatar Button */}
          <div className="mb-6 text-center">
            <button
              onClick={getRandomAvatar}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            >
              <Shuffle className="h-4 w-4" />
              Случайный аватар
            </button>
          </div>

          {/* Avatar Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {AVAILABLE_AVATARS.map((avatar) => {
              const avatarUrl = BASE_AVATAR_URL + avatar;
              const isSelected = selectedAvatar === avatarUrl;
              const avatarNumber = avatar.replace('.png', '');
              
              return (
                <div key={avatar} className="relative">
                  <button
                    onClick={() => setSelectedAvatar(avatarUrl)}
                    className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                      isSelected 
                        ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800' 
                        : 'border-gray-200 dark:border-dark-600 hover:border-primary-300'
                    }`}
                  >
                    <img
                      src={avatarUrl}
                      alt={`Avatar ${avatarNumber}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </button>
                  
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                      <div className="bg-primary-500 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedAvatar || loading}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;import { useState } from 'react';
import { Check, X, Shuffle } from 'lucide-react';
import { toast } from 'react-hot-toast';

type AvatarSelectorProps = {
  currentAvatar?: string;
  onAvatarSelect: (avatarUrl: string) => void;
  onClose: () => void;
};

const AVAILABLE_AVATARS = Array.from({ length: 90 }, (_, i) => `${i + 1}.png`);

const BASE_AVATAR_URL = 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/avatars/';

const AvatarSelector = ({ currentAvatar, onAvatarSelect, onClose }: AvatarSelectorProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '');
  const [loading, setLoading] = useState(false);

  const getRandomAvatar = () => {
    const randomIndex = Math.floor(Math.random() * AVAILABLE_AVATARS.length);
    const randomAvatar = BASE_AVATAR_URL + AVAILABLE_AVATARS[randomIndex];
    setSelectedAvatar(randomAvatar);
  };

  const handleSave = async () => {
    if (!selectedAvatar) {
      toast.error('Выберите аватар');
      return;
    }

    setLoading(true);
    try {
      await onAvatarSelect(selectedAvatar);
      onClose();
    } catch (error) {
      console.error('Error saving avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Выбор аватара
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Random Avatar Button */}
          <div className="mb-6 text-center">
            <button
              onClick={getRandomAvatar}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            >
              <Shuffle className="h-4 w-4" />
              Случайный аватар
            </button>
          </div>

          {/* Avatar Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {AVAILABLE_AVATARS.map((avatar) => {
              const avatarUrl = BASE_AVATAR_URL + avatar;
              const isSelected = selectedAvatar === avatarUrl;
              const avatarNumber = avatar.replace('.png', '');
              
              return (
                <div key={avatar} className="relative">
                  <button
                    onClick={() => setSelectedAvatar(avatarUrl)}
                    className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                      isSelected 
                        ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800' 
                        : 'border-gray-200 dark:border-dark-600 hover:border-primary-300'
                    }`}
                  >
                    <img
                      src={avatarUrl}
                      alt={`Avatar ${avatarNumber}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </button>
                  
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                      <div className="bg-primary-500 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedAvatar || loading}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;