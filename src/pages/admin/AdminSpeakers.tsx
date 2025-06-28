// src/pages/admin/AdminSpeakers.tsx - Унифицированная версия
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Search, Edit, Eye, User, Trash2, X, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CreateSpeakerModal from '../../components/admin/CreateSpeakerModal';
import SpeakerPhotoGallery from '../../components/admin/SpeakerPhotoGallery';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Speaker {
  id: string;
  name: string;
  field_of_expertise: string;
  description: string;
  date_of_birth: string | null;
  photos: { url: string }[];
  contact_info: any;
  blogs: any[];
  blog_visibility: any;
  google_drive_link: string | null;
  active: boolean;
}

const AdminSpeakers: React.FC = () => {
  // Состояния
  const [searchQuery, setSearchQuery] = useState('');
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Speaker>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    fetchSpeakers();
  }, []);

  const fetchSpeakers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('speakers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSpeakers(data || []);
    } catch (error) {
      console.error('Error fetching speakers:', error);
      toast.error('Ошибка при загрузке спикеров');
    } finally {
      setLoading(false);
    }
  };

  // === ОБРАБОТЧИКИ ===
  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('speakers')
        .update(editForm)
        .eq('id', selectedSpeaker?.id);

      if (error) throw error;

      toast.success('Спикер обновлен успешно');
      fetchSpeakers();
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating speaker:', error);
      toast.error('Ошибка при обновлении спикера');
    }
  };

  const handleDeleteSpeaker = async (speakerId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого спикера? Это действие нельзя отменить.')) {
      return;
    }

    try {
      // Удаляем фотографии из хранилища
      const speaker = speakers.find(s => s.id === speakerId);
      const photosToDelete = Array.isArray(speaker?.photos) 
        ? speaker.photos.map(p => p.url).filter(Boolean)
        : [];

      if (photosToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('images')
          .remove(photosToDelete);

        if (storageError) {
          console.error('Error deleting photos:', storageError);
        }
      }

      // Удаляем запись спикера
      const { error } = await supabase
        .from('speakers')
        .delete()
        .eq('id', speakerId);

      if (error) throw error;

      toast.success('Спикер удален успешно');
      fetchSpeakers();
      setSelectedSpeaker(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error deleting speaker:', error);
      toast.error('Ошибка при удалении спикера');
    }
  };

  const handleView = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setEditForm(speaker);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (speaker: Speaker) => {
    setSelectedSpeaker(speaker);
    setEditForm(speaker);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // === ФИЛЬТРАЦИЯ ===
  const filteredSpeakers = speakers.filter(speaker =>
    speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    speaker.field_of_expertise.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // === СОСТОЯНИЕ ЗАГРУЗКИ ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка спикеров...</p>
        </div>
      </div>
    );
  }

  // === РЕНДЕР ===
  return (
    <div className="space-y-6">
      {/* Унифицированный заголовок */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление спикерами</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Всего спикеров: {speakers.length} | Активных: {speakers.filter(s => s.active).length}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Добавить спикера
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Поиск */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Поиск по имени или области экспертизы..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Таблица спикеров */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Спикер
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Область экспертизы
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-500 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSpeakers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                            {searchQuery ? 'Спикеры не найдены' : 'Нет спикеров'}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            {searchQuery 
                              ? 'Попробуйте изменить критерии поиска' 
                              : 'Создайте первого спикера для начала работы'}
                          </p>
                          <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            {searchQuery ? 'Создать спикера' : 'Добавить первого спикера'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSpeakers.map((speaker) => (
                      <tr key={speaker.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mr-4 flex-shrink-0">
                              {speaker.photos?.[0]?.url ? (
                                <img
                                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${speaker.photos[0].url}`}
                                  alt={speaker.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {speaker.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                ID: {speaker.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {speaker.field_of_expertise}
                          </div>
                          {speaker.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {speaker.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            speaker.active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {speaker.active ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={() => handleView(speaker)}
                              className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                              title="Просмотр"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(speaker)}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Редактировать"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSpeaker(speaker.id)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно просмотра/редактирования */}
      {isModalOpen && selectedSpeaker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isEditMode ? 'Редактирование спикера' : 'Информация о спикере'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {isEditMode ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Имя
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Область экспертизы
                    </label>
                    <input
                      type="text"
                      value={editForm.field_of_expertise || ''}
                      onChange={(e) => setEditForm({ ...editForm, field_of_expertise: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Описание
                    </label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Дата рождения
                    </label>
                    <input
                      type="date"
                      value={editForm.date_of_birth || ''}
                      onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Google Drive ссылка
                    </label>
                    <input
                      type="url"
                      value={editForm.google_drive_link || ''}
                      onChange={(e) => setEditForm({ ...editForm, google_drive_link: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={editForm.active}
                      onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Активный спикер
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setIsEditMode(false);
                        setEditForm(selectedSpeaker);
                      }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-start gap-6">
                    <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                      {selectedSpeaker.photos?.[0]?.url ? (
                        <img
                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${selectedSpeaker.photos[0].url}`}
                          alt={selectedSpeaker.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {selectedSpeaker.name}
                      </h3>
                      <p className="text-lg text-primary-600 dark:text-primary-400 mb-4">
                        {selectedSpeaker.field_of_expertise}
                      </p>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <p><strong>ID:</strong> {selectedSpeaker.id}</p>
                        {selectedSpeaker.date_of_birth && (
                          <p><strong>Дата рождения:</strong> {selectedSpeaker.date_of_birth}</p>
                        )}
                        <p>
                          <strong>Статус:</strong>{' '}
                          <span className={selectedSpeaker.active ? 'text-green-600' : 'text-red-600'}>
                            {selectedSpeaker.active ? 'Активен' : 'Неактивен'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedSpeaker.description && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Описание</h4>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {selectedSpeaker.description}
                      </p>
                    </div>
                  )}

                  {selectedSpeaker.google_drive_link && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Google Drive</h4>
                      <a
                        href={selectedSpeaker.google_drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Открыть в Google Drive
                      </a>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteSpeaker(selectedSpeaker.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания спикера */}
      {isCreateModalOpen && (
        <CreateSpeakerModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            fetchSpeakers();
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Галерея фотографий спикера */}
      {selectedSpeaker && (
        <SpeakerPhotoGallery
          speakerId={selectedSpeaker.id}
          photos={selectedSpeaker.photos}
          onPhotosUpdate={() => {
            fetchSpeakers();
            // Обновляем выбранного спикера
            const updatedSpeaker = speakers.find(s => s.id === selectedSpeaker.id);
            if (updatedSpeaker) {
              setSelectedSpeaker(updatedSpeaker);
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminSpeakers;