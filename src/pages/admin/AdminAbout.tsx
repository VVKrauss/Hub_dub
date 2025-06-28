// src/pages/admin/AdminAbout.tsx - Версия для существующей таблицы about_table
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
  Target,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface TeamMember {
  id?: string;
  name: string;
  position: string;
  description?: string;
  photo?: string;
  contacts?: {
    email?: string;
    linkedin?: string;
    twitter?: string;
  };
}

interface Contributor {
  id?: string;
  name: string;
  contribution: string;
  website?: string;
}

interface SupportPlatform {
  id?: string;
  name: string;
  url: string;
  description?: string;
  logo?: string;
}

interface AboutData {
  id?: number;
  project_info: string;
  team_members: TeamMember[];
  contributors: Contributor[];
  support_platforms: SupportPlatform[];
  contact_info: {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
}

const AdminAbout: React.FC = () => {
  // Состояния
  const [aboutData, setAboutData] = useState<AboutData>({
    project_info: '',
    team_members: [],
    contributors: [],
    support_platforms: [],
    contact_info: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showContributorForm, setShowContributorForm] = useState(false);
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [editTeamMember, setEditTeamMember] = useState<TeamMember>({
    name: '',
    position: '',
    description: '',
    contacts: {}
  });
  const [editContributor, setEditContributor] = useState<Contributor>({
    name: '',
    contribution: '',
    website: ''
  });
  const [editPlatform, setEditPlatform] = useState<SupportPlatform>({
    name: '',
    url: '',
    description: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    fetchAboutData();
  }, []);

  const fetchAboutData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('about_table')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setAboutData({
          id: data.id,
          project_info: data.project_info || '',
          team_members: data.team_members || [],
          contributors: data.contributors || [],
          support_platforms: data.support_platforms || [],
          contact_info: data.contact_info || {}
        });
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
      
      const updateData = {
        project_info: aboutData.project_info,
        team_members: aboutData.team_members,
        contributors: aboutData.contributors,
        support_platforms: aboutData.support_platforms,
        contact_info: aboutData.contact_info
      };

      let result;
      if (aboutData.id) {
        // Обновляем существующую запись
        result = await supabase
          .from('about_table')
          .update(updateData)
          .eq('id', aboutData.id);
      } else {
        // Создаем новую запись
        result = await supabase
          .from('about_table')
          .insert([updateData]);
      }

      if (result.error) throw result.error;
      
      toast.success('Настройки страницы "О нас" сохранены');
      await fetchAboutData(); // Перезагружаем данные
    } catch (error) {
      console.error('Error saving about data:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'team' | 'platform') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `about_${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      if (type === 'team') {
        setEditTeamMember(prev => ({ ...prev, photo: fileName }));
      } else {
        setEditPlatform(prev => ({ ...prev, logo: fileName }));
      }

      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setIsUploading(false);
    }
  };

  // Функции для работы с участниками команды
  const saveTeamMember = () => {
    if (!editTeamMember.name.trim() || !editTeamMember.position.trim()) {
      toast.error('Заполните имя и должность');
      return;
    }

    setAboutData(prev => {
      const updatedMembers = editTeamMember.id
        ? prev.team_members.map(member => 
            member.id === editTeamMember.id ? editTeamMember : member
          )
        : [...prev.team_members, { ...editTeamMember, id: `member_${Date.now()}` }];

      return { ...prev, team_members: updatedMembers };
    });

    setShowTeamForm(false);
    setEditTeamMember({ name: '', position: '', description: '', contacts: {} });
  };

  const deleteTeamMember = (id: string) => {
    setAboutData(prev => ({
      ...prev,
      team_members: prev.team_members.filter(member => member.id !== id)
    }));
  };

  // Функции для работы с контрибьюторами
  const saveContributor = () => {
    if (!editContributor.name.trim() || !editContributor.contribution.trim()) {
      toast.error('Заполните имя и вклад');
      return;
    }

    setAboutData(prev => {
      const updatedContributors = editContributor.id
        ? prev.contributors.map(contributor => 
            contributor.id === editContributor.id ? editContributor : contributor
          )
        : [...prev.contributors, { ...editContributor, id: `contributor_${Date.now()}` }];

      return { ...prev, contributors: updatedContributors };
    });

    setShowContributorForm(false);
    setEditContributor({ name: '', contribution: '', website: '' });
  };

  const deleteContributor = (id: string) => {
    setAboutData(prev => ({
      ...prev,
      contributors: prev.contributors.filter(contributor => contributor.id !== id)
    }));
  };

  // Функции для работы с платформами поддержки
  const savePlatform = () => {
    if (!editPlatform.name.trim() || !editPlatform.url.trim()) {
      toast.error('Заполните название и URL');
      return;
    }

    setAboutData(prev => {
      const updatedPlatforms = editPlatform.id
        ? prev.support_platforms.map(platform => 
            platform.id === editPlatform.id ? editPlatform : platform
          )
        : [...prev.support_platforms, { ...editPlatform, id: `platform_${Date.now()}` }];

      return { ...prev, support_platforms: updatedPlatforms };
    });

    setShowPlatformForm(false);
    setEditPlatform({ name: '', url: '', description: '' });
  };

