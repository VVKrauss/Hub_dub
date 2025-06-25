// src/components/layout/TopBar.tsx
// Исправленная версия с правильной загрузкой навигации из site_settings

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../ui/Logo';
import LoginModal from '../auth/LoginModal';
import UserProfileDropdown from '../ui/UserProfileDropdown';

type NavItem = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
};

type UserData = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
} | null;

// Fallback навигация на случай если не удается загрузить из БД
const FALLBACK_NAVIGATION = [
  { id: 'home', label: 'Главная', path: '/', visible: true },
  { id: 'events', label: 'Мероприятия', path: '/events', visible: true },
  { id: 'speakers', label: 'Спикеры', path: '/speakers', visible: true },
  { id: 'rent', label: 'Аренда', path: '/rent', visible: true },
  { id: 'coworking', label: 'Коворкинг', path: '/coworking', visible: true },
  { id: 'about', label: 'О нас', path: '/about', visible: true },
];

const TopBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<UserData>(null);
  const [navItems, setNavItems] = useState<NavItem[]>(FALLBACK_NAVIGATION);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNavItems();
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // Close mobile menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      authListener.subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, role, avatar')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      setUser({
        id: userId,
        email: authUser.user?.email || '',
        name: profile?.name || authUser.user?.user_metadata?.name,
        role: profile?.role,
        avatar: profile?.avatar
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback - устанавливаем только базовые данные
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          setUser({
            id: userId,
            email: authUser.user.email || '',
            name: authUser.user.user_metadata?.name,
            role: undefined,
            avatar: undefined
          });
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setUser(null);
      }
    }
  };

  const fetchNavItems = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('navigation_items')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching navigation items:', error);
        // Используем fallback навигацию
        return;
      }

      if (data?.navigation_items && Array.isArray(data.navigation_items)) {
        // Добавляем "Главная" в начало если её нет
        const navItemsWithHome = data.navigation_items;
        const hasHome = navItemsWithHome.some((item: NavItem) => item.path === '/');
        
        if (!hasHome) {
          navItemsWithHome.unshift({
            id: 'home',
            label: 'Главная',
            path: '/',
            visible: true
          });
        }
        
        setNavItems(navItemsWithHome);
      } else {
        // Если navigation_items пустой или не существует, используем fallback
        console.log('No navigation items found, using fallback');
      }
    } catch (error) {
      console.error('Error fetching navigation items:', error);
      // При ошибке оставляем fallback навигацию
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const visibleNavItems = navItems.filter(item => item.visible);

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

            {user ? (
              <UserProfileDropdown 
                user={user} 
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
                
                {user && (
                  <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
                    <Link 
                      to="/profile" 
                      className="block py-2 font-medium hover:text-primary dark:hover:text-primary-400"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Мой профиль
                    </Link>
                    {user.role === 'Admin' && (
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
                
                {!user && (
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