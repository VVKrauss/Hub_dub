// src/pages/admin/AdminExport.tsx - исправленная версия
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Download, Save, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type TableInfo = {
  name: string;
  count: number;
  selected: boolean;
};

type ExportSettings = {
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'windows-1251';
  dateFormat: 'ISO' | 'DD.MM.YYYY' | 'MM/DD/YYYY';
};

const AdminExport = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    delimiter: ',',
    encoding: 'utf-8',
    dateFormat: 'ISO'
  });

  // Предопределенный список таблиц вместо запроса к information_schema
  const AVAILABLE_TABLES = [
    'profiles',
    'events',
    'speakers',
    'user_attendance',
    'user_favorite_events',
    'user_favorite_speakers',
    'user_event_registrations',
    'site_settings',
    'coworking_info_table',
    'coworking_header',
    'rent_info',
    'about_page_content'
  ];

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const tableInfoPromises = AVAILABLE_TABLES.map(async (tableName) => {
        try {
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (countError) {
            console.warn(`Table ${tableName} not accessible:`, countError);
            return null;
          }

          return {
            name: tableName,
            count: count || 0,
            selected: false
          };
        } catch (error) {
          console.warn(`Error accessing table ${tableName}:`, error);
          return null;
        }
      });

      const results = await Promise.all(tableInfoPromises);
      const validTables = results.filter(Boolean) as TableInfo[];
      
      setTables(validTables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Ошибка загрузки списка таблиц');
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
      
      const zip = new JSZip();
      const totalTables = selectedTables.length;

      for (let i = 0; i < selectedTables.length; i++) {
        const table = selectedTables[i];
        setExportProgress((i / totalTables) * 100);

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
        } catch (error) {
          console.error(`Error processing table ${table.name}:`, error);
        }
      }

      setExportProgress(100);

      // Генерируем архив
      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `export_${new Date().toISOString().split('T')[0]}.zip`;
      
      saveAs(content, fileName);
      toast.success('Экспорт завершен успешно');
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при экспорте данных');
    } finally {
      setExporting(false);
      setExportProgress(0);
      setShowExportModal(false);
    }
  };

  const convertToCSV = (data: any[], tableName: string) => {
    if (!data || data.length === 0) return '';

    const delimiter = exportSettings.delimiter;
    const headers = Object.keys(data[0]);
    
    const csvRows = [
      headers.join(delimiter),
      ...data.map(row => 
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
          
          // Экранирование специальных символов
          if (value && typeof value === 'string') {
            if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
              value = `"${value.replace(/"/g, '""')}"`;
            }
          }
          
          return value ?? '';
        }).join(delimiter)
      )
    ];

    return csvRows.join('\n');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-2">
            Экспорт данных
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Экспорт данных из базы в CSV формате
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={selectAllTables}
            className="btn-outline"
          >
            Выбрать все
          </button>
          <button
            onClick={deselectAllTables}
            className="btn-outline"
          >
            Снять выбор
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={!tables.some(t => t.selected) || exporting}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Экспорт...' : 'Экспортировать'}
          </button>
        </div>
      </div>

      {/* Tables List */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-dark-600">
          <h2 className="text-xl font-semibold">Доступные таблицы</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <div
                key={table.name}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  table.selected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-dark-600 hover:border-gray-300 dark:hover:border-dark-500'
                }`}
                onClick={() => toggleTableSelection(table.name)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {table.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {table.count} записей
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    table.selected
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-dark-600'
                  }`}>
                    {table.selected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Настройки экспорта</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Разделитель CSV</label>
                  <select
                    value={exportSettings.delimiter}
                    onChange={(e) => setExportSettings(prev => ({
                      ...prev,
                      delimiter: e.target.value as ',' | ';' | '\t'
                    }))}
                    className="w-full p-2 border border-gray-300 dark:border-dark-600 rounded-md dark:bg-dark-700"
                  >
                    <option value=",">Запятая (,)</option>
                    <option value=";">Точка с запятой (;)</option>
                    <option value="\t">Табуляция</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Формат даты</label>
                  <select
                    value={exportSettings.dateFormat}
                    onChange={(e) => setExportSettings(prev => ({
                      ...prev,
                      dateFormat: e.target.value as 'ISO' | 'DD.MM.YYYY' | 'MM/DD/YYYY'
                    }))}
                    className="w-full p-2 border border-gray-300 dark:border-dark-600 rounded-md dark:bg-dark-700"
                  >
                    <option value="ISO">ISO (2023-12-31T12:00:00Z)</option>
                    <option value="DD.MM.YYYY">ДД.ММ.ГГГГ</option>
                    <option value="MM/DD/YYYY">ММ/ДД/ГГГГ</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="btn-outline"
                >
                  Отмена
                </button>
                <button
                  onClick={exportData}
                  disabled={exporting}
                  className="btn-primary"
                >
                  {exporting ? 'Экспорт...' : 'Начать экспорт'}
                </button>
              </div>

              {exporting && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Экспорт: {Math.round(exportProgress)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExport;// src/pages/admin/AdminExport.tsx - исправленная версия
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Download, Save, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type TableInfo = {
  name: string;
  count: number;
  selected: boolean;
};

type ExportSettings = {
  delimiter: ',' | ';' | '\t';
  encoding: 'utf-8' | 'windows-1251';
  dateFormat: 'ISO' | 'DD.MM.YYYY' | 'MM/DD/YYYY';
};

const AdminExport = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    delimiter: ',',
    encoding: 'utf-8',
    dateFormat: 'ISO'
  });

  // Предопределенный список таблиц вместо запроса к information_schema
  const AVAILABLE_TABLES = [
    'profiles',
    'events',
    'speakers',
    'user_attendance',
    'user_favorite_events',
    'user_favorite_speakers',
    'user_event_registrations',
    'site_settings',
    'coworking_info_table',
    'coworking_header',
    'rent_info',
    'about_page_content'
  ];

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const tableInfoPromises = AVAILABLE_TABLES.map(async (tableName) => {
        try {
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (countError) {
            console.warn(`Table ${tableName} not accessible:`, countError);
            return null;
          }

          return {
            name: tableName,
            count: count || 0,
            selected: false
          };
        } catch (error) {
          console.warn(`Error accessing table ${tableName}:`, error);
          return null;
        }
      });

      const results = await Promise.all(tableInfoPromises);
      const validTables = results.filter(Boolean) as TableInfo[];
      
      setTables(validTables);
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Ошибка загрузки списка таблиц');
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
      
      const zip = new JSZip();
      const totalTables = selectedTables.length;

      for (let i = 0; i < selectedTables.length; i++) {
        const table = selectedTables[i];
        setExportProgress((i / totalTables) * 100);

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
        } catch (error) {
          console.error(`Error processing table ${table.name}:`, error);
        }
      }

      setExportProgress(100);

      // Генерируем архив
      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `export_${new Date().toISOString().split('T')[0]}.zip`;
      
      saveAs(content, fileName);
      toast.success('Экспорт завершен успешно');
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при экспорте данных');
    } finally {
      setExporting(false);
      setExportProgress(0);
      setShowExportModal(false);
    }
  };

  const convertToCSV = (data: any[], tableName: string) => {
    if (!data || data.length === 0) return '';

    const delimiter = exportSettings.delimiter;
    const headers = Object.keys(data[0]);
    
    const csvRows = [
      headers.join(delimiter),
      ...data.map(row => 
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
          
          // Экранирование специальных символов
          if (value && typeof value === 'string') {
            if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
              value = `"${value.replace(/"/g, '""')}"`;
            }
          }
          
          return value ?? '';
        }).join(delimiter)
      )
    ];

    return csvRows.join('\n');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent mb-2">
            Экспорт данных
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Экспорт данных из базы в CSV формате
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={selectAllTables}
            className="btn-outline"
          >
            Выбрать все
          </button>
          <button
            onClick={deselectAllTables}
            className="btn-outline"
          >
            Снять выбор
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={!tables.some(t => t.selected) || exporting}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Экспорт...' : 'Экспортировать'}
          </button>
        </div>
      </div>

      {/* Tables List */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-dark-600">
          <h2 className="text-xl font-semibold">Доступные таблицы</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <div
                key={table.name}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  table.selected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-dark-600 hover:border-gray-300 dark:hover:border-dark-500'
                }`}
                onClick={() => toggleTableSelection(table.name)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {table.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {table.count} записей
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    table.selected
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-dark-600'
                  }`}>
                    {table.selected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Настройки экспорта</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Разделитель CSV</label>
                  <select
                    value={exportSettings.delimiter}
                    onChange={(e) => setExportSettings(prev => ({
                      ...prev,
                      delimiter: e.target.value as ',' | ';' | '\t'
                    }))}
                    className="w-full p-2 border border-gray-300 dark:border-dark-600 rounded-md dark:bg-dark-700"
                  >
                    <option value=",">Запятая (,)</option>
                    <option value=";">Точка с запятой (;)</option>
                    <option value="\t">Табуляция</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Формат даты</label>
                  <select
                    value={exportSettings.dateFormat}
                    onChange={(e) => setExportSettings(prev => ({
                      ...prev,
                      dateFormat: e.target.value as 'ISO' | 'DD.MM.YYYY' | 'MM/DD/YYYY'
                    }))}
                    className="w-full p-2 border border-gray-300 dark:border-dark-600 rounded-md dark:bg-dark-700"
                  >
                    <option value="ISO">ISO (2023-12-31T12:00:00Z)</option>
                    <option value="DD.MM.YYYY">ДД.ММ.ГГГГ</option>
                    <option value="MM/DD/YYYY">ММ/ДД/ГГГГ</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="btn-outline"
                >
                  Отмена
                </button>
                <button
                  onClick={exportData}
                  disabled={exporting}
                  className="btn-primary"
                >
                  {exporting ? 'Экспорт...' : 'Начать экспорт'}
                </button>
              </div>

              {exporting && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Экспорт: {Math.round(exportProgress)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExport;