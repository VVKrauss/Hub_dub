import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical, Eye, EyeOff, Save } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type NavItem = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
};

type FooterSettings = {
  email: string;
  phone: string;
  address: string;
  workingHours: string;
  socialLinks: {
    telegram: string;
    vk: string;
    youtube: string;
  };
};

const AdminNavigation = () => {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [footerSettings, setFooterSettings] = useState<FooterSettings>({
    email: '',
    phone: '',
    address: '',
    workingHours: '',
    socialLinks: {
      telegram: '',
      vk: '',
      youtube: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [siteSettingsId, setSiteSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSiteSettingsId(data.id);
        setNavItems(data.navigation_items || []);
        setFooterSettings(data.footer_settings || {});
      } else {
        // If no settings exist, create a new record
        const { data: newSettings, error: newError } = await supabase
          .from('site_settings')
          .insert([
            {
              navigation_items: [],
              footer_settings: {}
            }
          ])
          .select('id')
          .single();

        if (newError) throw newError;

        setSiteSettingsId(newSettings.id);
        setNavItems([]);
        setFooterSettings({});
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Ошибка при загрузке настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(navItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setNavItems(items);
  };

  const toggleVisibility = (id: string) => {
    setNavItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleSave = async () => {
    try {
      if (!siteSettingsId) {
        toast.error('Site settings ID is not available.');
        return;
      }

      const { error } = await supabase
        .from('site_settings')
        .update({
          navigation_items: navItems,
          footer_settings: footerSettings
        })
        .eq('id', siteSettingsId);

      if (error) throw error;

      toast.success('Настройки сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ошибка при сохранении настроек');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Управление навигацией</h2>
        <button 
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="h-5 w-5" />
          Сохранить изменения
        </button>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Основное меню</h3>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="nav-items">
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
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <span {...provided.dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-gray-400" />
                            </span>
                            <span>{item.label}</span>
                            <span className="text-sm text-gray-500">{item.path}</span>
                          </div>
                          <button
                            onClick={() => toggleVisibility(item.id)}
                            className={`p-2 rounded-md ${
                              item.visible
                                ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-600'
                            }`}
                            title={item.visible ? 'Скрыть' : 'Показать'}
                          >
                            {item.visible ? (
                              <Eye className="h-5 w-5" />
                            ) : (
                              <EyeOff className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-6">Настройки футера</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label className="block font-medium mb-2">Email для связи</label>
              <input
                type="email"
                value={footerSettings.email}
                onChange={(e) => setFooterSettings(prev => ({
                  ...prev,
                  email: e.target.value
                }))}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label className="block font-medium mb-2">Телефон</label>
              <input
                type="tel"
                value={footerSettings.phone}
                onChange={(e) => setFooterSettings(prev => ({
                  ...prev,
                  phone: e.target.value
                }))}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label className="block font-medium mb-2">Адрес</label>
              <input
                type="text"
                value={footerSettings.address}
                onChange={(e) => setFooterSettings(prev => ({
                  ...prev,
                  address: e.target.value
                }))}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label className="block font-medium mb-2">Часы работы</label>
              <input
                type="text"
                value={footerSettings.workingHours}
                onChange={(e) => setFooterSettings(prev => ({
                  ...prev,
                  workingHours: e.target.value
                }))}
                className="form-input"
              />
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium mb-3">Социальные сети</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="url"
                placeholder="Telegram"
                value={footerSettings.socialLinks.telegram}
                onChange={(e) => setFooterSettings(prev => ({
                  ...prev,
                  socialLinks: {
                    ...prev.socialLinks,
                    telegram: e.target.value
                  }
                }))}
                className="form-input"
              />
              <input
                type="url"
                placeholder="VK"
                value={footerSettings.socialLinks.vk}
                onChange={(e) => setFooterSettings(prev => ({
                  ...prev,
                  socialLinks: {
                    ...prev.socialLinks,
                    vk: e.target.value
                  }
                }))}
                className="form-input"
              />
              <input
                type="url"
                placeholder="YouTube"
                value={footerSettings.socialLinks.youtube}
                onChange={(e) => setFooterSettings(prev => ({
                  ...prev,
                  socialLinks: {
                    ...prev.socialLinks,
                    youtube: e.target.value
                  }
                }))}
                className="form-input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNavigation;
