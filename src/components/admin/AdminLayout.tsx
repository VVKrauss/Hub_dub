import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Building2, 
  Briefcase,
  Info,
  BarChart3,
  Menu,
  LogOut,
  Download,
  Bell, 
  Settings,
  User,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Camera
} from 'lucide-react';


import { toast } from 'react-hot-toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AdminLayout = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Проверяем размер экрана
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Главная страница', shortLabel: 'Главная' },
  { to: '/admin/events', icon: Calendar, label: 'Мероприятия', shortLabel: 'События' },
  { to: '/admin/speakers', icon: Users, label: 'Спикеры', shortLabel: 'Спикеры' },
  { to: '/admin/attendance', icon: Camera, label: 'Посещения', shortLabel: 'QR-код' }, // Новый пункт
  { to: '/admin/rent', icon: Building2, label: 'Аренда', shortLabel: 'Аренда' },
  { to: '/admin/coworking', icon: Briefcase, label: 'Коворкинг', shortLabel: 'Коворк' },
  { to: '/admin/about', icon: Info, label: 'О нас', shortLabel: 'О нас' },
  { to: '/admin/navigation', icon: Menu, label: 'Навигация', shortLabel: 'Навиг.' },
  { to: '/admin/calendar', icon: Calendar, label: 'Календарь', shortLabel: 'Календ.' },
  { to: '/admin/event-statistics', icon: TrendingUp, label: 'Статистика мероприятий', shortLabel: 'Стат. мер.' },
  { to: '/admin/export', icon: Download, label: 'Экспорт', shortLabel: 'Экспорт' }
];

  const topBarLinks = [
    { to: '/', label: 'Главная' },
    { to: '/events', label: 'Мероприятия' },
    { to: '/speakers', label: 'Спикеры' },
    { to: '/coworking', label: 'Коворкинг' },
    { to: '/about', label: 'О нас' }
  ];

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Вы успешно вышли');
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Ошибка при выходе');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 z-50 shadow-sm">
        <div className="flex items-center justify-between h-full px-4">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <img 
            src="https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_science_hub%20no_title.png"
            alt="Logo"
            className="h-6 w-auto dark:hidden"
          />
          <img 
            src="https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_white_science_hub%20no_title.png"
            alt="Logo"
            className="h-6 w-auto hidden dark:block"
          />
          
          <button
            onClick={handleLogout}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Top Navigation Bar - Desktop */}
      <div className="hidden md:block fixed top-0 left-0 right-0 h-12 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 z-40 shadow-sm">
        <div className="flex items-center justify-between h-full px-4">
          <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}></div>
          
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center space-x-4">
              {topBarLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </Link>
              ))}
            </div>
          </div>
          
          <div className="w-16"></div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 shadow-sm z-50
        transition-all duration-300 ease-in-out
        ${isMobile 
          ? `${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
          : `${isSidebarCollapsed ? 'w-16' : 'w-64'}`
        }
      `}>
        <div className="p-3 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            {(!isSidebarCollapsed || isMobile) && (
              <img 
                src="https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_science_hub%20no_title.png"
                alt="Logo"
                className="h-6 w-auto dark:hidden"
              />
            )}
            {(!isSidebarCollapsed || isMobile) && (
              <img 
                src="https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/logo/logo_white_science_hub%20no_title.png"
                alt="Logo"
                className="h-6 w-auto hidden dark:block"
              />
            )}
            
            {isMobile ? (
              <button
                onClick={closeMobileMenu}
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={toggleSidebar}
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700 rounded"
              >
                {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const showLabel = !isSidebarCollapsed || isMobile;
              const label = isMobile ? item.label : (showLabel ? item.shortLabel : '');
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={isMobile ? closeMobileMenu : undefined}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-2 py-2.5 rounded-md transition-colors group relative
                    ${isActive 
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                    }
                    ${isSidebarCollapsed && !isMobile ? 'justify-center' : ''}
                  `}
                  title={isSidebarCollapsed && !isMobile ? item.label : ''}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {showLabel && <span className="text-sm truncate">{label}</span>}
                  
                  {/* Tooltip for collapsed state */}
                  {isSidebarCollapsed && !isMobile && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-2 px-2 py-2.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group relative
              ${isSidebarCollapsed && !isMobile ? 'justify-center' : ''}
            `}
            title={isSidebarCollapsed && !isMobile ? 'Выйти' : ''}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {(!isSidebarCollapsed || isMobile) && <span className="text-sm">Выйти</span>}
            
            {/* Tooltip for collapsed state */}
            {isSidebarCollapsed && !isMobile && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                Выйти
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`
        transition-all duration-300 ease-in-out
        ${isMobile 
          ? 'ml-0 pt-14' 
          : `${isSidebarCollapsed ? 'ml-16' : 'ml-64'} pt-12`
        }
        p-3 md:p-4
      `}>
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-3 md:p-6 min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-4rem)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;