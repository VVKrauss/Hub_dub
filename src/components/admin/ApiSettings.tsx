// src/components/admin/ApiSettings.tsx
import React, { useState, useEffect } from 'react';
import { Key, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ApiKey {
  name: string;
  value: string;
  description: string;
}

const ApiSettings: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('secrets')
        .select('name, value, description')
        .order('name');

      if (error) throw error;

      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast.error('Ошибка при загрузке API ключей');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (name: string, value: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('secrets')
        .upsert({
          name,
          value,
          description: apiKeys.find(k => k.name === name)?.description || ''
        });

      if (error) throw error;

      toast.success('API ключ сохранен');
      await loadApiKeys();
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Ошибка при сохранении API ключа');
    } finally {
      setSaving(false);
    }
  };

  const updateApiKey = (name: string, value: string) => {
    setApiKeys(prev => 
      prev.map(key => 
        key.name === name ? { ...key, value } : key
      )
    );
  };

  const toggleShowKey = (name: string) => {
    setShowKeys(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.slice(0, 4) + '*'.repeat(key.length - 8) + key.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600 dark:text-gray-300">Загрузка настроек API...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Key className="h-5 w-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Настройки API</h3>
      </div>

      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <div key={apiKey.name} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {apiKey.name}
              </label>
              <button
                onClick={() => toggleShowKey(apiKey.name)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                type="button"
              >
                {showKeys[apiKey.name] ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {apiKey.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {apiKey.description}
              </p>
            )}
            
            <div className="flex gap-2">
              <input
                type={showKeys[apiKey.name] ? 'text' : 'password'}
                value={showKeys[apiKey.name] ? apiKey.value : maskKey(apiKey.value)}
                onChange={(e) => updateApiKey(apiKey.name, e.target.value)}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm font-mono"
                placeholder="Введите API ключ..."
              />
              <button
                onClick={() => saveApiKey(apiKey.name, apiKey.value)}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        ))}
        
        {apiKeys.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>API ключи не найдены</p>
            <p className="text-sm">Выполните миграцию для создания таблицы secrets</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiSettings;