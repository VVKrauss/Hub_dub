// src/pages/admin/AdminAbout.tsx - Унифицированная версия
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Save, 
  Loader2, 
  Info, 
  ImageIcon, 
  Upload, 
  Trash2, 
  Edit,
  Eye,
  Users,
  Building,
  Target
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface AboutSection {
  id: string;
  title: string;
  description: string;
  image?: string;
  enabled: boolean;
  order: number;
}

interface AboutData {
  main_title: string;
  main_description: string;
  sections: AboutSection[];
  team_section: {
    enabled: boolean;
    title: string;
    description: string;
  };
  mission_section: {
    enabled: boolean;
    title: string;
    description: string;
  };
}

const AdminAbout: React.FC = () => {
  // Состояния
  const [aboutData, setAboutData] = useState<AboutData>({
    main_title: '',
    main_description: '',
    sections: [],
    team_section: { enabled: true, title: '', description: '' },
    mission_section: { enabled: true, title: '', description: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    fetchAboutData();
  }, []);

  const fetchAboutData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('about_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setAboutData(data);
      }
    } catch (error) {
      console.error('Error fetching about data:', error);
      toast.error('Ошибка при загрузке данных страницы "О нас"');
    } finally {
      setLoading(false);
    }
  };

  // === ОБРАБОТЧИКИ ===
  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('about_settings')
        .upsert(aboutData);

      if (error) throw error;
      
      toast.success('Настройки страницы "О нас" сохранены');
    } catch (error) {
      console.error('Error saving about data:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, sectionId?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `about_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      if (sectionId) {
        setAboutData(prev => ({
          ...prev,
          sections: prev.sections.map(section => 
            section.id === sectionId 
              ? { ...section, image: fileName }
              : section
          )
        }));
      }

      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setIsUploading(false);
    }
  };

  const addSection = () => {
    const newSection: AboutSection = {
      id: `section_${Date.now()}`,
      title: 'Новый раздел',
      description: '',
      enabled: true,
      order: aboutData.sections.length + 1
    };

    setAboutData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<AboutSection>) => {
    setAboutData(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId 
          ? { ...section, ...updates }
          : section
      )
    }));
  };

  const removeSection = (sectionId: string) => {
    if (!confirm('Удалить раздел?')) return;

    setAboutData(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  // === СОСТОЯНИЕ ЗАГРУЗКИ ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка настроек страницы "О нас"...</p>
        </div>
      </div>
    );
  }

  // === ПРЕВЬЮ ===
  if (previewMode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setPreviewMode(false)}
            className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
        
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              {aboutData.main_title || 'О нас'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {aboutData.main_description}
            </p>
          </div>

          <div className="space-y-16">
            {aboutData.sections.filter(s => s.enabled).map((section) => (
              <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      {section.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                  {section.image && (
                    <div>
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${section.image}`}
                        alt={section.title}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление страницей "О нас"</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Настройка содержимого и разделов страницы
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                Превью
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Сохранить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Основные настройки */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Building className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Основная информация</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Заголовок страницы
                </label>
                <input
                  type="text"
                  value={aboutData.main_title}
                  onChange={(e) => setAboutData(prev => ({ ...prev, main_title: e.target.value }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Введите заголовок страницы О нас"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Основное описание
                </label>
                <textarea
                  value={aboutData.main_description}
                  onChange={(e) => setAboutData(prev => ({ ...prev, main_description: e.target.value }))}
                  rows={4}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  placeholder="Расскажите о вашей организации..."
                />
              </div>
            </div>
          </div>

          {/* Разделы команды и миссии */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Секция команды */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Раздел команды</h3>
                </div>
                <input
                  type="checkbox"
                  checked={aboutData.team_section.enabled}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    team_section: { ...prev.team_section, enabled: e.target.checked }
                  }))}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                />
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={aboutData.team_section.title}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    team_section: { ...prev.team_section, title: e.target.value }
                  }))}
                  placeholder="Заголовок раздела команды"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                />
                <textarea
                  value={aboutData.team_section.description}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    team_section: { ...prev.team_section, description: e.target.value }
                  }))}
                  rows={3}
                  placeholder="Описание команды"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none text-sm"
                />
              </div>
            </div>

            {/* Секция миссии */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Раздел миссии</h3>
                </div>
                <input
                  type="checkbox"
                  checked={aboutData.mission_section.enabled}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    mission_section: { ...prev.mission_section, enabled: e.target.checked }
                  }))}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                />
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={aboutData.mission_section.title}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    mission_section: { ...prev.mission_section, title: e.target.value }
                  }))}
                  placeholder="Заголовок раздела миссии"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                />
                <textarea
                  value={aboutData.mission_section.description}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    mission_section: { ...prev.mission_section, description: e.target.value }
                  }))}
                  rows={3}
                  placeholder="Описание миссии и целей"
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Дополнительные разделы */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Дополнительные разделы</h3>
              </div>
              <button
                onClick={addSection}
                className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              >
                <Edit className="w-4 h-4" />
                Добавить раздел
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e)}
              accept="image/*"
              className="hidden"
            />

            <div className="space-y-4">
              {aboutData.sections.map((section, index) => (
                <div key={section.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Раздел {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={section.order}
                        onChange={(e) => updateSection(section.id, { order: Number(e.target.value) })}
                        className="w-16 p-1 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
                        min="1"
                        title="Порядок отображения"
                      />
                      <button
                        onClick={() => removeSection(section.id)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        title="Удалить раздел"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="Заголовок раздела"
                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                      />
                      <textarea
                        value={section.description}
                        onChange={(e) => updateSection(section.id, { description: e.target.value })}
                        rows={4}
                        placeholder="Описание раздела"
                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none text-sm"
                      />
                    </div>

                    <div className="space-y-3">
                      {section.image ? (
                        <div className="relative">
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${section.image}`}
                            alt={section.title}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                          />
                          <button
                            onClick={() => updateSection(section.id, { image: undefined })}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            fileInputRef.current?.click();
                            fileInputRef.current?.setAttribute('data-section-id', section.id);
                          }}
                          disabled={isUploading}
                          className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-gray-50 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
                        >
                          {isUploading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Загрузить изображение
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {aboutData.sections.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Нет дополнительных разделов</p>
                  <p className="text-xs mt-1">Нажмите "Добавить раздел" для создания нового</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAbout;