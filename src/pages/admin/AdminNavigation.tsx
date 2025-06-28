import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Layout, 
  Settings, 
  Plus, 
  Save, 
  Eye, 
  EyeOff, 
  Trash2, 
  GripVertical,
  Loader2,
  Palette,
  Monitor,
  RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../shared/ui/Button/Button';
import { toast } from 'react-hot-toast';

// Типы для навигации
interface NavigationItem {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order: number;
}

interface TopBarSettings {
  alignment: 'left' | 'center' | 'right' | 'space-between';
  style: 'classic' | 'modern' | 'minimal' | 'rounded';
  spacing: 'compact' | 'normal' | 'relaxed';
  height: 'compact' | 'normal' | 'large';
  showBorder: boolean;
  showShadow: boolean;
  backgroundColor: 'white' | 'transparent' | 'blur';
  animation: 'none' | 'slide' | 'fade' | 'bounce';
  mobileCollapse: boolean;
  showIcons: boolean;
  showBadges: boolean;
  stickyHeader: boolean;
  maxWidth: 'container' | 'full' | 'screen-xl';
}

const AdminNavigation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'navigation' | 'topbar'>('navigation');
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);
  const [topBarSettings, setTopBarSettings] = useState<TopBarSettings>({
    alignment: 'space-between',
    style: 'modern',
    spacing: 'normal',
    height: 'normal',
    showBorder: true,
    showShadow: true,
    backgroundColor: 'white',
    animation: 'none',
    mobileCollapse: true,
    showIcons: true,
    showBadges: true,
    stickyHeader: true,
    maxWidth: 'container'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemPath, setNewItemPath] = useState('');
  const [siteSettingsId, setSiteSettingsId] = useState<string | null>(null);

  // Загрузка данных навигации
  useEffect(() => {
    loadNavigationData();
  }, []);

  const loadNavigationData = async () => {
    try {
      setLoading(true);
      
      // Загружаем настройки сайта
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (settingsData) {
        setSiteSettingsId(settingsData.id);
        
        // Загружаем навигационные элементы из JSONB поля
        const navigationItems = settingsData.navigation_items || [];
        setNavItems(navigationItems);
        
        // Загружаем настройки топбара
        if (settingsData.topbar_settings) {
          setTopBarSettings({ ...topBarSettings, ...settingsData.topbar_settings });
        }
      } else {
        // Создаем новую запись настроек, если её нет
        const { data: newSettings, error: createError } = await supabase
          .from('site_settings')
          .insert({
            navigation_items: [],
            topbar_settings: topBarSettings
          })
          .select()
          .single();

        if (createError) throw createError;
        setSiteSettingsId(newSettings.id);
      }
    } catch (error) {
      console.error('Error loading navigation data:', error);
      toast.error('Ошибка при загрузке данных навигации');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(navItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Обновляем порядок
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setNavItems(updatedItems);
  };

  const handleAddNavItem = () => {
    if (!newItemLabel.trim() || !newItemPath.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    const newOrder = Math.max(...navItems.map(item => item.order), -1) + 1;
    const newItem: NavigationItem = {
      id: crypto.randomUUID(),
      label: newItemLabel.trim(),
      path: newItemPath.trim(),
      visible: true,
      order: newOrder
    };

    setNavItems(prev => [...prev, newItem]);
    setNewItemLabel('');
    setNewItemPath('');
    toast.success('Элемент навигации добавлен');
  };

  const handleToggleVisibility = (id: string) => {
    setNavItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleDeleteNavItem = (id: string) => {
    setNavItems(prev => prev.filter(item => item.id !== id));
    toast.success('Элемент удален');
  };

  const saveNavigation = async () => {
    if (!siteSettingsId) {
      toast.error('Ошибка: не найдены настройки сайта');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          navigation_items: navItems.sort((a, b) => a.order - b.order)
        })
        .eq('id', siteSettingsId);

      if (error) throw error;
      
      toast.success('Навигация сохранена');
    } catch (error) {
      console.error('Error saving navigation:', error);
      toast.error('Ошибка при сохранении навигации');
    } finally {
      setSaving(false);
    }
  };

  const saveTopBarSettings = async () => {
    if (!siteSettingsId) {
      toast.error('Ошибка: не найдены настройки сайта');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('site_settings')
        .update({ topbar_settings: topBarSettings })
        .eq('id', siteSettingsId);

      if (error) throw error;
      
      toast.success('Настройки топбара сохранены');
    } catch (error) {
      console.error('Error saving topbar settings:', error);
      toast.error('Ошибка при сохранении настроек топбара');
    } finally {
      setSaving(false);
    }
  };

  const resetTopBarSettings = () => {
    setTopBarSettings({
      alignment: 'space-between',
      style: 'modern',
      spacing: 'normal',
      height: 'normal',
      showBorder: true,
      showShadow: true,
      backgroundColor: 'white',
      animation: 'none',
      mobileCollapse: true,
      showIcons: true,
      showBadges: true,
      stickyHeader: true,
      maxWidth: 'container'
    });
    toast.success('Настройки сброшены к значениям по умолчанию');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Управление навигацией
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-600">
        <button
          onClick={() => setActiveTab('navigation')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'navigation'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Layout className="inline-block w-5 h-5 mr-2" />
          Навигация
        </button>
        <button
          onClick={() => setActiveTab('topbar')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'topbar'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Settings className="inline-block w-5 h-5 mr-2" />
          Топбар
        </button>
      </div>

      {/* Navigation Tab */}
      {activeTab === 'navigation' && (
        <div className="space-y-6">
          {/* Добавление нового элемента */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Добавить элемент навигации
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название
                </label>
                <input
                  type="text"
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  placeholder="Например: О нас"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Путь
                </label>
                <input
                  type="text"
                  value={newItemPath}
                  onChange={(e) => setNewItemPath(e.target.value)}
                  placeholder="Например: /about"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={handleAddNavItem}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Добавить элемент
              </Button>
            </div>
          </div>

          {/* Список элементов навигации */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Элементы навигации
                </h3>
                <Button
                  variant="primary"
                  onClick={saveNavigation}
                  loading={saving}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="navigation-items">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {navItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg"
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-5 w-5 text-gray-400" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {item.label}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.path}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleVisibility(item.id)}
                                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                  title={item.visible ? 'Скрыть' : 'Показать'}
                                >
                                  {item.visible ? (
                                    <Eye className="h-4 w-4" />
                                  ) : (
                                    <EyeOff className="h-4 w-4" />
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteNavItem(item.id)}
                                  className="p-2 text-red-500 hover:text-red-700"
                                  title="Удалить"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {navItems.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Элементы навигации не найдены
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TopBar Tab */}
      {activeTab === 'topbar' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Настройки топбара
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={resetTopBarSettings}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                >
                  Сбросить
                </Button>
                <Button
                  variant="primary"
                  onClick={saveTopBarSettings}
                  loading={saving}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Левая колонка - Основные настройки */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="h-5 w-5 text-primary-600" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    Основные настройки
                  </h4>
                </div>

                {/* Выравнивание */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Выравнивание контента
                  </label>
                  <select
                    value={topBarSettings.alignment}
                    onChange={(e) => setTopBarSettings(prev => ({ 
                      ...prev, 
                      alignment: e.target.value as TopBarSettings['alignment']
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="left">По левому краю</option>
                    <option value="center">По центру</option>
                    <option value="right">По правому краю</option>
                    <option value="space-between">Равномерное распределение</option>
                  </select>
                </div>

                {/* Стиль */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Стиль топбара
                  </label>
                  <select
                    value={topBarSettings.style}
                    onChange={(e) => setTopBarSettings(prev => ({ 
                      ...prev, 
                      style: e.target.value as TopBarSettings['style']
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="classic">Классический</option>
                    <option value="modern">Современный</option>
                    <option value="minimal">Минимальный</option>
                    <option value="rounded">Скругленный</option>
                  </select>
                </div>

                {/* Размер */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Высота топбара
                  </label>
                  <select
                    value={topBarSettings.height}
                    onChange={(e) => setTopBarSettings(prev => ({ 
                      ...prev, 
                      height: e.target.value as TopBarSettings['height']
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="compact">Компактная</option>
                    <option value="normal">Обычная</option>
                    <option value="large">Большая</option>
                  </select>
                </div>

                {/* Отступы */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Внутренние отступы
                  </label>
                  <select
                    value={topBarSettings.spacing}
                    onChange={(e) => setTopBarSettings(prev => ({ 
                      ...prev, 
                      spacing: e.target.value as TopBarSettings['spacing']
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="compact">Компактные</option>
                    <option value="normal">Обычные</option>
                    <option value="relaxed">Увеличенные</option>
                  </select>
                </div>

                {/* Максимальная ширина */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Максимальная ширина
                  </label>
                  <select
                    value={topBarSettings.maxWidth}
                    onChange={(e) => setTopBarSettings(prev => ({ 
                      ...prev, 
                      maxWidth: e.target.value as TopBarSettings['maxWidth']
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="container">Контейнер</option>
                    <option value="full">Полная ширина</option>
                    <option value="screen-xl">Широкий экран</option>
                  </select>
                </div>
              </div>

              {/* Правая колонка - Внешний вид */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="h-5 w-5 text-primary-600" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    Внешний вид
                  </h4>
                </div>

                {/* Цвет фона */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Фон топбара
                  </label>
                  <select
                    value={topBarSettings.backgroundColor}
                    onChange={(e) => setTopBarSettings(prev => ({ 
                      ...prev, 
                      backgroundColor: e.target.value as TopBarSettings['backgroundColor']
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="white">Белый</option>
                    <option value="transparent">Прозрачный</option>
                    <option value="blur">Размытый</option>
                  </select>
                </div>

                {/* Анимация */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Анимация появления
                  </label>
                  <select
                    value={topBarSettings.animation}
                    onChange={(e) => setTopBarSettings(prev => ({ 
                      ...prev, 
                      animation: e.target.value as TopBarSettings['animation']
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="none">Без анимации</option>
                    <option value="fade">Затухание</option>
                    <option value="slide">Скольжение</option>
                    <option value="bounce">Отскок</option>
                  </select>
                </div>

                {/* Переключатели */}
                <div className="space-y-4">
                  {[
                    { key: 'showBorder', label: 'Показать границу' },
                    { key: 'showShadow', label: 'Показать тень' },
                    { key: 'stickyHeader', label: 'Закрепленный заголовок' },
                    { key: 'mobileCollapse', label: 'Сворачивать на мобильных' },
                    { key: 'showIcons', label: 'Показать иконки' },
                    { key: 'showBadges', label: 'Показать бейджи' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {label}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={topBarSettings[key as keyof TopBarSettings] as boolean}
                          onChange={(e) => setTopBarSettings(prev => ({ 
                            ...prev, 
                            [key]: e.target.checked 
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Предварительный просмотр */}
            <div className="mt-8 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Предварительный просмотр:
              </h5>
              <div 
                className={`
                  w-full p-4 rounded-lg transition-all
                  ${topBarSettings.backgroundColor === 'white' ? 'bg-white' : 
                    topBarSettings.backgroundColor === 'transparent' ? 'bg-transparent border border-gray-200' : 
                    'bg-gray-100/50 backdrop-blur-sm'}
                  ${topBarSettings.showBorder ? 'border-b border-gray-200' : ''}
                  ${topBarSettings.showShadow ? 'shadow-sm' : ''}
                  ${topBarSettings.height === 'compact' ? 'py-2' : 
                    topBarSettings.height === 'large' ? 'py-6' : 'py-4'}
                  ${topBarSettings.spacing === 'compact' ? 'px-2' : 
                    topBarSettings.spacing === 'relaxed' ? 'px-8' : 'px-4'}
                  flex items-center
                  ${topBarSettings.alignment === 'center' ? 'justify-center' :
                    topBarSettings.alignment === 'right' ? 'justify-end' :
                    topBarSettings.alignment === 'space-between' ? 'justify-between' : 'justify-start'}
                `}
              >
                <div className="text-sm text-gray-600 font-medium">Логотип</div>
                {topBarSettings.alignment === 'space-between' && (
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Главная</span>
                    <span>О нас</span>
                    <span>Контакты</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNavigation;