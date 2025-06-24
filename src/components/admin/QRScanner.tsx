// src/components/admin/QRScanner.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Users, Calendar, MapPin, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string; // Опционально для привязки к событию
}

interface ScannedUser {
  userId: string;
  userName: string;
  userEmail: string;
  qrToken: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  scanned_at: string;
  event_id?: string;
  location?: string;
  notes?: string;
  profiles: {
    name: string;
    email: string;
  };
  events?: {
    title: string;
  };
}

const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, eventId }) => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<AttendanceRecord[]>([]);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRecentScans();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const fetchRecentScans = async () => {
    try {
      const { data, error } = await supabase
        .from('user_attendance')
        .select(`
          *,
          profiles!user_attendance_user_id_fkey(name, email),
          events(title)
        `)
        .order('scanned_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentScans(data || []);
    } catch (error) {
      console.error('Error fetching recent scans:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      
      setIsScanning(true);
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error('Не удалось запустить камеру');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const processQRCode = async (qrData: string) => {
    try {
      const parsed = JSON.parse(qrData);
      
      if (parsed.type !== 'user_attendance' || !parsed.userId || !parsed.qrToken) {
        throw new Error('Неверный формат QR-кода');
      }

      // Проверяем валидность токена
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, email, qr_token')
        .eq('id', parsed.userId)
        .eq('qr_token', parsed.qrToken)
        .single();

      if (error || !profile) {
        throw new Error('QR-код недействителен или устарел');
      }

      setScannedUser({
        userId: profile.id,
        userName: profile.name || profile.email.split('@')[0],
        userEmail: profile.email,
        qrToken: profile.qr_token
      });

      stopCamera();
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка обработки QR-кода');
    }
  };

  const confirmAttendance = async () => {
    if (!scannedUser || !user) return;

    try {
      setLoading(true);

      const attendanceData = {
        user_id: scannedUser.userId,
        scanned_by: user.id,
        event_id: eventId || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        attendance_type: eventId ? 'event' : 'general'
      };

      const { error } = await supabase
        .from('user_attendance')
        .insert([attendanceData]);

      if (error) throw error;

      toast.success(`Посещение отмечено для ${scannedUser.userName}`);
      
      // Сбрасываем состояние
      setScannedUser(null);
      setLocation('');
      setNotes('');
      
      // Обновляем список недавних сканирований
      await fetchRecentScans();
      
    } catch (error) {
      console.error('Error recording attendance:', error);
      toast.error('Ошибка при записи посещения');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // Здесь можно добавить библиотеку для декодирования QR из изображения
        // Например, jsQR или qr-scanner
        toast.info('Функция сканирования из файла будет добавлена');
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Сканер QR-кодов</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          {eventId && (
            <p className="text-primary-100 text-sm mt-1">
              Отметка посещения мероприятия
            </p>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {!scannedUser ? (
            <>
              {/* Scanner Interface */}
              <div className="text-center mb-6">
                {!isScanning ? (
                  <div className="space-y-4">
                    <div className="w-64 h-64 bg-gray-100 dark:bg-dark-700 rounded-lg flex items-center justify-center mx-auto">
                      <Camera className="h-16 w-16 text-gray-400" />
                    </div>
                    <button
                      onClick={startCamera}
                      className="btn-primary"
                    >
                      Запустить камеру
                    </button>
                    
                    {/* File Upload Alternative */}
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      или
                      <label className="block mt-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <span className="btn-outline cursor-pointer">
                          Загрузить изображение QR-кода
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative w-64 h-64 mx-auto bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-4 border-2 border-primary-500 rounded-lg"></div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Наведите камеру на QR-код пользователя
                      </p>
                      <button
                        onClick={stopCamera}
                        className="btn-outline"
                      >
                        Остановить камеру
                      </button>
                    </div>

                    {/* Manual Input */}
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                      <p className="text-sm font-medium mb-2">Ручной ввод данных QR-кода:</p>
                      <textarea
                        placeholder="Вставьте данные QR-кода здесь..."
                        className="w-full p-2 border border-gray-300 dark:border-dark-600 rounded-md dark:bg-dark-800"
                        rows={3}
                        onChange={(e) => {
                          if (e.target.value.trim()) {
                            processQRCode(e.target.value.trim());
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Scans */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Недавние сканирования
                </h3>
                
                {recentScans.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {recentScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{scan.profiles.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(scan.scanned_at).toLocaleString('ru-RU')}
                          </p>
                          {scan.events && (
                            <p className="text-xs text-primary-600 dark:text-primary-400">
                              {scan.events.title}
                            </p>
                          )}
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Пока нет записей о посещениях
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Confirmation Screen */
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Пользователь найден</h3>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <p className="font-medium text-lg">{scannedUser.userName}</p>
                  <p className="text-gray-500 dark:text-gray-400">{scannedUser.userEmail}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    ID: {scannedUser.qrToken.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Additional Info Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Местоположение (опционально)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Например: Главный зал, Коворкинг"
                    className="w-full p-3 border border-gray-300 dark:border-dark-600 rounded-lg dark:bg-dark-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Заметки (опционально)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Дополнительная информация о посещении"
                    rows={3}
                    className="w-full p-3 border border-gray-300 dark:border-dark-600 rounded-lg dark:bg-dark-800"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setScannedUser(null)}
                  className="flex-1 btn-outline"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmAttendance}
                  disabled={loading}
                  className="flex-1 btn-primary"
                >
                  {loading ? 'Сохранение...' : 'Подтвердить посещение'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;