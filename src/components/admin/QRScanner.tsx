// src/components/admin/QRScanner.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Users, Calendar, MapPin, MessageSquare, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
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
  const [videoLoaded, setVideoLoaded] = useState(false);
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
          profiles!user_attendance_user_id_fkey(name),
          events(title)
        `)
        .order('scanned_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentScans(data || []);
    } catch (error) {
      console.error('Error fetching recent scans:', error);
    }
  };

  const startCamera = async () => {
    try {
      console.log('🔍 Запуск камеры...');
      setCameraError(null);
      setLoading(true);
      setVideoLoaded(false);

      // Останавливаем предыдущий поток
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Камера не поддерживается');
      }

      // Простые настройки камеры
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      console.log('🎥 Получение потока...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Поток получен:', stream);
      console.log('📊 Треки:', stream.getVideoTracks().length);

      if (videoRef.current) {
        const video = videoRef.current;
        
        // Очищаем предыдущий источник
        video.srcObject = null;
        
        // Устанавливаем новый поток
        video.srcObject = stream;
        streamRef.current = stream;
        
        // Настройки видео для лучшей совместимости
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Обработчики событий
        const handleLoadedMetadata = () => {
          console.log('📺 Метаданные загружены');
          console.log('📐 Размеры видео:', video.videoWidth, 'x', video.videoHeight);
          setVideoLoaded(true);
        };

        const handleCanPlay = () => {
          console.log('▶️ Видео готово к воспроизведению');
          video.play().then(() => {
            console.log('✅ Воспроизведение началось');
            setIsScanning(true);
            toast.success('Камера запущена');
          }).catch(err => {
            console.error('❌ Ошибка воспроизведения:', err);
            setCameraError('Ошибка воспроизведения видео');
          });
        };

        const handleError = (event: Event) => {
          console.error('❌ Ошибка видео:', event);
          setCameraError('Ошибка видео элемента');
        };

        // Добавляем обработчики
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);

        // Очистка при размонтировании
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
        };

        // Сохраняем функцию очистки
        video.dataset.cleanup = 'true';

        // Принудительно загружаем видео
        video.load();

        // Таймаут для отладки
        setTimeout(() => {
          if (!videoLoaded) {
            console.warn('⚠️ Видео не загрузилось за 3 секунды');
            console.log('📊 Состояние видео:', {
              readyState: video.readyState,
              networkState: video.networkState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              paused: video.paused,
              srcObject: !!video.srcObject
            });
          }
        }, 3000);

      } else {
        throw new Error('Видео элемент не найден');
      }

    } catch (error) {
      console.error('❌ Ошибка камеры:', error);
      let message = 'Ошибка запуска камеры';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          message = 'Доступ запрещен. Разрешите камеру в настройках.';
        } else if (error.name === 'NotFoundError') {
          message = 'Камера не найдена.';
        } else if (error.name === 'NotReadableError') {
          message = 'Камера занята другим приложением.';
        } else {
          message = error.message;
        }
      }
      
      setCameraError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    console.log('🛑 Остановка камеры...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('🔇 Остановка трека:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Принудительно сбрасываем
    }
    
    setIsScanning(false);
    setVideoLoaded(false);
    setCameraError(null);
  };

  const processQRCode = async (qrData: string) => {
    try {
      const parsed = JSON.parse(qrData);
      
      if (parsed.type === 'user_attendance' && parsed.userId && parsed.qrToken) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, name, email, qr_token')
          .eq('id', parsed.userId)
          .eq('qr_token', parsed.qrToken)
          .single();

        if (error || !profile) {
          throw new Error('QR-код недействителен');
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
      
      if (parsed.type === 'event_registration' && parsed.registrationId && parsed.eventId) {
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
          throw new Error('Регистрация не найдена');
        }

        if (registration.full_name !== parsed.fullName || registration.email !== parsed.email) {
          throw new Error('Данные не соответствуют');
        }

        setScannedUser({
          userId: registration.user_id,
          userName: registration.full_name,
          userEmail: registration.email,
          qrToken: parsed.registrationId,
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
      
      throw new Error('Неверный QR-код');
    } catch (error) {
      console.error('QR processing error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка QR-кода');
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

      if (scannedUser.registrationData) {
        await supabase
          .from('user_event_registrations')
          .update({ 
            attended_at: new Date().toISOString(),
            attendance_confirmed: true 
          })
          .eq('registration_id', scannedUser.registrationData.registrationId)
          .eq('user_id', scannedUser.userId);
      }

      toast.success(`Посещение отмечено: ${scannedUser.userName}`);
      
      setScannedUser(null);
      setLocation('');
      setNotes('');
      await fetchRecentScans();
      
    } catch (error) {
      console.error('Attendance error:', error);
      toast.error('Ошибка записи посещения');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-md max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <h2 className="text-lg font-semibold">QR Сканер</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(95vh-80px)]">
          {!scannedUser ? (
            <div className="space-y-4">
              {/* Scanner Interface */}
              <div className="text-center">
                {!isScanning ? (
                  <div className="space-y-4">
                    <div className="w-full aspect-square max-w-64 mx-auto bg-gray-100 dark:bg-dark-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-dark-600">
                      {cameraError ? (
                        <div className="text-center p-4">
                          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          <p className="text-xs text-red-600 dark:text-red-400">
                            {cameraError}
                          </p>
                        </div>
                      ) : (
                        <Camera className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    
                    <button
                      onClick={startCamera}
                      disabled={loading}
                      className="w-full btn-primary disabled:opacity-50 py-3 text-lg font-medium"
                    >
                      {loading ? 'Запуск...' : '📱 Запустить камеру'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative w-full aspect-square max-w-64 mx-auto bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        style={{ 
                          display: videoLoaded ? 'block' : 'none',
                          transform: 'scaleX(-1)' // Зеркально для удобства
                        }}
                      />
                      
                      {/* Показываем загрузку если видео не готово */}
                      {!videoLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                            <p className="text-sm">Загрузка видео...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Scanning overlay */}
                      {videoLoaded && (
                        <div className="absolute inset-4 border-2 border-primary-500 rounded-lg">
                          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-white"></div>
                          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-white"></div>
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-white"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📷 Наведите на QR-код
                      </p>
                      <button
                        onClick={stopCamera}
                        className="w-full btn-outline py-2"
                      >
                        Остановить
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual Input */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                  <p className="text-sm font-medium mb-2">Ручной ввод:</p>
                  <textarea
                    placeholder="Вставьте JSON данные QR-кода..."
                    className="w-full p-2 border border-gray-300 dark:border-dark-600 rounded text-xs font-mono"
                    rows={2}
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        processQRCode(e.target.value.trim());
                      }
                    }}
                  />
                </div>
              </div>

              {/* Recent Scans - Compact for mobile */}
              <div>
                <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Недавние сканы
                </h3>
                
                {recentScans.length > 0 ? (
                  <div className="space-y-2">
                    {recentScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-700 rounded text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{scan.profiles.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(scan.scanned_at).toLocaleString('ru-RU', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-3 text-sm">
                    Нет сканов
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Confirmation Screen */
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">
                  {scannedUser.registrationData ? '✅ Регистрация найдена' : '👤 Пользователь найден'}
                </h3>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
                  <p className="font-medium">{scannedUser.userName}</p>
                  <p className="text-sm text-gray-500">{scannedUser.userEmail}</p>
                  
                  {scannedUser.registrationData && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-600 text-sm">
                      <p className="font-medium text-primary-600">
                        {scannedUser.registrationData.eventTitle}
                      </p>
                      <p className="text-xs">
                        🎫 {scannedUser.registrationData.adultTickets} взрослых
                        {scannedUser.registrationData.childTickets > 0 && 
                          `, ${scannedUser.registrationData.childTickets} детей`
                        }
                      </p>
                      {scannedUser.registrationData.totalAmount > 0 && (
                        <p className="text-xs">💰 {scannedUser.registrationData.totalAmount} ₽</p>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-2">
                    ID: {scannedUser.qrToken.slice(0, 8)}...
                  </p>
                </div>
              </div>

              {/* Quick Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    📍 Местоположение
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Главный зал, Коворкинг..."
                    className="w-full p-2 border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    📝 Заметки
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Дополнительная информация..."
                    rows={2}
                    className="w-full p-2 border border-gray-300 dark:border-dark-600 rounded dark:bg-dark-800 text-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setScannedUser(null)}
                  className="flex-1 btn-outline py-3"
                >
                  ❌ Отмена
                </button>
                <button
                  onClick={confirmAttendance}
                  disabled={loading}
                  className="flex-1 btn-primary py-3 font-medium"
                >
                  {loading ? '⏳ Сохранение...' : '✅ Подтвердить'}
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