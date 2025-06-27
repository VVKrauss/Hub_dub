// src/pages/admin/AdminOblaKarteStats.tsx

import React from 'react';
import { Ticket } from 'lucide-react';

const AdminOblaKarteStats = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Статистика OblaKarte.rs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Анализ продаж билетов и статистика событий
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Страница в разработке
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Интеграция с API OblaKarte.rs будет доступна в ближайшее время
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminOblaKarteStats;