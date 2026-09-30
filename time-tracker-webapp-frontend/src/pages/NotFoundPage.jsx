import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="flex-grow flex flex-col items-center justify-center px-4 text-center">
        <div className="text-9xl font-bold text-primary-600 dark:text-primary-400">
          404
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4 mb-6">
          Page Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link 
          to="/" 
          className="btn btn-primary py-2 px-6"
        >
          Go to Homepage
        </Link>
      </main>
      
      <footer className="bg-white dark:bg-gray-800 shadow-md mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} ShiftTracker. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NotFoundPage;