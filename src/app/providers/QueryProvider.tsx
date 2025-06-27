// src/app/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';

// Создаем клиент с оптимальными настройками
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Время, в течение которого данные считаются "свежими" (не требуют перезапроса)
      staleTime: 5 * 60 * 1000, // 5 минут
      
      // Время, в течение которого данные хранятся в кэше после того, как компонент размонтирован
      gcTime: 10 * 60 * 1000, // 10 минут (ранее cacheTime)
      
      // Автоматический повтор запросов при ошибке
      retry: (failureCount, error: any) => {
        // Не повторяем запросы для ошибок аутентификации или 404
        if (error?.status === 401 || error?.status === 404) {
          return false;
        }
        // Повторяем максимум 3 раза
        return failureCount < 3;
      },
      
      // Интервал между повторными попытками
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Автоматическое обновление данных при фокусе на окне
      refetchOnWindowFocus: false,
      
      // Автоматическое обновление данных при восстановлении соединения
      refetchOnReconnect: true,
      
      // Показывать ошибки в консоли
      throwOnError: false,
    },
    mutations: {
      // Автоматический повтор мутаций при ошибке
      retry: 1,
      
      // Интервал между повторными попытками для мутаций
      retryDelay: 1000,
      
      // Показывать ошибки в консоли
      throwOnError: false,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider = ({ children }: QueryProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Показываем DevTools только в режиме разработки */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
};

export { queryClient };