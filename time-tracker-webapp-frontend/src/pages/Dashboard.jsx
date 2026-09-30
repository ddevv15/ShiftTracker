import { useContext, useEffect } from 'react';
import { ShiftContext } from '../context/ShiftContext';
import Header from '../components/layout/Header';
import ShiftActions from '../components/shift/ShiftActions';
import ShiftTimer from '../components/shift/ShiftTimer';
import ShiftStatus from '../components/shift/ShiftStatus';
import LocationMap from '../components/shift/LocationMap';
import ShiftHistory from '../components/dashboard/ShiftHistory';

const DashboardPage = () => {
  const { fetchCurrentShift, fetchShiftHistory, fetchShiftStats } = useContext(ShiftContext);
  
  useEffect(() => {
    // Load all shift data
    fetchCurrentShift();
    fetchShiftHistory();
    fetchShiftStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Employee Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <ShiftActions />
          <ShiftTimer />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <ShiftStatus />
          <LocationMap />
        </div>
        
        <div className="mt-12">
          <ShiftHistory />
        </div>
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

export default DashboardPage;