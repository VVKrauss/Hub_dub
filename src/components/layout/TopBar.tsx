import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import Logo from '../ui/Logo';
import LoginModal from '../auth/LoginModal';
import UserProfileDropdown from '../ui/UserProfileDropdown';

// Типы для настроек топбара
interface TopBarSettings {
  alignment: 'left' | 'center' | 'right' | 'space-between';
  style: 'classic' | 'modern' | 'minimal' | 'rounded';
  spacing: 'compact' | 'normal' | 'relaxed';
  height: 'compact' | 'normal' | 'large';
  showBorder: boolean;
  showShadow: boolean;
  backgroundColor: 'white' | 'transparent' | 'blur';
  animation: 'none' | 'slide' | 'fade' | 'bounce';
  mobileCollapse: boolean;
  showIcons: boolean;
  showBadges: boolean;
  stickyHeader: boolean;
  maxWidth: 'container' | 'full' | 'screen-xl';
}

type NavItem = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  order?: number;
  badge?: number;
  icon?: string;
};

type UserData = {
  id: string;
  email: string;
  name?: string;
  role?: string;
} | null;

const TopBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [user, setUser] = useState<UserData>(null);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [topBarSettings, setTopBarSettings] = useState<TopBarSettings>({
    alignment: 'center',
    style: 'classic',
    spacing: 'normal',
    height: 'compact',
    showBorder: true,
    showShadow: true,
    backgroundColor: 'white',
    animation: 'slide',
    mobileCollapse: true,
    showIcons: false,
    showBadges: true,
    stickyHeader: true,
    maxWidth: 'container'
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNavItems();
    fetchTopBarSettings();
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

  const fetchTopBarSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('topbar_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.topbar_settings) {
        setTopBarSettings({ ...topBarSettings, ...data.topbar_settings });
      }
    } catch (error) {
      console.error('Error fetching topbar settings:', error);
    }
  };

  const fetchNavItems = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('navigation_items')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.navigation_items) {
        // Сортируем по порядку
        const sortedItems = data.navigation_items
          .map((item: any, index: number) => ({
            ...item,
            order: item.order !== undefined ? item.order : index
          }))
          .sort((a: any, b: any) => a.order - b.order);
        
        setNavItems(sortedItems);
      }
    } catch (error) {
      console.error('Error fetching navigation items:', error);
    }
  };

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user session:', error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Profile doesn't exist, use basic user info
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name
          });
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      setUser({
        id: userId,
        email: session?.user.email || '',
        name: profile?.name || session?.user.user_metadata?.name,
        role: profile?.role
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Функции для получения CSS классов на основе настроек
  const getTopBarClasses = () => {
    let classes = 'transition-all duration-300';

    // Sticky или нет
    if (topBarSettings.stickyHeader) {
      classes += ' sticky top-0 z-50';
    }

    // Фон
    switch (topBarSettings.backgroundColor) {
      case 'white':
        classes += ' bg-white dark:bg-dark-900';
        break;
      case 'transparent':
        classes += ' bg-transparent';
        break;
      case 'blur':
        classes += ' bg-white/80 dark:bg-dark-900/80 backdrop-blur-md';
        break;
    }

    // Граница и тень
    if (topBarSettings.showBorder) {
      classes += ' border-b border-gray-200 dark:border-gray-700';
    }
    if (topBarSettings.showShadow) {
      classes += ' shadow-sm';
    }

    return classes;
  };

  const getContainerClasses = () => {
    let classes = 'flex items-center justify-between px-4 sm:px-6 lg:px-8';
    
    // Высота топбара
    switch (topBarSettings.height) {
      case 'compact':
        classes += ' py-2';
        break;
      case 'normal':
        classes += ' py-4';
        break;
      case 'large':
        classes += ' py-6';
        break;
    }
    
    switch (topBarSettings.maxWidth) {
      case 'container':
        classes += ' max-w-7xl mx-auto';
        break;
      case 'screen-xl':
        classes += ' max-w-screen-xl mx-auto';
        break;
      case 'full':
        classes += ' w-full';
        break;
    }

    return classes;
  };

  const getNavClasses = () => {
    let classes = 'hidden md:flex items-center flex-1';

    // Выравнивание
    switch (topBarSettings.alignment) {
      case 'left':
        classes += ' justify-start ml-8';
        break;
      case 'center':
        classes += ' justify-center';
        break;
      case 'right':
        classes += ' justify-end mr-8';
        break;
      case 'space-between':
        classes += ' justify-between';
        break;
    }

    // Отступы между элементами
    switch (topBarSettings.spacing) {
      case 'compact':
        classes += ' gap-4';
        break;
      case 'normal':
        classes += ' gap-6';
        break;
      case 'relaxed':
        classes += ' gap-8';
        break;
    }

    return classes;
  };

  const getLinkClasses = (isActive: boolean) => {
    let classes = 'font-medium relative transition-all duration-300 flex items-center gap-2';

    // Отступы в зависимости от высоты топбара
    switch (topBarSettings.height) {
      case 'compact':
        classes += ' py-2 px-2';
        break;
      case 'normal':
        classes += ' py-3 px-2';
        break;
      case 'large':
        classes += ' py-4 px-2';
        break;
    }

    // Состояния активности для всех стилей
    if (isActive) {
      switch (topBarSettings.style) {
        case 'classic':
          classes += ' text-primary-600 dark:text-primary-400 after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400';
          break;
        case 'modern':
          classes += ' text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg';
          break;
        case 'minimal':
          classes += ' text-primary-600 dark:text-primary-400 font-semibold';
          break;
        case 'rounded':
          classes += ' text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-full';
          break;
      }
    } else {
      classes += ' text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400';
      
      // Hover эффекты для неактивных ссылок
      switch (topBarSettings.style) {
        case 'modern':
          classes += ' hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg';
          break;
        case 'rounded':
          classes += ' hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full';
          break;
      }
    }

    // Анимация
    switch (topBarSettings.animation) {
      case 'slide':
        classes += ' hover:transform hover:-translate-y-0.5';
        break;
      case 'fade':
        classes += ' hover:opacity-80';
        break;
      case 'bounce':
        classes += ' hover:animate-pulse';
        break;
    }

    return classes;
  };

  // Фильтруем и сортируем видимые элементы навигации
  const visibleNavItems = navItems.filter(item => item.visible);

  