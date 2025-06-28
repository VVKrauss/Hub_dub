// src/pages/admin/AdminAbout.tsx - Часть 1
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

// Интерфейсы согласно реальной структуре БД
interface TeamMember {
  name: string;
  role: string;
  photo?: string;
  bio?: string;
  contacts?: {
    email?: string;
    linkedin?: string;
    twitter?: string;
  };
}

interface Contributor {
  name: string;
  photo?: string;
  contribution?: string;
  website?: string;
}

interface SupportPlatform {
  url: string;
  platform: string;
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
  // Основные состояния
  const [aboutData, setAboutData] = useState<AboutData>({
    project_info: '',
    team_members: [],
    contributors: [],
    support_platforms: [],
    contact_info: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Состояния для форм
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showContributorForm, setShowContributorForm] = useState(false);
  const [showPlatformForm, setShowPlatformForm] = useState(false);

  // Состояния для редактирования
  const [editTeamMember, setEditTeamMember] = useState<TeamMember>({
    name: '',
    role: '',
    bio: '',
    contacts: {}
  });
  const [editContributor, setEditContributor] = useState<Contributor>({
    name: '',
    contribution: '',
    website: ''
  });
  const [editPlatform, setEditPlatform] = useState<SupportPlatform>({
    platform: '',
    url: '',
    description: ''
  });

  // Индексы для редактирования
  const [editingContributorIndex, setEditingContributorIndex] = useState<number | null>(null);
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
  const [editingPlatformIndex, setEditingPlatformIndex] = useState<number | null>(null);

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

  // === СОХРАНЕНИЕ ДАННЫХ ===
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
        result = await supabase
          .from('about_table')
          .update(updateData)
          .eq('id', aboutData.id);
      } else {
        result = await supabase
          .from('about_table')
          .insert([updateData]);
      }

      if (result.error) throw result.error;
      
      toast.success('Настройки страницы "О нас" сохранены');
      await fetchAboutData();
    } catch (error) {
      console.error('Error saving about data:', error);
      toast.error('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  // === ЗАГРУЗКА ФАЙЛОВ ===
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'team' | 'contributor' | 'platform') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `about/${type}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      if (type === 'team') {
        setEditTeamMember(prev => ({ ...prev, photo: publicUrl }));
      } else if (type === 'contributor') {
        setEditContributor(prev => ({ ...prev, photo: publicUrl }));
      } else {
        setEditPlatform(prev => ({ ...prev, logo: publicUrl }));
      }

      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Ошибка при загрузке изображения');
    }
  };

  // src/pages/admin/AdminAbout.tsx - Часть 2: Функции для работы с данными

  // === ФУНКЦИИ ДЛЯ КОМАНДЫ ===
  const saveTeamMember = () => {
    if (!editTeamMember.name.trim() || !editTeamMember.role.trim()) {
      toast.error('Заполните имя и роль');
      return;
    }

    setAboutData(prev => {
      const updatedMembers = [...prev.team_members];
      if (editingTeamIndex !== null) {
        updatedMembers[editingTeamIndex] = editTeamMember;
      } else {
        updatedMembers.push(editTeamMember);
      }
      return { ...prev, team_members: updatedMembers };
    });

    setShowTeamForm(false);
    setEditTeamMember({ name: '', role: '', bio: '', contacts: {} });
    setEditingTeamIndex(null);
  };

  const deleteTeamMember = (index: number) => {
    setAboutData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  const editTeamMember = (index: number) => {
    setEditTeamMember(aboutData.team_members[index]);
    setEditingTeamIndex(index);
    setShowTeamForm(true);
  };

  // === ФУНКЦИИ ДЛЯ КОНТРИБЬЮТОРОВ ===
  const saveContributor = () => {
    if (!editContributor.name.trim()) {
      toast.error('Заполните имя');
      return;
    }

    setAboutData(prev => {
      const updatedContributors = [...prev.contributors];
      if (editingContributorIndex !== null) {
        updatedContributors[editingContributorIndex] = editContributor;
      } else {
        updatedContributors.push(editContributor);
      }
      return { ...prev, contributors: updatedContributors };
    });

    setShowContributorForm(false);
    setEditContributor({ name: '', contribution: '', website: '' });
    setEditingContributorIndex(null);
  };

  const deleteContributor = (index: number) => {
    setAboutData(prev => ({
      ...prev,
      contributors: prev.contributors.filter((_, i) => i !== index)
    }));
  };

  const editContributor = (index: number) => {
    setEditContributor(aboutData.contributors[index]);
    setEditingContributorIndex(index);
    setShowContributorForm(true);
  };

  // === ФУНКЦИИ ДЛЯ ПЛАТФОРМ ПОДДЕРЖКИ ===
  const savePlatform = () => {
    if (!editPlatform.platform.trim() || !editPlatform.url.trim()) {
      toast.error('Заполните название и URL');
      return;
    }

    setAboutData(prev => {
      const updatedPlatforms = [...prev.support_platforms];
      if (editingPlatformIndex !== null) {
        updatedPlatforms[editingPlatformIndex] = editPlatform;
      } else {
        updatedPlatforms.push(editPlatform);
      }
      return { ...prev, support_platforms: updatedPlatforms };
    });

    setShowPlatformForm(false);
    setEditPlatform({ platform: '', url: '', description: '' });
    setEditingPlatformIndex(null);
  };

  const deletePlatform = (index: number) => {
    setAboutData(prev => ({
      ...prev,
      support_platforms: prev.support_platforms.filter((_, i) => i !== index)
    }));
  };

  const editPlatform = (index: number) => {
    setEditPlatform(aboutData.support_platforms[index]);
    setEditingPlatformIndex(index);
    setShowPlatformForm(true);
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

  // src/pages/admin/AdminAbout.tsx - Часть 3: Главный интерфейс

  // === РЕНДЕР ===
  return (
    <div className="space-y-6">
      {/* Заголовок */}
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
              rows={12}
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
              placeholder="Расскажите о вашем проекте, его целях и задачах... (поддерживается HTML)"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Можно использовать HTML-теги для форматирования
            </p>
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

         // src/pages/admin/AdminAbout.tsx - Часть 4: Блоки команды и контрибьюторов

          {/* Команда */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Команда проекта</h3>
              </div>
              <button
                onClick={() => {
                  setEditTeamMember({ name: '', role: '', bio: '', contacts: {} });
                  setEditingTeamIndex(null);
                  setShowTeamForm(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить участника
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aboutData.team_members.map((member, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {member.photo && (
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover mb-2"
                        />
                      )}
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">{member.name}</h4>
                      <p className="text-primary-600 dark:text-primary-400 text-xs">{member.role}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => editTeamMember(index)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteTeamMember(index)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {member.bio && (
                    <p className="text-gray-600 dark:text-gray-300 text-xs">{member.bio}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Контрибьюторы - inline форма */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Контрибьюторы</h3>
              </div>
            </div>

            {/* Список существующих контрибьюторов */}
            <div className="space-y-3 mb-4">
              {aboutData.contributors.map((contributor, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {contributor.photo && (
                        <img
                          src={contributor.photo}
                          alt={contributor.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Имя
                          </label>
                          <input
                            type="text"
                            value={contributor.name}
                            onChange={(e) => {
                              setAboutData(prev => ({
                                ...prev,
                                contributors: prev.contributors.map((c, i) => 
                                  i === index ? { ...c, name: e.target.value } : c
                                )
                              }));
                            }}
                            className="w-full p-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            placeholder="Имя контрибьютора"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Вклад
                          </label>
                          <input
                            type="text"
                            value={contributor.contribution || ''}
                            onChange={(e) => {
                              setAboutData(prev => ({
                                ...prev,
                                contributors: prev.contributors.map((c, i) => 
                                  i === index ? { ...c, contribution: e.target.value } : c
                                )
                              }));
                            }}
                            className="w-full p-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            placeholder="Описание вклада"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Веб-сайт
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={contributor.website || ''}
                              onChange={(e) => {
                                setAboutData(prev => ({
                                  ...prev,
                                  contributors: prev.contributors.map((c, i) => 
                                    i === index ? { ...c, website: e.target.value } : c
                                  )
                                }));
                              }}
                              className="flex-1 p-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                              placeholder="https://example.com"
                            />
                            <button
                              onClick={() => editContributor(index)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                              title="Редактировать фото"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteContributor(index)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                              title="Удалить контрибьютора"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Форма добавления нового контрибьютора */}
            {showContributorForm ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {editingContributorIndex !== null ? 'Редактировать контрибьютора' : 'Новый контрибьютор'}
                  </h4>
                  <button
                    onClick={() => {
                      setShowContributorForm(false);
                      setEditContributor({ name: '', contribution: '', website: '' });
                      setEditingContributorIndex(null);
                    }}
                    className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={editContributor.name}
                        onChange={(e) => setEditContributor(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 text-sm border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900/30 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Имя контрибьютора *"
                      />
                    </div>
                    
                    <div>
                      <input
                        type="text"
                        value={editContributor.contribution || ''}
                        onChange={(e) => setEditContributor(prev => ({ ...prev, contribution: e.target.value }))}
                        className="w-full p-2 text-sm border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900/30 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Описание вклада"
                      />
                    </div>
                    
                    <div>
                      <input
                        type="url"
                        value={editContributor.website || ''}
                        onChange={(e) => setEditContributor(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full p-2 text-sm border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-blue-900/30 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  
                  {/* Загрузка фото */}
                  <div>
                    <label className="block text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Фото
                    </label>
                    <div className="flex items-center gap-3">
                      {editContributor.photo && (
                        <img
                          src={editContributor.photo}
                          alt="Preview"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'contributor')}
                        className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowContributorForm(false);
                      setEditContributor({ name: '', contribution: '', website: '' });
                      setEditingContributorIndex(null);
                    }}
                    className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={saveContributor}
                    className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {editingContributorIndex !== null ? 'Обновить' : 'Добавить'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditContributor({ name: '', contribution: '', website: '' });
                  setEditingContributorIndex(null);
                  setShowContributorForm(true);
                }}
                className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить контрибьютора
              </button>
            )}
          </div>

          {/* // src/pages/admin/AdminAbout.tsx - Часть 5: Платформы поддержки и модальные окна
 */}
          {/* Платформы поддержки */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Платформы поддержки</h3>
              </div>
              <button
                onClick={() => {
                  setEditPlatform({ platform: '', url: '', description: '' });
                  setEditingPlatformIndex(null);
                  setShowPlatformForm(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Добавить платформу
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aboutData.support_platforms.map((platform, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {platform.logo && (
                        <img
                          src={platform.logo}
                          alt={platform.platform}
                          className="w-8 h-8 object-cover mb-2"
                        />
                      )}
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">{platform.platform}</h4>
                      <a href={platform.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 text-xs hover:underline break-all">
                        {platform.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => editPlatform(index)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deletePlatform(index)}
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
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingTeamIndex !== null ? 'Редактировать участника' : 'Добавить участника'}
                </h2>
                <button
                  onClick={() => {
                    setShowTeamForm(false);
                    setEditTeamMember({ name: '', role: '', bio: '', contacts: {} });
                    setEditingTeamIndex(null);
                  }}
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
                  Роль *
                </label>
                <input
                  type="text"
                  value={editTeamMember.role}
                  onChange={(e) => setEditTeamMember(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Роль в проекте"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Биография
                </label>
                <textarea
                  value={editTeamMember.bio || ''}
                  onChange={(e) => setEditTeamMember(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  placeholder="Краткая биография"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Фото
                </label>
                <div className="flex items-center gap-3">
                  {editTeamMember.photo && (
                    <img
                      src={editTeamMember.photo}
                      alt="Preview"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'team')}
                    className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/50 dark:file:text-primary-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowTeamForm(false);
                    setEditTeamMember({ name: '', role: '', bio: '', contacts: {} });
                    setEditingTeamIndex(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={saveTeamMember}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  {editingTeamIndex !== null ? 'Обновить' : 'Добавить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* // src/pages/admin/AdminAbout.tsx - Часть 6: Модальное окно платформ и экспорт
 */}
      {/* Модальное окно для платформ поддержки */}
      {showPlatformForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-dark-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingPlatformIndex !== null ? 'Редактировать платформу' : 'Добавить платформу'}
                </h2>
                <button
                  onClick={() => {
                    setShowPlatformForm(false);
                    setEditPlatform({ platform: '', url: '', description: '' });
                    setEditingPlatformIndex(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название платформы *
                </label>
                <input
                  type="text"
                  value={editPlatform.platform}
                  onChange={(e) => setEditPlatform(prev => ({ ...prev, platform: e.target.value }))}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Patreon, Boosty, PayPal..."
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
                  value={editPlatform.description || ''}
                  onChange={(e) => setEditPlatform(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                  placeholder="Описание платформы"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Логотип
                </label>
                <div className="flex items-center gap-3">
                  {editPlatform.logo && (
                    <img
                      src={editPlatform.logo}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'platform')}
                    className="flex-1 text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/50 dark:file:text-primary-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPlatformForm(false);
                    setEditPlatform({ platform: '', url: '', description: '' });
                    setEditingPlatformIndex(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={savePlatform}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  {editingPlatformIndex !== null ? 'Обновить' : 'Добавить'}
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