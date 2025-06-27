// src/pages/admin/AdminAttendance.tsx

import React from 'react';
import { Camera } from 'lucide-react';

const AdminAttendance = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Camera className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Посещения
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            QR-сканирование и отметка посещений
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Страница в разработке
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Функционал QR-сканирования будет доступен в ближайшее время
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAttendance;