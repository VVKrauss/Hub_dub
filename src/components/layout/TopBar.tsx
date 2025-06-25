// src/components/layout/TopBar.tsx
// Обновленная версия с использованием AuthContext

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../ui/Logo';
import LoginModal from '../auth/LoginModal';
import UserProfileDropdown from '../ui/UserProfileDropdown';

type NavItem = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
};

const TopBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { user, signOut } = useAuth(); // Используем AuthContext
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNavItems();

    // Close mobile menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNavItems = async () => {
    try {
      const { data, error } = await supabase
        .from('navigation_items')
        .select('*')
        .eq('visible', true)
        .order('order_index');

      if (error) throw error;

      setNavItems(data || []);
    } catch (error) {
      console.error('Error fetching nav items:', error);
      // Fallback navigation items
      setNavItems([
        { id: '1', label: 'Главная', path: '/', visible: true },
        { id: '2', label: 'Мероприятия', path: '/events', visible: true },
        { id: '3', label: 'Спикеры', path: '/speakers', visible: true },
        { id: '4', label: 'Аренда', path: '/rent', visible: true },
        { id: '5', label: 'Коворкинг', path: '/coworking', visible: true },
        { id: '6', label: 'О нас', path: '/about', visible: true },
      ]);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const visibleNavItems = navItems.filter(item => item.visible);

  // Формируем данные пользователя для UserProfileDropdown
  const userData = user ? {
    id: user.id,
    email: user.email,
    name: user.name || user.profile?.name,
    role: user.profile?.role,
    avatar: user.profile?.avatar, // Используем аватар из профиля
  } : null;

  return (
    <>
      <header className="bg-white dark:bg-dark-900 shadow-sm relative z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex-shrink-0">
              <Logo className="h-8" />
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              {visibleNavItems.map(item => (
                <Link 
                  key={item.id}
                  to={item.path} 
                  className={`py-2 font-medium transition-colors relative ${
                    location.pathname === item.path 
                      ? 'text-primary dark:text-primary-400 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400' 
                      : 'hover:text-primary dark:hover:text-primary-400'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex md:flex-none items-center gap-4">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full hover:bg-dark-100 dark:hover:bg-dark-800"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {userData ? (
              <UserProfileDropdown 
                user={userData} 
                onLogout={handleLogout} 
              />
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-2 p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md"
              >
                <LogIn className="h-5 w-5" />
                <span className="hidden sm:inline">Войти</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden rounded-md text-dark-900 dark:text-white hover:bg-dark-100 dark:hover:bg-dark-800"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
          
          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div 
              ref={menuRef}
              className="md:hidden absolute top-16 left-0 right-0 bg-white dark:bg-dark-900 shadow-lg z-50 animate-fade-in"
            >
              <nav className="container py-5 flex flex-col space-y-4">
                {visibleNavItems.map(item => (
                  <Link 
                    key={item.id}
                    to={item.path} 
                    className={`py-2 font-medium ${
                      location.pathname === item.path 
                        ? 'text-primary dark:text-primary-400' 
                        : 'hover:text-primary dark:hover:text-primary-400'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                
                {userData && (
                  <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
                    <Link 
                      to="/profile" 
                      className="block py-2 font-medium hover:text-primary dark:hover:text-primary-400"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Мой профиль
                    </Link>
                    {userData.role === 'Admin' && (
                      <Link 
                        to="/admin" 
                        className="block py-2 font-medium hover:text-primary dark:hover:text-primary-400"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Панель управления
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-2 font-medium text-red-600 dark:text-red-400"
                    >
                      Выйти
                    </button>
                  </div>
                )}
                
                {!userData && (
                  <button
                    onClick={() => {
                      setLoginModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="text-left py-2 font-medium text-primary-600 dark:text-primary-400"
                  >
                    Войти
                  </button>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Login Modal */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
      />
    </>
  );
};

export default TopBar;