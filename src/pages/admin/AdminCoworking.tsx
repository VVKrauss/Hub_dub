// src/pages/admin/AdminCoworking.tsx - Версия для существующих таблиц
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Save, 
  Loader2, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  X,
  DollarSign,
  Clock,
  Building,
  Eye,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface CoworkingService {
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: 'euro' | 'кофе' | 'RSD';
  period: 'час' | 'день' | 'месяц' | 'Страница';
  image_url?: string;
  active: boolean;
  order: number;
  main_service: boolean;
}

const AdminCoworking: React.FC = () => {
  // Состояния
  const [services, setServices] = useState<CoworkingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<CoworkingService>({
    name: '',
    description: '',
    price: 0,
    currency: 'euro',
    period: 'час',
    active: true,
    order: 1,
    main_service: true
  });
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coworking_info_table')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching coworking services:', error);
      toast.error('Ошибка при загрузке услуг коворкинга');
    } finally {
      setLoading(false);
    }
  };

  // === ОБРАБОТЧИКИ ===
  const handleServiceSave = async () => {
    try {
      if (!editData.name.trim() || editData.price < 0) {
        toast.error('Заполните все обязательные поля');
        return;
      }

      setSaving(true);

      const serviceData = {
        name: editData.name,
        description: editData.description,
        price: editData.price,
        currency: editData.currency,
        period: editData.period,
        image_url: editData.image_url,
        active: editData.active,
        order: editData.order,
        main_service: editData.main_service
      };

      let result;
      if (editData.id) {
        // Обновление
        result = await supabase
          .from('coworking_info_table')
          .update(serviceData)
          .eq('id', editData.id);
      } else {
        // Создание
        result = await supabase
          .from('coworking_info_table')
          .insert([serviceData]);
      }

      if (result.error) throw result.error;

      toast.success(editData.id ? 'Услуга обновлена' : 'Услуга создана');
      setShowForm(false);
      setEditData({
        name: '',
        description: '',
        price: 0,
        currency: 'euro',
        period: 'час',
        active: true,
        order: 1,
        main_service: true
      });
      await fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Ошибка при сохранении услуги');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Удалить услугу?')) return;

    try {
      const { error } = await supabase
        .from('coworking_info_table')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast.success('Услуга удалена');
      await fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Ошибка при удалении услуги');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `coworking_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setEditData(prev => ({ ...prev, image_url: fileName }));
      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setIsUploading(false);
    }
  };

  const getCurrencyLabel = (currency: string) => {
    const labels = {
      euro: '€',
      кофе: '☕',
      RSD: 'RSD'
    };
    return labels[currency as keyof typeof labels] || currency;
  };

  const getPeriodLabel = (period: string) => {
    const labels = {
      час: 'за час',
      день: 'за день',
      месяц: 'за месяц',
      Страница: 'фиксированная'
    };
    return labels[period as keyof typeof labels] || period;
  };

  // === СОСТОЯНИЕ ЗАГРУЗКИ ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка услуг коворкинга...</p>
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
              Коворкинг пространство
            </h1>
          </div>

          {/* Услуги */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services
              .filter(service => service.active)
              .sort((a, b) => a.order - b.order)
              .map((service) => (
                <div key={service.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                  {service.image_url && (
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${service.image_url}`}
                      alt={service.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {service.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      {service.description}
                    </p>
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {service.price} {getCurrencyLabel(service.currency)} <span className="text-sm font-normal text-gray-500">
                        {getPeriodLabel(service.period)}
                      </span>
                    </div>
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
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление коворкингом</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Услуги: {services.length} | Активных: {services.filter(s => s.active).length}
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
                onClick={() => {
                  setEditData({
                    name: '',
                    description: '',
                    price: 0,
                    currency: 'euro',
                    period: 'час',
                    active: true,
                    order: services.length + 1,
                    main_service: true
                  });
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Добавить услугу
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Таблица услуг */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Услуга
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Цена
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                            Нет услуг
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Создайте первую услугу для начала работы
                          </p>
                          <button
                            onClick={() => {
                              setEditData({
                                name: '',
                                description: '',
                                price: 0,
                                currency: 'euro',
                                period: 'час',
                                active: true,
                                order: 1,
                                main_service: true
                              });
                              setShowForm(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Добавить первую услугу
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    services
                      .sort((a, b) => a.order - b.order)
                      .map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {service.image_url && (
                                <img
                                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${service.image_url}`}
                                  alt={service.name}
                                  className="w-12 h-12 rounded-lg object-cover mr-4"
                                />
                              )}
                              <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {service.name}
                                  {service.main_service && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                      Основная
                                    </span>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {service.description}
                                </p>
                                <span className="text-xs text-gray-400">
                                  Порядок: {service.order}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {service.price} {getCurrencyLabel(service.currency)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {getPeriodLabel(service.period)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              service.active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {service.active ? 'Активна' : 'Неактивна'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditData(service);
                                  setShowForm(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(service.id!)}
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

      {/* Модальное окно добавления/редактирования услуги */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editData.id ? 'Редактирование услуги' : 'Добавление услуги'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название услуги *
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Название услуги"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                    placeholder="Описание услуги"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Цена *
                    </label>
                    <input
                      type="number"
                      value={editData.price}
                      onChange={(e) => setEditData(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      min="0"
                      step="0.01"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Валюта
                    </label>
                    <select
                      value={editData.currency}
                      onChange={(e) => setEditData(prev => ({ ...prev, currency: e.target.value as any }))}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="euro">€</option>
                      <option value="кофе">☕</option>
                      <option value="RSD">RSD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Период
                    </label>
                    <select
                      value={editData.period}
                      onChange={(e) => setEditData(prev => ({ ...prev, period: e.target.value as any }))}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="час">За час</option>
                      <option value="день">За день</option>
                      <option value="месяц">За месяц</option>
                      <option value="Страница">Фиксированная</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Порядок отображения
                  </label>
                  <input
                    type="number"
                    value={editData.order}
                    onChange={(e) => setEditData(prev => ({ ...prev, order: Number(e.target.value) }))}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    min="1"
                  />
                </div>

                {/* Изображение */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Изображение
                  </label>
                  {editData.image_url ? (
                    <div className="relative">
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${editData.image_url}`}
                        alt="Service"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                      <button
                        onClick={() => setEditData(prev => ({ ...prev, image_url: undefined }))}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-gray-50 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
                    >
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Загрузить изображение
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={editData.active}
                      onChange={(e) => setEditData(prev => ({ ...prev, active: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Активная услуга
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="main_service"
                      checked={editData.main_service}
                      onChange={(e) => setEditData(prev => ({ ...prev, main_service: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="main_service" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Основная услуга
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleServiceSave}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Сохранение...
                    </>
                  ) : (
                    editData.id ? 'Обновить' : 'Создать'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCoworking;// src/pages/admin/AdminCoworking.tsx - Версия для существующих таблиц
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Save, 
  Loader2, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  X,
  DollarSign,
  Clock,
  Building,
  Eye,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface CoworkingService {
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: 'euro' | 'кофе' | 'RSD';
  period: 'час' | 'день' | 'месяц' | 'Страница';
  image_url?: string;
  active: boolean;
  order: number;
  main_service: boolean;
}

const AdminCoworking: React.FC = () => {
  // Состояния
  const [services, setServices] = useState<CoworkingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<CoworkingService>({
    name: '',
    description: '',
    price: 0,
    currency: 'euro',
    period: 'час',
    active: true,
    order: 1,
    main_service: true
  });
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coworking_info_table')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching coworking services:', error);
      toast.error('Ошибка при загрузке услуг коворкинга');
    } finally {
      setLoading(false);
    }
  };

  // === ОБРАБОТЧИКИ ===
  const handleServiceSave = async () => {
    try {
      if (!editData.name.trim() || editData.price < 0) {
        toast.error('Заполните все обязательные поля');
        return;
      }

      setSaving(true);

      const serviceData = {
        name: editData.name,
        description: editData.description,
        price: editData.price,
        currency: editData.currency,
        period: editData.period,
        image_url: editData.image_url,
        active: editData.active,
        order: editData.order,
        main_service: editData.main_service
      };

      let result;
      if (editData.id) {
        // Обновление
        result = await supabase
          .from('coworking_info_table')
          .update(serviceData)
          .eq('id', editData.id);
      } else {
        // Создание
        result = await supabase
          .from('coworking_info_table')
          .insert([serviceData]);
      }

      if (result.error) throw result.error;

      toast.success(editData.id ? 'Услуга обновлена' : 'Услуга создана');
      setShowForm(false);
      setEditData({
        name: '',
        description: '',
        price: 0,
        currency: 'euro',
        period: 'час',
        active: true,
        order: 1,
        main_service: true
      });
      await fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Ошибка при сохранении услуги');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Удалить услугу?')) return;

    try {
      const { error } = await supabase
        .from('coworking_info_table')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast.success('Услуга удалена');
      await fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Ошибка при удалении услуги');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `coworking_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setEditData(prev => ({ ...prev, image_url: fileName }));
      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setIsUploading(false);
    }
  };

  const getCurrencyLabel = (currency: string) => {
    const labels = {
      euro: '€',
      кофе: '☕',
      RSD: 'RSD'
    };
    return labels[currency as keyof typeof labels] || currency;
  };

  const getPeriodLabel = (period: string) => {
    const labels = {
      час: 'за час',
      день: 'за день',
      месяц: 'за месяц',
      Страница: 'фиксированная'
    };
    return labels[period as keyof typeof labels] || period;
  };

  // === СОСТОЯНИЕ ЗАГРУЗКИ ===
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка услуг коворкинга...</p>
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
              Коворкинг пространство
            </h1>
          </div>

          {/* Услуги */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services
              .filter(service => service.active)
              .sort((a, b) => a.order - b.order)
              .map((service) => (
                <div key={service.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                  {service.image_url && (
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${service.image_url}`}
                      alt={service.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {service.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      {service.description}
                    </p>
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {service.price} {getCurrencyLabel(service.currency)} <span className="text-sm font-normal text-gray-500">
                        {getPeriodLabel(service.period)}
                      </span>
                    </div>
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
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление коворкингом</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  Услуги: {services.length} | Активных: {services.filter(s => s.active).length}
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
                onClick={() => {
                  setEditData({
                    name: '',
                    description: '',
                    price: 0,
                    currency: 'euro',
                    period: 'час',
                    active: true,
                    order: services.length + 1,
                    main_service: true
                  });
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Добавить услугу
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Таблица услуг */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Услуга
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Цена
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Users className="w-12 h-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                            Нет услуг
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Создайте первую услугу для начала работы
                          </p>
                          <button
                            onClick={() => {
                              setEditData({
                                name: '',
                                description: '',
                                price: 0,
                                currency: 'euro',
                                period: 'час',
                                active: true,
                                order: 1,
                                main_service: true
                              });
                              setShowForm(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Добавить первую услугу
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    services
                      .sort((a, b) => a.order - b.order)
                      .map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {service.image_url && (
                                <img
                                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${service.image_url}`}
                                  alt={service.name}
                                  className="w-12 h-12 rounded-lg object-cover mr-4"
                                />
                              )}
                              <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {service.name}
                                  {service.main_service && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                      Основная
                                    </span>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {service.description}
                                </p>
                                <span className="text-xs text-gray-400">
                                  Порядок: {service.order}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {service.price} {getCurrencyLabel(service.currency)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {getPeriodLabel(service.period)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              service.active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {service.active ? 'Активна' : 'Неактивна'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditData(service);
                                  setShowForm(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(service.id!)}
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

      {/* Модальное окно добавления/редактирования услуги */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editData.id ? 'Редактирование услуги' : 'Добавление услуги'}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Название услуги *
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Название услуги"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                    placeholder="Описание услуги"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Цена *
                    </label>
                    <input
                      type="number"
                      value={editData.price}
                      onChange={(e) => setEditData(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      min="0"
                      step="0.01"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Валюта
                    </label>
                    <select
                      value={editData.currency}
                      onChange={(e) => setEditData(prev => ({ ...prev, currency: e.target.value as any }))}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="euro">€</option>
                      <option value="кофе">☕</option>
                      <option value="RSD">RSD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Период
                    </label>
                    <select
                      value={editData.period}
                      onChange={(e) => setEditData(prev => ({ ...prev, period: e.target.value as any }))}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="час">За час</option>
                      <option value="день">За день</option>
                      <option value="месяц">За месяц</option>
                      <option value="Страница">Фиксированная</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Порядок отображения
                  </label>
                  <input
                    type="number"
                    value={editData.order}
                    onChange={(e) => setEditData(prev => ({ ...prev, order: Number(e.target.value) }))}
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    min="1"
                  />
                </div>

                {/* Изображение */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Изображение
                  </label>
                  {editData.image_url ? (
                    <div className="relative">
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${editData.image_url}`}
                        alt="Service"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                      <button
                        onClick={() => setEditData(prev => ({ ...prev, image_url: undefined }))}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-400 dark:hover:border-primary-500 transition-colors bg-gray-50 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
                    >
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Загрузить изображение
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="active"
                      checked={editData.active}
                      onChange={(e) => setEditData(prev => ({ ...prev, active: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Активная услуга
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="main_service"
                      checked={editData.main_service}
                      onChange={(e) => setEditData(prev => ({ ...prev, main_service: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="main_service" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Основная услуга
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleServiceSave}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Сохранение...
                    </>
                  ) : (
                    editData.id ? 'Обновить' : 'Создать'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCoworking;
