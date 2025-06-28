// src/pages/admin/AdminHomeHeader.tsx - Версия для существующей site_settings
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Save, 
  Loader2, 
  Home, 
  Info, 
  Clock, 
  Users, 
  Building2,
  Edit,
  Upload,
  Trash2,
  Eye,
  ImageIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface SectionConfig {
  enabled: boolean;
  title: string;
  description: string;
  order: number;
  image?: string;
}

interface SiteSettings {
  id?: string;
  header_settings?: {
    enabled: boolean;
    title: string;
    subtitle: string;
    background_image?: string;
  };
  info_section?: SectionConfig;
  rent_selection?: SectionConfig;
  coworking_selection?: SectionConfig;
  navigation_items?: any[];
}

const AdminHomeHeader: React.FC = () => {
  // Состояния
  const [settings, setSettings] = useState<SiteSettings>({
    header_settings: {
      enabled: true,
      title: '',
      subtitle: '',
    },
    info_section: {
      enabled: true,
      title: '',
      description: '',
      order: 1,
    },
    rent_selection: {
      enabled: true,
      title: '',
      description: '',
      order: 2,
    },
    coworking_selection: {
      enabled: true,
      title: '',
      description: '',
      order: 3,
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          header_settings: data.header_settings || {
            enabled: true,
            title: 'Добро пожаловать',
            subtitle: 'Место для работы, обучения и встреч'
          },
          info_section: data.info_section || {
            enabled: true,
            title: 'О нас',
            description: 'Описание организации',
            order: 1
          },
          rent_selection: data.rent_selection || {
            enabled: true,
            title: 'Аренда помещений',
            description: 'Описание услуг аренды',
            order: 2
          },
          coworking_selection: data.coworking_selection || {
            enabled: true,
            title: 'Коворкинг пространство',
            description: 'Описание коворкинга',
            order: 3
          }
        });
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
      toast.error('Ошибка при загрузке настроек сайта');
    } finally {
      setLoading(false);
    }
  };

  // === ОБРАБОТЧИКИ ===
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        header_settings: settings.header_settings,
        info_section: settings.info_section,
        rent_selection: settings.rent_selection,
        coworking_selection: settings.coworking_selection
      };

      let result;
      if (settings.id) {
        // Обновляем существующую запись
        result = await supabase
          .from('site_settings')
          .update(updateData)
          .eq('id', settings.id);
      } else {
        // Создаем новую запись
        result = await supabase
          .from('site_settings')
          .insert([updateData]);
      }

      if (result.error) throw result.error;
      
      toast.success('Настройки сохранены');
      await fetchSettings(); // Перезагружаем данные
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `header_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setSettings(prev => ({
        ...prev,
        header_settings: { 
          ...prev.header_settings!, 
          background_image: fileName 
        }
      }));

      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setIsUploading(false);
    }
  };

  // === СОСТОЯНИЕ ЗАГРУЗКИ ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка настроек...</p>
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
        
        {/* Hero Section Preview */}
        {settings.header_settings?.enabled && (
          <div className="relative h-96 bg-gradient-to-r from-primary-600 to-primary-800 flex items-center justify-center text-white">
            {settings.header_settings.background_image && (
              <img
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${settings.header_settings.background_image}`}
                alt="Hero background"
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
            )}
            <div className="relative z-10 text-center">
              <h1 className="text-4xl font-bold mb-4">{settings.header_settings.title}</h1>
              <p className="text-xl">{settings.header_settings.subtitle}</p>
            </div>
          </div>
        )}

        {/* Sections Preview */}
        <div className="container mx-auto px-4 py-16 space-y-16">
          {settings.info_section?.enabled && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {settings.info_section.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {settings.info_section.description}
              </p>
            </div>
          )}
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
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Настройки главной страницы</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Управление разделами и контентом главной страницы
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Главный баннер */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Главный баннер</h3>
              </div>
              <input
                type="checkbox"
                checked={settings.header_settings?.enabled || false}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  header_settings: { 
                    ...prev.header_settings!, 
                    enabled: e.target.checked 
                  }
                }))}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Заголовок
                </label>
                <input
                  type="text"
                  value={settings.header_settings?.title || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    header_settings: { 
                      ...prev.header_settings!, 
                      title: e.target.value 
                    }
                  }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Добро пожаловать"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Подзаголовок
                </label>
                <input
                  type="text"
                  value={settings.header_settings?.subtitle || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    header_settings: { 
                      ...prev.header_settings!, 
                      subtitle: e.target.value 
                    }
                  }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Место для работы, обучения и встреч"
                />
              </div>
            </div>
          </div>

          {/* Секции */}
          {(['info_section', 'rent_selection', 'coworking_selection'] as const).map((sectionKey) => {
            const section = settings[sectionKey];
            const icons = {
              info_section: Info,
              rent_selection: Building2,
              coworking_selection: Users
            };
            const titles = {
              info_section: 'Блок "О нас"',
              rent_selection: 'Блок "Аренда"',
              coworking_selection: 'Блок "Коворкинг"'
            };
            
            const IconComponent = icons[sectionKey];
            const sectionTitle = titles[sectionKey];

            return (
              <div key={sectionKey} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-5 h-5 text-gray-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{sectionTitle}</h3>
                  </div> 
                  <input
                    type="checkbox"
                    checked={section?.enabled || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      [sectionKey]: { 
                        ...prev[sectionKey]!, 
                        enabled: e.target.checked 
                      }
                    }))}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                  />
                </div>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    value={section?.title || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      [sectionKey]: { 
                        ...prev[sectionKey]!, 
                        title: e.target.value 
                      }
                    }))}
                    placeholder="Заголовок раздела"
                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  />
                  <textarea
                    value={section?.description || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      [sectionKey]: { 
                        ...prev[sectionKey]!, 
                        description: e.target.value 
                      }
                    }))}
                    rows={3}
                    placeholder="Описание раздела"
                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminHomeHeader;