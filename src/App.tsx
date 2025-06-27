// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Провайдеры
import { QueryProvider } from './app/providers/QueryProvider';
import { AuthContextProvider } from './contexts/AuthContext';

// Страницы
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventPage from './pages/EventPage';
import AboutPage from './pages/AboutPage';
import RentPage from './pages/RentPage';
import CoworkingPage from './pages/CoworkingPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Админ страницы
import AdminLayout from './pages/admin/AdminLayout';
import AdminHomeHeader from './pages/admin/AdminHomeHeader';
import AdminEvents from './pages/admin/AdminEvents';
import CreateEditEventPage from './pages/admin/CreateEditEventPage';
import AdminSpeakers from './pages/admin/AdminSpeakers';
import AdminRent from './pages/admin/AdminRent';
import AdminCoworking from './pages/admin/AdminCoworking';
import AdminAbout from './pages/admin/AdminAbout';
import AdminNavigation from './pages/admin/AdminNavigation';
import AdminExport from './pages/admin/AdminExport';
import AdminCalendarPage from './pages/admin/AdminCalendarPage';
import AdminEventStatistics from './pages/admin/AdminEventStatistics';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminOblakkarteStats from './pages/admin/AdminOblakkarteStats';

// Компоненты защиты маршрутов
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicProtectedRoute from './components/auth/PublicProtectedRoute';

function App() {
  return (
    <QueryProvider>
      <AuthContextProvider>
        <Router>
          <div className="min-h-screen bg-white dark:bg-dark-900">
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/rent" element={<RentPage />} />
              <Route path="/coworking" element={<CoworkingPage />} />
              
              {/* Защищенные публичные маршруты (требуют аутентификации) */}
              <Route path="/profile" element={
                <PublicProtectedRoute>
                  <ProfilePage />
                </PublicProtectedRoute>
              } />
              
              {/* Защищенные админ маршруты */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminHomeHeader />} />
                <Route path="events" element={<AdminEvents />} />
                <Route path="events/new" element={<CreateEditEventPage />} />
                <Route path="events/:id/edit" element={<CreateEditEventPage />} />
                <Route path="speakers" element={<AdminSpeakers />} />
                <Route path="rent" element={<AdminRent />} />
                <Route path="coworking" element={<AdminCoworking />} />
                <Route path="about" element={<AdminAbout />} />
                <Route path="navigation" element={<AdminNavigation />} />
                <Route path="export" element={<AdminExport />} />
                <Route path="calendar" element={<AdminCalendarPage />} />
                <Route path="event-statistics" element={<AdminEventStatistics />} />
                <Route path="attendance" element={<AdminAttendance />} />
                <Route path="oblakkarte-stats" element={<AdminOblakkarteStats />} />
              </Route>

              {/* 404 маршрут */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>

            {/* Глобальные уведомления */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                  border: '1px solid var(--toast-border)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#ffffff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthContextProvider> 
    </QueryProvider>
  );
}

export default App; 