// src/components/admin/QRScanner.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Users, Calendar, MapPin, MessageSquare, Upload } from 'lucide-react';
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
  registrationData?: {
    registrationId: string;
    eventId: string;
    eventTitle?: string;
    adultTickets: number;
    childTickets: number;
    totalAmount: number;
    paymentStatus: string;
  };
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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      fetchRecentScans();
    }
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  const fetchRecentScans = async () => {
    try {
      const { data, error } = await supabase
        .from('user_attendance')
        .select(`
          *,
          profiles!user_attendance_user_id_fkey(name),
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
      setCameraError(null);
      setLoading(true);

      // Останавливаем предыдущий поток если есть
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Проверяем доступность камеры
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Камера не поддерживается в этом браузере');
      }

      // Запрашиваем доступ к камере
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Предпочитаем заднюю камеру
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Ждем когда видео загрузится
        await new Promise((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }

          const video = videoRef.current;
          
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve(undefined);
          };
          
          const onError = (e: Event) => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Ошибка загрузки видео'));
          };

          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
        });

        setIsScanning(true);
        toast.success('Камера запущена');
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось запустить камеру';
      setCameraError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsScanning(false);
    setCameraError(null);
  };

  const processQRCode = async (qrData: string) => {
    try {
      const parsed = JSON.parse(qrData);
      
      // Обработка QR-кода пользователя для посещений
      if (parsed.type === 'user_attendance' && parsed.userId && parsed.qrToken) {
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
        return;
      }
      
      // Обработка QR-кода регистрации на мероприятие
      if (parsed.type === 'event_registration' && parsed.registrationId && parsed.eventId) {
        // Проверяем валидность регистрации
        const { data: registration, error } = await supabase
          .from('user_event_registrations')
          .select(`
            *,
            event:events(id, title, start_at, location),
            profile:profiles(id, name, email)
          `)
          .eq('registration_id', parsed.registrationId)
          .eq('event_id', parsed.eventId)
          .eq('status', 'active')
          .single();

        if (error || !registration) {
          throw new Error('Регистрация не найдена или неактивна');
        }

        // Проверяем соответствие данных в QR-коде
        if (registration.full_name !== parsed.fullName || 
            registration.email !== parsed.email) {
          throw new Error('Данные в QR-коде не соответствуют регистрации');
        }

        // Устанавливаем данные как для обычного пользователя, но с дополнительной информацией о регистрации
        setScannedUser({
          userId: registration.user_id,
          userName: registration.full_name,
          userEmail: registration.email,
          qrToken: parsed.registrationId, // Используем ID регистрации как токен
          registrationData: {
            registrationId: registration.registration_id,
            eventId: registration.event_id,
            eventTitle: registration.event?.title,
            adultTickets: registration.adult_tickets,
            childTickets: registration.child_tickets,
            totalAmount: registration.total_amount,
            paymentStatus: registration.payment_status
          }
        });

        stopCamera();
        return;
      }
      
      throw new Error('Неверный формат QR-кода');
      
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
        event_id: eventId || scannedUser.registrationData?.eventId || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        attendance_type: (eventId || scannedUser.registrationData?.eventId) ? 'event' : 'general'
      };

      const { error } = await supabase
        .from('user_attendance')
        .insert([attendanceData]);

      if (error) throw error;

      // Если это регистрация на мероприятие, также отмечаем посещение в таблице регистраций
      if (scannedUser.registrationData) {
        const { error: regError } = await supabase
          .from('user_event_registrations')
          .update({ 
            attended_at: new Date().toISOString(),
            attendance_confirmed: true 
          })
          .eq('registration_id', scannedUser.registrationData.registrationId)
          .eq('user_id', scannedUser.userId);

        if (regError) {
          console.error('Error updating registration attendance:', regError);
          // Не показываем ошибку пользователю, основная запись посещения прошла успешно
        }
      }

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
        toast.info('Функция сканирования из файла будет добавлена в следующем обновлении');
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
              <h2 className="text-lg font-semibold">QR Сканер</h2>
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
                    <div className="w-64 h-64 bg-gray-100 dark:bg-dark-700 rounded-lg flex items-center justify-center mx-auto border-2 border-dashed border-gray-300 dark:border-dark-600">
                      {cameraError ? (
                        <div className="text-center">
                          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-red-600 dark:text-red-400 max-w-48">
                            {cameraError}
                          </p>
                        </div>
                      ) : (
                        <Camera className="h-16 w-16 text-gray-400" />
                      )}
                    </div>
                    
                    <button
                      onClick={startCamera}
                      disabled={loading}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Запуск камеры...' : 'Запустить камеру'}
                    </button>
                    
                    {/* Alternative Methods */}
                    <div className="space-y-3">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        или используйте альтернативные способы:
                      </div>
                      
                      {/* File Upload */}
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <span className="btn-outline cursor-pointer inline-flex items-center gap-2">
                          <Upload className="h-4 w-4" />
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
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }} // Зеркальное отображение для удобства
                      />
                      {/* QR scanning overlay */}
                      <div className="absolute inset-4 border-2 border-primary-500 rounded-lg">
                        <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-primary-500"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-primary-500"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-primary-500"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-primary-500"></div>
                      </div>
                      
                      {/* Scanning line animation */}
                      <div className="absolute inset-4 overflow-hidden">
                        <div className="absolute w-full h-0.5 bg-primary-500 opacity-75 animate-pulse"></div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Наведите камеру на QR-код
                      </p>
                      <button
                        onClick={stopCamera}
                        className="btn-outline"
                      >
                        Остановить камеру
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Input */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                  <p className="text-sm font-medium mb-2">Ручной ввод данных QR-кода:</p>
                  <textarea
                    placeholder="Вставьте JSON данные QR-кода здесь..."
                    className="w-full p-2 border border-gray-300 dark:border-dark-600 rounded-md dark:bg-dark-800 text-xs font-mono"
                    rows={3}
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        processQRCode(e.target.value.trim());
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Скопируйте и вставьте данные QR-кода для тестирования
                  </p>
                </div>
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
                <h3 className="text-xl font-semibold mb-2">
                  {scannedUser.registrationData ? 'Регистрация найдена' : 'Пользователь найден'}
                </h3>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <p className="font-medium text-lg">{scannedUser.userName}</p>
                  <p className="text-gray-500 dark:text-gray-400">{scannedUser.userEmail}</p>
                  
                  {/* Registration Details */}
                  {scannedUser.registrationData && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-600">
                      <div className="text-sm space-y-1">
                        <p className="font-medium text-primary-600 dark:text-primary-400">
                          {scannedUser.registrationData.eventTitle}
                        </p>
                        <p>
                          Билеты: {scannedUser.registrationData.adultTickets} взрослых
                          {scannedUser.registrationData.childTickets > 0 && 
                            `, ${scannedUser.registrationData.childTickets} детей`
                          }
                        </p>
                        {scannedUser.registrationData.totalAmount > 0 && (
                          <p>Сумма: {scannedUser.registrationData.totalAmount} ₽</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Статус оплаты: {scannedUser.registrationData.paymentStatus === 'paid' ? 'Оплачено' : 
                                          scannedUser.registrationData.paymentStatus === 'pending' ? 'Ожидает оплаты' : 
                                          'Бесплатно'}
                        </p>
                      </div>
                    </div>
                  )}
                  
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