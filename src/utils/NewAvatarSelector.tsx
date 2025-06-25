// src/components/ui/NewAvatarSelector.tsx

import { useState, useEffect, useMemo } from 'react';
import { Check, X, Shuffle, Search, ChevronLeft, ChevronRight, Grid, List, Star, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getCachedAvatars, invalidateAvatarCache, getAvatarStats } from '../../utils/dynamicAvatarUtils';

type AvatarSelectorProps = {
  currentAvatar?: string;
  onAvatarSelect: (avatarUrl: string) => void;
  onClose: () => void;
};

type ViewMode = 'grid' | 'list';
type SortMode = 'default' | 'random' | 'favorites';

type AvatarFile = {
  name: string;
  url: string;
  id?: string;
};

const NewAvatarSelector = ({ currentAvatar, onAvatarSelect, onClose }: AvatarSelectorProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Состояние для аватаров
  const [availableAvatars, setAvailableAvatars] = useState<AvatarFile[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [avatarsError, setAvatarsError] = useState<string | null>(null);
  const [avatarStats, setAvatarStats] = useState<any>(null);
  
  const itemsPerPage = viewMode === 'grid' ? 30 : 20;

  // Загрузка аватаров при монтировании
  useEffect(() => {
    loadAvatars();
    loadAvatarStats();
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('avatar_favorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  const loadAvatars = async () => {
    try {
      setLoadingAvatars(true);
      setAvatarsError(null);
      
      const avatars = await getCachedAvatars();
      setAvailableAvatars(avatars);
      
      if (avatars.length === 0) {
        setAvatarsError('Аватары не найдены');
      }
    } catch (error) {
      console.error('Failed to load avatars:', error);
      setAvatarsError('Ошибка загрузки аватаров');
    } finally {
      setLoadingAvatars(false);
    }
  };

  const loadAvatarStats = async () => {
    try {
      const stats = await getAvatarStats();
      setAvatarStats(stats);
    } catch (error) {
      console.error('Failed to load avatar stats:', error);
    }
  };

  const refreshAvatars = async () => {
    invalidateAvatarCache();
    await loadAvatars();
    await loadAvatarStats();
    toast.success('Список аватаров обновлен');
  };

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: Set<string>) => {
    setFavorites(newFavorites);
    localStorage.setItem('avatar_favorites', JSON.stringify([...newFavorites]));
  };

  const toggleFavorite = (avatarUrl: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(avatarUrl)) {
      newFavorites.delete(avatarUrl);
    } else {
      newFavorites.add(avatarUrl);
    }
    saveFavorites(newFavorites);
  };

  // Filter and sort avatars
  const processedAvatars = useMemo(() => {
    let avatars = [...availableAvatars];

    // Filter by search
    if (searchQuery) {
      avatars = avatars.filter(avatar => {
        const fileName = avatar.name.toLowerCase();
        const fileNameWithoutExt = fileName.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
        const query = searchQuery.toLowerCase();
        
        return fileName.includes(query) || 
               fileNameWithoutExt.includes(query) ||
               // Поиск по номеру в имени
               (/\d+/.test(query) && fileName.includes(query));
      });
    }

    // Filter by sort mode
    if (sortMode === 'favorites') {
      avatars = avatars.filter(avatar => 
        favorites.has(avatar.url)
      );
    }

    // Sort avatars
    switch (sortMode) {
      case 'random':
        avatars.sort(() => Math.random() - 0.5);
        break;
      case 'favorites':
        // Already filtered above
        break;
      default:
        // Keep default order (alphabetical by name)
        avatars.sort((a, b) => a.name.localeCompare(b.name));
    }

    return avatars;
  }, [availableAvatars, searchQuery, sortMode, favorites]);

  const totalPages = Math.ceil(processedAvatars.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAvatars = processedAvatars.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortMode, viewMode]);

  const getRandomAvatar = async () => {
    try {
      if (availableAvatars.length === 0) {
        toast.error('Аватары не загружены');
        return;
      }

      const randomIndex = Math.floor(Math.random() * availableAvatars.length);
      const randomAvatar = availableAvatars[randomIndex].url;
      setSelectedAvatar(randomAvatar);
    } catch (error) {
      console.error('Failed to get random avatar:', error);
      toast.error('Ошибка при выборе случайного аватара');
    }
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

  const downloadAvatar = async (avatarUrl: string) => {
    try {
      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `avatar-${avatarUrl.split('/').pop()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Аватар скачан');
    } catch (error) {
      toast.error('Ошибка при скачивании');
    }
  };

  const AvatarGridItem = ({ avatar }: { avatar: AvatarFile }) => {
    const isFavorite = favorites.has(avatar.url);
    const isSelected = selectedAvatar === avatar.url;
    const fileName = avatar.name.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');

    return (
      <div className="relative group">
        <div
          className={`
            relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300
            ${isSelected 
              ? 'ring-4 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-dark-800 scale-105' 
              : 'hover:scale-105 hover:shadow-lg'
            }
            ${viewMode === 'grid' ? 'aspect-square' : 'w-16 h-16'}
          `}
          onClick={() => setSelectedAvatar(avatar.url)}
        >
          <img
            src={avatar.url}
            alt={`Аватар ${fileName}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.opacity = '0.5';
            }}
          />
          
          {/* Overlay for selected */}
          {isSelected && (
            <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
              <div className="bg-primary-500 text-white rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            </div>
          )}

          {/* Action buttons overlay */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(avatar.url);
              }}
              className={`p-1 rounded-full transition-colors ${
                isFavorite 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            >
              <Star className="h-3 w-3" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadAvatar(avatar.url);
              }}
              className="p-1 rounded-full bg-white/80 hover:bg-white text-gray-700 transition-colors"
              title="Скачать аватар"
            >
              <Download className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Avatar name badge */}
        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded max-w-full truncate">
          {fileName}
        </div>
      </div>
    );
  };

  // Loading state
  if (loadingAvatars) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Загрузка аватаров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Выбор аватара
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {avatarsError ? (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {avatarsError}
                  </span>
                ) : (
                  <>
                    {processedAvatars.length} из {availableAvatars.length} аватаров
                    {avatarStats && (
                      <span className="ml-2">
                        ({Object.entries(avatarStats.byExtension).map(([ext, count]) => 
                          `${count} ${ext}`
                        ).join(', ')})
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshAvatars}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                title="Обновить список аватаров"
              >
                <RefreshCw className="h-5 w-5 text-gray-500" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-700 space-y-4">
          {/* Selected Avatar Preview */}
          {selectedAvatar && (
            <div className="text-center">
              <div className="inline-block relative">
                <div className="w-20 h-20 rounded-xl overflow-hidden border-4 border-primary-500 shadow-lg mb-2">
                  <img
                    src={selectedAvatar}
                    alt="Выбранный аватар"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedAvatar.split('/').pop()?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '') || 'Выбранный аватар'}
                </p>
              </div>
            </div>
          )}

          {/* Search and Controls Row */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени или номеру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
              />
            </div>

            {/* Sort Mode */}
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
            >
              <option value="default">По алфавиту</option>
              <option value="random">Случайно</option>
              <option value="favorites">Избранные ({favorites.size})</option>
            </select>

            {/* View Mode */}
            <div className="flex bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-dark-600 shadow' : ''}`}
                title="Сетка"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-dark-600 shadow' : ''}`}
                title="Список"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Random Avatar */}
            <button
              onClick={getRandomAvatar}
              disabled={availableAvatars.length === 0}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-dark-700 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shuffle className="h-4 w-4" />
              Случайный
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {currentAvatars.length > 0 ? (
              <>
                {/* Avatars Grid/List */}
                <div className={`
                  ${viewMode === 'grid' 
                    ? 'grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3' 
                    : 'grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-20 gap-2'
                  }
                  mb-6
                `}>
                  {currentAvatars.map((avatar) => (
                    <AvatarGridItem key={avatar.url} avatar={avatar} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {currentPage} из {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 dark:border-dark-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Аватары не найдены</h3>
                <p className="text-sm">
                  {searchQuery || sortMode === 'favorites' 
                    ? 'Попробуйте изменить поисковый запрос или фильтры'
                    : 'Аватары не загружены или произошла ошибка'
                  }
                </p>
                {avatarsError && (
                  <button
                    onClick={refreshAvatars}
                    className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    Попробовать снова
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-700 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {favorites.size > 0 && (
              <span>{favorites.size} в избранном</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !selectedAvatar}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAvatarSelector;   