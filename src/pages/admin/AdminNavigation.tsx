import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Save, 
  Plus, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Trash2, 
  RotateCcw,
  Layout,
  Settings,
  Palette,
  Monitor
} from 'lucide-react';
import { Button } from '../../shared/ui/Button/Button';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Типы для навигации
type NavItem = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order: number;
};

type TopBarSettings = {
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
};

const AdminNavigation = () => {
  const [activeTab, setActiveTab] = useState<'navigation' | 'topbar'>('navigation');
  const [navItems, setNavItems] = useState<NavItem[]>([]);
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

  // Загрузка данных навигации
  useEffect(() => {
    loadNavigationData();
  }, []);

  const loadNavigationData = async () => {
    try {
      setLoading(true);
      
      // Загружаем навигационные элементы
      const { data: navData, error: navError } = await supabase
        .from('navigation_items')
        .select('*')
        .order('order');

      if (navError) throw navError;

      // Загружаем настройки топбара
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('topbar_settings')
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      setNavItems(navData || []);
      if (settingsData?.topbar_settings) {
        setTopBarSettings(settingsData.topbar_settings);
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

  const handleAddNavItem = async () => {
    if (!newItemLabel.trim() || !newItemPath.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      const newOrder = Math.max(...navItems.map(item => item.order), 0) + 1;
      
      const { data, error } = await supabase
        .from('navigation_items')
        .insert({
          label: newItemLabel.trim(),
          path: newItemPath.trim(),
          visible: true,
          order: newOrder
        })
        .select()
        .single();

      if (error) throw error;

      setNavItems(prev => [...prev, data]);
      setNewItemLabel('');
      setNewItemPath('');
      toast.success('Элемент навигации добавлен');
    } catch (error) {
      console.error('Error adding nav item:', error);
      toast.error('Ошибка при добавлении элемента');
    }
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    try {
      const { error } = await supabase
        .from('navigation_items')
        .update({ visible: !visible })
        .eq('id', id);

      if (error) throw error;

      setNavItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, visible: !visible } : item
        )
      );
      
      toast.success(visible ? 'Элемент скрыт' : 'Элемент показан');
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error('Ошибка при изменении видимости');
    }
  };

  const handleDeleteNavItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('navigation_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNavItems(prev => prev.filter(item => item.id !== id));
      toast.success('Элемент удален');
    } catch (error) {
      console.error('Error deleting nav item:', error);
      toast.error('Ошибка при удалении элемента');
    }
  };

  const saveNavigation = async () => {
    try {
      setSaving(true);
      
      // Сохраняем порядок навигационных элементов
      const updates = navItems.map(item => supabase
        .from('navigation_items')
        .update({ order: item.order })
        .eq('id', item.id)
      );

      await Promise.all(updates);
      toast.success('Порядок навигации сохранен');
    } catch (error) {
      console.error('Error saving navigation:', error);
      toast.error('Ошибка при сохранении навигации');
    } finally {
      setSaving(false);
    }
  };

  const saveTopBarSettings = async () => {
    try {
      setSaving(true);
      
      // Находим или создаем запись настроек
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        // Обновляем существующую запись
        const { error } = await supabase
          .from('site_settings')
          .update({ topbar_settings: topBarSettings })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Создаем новую запись
        const { error } = await supabase
          .from('site_settings')
          .insert({ topbar_settings: topBarSettings });

        if (error) throw error;
      }

      toast.success('Настройки топбара сохранены');
    } catch (error) {
      console.error('Error saving topbar settings:', error);
      toast.error('Ошибка при сохранении настроек топбара');
    } finally {
      setSaving(false);
    }
  };

  const resetTopBarToDefaults = () => {
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
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Управление навигацией</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Настройте элементы навигации и внешний вид топбара
        </p>
      </div>

      {/* Вкладки */}
      <div className="flex mb-8 border-b border-gray-200 dark:border-gray-700">
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
                  {saving ? 'Сохранение...' : 'Сохранить порядок'}
                </Button>
              </div>

              {navItems.length > 0 && (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="navigation">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        {navItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2 border border-gray-200 dark:border-gray-600"
                              >
                                <div className="flex items-center gap-4">
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {item.label}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {item.path}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleVisibility(item.id, item.visible)}
                                    leftIcon={item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  >
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteNavItem(item.id)}
                                    leftIcon={<Trash2 className="h-4 w-4" />}
                                  >
                                  </Button>
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* TopBar Settings Tab */}
      {activeTab === 'topbar' && (
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Настройки топбара</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Настройте внешний вид и поведение верхней панели
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetTopBarToDefaults}
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
              {/* Layout Settings */}
              <div className="space-y-6">
                <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Layout className="h-5 w-5 text-primary-600" />
                  Расположение и стиль
                </h4>

                {/* Alignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Выравнивание
                  </label>
                  <select
                    value={topBarSettings.alignment}
                    onChange={(e) => setTopBarSettings(prev => ({ 
                      ...prev, 
                      alignment: e.target.value as TopBarSettings['alignment'] 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="left">Слева</option>
                    <option value="center">По центру</option>
                    <option value="right">Справа</option>
                    <option value="space-between">Разнести по краям</option>
                  </select>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Стиль
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
                    <option value="rounded">Закругленный</option>
                  </select>
                </div>

                {/* Height */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Высота
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
              </div>

              {/* Visual Settings */}
              <div className="space-y-6">
                <h4 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Palette className="h-5 w-5 text-primary-600" />
                  Внешний вид
                </h4>

                {/* Background */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Фон
                  </label>