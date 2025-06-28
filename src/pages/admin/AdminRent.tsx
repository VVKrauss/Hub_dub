// src/pages/admin/AdminRent.tsx - Версия для существующей таблицы rent_info_settings
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Save, 
  Loader2, 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  DollarSign,
  Clock,
  Check,
  Eye,
  ImageIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface RentSettings {
  id?: number;
  title: string;
  description: string;
  photos: string[];
  pricelist: Array<{
    name: string;
    price: number;
    description?: string;
  }>;
  contacts: {
    phone?: string;
    email?: string;
    address?: string;
  };
}

const AdminRent: React.FC = () => {
  // Состояния
  const [settings, setSettings] = useState<RentSettings>({
    title: '',
    description: '',
    photos: [],
    pricelist: [],
    contacts: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newPriceItem, setNewPriceItem] = useState({ name: '', price: 0, description: '' });
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
        .from('rent_info_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          title: data.title || '',
          description: data.description || '',
          photos: data.photos || [],
          pricelist: data.pricelist || [],
          contacts: data.contacts || {}
        });
      }
    } catch (error) {
      console.error('Error fetching rent settings:', error);
      toast.error('Ошибка при загрузке настроек аренды');
    } finally {
      setLoading(false);
    }
  };

  // === ОБРАБОТЧИКИ ===
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        title: settings.title,
        description: settings.description,
        photos: settings.photos,
        pricelist: settings.pricelist,
        contacts: settings.contacts
      };

      let result;
      if (settings.id) {
        // Обновляем существующую запись
        result = await supabase
          .from('rent_info_settings')
          .update(updateData)
          .eq('id', settings.id);
      } else {
        // Создаем новую запись
        result = await supabase
          .from('rent_info_settings')
          .insert([updateData]);
      }

      if (result.error) throw result.error;
      
      toast.success('Настройки аренды сохранены');
      await fetchSettings(); // Перезагружаем данные
    } catch (error) {
      console.error('Error saving rent settings:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `rent_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setSettings(prev => ({
        ...prev,
        photos: [...prev.photos, fileName]
      }));

      toast.success('Фотография загружена');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Ошибка при загрузке фотографии');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!confirm('Удалить фотографию?')) return;

    try {
      const { error } = await supabase.storage
        .from('images')
        .remove([photoUrl]);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        photos: prev.photos.filter(photo => photo !== photoUrl)
      }));

      toast.success('Фотография удалена');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Ошибка при удалении фотографии');
    }
  };

  const addPriceItem = () => {
    if (!newPriceItem.name.trim() || newPriceItem.price <= 0) {
      toast.error('Заполните название и цену');
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      pricelist: [...prev.pricelist, { ...newPriceItem }]
    }));
    setNewPriceItem({ name: '', price: 0, description: '' });
  };

  const removePriceItem = (index: number) => {
    setSettings(prev => ({
      ...prev,
      pricelist: prev.pricelist.filter((_, i) => i !== index)
    }));
  };

  // === СОСТОЯНИЕ ЗАГРУЗКИ ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка настроек аренды...</p>
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
              {settings.title || 'Аренда помещений'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {settings.description}
            </p>
          </div>

          {/* Фотогалерея */}
          {settings.photos.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Фотогалерея
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settings.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${photo}`}
                    alt={`Rent photo ${index + 1}`}
                    className="w-full h-64 object-cover rounded-lg shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Прайс-лист */}
          {settings.pricelist.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Прайс-лист
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.pricelist.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
                      <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                        {item.price} €
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
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
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление арендой</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Настройка информации о помещениях для аренды
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
          {/* Основная информация */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Основная информация</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Заголовок страницы
                </label>
                <input
                  type="text"
                  value={settings.title}
                  onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Введите заголовок страницы аренды"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  placeholder="Опишите ваши помещения для аренды..."
                />
              </div>
            </div>
          </div>

          {/* Контактная информация */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Контактная информация</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={settings.contacts.phone || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, phone: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="+381 11 123 4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.contacts.email || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, email: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="info@rent.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={settings.contacts.address || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, address: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="Белград, Сербия"
                />
              </div>
            </div>
          </div>

          {/* Прайс-лист */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Прайс-лист услуг</h3>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Добавление новой услуги */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Добавить услугу</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newPriceItem.name}
                    onChange={(e) => setNewPriceItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Название услуги"
                    className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  />
                  <input
                    type="number"
                    value={newPriceItem.price || ''}
                    onChange={(e) => setNewPriceItem(prev => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="Цена (€)"
                    className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="text"
                    value={newPriceItem.description}
                    onChange={(e) => setNewPriceItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Описание"
                    className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  />
                  <button
                    onClick={addPriceItem}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Добавить
                  </button>
                </div>
              </div>
              
              {/* Список услуг */}
              <div className="space-y-2">
                {settings.pricelist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</span>
                        <span className="font-bold text-primary-600 dark:text-primary-400 text-sm">{item.price} €</span>
                      </div>
                      {item.description && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removePriceItem(index)}
                      className="ml-3 p-1 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Фотогалерея */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Фотогалерея</h3>
            </div>
            
            {/* Загрузка фотографий */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            
            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-center">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-500" />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    {isUploading ? 'Загрузка...' : 'Нажмите для загрузки фотографии'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    PNG, JPG, GIF до 10MB
                  </p>
                </div>
              </button>
              
              {/* Превью фотографий */}
              {settings.photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {settings.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${photo}`}
                        alt={`Rent photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRent;// src/pages/admin/AdminRent.tsx - Версия для существующей таблицы rent_info_settings
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Save, 
  Loader2, 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  DollarSign,
  Clock,
  Check,
  Eye,
  ImageIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface RentSettings {
  id?: number;
  title: string;
  description: string;
  photos: string[];
  pricelist: Array<{
    name: string;
    price: number;
    description?: string;
  }>;
  contacts: {
    phone?: string;
    email?: string;
    address?: string;
  };
}

const AdminRent: React.FC = () => {
  // Состояния
  const [settings, setSettings] = useState<RentSettings>({
    title: '',
    description: '',
    photos: [],
    pricelist: [],
    contacts: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newPriceItem, setNewPriceItem] = useState({ name: '', price: 0, description: '' });
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
        .from('rent_info_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          title: data.title || '',
          description: data.description || '',
          photos: data.photos || [],
          pricelist: data.pricelist || [],
          contacts: data.contacts || {}
        });
      }
    } catch (error) {
      console.error('Error fetching rent settings:', error);
      toast.error('Ошибка при загрузке настроек аренды');
    } finally {
      setLoading(false);
    }
  };

  // === ОБРАБОТЧИКИ ===
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        title: settings.title,
        description: settings.description,
        photos: settings.photos,
        pricelist: settings.pricelist,
        contacts: settings.contacts
      };

      let result;
      if (settings.id) {
        // Обновляем существующую запись
        result = await supabase
          .from('rent_info_settings')
          .update(updateData)
          .eq('id', settings.id);
      } else {
        // Создаем новую запись
        result = await supabase
          .from('rent_info_settings')
          .insert([updateData]);
      }

      if (result.error) throw result.error;
      
      toast.success('Настройки аренды сохранены');
      await fetchSettings(); // Перезагружаем данные
    } catch (error) {
      console.error('Error saving rent settings:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `rent_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setSettings(prev => ({
        ...prev,
        photos: [...prev.photos, fileName]
      }));

      toast.success('Фотография загружена');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Ошибка при загрузке фотографии');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!confirm('Удалить фотографию?')) return;

    try {
      const { error } = await supabase.storage
        .from('images')
        .remove([photoUrl]);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        photos: prev.photos.filter(photo => photo !== photoUrl)
      }));

      toast.success('Фотография удалена');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Ошибка при удалении фотографии');
    }
  };

  const addPriceItem = () => {
    if (!newPriceItem.name.trim() || newPriceItem.price <= 0) {
      toast.error('Заполните название и цену');
      return;
    }
    
    setSettings(prev => ({
      ...prev,
      pricelist: [...prev.pricelist, { ...newPriceItem }]
    }));
    setNewPriceItem({ name: '', price: 0, description: '' });
  };

  const removePriceItem = (index: number) => {
    setSettings(prev => ({
      ...prev,
      pricelist: prev.pricelist.filter((_, i) => i !== index)
    }));
  };

  // === СОСТОЯНИЕ ЗАГРУЗКИ ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка настроек аренды...</p>
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
              {settings.title || 'Аренда помещений'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              {settings.description}
            </p>
          </div>

          {/* Фотогалерея */}
          {settings.photos.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Фотогалерея
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settings.photos.map((photo, index) => (
                  <img
                    key={index}
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${photo}`}
                    alt={`Rent photo ${index + 1}`}
                    className="w-full h-64 object-cover rounded-lg shadow-sm"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Прайс-лист */}
          {settings.pricelist.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Прайс-лист
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {settings.pricelist.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </h3>
                      <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                        {item.price} €
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
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
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление арендой</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Настройка информации о помещениях для аренды
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
          {/* Основная информация */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Основная информация</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Заголовок страницы
                </label>
                <input
                  type="text"
                  value={settings.title}
                  onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Введите заголовок страницы аренды"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  placeholder="Опишите ваши помещения для аренды..."
                />
              </div>
            </div>
          </div>

          {/* Контактная информация */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Контактная информация</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={settings.contacts.phone || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, phone: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="+381 11 123 4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.contacts.email || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, email: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="info@rent.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={settings.contacts.address || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    contacts: { ...prev.contacts, address: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="Белград, Сербия"
                />
              </div>
            </div>
          </div>

          {/* Прайс-лист */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Прайс-лист услуг</h3>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Добавление новой услуги */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Добавить услугу</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newPriceItem.name}
                    onChange={(e) => setNewPriceItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Название услуги"
                    className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  />
                  <input
                    type="number"
                    value={newPriceItem.price || ''}
                    onChange={(e) => setNewPriceItem(prev => ({ ...prev, price: Number(e.target.value) }))}
                    placeholder="Цена (€)"
                    className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="text"
                    value={newPriceItem.description}
                    onChange={(e) => setNewPriceItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Описание"
                    className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  />
                  <button
                    onClick={addPriceItem}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Добавить
                  </button>
                </div>
              </div>
              
              {/* Список услуг */}
              <div className="space-y-2">
                {settings.pricelist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</span>
                        <span className="font-bold text-primary-600 dark:text-primary-400 text-sm">{item.price} €</span>
                      </div>
                      {item.description && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removePriceItem(index)}
                      className="ml-3 p-1 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Фотогалерея */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Фотогалерея</h3>
            </div>
            
            {/* Загрузка фотографий */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            
            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-center">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-500" />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    {isUploading ? 'Загрузка...' : 'Нажмите для загрузки фотографии'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    PNG, JPG, GIF до 10MB
                  </p>
                </div>
              </button>
              
              {/* Превью фотографий */}
              {settings.photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {settings.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${photo}`}
                        alt={`Rent photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRent;