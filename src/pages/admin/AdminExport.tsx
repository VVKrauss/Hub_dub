// src/pages/admin/AdminExport.tsx - красивая версия
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Download, 
  Database, 
  FileText, 
  Settings, 
  CheckCircle, 
  Circle,
  Users,
  Calendar,
  Building,
  Heart,
  BarChart3,
  Globe,
  Archive,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type TableInfo = {
  name: string;
  displayName: string;
  description: string;
  icon: any;
  count: number;
  selected: boolean;
  category: 'users' | 'content' | 'system';
  color: string;
};

type ExportSettings = {
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'windows-1251';
  dateFormat: 'ISO' | 'DD.MM.YYYY' | 'MM/DD/YYYY';
  includeHeaders: boolean;
};

const AdminExport = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedTables, setExportedTables] = useState(0);
  const [totalTables, setTotalTables] = useState(0);
  const [currentTable, setCurrentTable] = useState('');
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    delimiter: ',',
    encoding: 'utf-8',
    dateFormat: 'DD.MM.YYYY',
    includeHeaders: true
  });

  // Красивый список таблиц с иконками и описаниями
  const TABLE_DEFINITIONS: Omit<TableInfo, 'count' | 'selected'>[] = [
    {
      name: 'profiles',
      displayName: 'Профили пользователей',
      description: 'Данные пользователей, роли и настройки',
      icon: Users,
      category: 'users',
      color: 'blue'
    },
    {
      name: 'events',
      displayName: 'Мероприятия',
      description: 'События, расписание и информация',
      icon: Calendar,
      category: 'content',
      color: 'green'
    },
    {
      name: 'speakers',
      displayName: 'Спикеры',
      description: 'Докладчики и их профили',
      icon: Users,
      category: 'content',
      color: 'purple'
    },
    {
      name: 'user_attendance',
      displayName: 'Посещения',
      description: 'QR-сканирования и отметки',
      icon: BarChart3,
      category: 'users',
      color: 'orange'
    },
    {
      name: 'user_favorite_events',
      displayName: 'Избранные события',
      description: 'Любимые мероприятия пользователей',
      icon: Heart,
      category: 'users',
      color: 'red'
    },
    {
      name: 'user_favorite_speakers',
      displayName: 'Избранные спикеры',
      description: 'Любимые докладчики пользователей',
      icon: Heart,
      category: 'users',
      color: 'pink'
    },
    {
      name: 'user_event_registrations',
      displayName: 'Регистрации',
      description: 'Записи на мероприятия',
      icon: FileText,
      category: 'users',
      color: 'indigo'
    },
    {
      name: 'site_settings',
      displayName: 'Настройки сайта',
      description: 'Конфигурация и параметры',
      icon: Settings,
      category: 'system',
      color: 'gray'
    },
    {
      name: 'coworking_info_table',
      displayName: 'Коворкинг услуги',
      description: 'Информация о коворкинге',
      icon: Building,
      category: 'content',
      color: 'teal'
    },
    {
      name: 'rent_info',
      displayName: 'Аренда помещений',
      description: 'Данные об аренде',
      icon: Building,
      category: 'content',
      color: 'cyan'
    }
  ];

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const tableInfoPromises = TABLE_DEFINITIONS.map(async (tableDef) => {
        try {
          const { count, error: countError } = await supabase
            .from(tableDef.name)
            .select('*', { count: 'exact', head: true });

          if (countError) {
            console.warn(`Table ${tableDef.name} not accessible:`, countError);
            return null;
          }

          return {
            ...tableDef,
            count: count || 0,
            selected: false
          };
        } catch (error) {
          console.warn(`Error accessing table ${tableDef.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(tableInfoPromises);
      const validTables = results.filter(Boolean) as TableInfo[];
      
      setTables(validTables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setTables(prev => prev.map(table => 
      table.name === tableName 
        ? { ...table, selected: !table.selected }
        : table
    ));
  };

  const selectByCategory = (category: string) => {
    setTables(prev => prev.map(table => 
      table.category === category 
        ? { ...table, selected: true }
        : table
    ));
  };

  const selectAllTables = () => {
    setTables(prev => prev.map(table => ({ ...table, selected: true })));
  };

  const deselectAllTables = () => {
    setTables(prev => prev.map(table => ({ ...table, selected: false })));
  };

  const exportData = async () => {
    const selectedTables = tables.filter(table => table.selected);
    
    if (selectedTables.length === 0) {
      toast.error('Выберите хотя бы одну таблицу для экспорта');
      return;
    }

    try {
      setExporting(true);
      setExportProgress(0);
      setTotalTables(selectedTables.length);
      setExportedTables(0);
      
      const zip = new JSZip();

      for (let i = 0; i < selectedTables.length; i++) {
        const table = selectedTables[i];
        setCurrentTable(table.displayName);
        setExportProgress((i / selectedTables.length) * 100);

        try {
          const { data, error } = await supabase
            .from(table.name)
            .select('*');

          if (error) {
            console.error(`Error exporting ${table.name}:`, error);
            continue;
          }

          if (data && data.length > 0) {
            const csvContent = convertToCSV(data, table.name);
            zip.file(`${table.name}.csv`, csvContent);
          }

          setExportedTables(i + 1);
        } catch (error) {
          console.error(`Error processing table ${table.name}:`, error);
        }
      }

      setExportProgress(100);
      setCurrentTable('Создание архива...');

      // Добавляем README файл
      const readme = generateReadme(selectedTables);
      zip.file('README.txt', readme);

      // Генерируем архив
      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `science-hub-export-${new Date().toISOString().split('T')[0]}.zip`;
      
      saveAs(content, fileName);
      toast.success(`Экспорт завершен! Экспортировано ${selectedTables.length} таблиц`);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при экспорте данных');
    } finally {
      setExporting(false);
      setExportProgress(0);
      setExportedTables(0);
      setCurrentTable('');
      setShowSettingsModal(false);
    }
  };

  const convertToCSV = (data: any[], tableName: string) => {
    if (!data || data.length === 0) return '';

    const delimiter = exportSettings.delimiter;
    const headers = Object.keys(data[0]);
    
    const csvRows = [];
    
    if (exportSettings.includeHeaders) {
      csvRows.push(headers.join(delimiter));
    }
    
    csvRows.push(...data.map(row => 
      headers.map(header => {
        let value = row[header];
        
        // Форматирование дат
        if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) { 
          const date = new Date(value);
          switch (exportSettings.dateFormat) {
            case 'DD.MM.YYYY':
              value = date.toLocaleDateString('ru-RU');
              break;
            case 'MM/DD/YYYY':
              value = date.toLocaleDateString('en-US');
              break;
            default:
              value = date.toISOString();
          }
        }
        
        // Экранирование
        if (value && typeof value === 'string') {
          if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
        }
        
        return value ?? '';
      }).join(delimiter)
    ));

    return csvRows.join('\n');
  };

  const generateReadme = (exportedTables: TableInfo[]) => {
    return `
SCIENCE HUB - ЭКСПОРТ ДАННЫХ
===========================

Дата экспорта: ${new Date().toLocaleString('ru-RU')}
Всего таблиц: ${exportedTables.length}

ЭКСПОРТИРОВАННЫЕ ТАБЛИЦЫ:
${exportedTables.map(table => `
- ${table.name}.csv
  Название: ${table.displayName}
  Описание: ${table.description}
  Записей: ${table.count}
`).join('')}

НАСТРОЙКИ ЭКСПОРТА:
- Разделитель: ${exportSettings.delimiter === ',' ? 'Запятая' : exportSettings.delimiter === ';' ? 'Точка с запятой' : 'Табуляция'}
- Формат даты: ${exportSettings.dateFormat}
- Заголовки: ${exportSettings.includeHeaders ? 'Включены' : 'Не включены'}
- Кодировка: ${exportSettings.encoding}

Создано системой Science Hub
    `.trim();
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800',
      green: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800',
      purple: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800',
      orange: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800',
      red: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800',
      pink: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border-pink-200 dark:border-pink-800',
      indigo: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800',
      gray: 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-gray-200 dark:border-gray-800',
      teal: 'from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200 dark:border-teal-800',
      cyan: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 border-cyan-200 dark:border-cyan-800'
    };
    return colors[color] || colors.gray;
  };

  const groupedTables = {
    users: tables.filter(t => t.category === 'users'),
    content: tables.filter(t => t.category === 'content'),  
    system: tables.filter(t => t.category === 'system')
  };

  const selectedCount = tables.filter(t => t.selected).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
        <p className="text-gray-600 dark:text-gray-400">Загрузка таблиц...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mb-4">
          <Archive className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-2">
          Экспорт данных
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Экспортируйте данные из базы в удобном CSV формате. Выберите нужные таблицы и настройте параметры экспорта.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={selectAllTables}
          className="btn-outline flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Выбрать все ({tables.length})
        </button>
        <button
          onClick={deselectAllTables}
          className="btn-outline flex items-center gap-2"
        >
          <Circle className="h-4 w-4" />
          Снять выбор
        </button>
        <button
          onClick={() => selectByCategory('users')}
          className="btn-outline flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Пользователи ({groupedTables.users.length})
        </button>
        <button
          onClick={() => selectByCategory('content')}
          className="btn-outline flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Контент ({groupedTables.content.length})
        </button>
      </div>

      {/* Tables by Category */}
      {Object.entries(groupedTables).map(([category, categoryTables]) => {
        if (categoryTables.length === 0) return null;
        
        const categoryNames = {
          users: '👥 Пользователи',
          content: '📝 Контент',
          system: '⚙️ Система'
        };

        return (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {categoryNames[category as keyof typeof categoryNames]}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryTables.map((table) => {
                const Icon = table.icon;
                return (
                  <div
                    key={table.name}
                    className={`group cursor-pointer transition-all duration-200 hover:scale-105 ${
                      table.selected ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-900' : ''
                    }`}
                    onClick={() => toggleTableSelection(table.name)}
                  >
                    <div className={`p-6 rounded-xl border-2 bg-gradient-to-br ${getColorClasses(table.color)} ${
                      table.selected 
                        ? 'shadow-lg' 
                        : 'shadow-sm hover:shadow-md'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-3 rounded-lg bg-white dark:bg-dark-800 shadow-sm`}>
                          <Icon className={`h-6 w-6 text-${table.color}-600 dark:text-${table.color}-400`} />
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          table.selected
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-gray-300 dark:border-gray-600 group-hover:border-primary-400'
                        }`}>
                          {table.selected && <CheckCircle className="h-4 w-4 text-white" />}
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {table.displayName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {table.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {table.count} записей
                        </span>
                        <Database className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Export Actions */}
      <div className="flex flex-col items-center space-y-4 pt-8 border-t border-gray-200 dark:border-dark-600">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            Выбрано таблиц: <span className="text-primary-600 dark:text-primary-400">{selectedCount}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Общее количество записей: {tables.filter(t => t.selected).reduce((sum, t) => sum + t.count, 0)}
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => setShowSettingsModal(true)}
            disabled={selectedCount === 0 || exporting}
            className="btn-outline flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Настройки экспорта
          </button>
          <button
            onClick={exportData}
            disabled={selectedCount === 0 || exporting}
            className="btn-primary flex items-center gap-2 px-8"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? 'Экспорт...' : 'Экспортировать'}
          </button>
        </div>
      </div>

      {/* Export Progress */}
      {exporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-4">
                <Archive className="h-16 w-16 text-primary-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Экспорт данных</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentTable}
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Прогресс: {Math.round(exportProgress)}%</span>
                  <span>{exportedTables} из {totalTables}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-dark-600">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Настройки экспорта
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">Разделитель CSV</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: ',', label: 'Запятая (,)' },
                    { value: ';', label: 'Точка с запятой (;)' },
                    { value: '\t', label: 'Табуляция' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setExportSettings(prev => ({ ...prev, delimiter: option.value as any }))}
                      className={`p-3 text-sm rounded-lg border transition-colors ${
                        exportSettings.delimiter === option.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-300 dark:border-dark-600 hover:border-gray-400 dark:hover:border-dark-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Формат даты</label>
                <div className="space-y-2">
                  {[
                    { value: 'DD.MM.YYYY', label: 'ДД.ММ.ГГГГ (31.12.2023)' },
                    { value: 'MM/DD/YYYY', label: 'ММ/ДД/ГГГГ (12/31/2023)' },
                    { value: 'ISO', label: 'ISO (2023-12-31T12:00:00Z)' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setExportSettings(prev => ({ ...prev, dateFormat: option.value as any }))}
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        exportSettings.dateFormat === option.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-300 dark:border-dark-600 hover:border-gray-400 dark:hover:border-dark-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportSettings.includeHeaders}
                    onChange={(e) => setExportSettings(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600"
                  />
                  <span className="text-sm font-medium">Включить заголовки столбцов</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-dark-600 flex justify-end gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="btn-outline"
              >
                Отмена
              </button>
              <button
                onClick={exportData}
                className="btn-primary"
              >
                Начать экспорт
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExport;