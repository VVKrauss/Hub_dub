// src/components/ui/AvatarSelector.tsx

import { useState } from 'react';
import { Check, X, Shuffle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const filteredAvatars = AVAILABLE_AVATARS.filter(avatar => {
    if (!searchQuery) return true;
    const avatarNumber = avatar.replace('.png', '');
    return avatarNumber.includes(searchQuery);
  });

  const totalPages = Math.ceil(filteredAvatars.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAvatars = filteredAvatars.slice(startIndex, endIndex);

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

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
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Selected Avatar Preview */}
          {selectedAvatar && (
            <div className="mb-6 text-center">
              <div className="inline-block relative">
                <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-primary-500 shadow-lg mb-3 transition-all duration-300 hover:scale-105">
                  <img
                    src={selectedAvatar}
                    alt="Выбранный аватар"
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                </div>
                <button
                  onClick={() => setSelectedAvatar('')}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                  title="Отменить выбор"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Выбранный аватар
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Аватар #{selectedAvatar.split('/').pop()?.replace('.png', '') || ''}
                </p>
              </div>
            </div>
          )}

          {/* Search and Random Avatar */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по номеру аватара..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
              />
            </div>
            
            {/* Random Avatar Button */}
            <div className="text-center">
              <button
                onClick={getRandomAvatar}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
              >
                <Shuffle className="h-4 w-4" />
                Случайный аватар
              </button>
            </div>
          </div>

          {/* Results count and pagination info */}
          <div className="mb-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>Найдено: {filteredAvatars.length} из {AVAILABLE_AVATARS.length} аватаров</span>
            {totalPages > 1 && (
              <span>Страница {currentPage} из {totalPages}</span>
            )}
          </div>

          {/* Avatar Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-4">
            {currentAvatars.map((avatar) => {
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

          {/* Pagination */}
          {totalPages > 1 && !searchQuery && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-dark-600 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <span className="px-3 py-1 text-sm">
                {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-dark-600 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* No results message */}
          {filteredAvatars.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Аватар с номером "{searchQuery}" не найден</p>
              <p className="text-sm mt-1">Попробуйте другой номер от 1 до 90</p>
            </div>
          )}
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