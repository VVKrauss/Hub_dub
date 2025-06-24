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

  useEffect(() => {
    fetchTables();
  }, []);

const fetchTables = async () => {
  try {
    setLoading(true);
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'flyway_schema_history');

    if (tablesError) throw tablesError;

    const tableInfoPromises = (tablesData || []).map(async ({ table_name }) => {
      const { count, error: countError } = await supabase
        .from(table_name)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error(`Error getting count for ${table_name}:`, countError);
        return {
          name: table_name,
          count: 0,
          selected: false
        };
      }

      return {
        name: table_name,
        count: count || 0,
        selected: false
      };
    });

    const tableInfo = await Promise.all(tableInfoPromises);
    setTables(tableInfo);
  } catch (error) {
    console.error('Error fetching tables:', error);
    toast.error('Ошибка при загрузке списка таблиц');
  } finally {
    setLoading(false);
  }
};


  const toggleAllTables = () => {
    const allSelected = tables.every(table => table.selected);
    setTables(prev => prev.map(table => ({ ...table, selected: !allSelected })));
  };

  const convertToCSV = (data: any[], delimiter: string): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(delimiter),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return value.toString();
        }).join(delimiter)
      )
    ];
    
    return csvRows.join('\n');
  };

  const formatDate = (dateStr: string, format: string): string => {
    const date = new Date(dateStr);
    switch (format) {
      case 'DD.MM.YYYY':
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
      case 'MM/DD/YYYY':
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
      default:
        return date.toISOString();
    }
  };

  const handleExport = async () => {
    const selectedTables = tables.filter(table => table.selected);
    if (selectedTables.length === 0) {
      toast.error('Выберите хотя бы одну таблицу для экспорта');
      return;
    }

    setExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();
      const totalTables = selectedTables.length;
      
      for (let i = 0; i < selectedTables.length; i++) {
        const table = selectedTables[i];
        const { data, error } = await supabase
          .from(table.name)
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          // Format dates according to settings
          const formattedData = data.map(row => {
            const newRow = { ...row };
            Object.keys(newRow).forEach(key => {
              if (typeof newRow[key] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(newRow[key])) {
                newRow[key] = formatDate(newRow[key], exportSettings.dateFormat);
              }
            });
            return newRow;
          });

          const csv = convertToCSV(formattedData, exportSettings.delimiter);
          const blob = new Blob([csv], { type: 'text/csv;charset=' + exportSettings.encoding });
          zip.file(`${table.name}.csv`, blob);
        }

        setExportProgress(((i + 1) / totalTables) * 100);
      }

      if (includeMedia) {
        const { data: mediaFiles, error: mediaError } = await supabase.storage
          .from('images')
          .list();

        if (!mediaError && mediaFiles) {
          const mediaFolder = zip.folder('media');
          for (const file of mediaFiles) {
            const { data, error: downloadError } = await supabase.storage
              .from('images')
              .download(file.name);

            if (!downloadError && data) {
              mediaFolder?.file(file.name, data);
            }
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      saveAs(content, `export_${timestamp}.zip`);

      toast.success('Экспорт успешно завершен');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при экспорте данных');
    } finally {
      setExporting(false);
      setShowExportModal(false);
      setExportProgress(0);
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Экспорт данных</h2>
        <button
          onClick={() => setShowExportModal(true)}
          disabled={!tables.some(table => table.selected) || exporting}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="h-5 w-5" />
          {exporting ? `Экспорт... ${Math.round(exportProgress)}%` : 'Экспортировать'}
        </button>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-lg shadow p-6">
        <div className="mb-6">
          <button
            onClick={toggleAllTables}
            className="btn-outline"
          >
            {tables.every(table => table.selected) ? 'Снять выбор' : 'Выбрать все'}
          </button>
        </div>

        <div className="space-y-2">
          {tables.map(table => (
            <div
              key={table.name}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={table.selected}
                  onChange={() => toggleTableSelection(table.name)}
                  className="form-checkbox h-5 w-5 text-primary-600"
                />
                <span className="font-medium">{table.name}</span>
                <span className="text-sm text-gray-500">({table.count} записей)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Settings Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-4">Настройки экспорта</h3>

            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-2">Разделитель CSV</label>
                <select
                  value={exportSettings.delimiter}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, delimiter: e.target.value as ',' | ';' | '\t' }))}
                  className="form-input"
                >
                  <option value=",">Запятая (,)</option>
                  <option value=";">Точка с запятой (;)</option>
                  <option value="\t">Табуляция</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-2">Кодировка</label>
                <select
                  value={exportSettings.encoding}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, encoding: e.target.value as 'utf-8' | 'windows-1251' }))}
                  className="form-input"
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="windows-1251">Windows-1251</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-2">Формат дат</label>
                <select
                  value={exportSettings.dateFormat}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, dateFormat: e.target.value as 'ISO' | 'DD.MM.YYYY' | 'MM/DD/YYYY' }))}
                  className="form-input"
                >
                  <option value="ISO">ISO (YYYY-MM-DD)</option>
                  <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeMedia}
                    onChange={(e) => setIncludeMedia(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span>Включить медиафайлы в экспорт</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="btn-outline"
              >
                Отмена
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn-primary"
              >
                {exporting ? 'Экспорт...' : 'Экспортировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExport;
