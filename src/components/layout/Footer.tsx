import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, AtSign, Phone, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Logo from '../ui/Logo';
import SocialLinks from '../ui/SocialLinks';

interface FooterSettings {
  id: number;
  logo_url: string;
  columns: number;
  social_media: {
    telegram?: string;
    vk?: string;
    youtube?: string;
    instagram?: string;
  };
  support_links: {
    paypal?: string;
    patreon?: string;
    boosty?: string;
  };
  is_active: boolean;
  footer_text: string;
  text_align: 'left' | 'center' | 'right';
  email?: string;
  phone?: string;
  address?: string;
  working_hours?: string;
}

export function Footer() {
  const [settings, setSettings] = useState<FooterSettings | null>(null);

  useEffect(() => {
    const fetchFooterSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('footer_settings')
          .select('*')
          .eq('is_active', true)
          .single();
        
        if (error) {
          console.error('Error fetching footer settings:', error);
          return;
        }

        if (data) {
          setSettings({
            ...data,
            text_align: data.text_align || 'center'
          });
        }
      } catch (error) {
        console.error('Error fetching footer data:', error);
      }
    };

    fetchFooterSettings();
  }, []);

  if (!settings) return null;

  const getTextAlignClass = () => {
    switch (settings.text_align) {
      case 'left': return 'text-left';
      case 'right': return 'text-right';
      case 'center':
      default: return 'text-center';
    }
  };

  // Статические ссылки для навигации. 
  const navigationLinks = [
    { path: '/', label: 'Главная' },
    { path: '/events', label: 'Мероприятия' },
    { path: '/speakers', label: 'Спикеры' },
    { path: '/about', label: 'О нас' },
  ];

  return (
    <footer className="bg-dark-900 border-t border-dark-700">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 md:grid-cols-${settings.columns} gap-8`}>
          {/* Колонка 1: Логотип и соцсети */}
          <div>
            {settings.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt="Logo" 
                className="h-10 w-auto mb-4" 
              />
            ) : (
              <Logo className="h-10 w-auto mb-4" inverted />
            )}
            <p className="text-dark-300 mb-4">
              {settings.footer_text}
            </p>
          </div>

          {/* Колонка 2: Навигация */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Навигация</h4>
            <ul className="space-y-2">
              {navigationLinks.map((item, index) => (
                <li key={index}>
                  <Link 
                    to={item.path}
                    className="text-dark-300 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Колонка 4: Контакты */}
          {(settings.email || settings.phone || settings.address || settings.working_hours) && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Контакты</h4>
              <ul className="space-y-4">
                {settings.phone && (
                  <li className="flex items-start">
                    <Phone className="h-5 w-5 mr-2 mt-0.5 text-primary-400" />
                    <a 
                      href={`tel:${settings.phone}`}
                      className="text-dark-300 hover:text-white transition-colors"
                    >
                      {settings.phone}
                    </a>
                  </li>
                )}
                {settings.email && (
                  <li className="flex items-start">
                    <AtSign className="h-5 w-5 mr-2 mt-0.5 text-primary-400" />
                    <a 
                      href={`mailto:${settings.email}`}
                      className="text-dark-300 hover:text-white transition-colors"
                    >
                      {settings.email}
                    </a>
                  </li>
                )}
                {settings.address && (
                  <li className="flex items-start">
                    <MapPin className="h-5 w-5 mr-2 mt-0.5 text-primary-400 flex-shrink-0" />
                    <span className="text-dark-300">
                      {settings.address}
                    </span>
                  </li>
                )}
                {settings.working_hours && (
                  <li className="flex items-start">
                    <MessageCircle className="h-5 w-5 mr-2 mt-0.5 text-primary-400" />
                    <span className="text-dark-300">
                      {settings.working_hours}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

export default Footer;