// src/pages/admin/AdminHomeHeader.tsx - Унифицированная версия
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

interface HomeSettings {
  hero_section: {
    enabled: boolean;
    title: string;
    subtitle: string;
    background_image?: string;
  };
  info_section: SectionConfig;
  rent_section: SectionConfig;
  coworking_section: SectionConfig;
  events_section: SectionConfig;
}

const AdminHomeHeader: React.FC = () => {
  // Состояния
  const [settings, setSettings] = useState<HomeSettings>({
    hero_section: {
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
    rent_section: {
      enabled: true,
      title: '',
      description: '',
      order: 2,
    },
    coworking_section: {
      enabled: true,
      title: '',
      description: '',
      order: 3,
    },
    events_section: {
      enabled: true,
      title: '',
      description: '',
      order: 4,
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
        .from('home_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching home settings:', error);
      toast.error('Ошибка при загрузке настроек главной страницы');
    } finally {
      setLoading(false);
    }
  };

  // === ОБРАБОТЧИКИ ===
  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('home_settings')
        .upsert(settings);

      if (error) throw error;
      
      toast.success('Настройки главной страницы сохранены');
    } catch (error) {
      console.error('Error saving home settings:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, sectionType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `home_${sectionType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      if (sectionType === 'hero') {
        setSettings(prev => ({
          ...prev,
          hero_section: { ...prev.hero_section, background_image: fileName }
        }));
      } else {
        setSettings(prev => ({
          ...prev,
          [`${sectionType}_section`]: { 
            ...prev[`${sectionType}_section` as keyof typeof prev] as SectionConfig, 
            image: fileName 
          }
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

  const updateSectionConfig = (sectionKey: keyof HomeSettings, updates: Partial<SectionConfig>) => {
    setSettings(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], ...updates }
    }));
  };

  // === СОСТОЯНИЕ ЗАГРУЗКИ ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка настроек главной страницы...</p>
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
        {settings.hero_section.enabled && (
          <div className="relative h-96 bg-gradient-to-r from-primary-600 to-primary-800 flex items-center justify-center text-white">
            {settings.hero_section.background_image && (
              <img
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${settings.hero_section.background_image}`}
                alt="Hero background"
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
            )}
            <div className="relative z-10 text-center">
              <h1 className="text-4xl font-bold mb-4">{settings.hero_section.title}</h1>
              <p className="text-xl">{settings.hero_section.subtitle}</p>
            </div>
          </div>
        )}

        {/* Sections Preview */}
        <div className="container mx-auto px-4 py-16 space-y-16">
          {Object.entries(settings)
            .filter(([key, section]) => key !== 'hero_section' && (section as SectionConfig).enabled)
            .sort(([, a], [, b]) => (a as SectionConfig).order - (b as SectionConfig).order)
            .map(([key, section]) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {(section as SectionConfig).title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {(section as SectionConfig).description}
                </p>
                {(section as SectionConfig).image && (
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${(section as SectionConfig).image}`}
                    alt={(section as SectionConfig).title}
                    className="w-full h-48 object-cover rounded-lg mt-4"
                  />
                )}
              </div>
            ))}
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
            onChange={(e) => handleImageUpload(e, 'hero')}
            accept="image/*"
            className="hidden"
          />

          {/* Hero Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Главный баннер (Hero)</h3>
              </div>
              <input
                type="checkbox"
                checked={settings.hero_section.enabled}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  hero_section: { ...prev.hero_section, enabled: e.target.checked }
                }))}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Основной заголовок
                </label>
                <input
                  type="text"
                  value={settings.hero_section.title}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    hero_section: { ...prev.hero_section, title: e.target.value }
                  }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Добро пожаловать в наше пространство"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Подзаголовок
                </label>
                <input
                  type="text"
                  value={settings.hero_section.subtitle}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    hero_section: { ...prev.hero_section, subtitle: e.target.value }
                  }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Место для работы, обучения и встреч"
                />
              </div>

              {/* Фоновое изображение */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Фоновое изображение
                </label>
                {settings.hero_section.background_image ? (
                  <div className="relative">
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${settings.hero_section.background_image}`}
                      alt="Hero background"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        hero_section: { ...prev.hero_section, background_image: undefined }
                      }))}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
                  >
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Загрузить фоновое изображение
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Page Sections */}
          {Object.entries(settings)
            .filter(([key]) => key !== 'hero_section')
            .map(([key, section]) => {
              const sectionData = section as SectionConfig;
              const icons = {
                info_section: Info,
                rent_section: Building2,
                coworking_section: Users,
                events_section: Clock
              };
              const titles = {
                info_section: 'Блок "О нас"',
                rent_section: 'Блок "Аренда помещений"',
                coworking_section: 'Блок "Коворкинг пространство"',
                events_section: 'Блок "Мероприятия"'
              };
              
              const IconComponent = icons[key as keyof typeof icons];
              const sectionTitle = titles[key as keyof typeof titles];

              return (
                <div key={key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-5 h-5 text-gray-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{sectionTitle}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={sectionData.order}
                        onChange={(e) => updateSectionConfig(key as keyof HomeSettings, { order: Number(e.target.value) })}
                        className="w-16 p-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        min="1"
                        title="Порядок отображения"
                      />
                      <input
                        type="checkbox"
                        checked={sectionData.enabled}
                        onChange={(e) => updateSectionConfig(key as keyof HomeSettings, { enabled: e.target.checked })}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={sectionData.title}
                      onChange={(e) => updateSectionConfig(key as keyof HomeSettings, { title: e.target.value })}
                      placeholder="Заголовок раздела"
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                    />
                    <textarea
                      value={sectionData.description}
                      onChange={(e) => updateSectionConfig(key as keyof HomeSettings, { description: e.target.value })}
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