  const deletePlatform = (id: string) => {
    setAboutData(prev => ({
      ...prev,
      support_platforms: prev.support_platforms.filter(platform => platform.id !== id)
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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">О нас</h1>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {aboutData.project_info}
              </p>
            </div>
          </div>

          {/* Команда */}
          {aboutData.team_members.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Наша команда
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aboutData.team_members.map((member) => (
                  <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm text-center">
                    {member.photo && (
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${member.photo}`}
                        alt={member.name}
                        className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                      />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {member.name}
                    </h3>
                    <p className="text-primary-600 dark:text-primary-400 mb-2">
                      {member.position}
                    </p>
                    {member.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {member.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Платформы поддержки */}
          {aboutData.support_platforms.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Поддержите нас
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {aboutData.support_platforms.map((platform) => (
                  <a
                    key={platform.id}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow text-center"
                  >
                    {platform.logo && (
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/${platform.logo}`}
                        alt={platform.name}
                        className="w-16 h-16 mx-auto mb-4 object-cover"
                      />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {platform.name}
                    </h3>
                    {platform.description && (
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {platform.description}
                      </p>
                    )}
                  </a>
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
          {/* Информация о проекте */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Building className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Информация о проекте</h3>
            </div>
            
            <textarea
              value={aboutData.project_info}
              onChange={(e) => setAboutData(prev => ({ ...prev, project_info: e.target.value }))}
              rows={8}
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
              placeholder="Расскажите о вашем проекте, его целях и задачах..."
            />
          </div>

          {/* Контактная информация */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Контактная информация</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={aboutData.contact_info.email || ''}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, email: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="info@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={aboutData.contact_info.phone || ''}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, phone: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="+381 11 123 4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Веб-сайт
                </label>
                <input
                  type="url"
                  value={aboutData.contact_info.website || ''}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, website: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="https://example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Адрес
                </label>
                <input
                  type="text"
                  value={aboutData.contact_info.address || ''}
                  onChange={(e) => setAboutData(prev => ({
                    ...prev,
                    contact_info: { ...prev.contact_info, address: e.target.value }
                  }))}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="Белград, Сербия"
                />
              </div>
            </div>
          </div>

          {/* Команда */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Команда проекта</h3>
              </div>
              <button
                onClick={() => {
                  setEditTeamMember({ name: '', position: '', description: '', contacts: {} });
                  setShowTeamForm(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить участника
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aboutData.team_members.map((member) => (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">{member.name}</h4>
                      <p className="text-primary-600 dark:text-primary-400 text-xs">{member.position}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditTeamMember(member);
                          setShowTeamForm(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteTeamMember(member.id!)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {member.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-xs">{member.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Платформы поддержки */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Платформы поддержки</h3>
              </div>
              <button
                onClick={() => {
                  setEditPlatform({ name: '', url: '', description: '' });
                  setShowPlatformForm(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить платформу
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aboutData.support_platforms.map((platform) => (
                <div key={platform.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">{platform.name}</h4>
                      <a href={platform.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 text-xs hover:underline">
                        {platform.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditPlatform(platform);
                          setShowPlatformForm(true);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deletePlatform(platform.id!)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {platform.description && (
                    <p className="text-gray-600 dark:text-gray-300 text-xs">{platform.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно для команды */}
      {showTeamForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editTeamMember.id ? 'Редактировать участника' : 'Добавить участника'}
                </h2>
                <button
                  onClick={() => setShowTeamForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Имя *
                </label>
                <input
                  type="text"
                  value={editTeamMember.name}
                  onChange={(e) => setEditTeamMember(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Имя участника"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Должность *
                </label>
                <input
                  type="text"
                  value={editTeamMember.position}
                  onChange={(e) => setEditTeamMember(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Должность"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={editTeamMember.description}
                  onChange={(e) => setEditTeamMember(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  placeholder="Краткое описание"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowTeamForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={saveTeamMember}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  {editTeamMember.id ? 'Обновить' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для платформ поддержки */}
      {showPlatformForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editPlatform.id ? 'Редактировать платформу' : 'Добавить платформу'}
                </h2>
                <button
                  onClick={() => setShowPlatformForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название *
                </label>
                <input
                  type="text"
                  value={editPlatform.name}
                  onChange={(e) => setEditPlatform(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Название платформы"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={editPlatform.url}
                  onChange={(e) => setEditPlatform(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={editPlatform.description}
                  onChange={(e) => setEditPlatform(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  placeholder="Описание платформы"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowPlatformForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={savePlatform}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  {editPlatform.id ? 'Обновить' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAbout;