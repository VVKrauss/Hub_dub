import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Atom } from 'lucide-react';
import { Button } from '../shared/ui/Button/Button';

const NotFoundPage = () => {
  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="container max-w-2xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <Atom className="h-24 w-24 text-primary-500 animate-pulse" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold">
                404
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Страница не найдена</h1>
          <p className="text-lg text-dark-600 dark:text-dark-300 mb-8">
            Извините, запрошенная страница не существует или была перемещена.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="inline-block">
              <Button variant="primary" size="lg">
                Вернуться на главную
              </Button>
            </Link>
            <Link to="/events" className="inline-block">
              <Button variant="outline" size="lg">
                Посмотреть мероприятия
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFoundPage;