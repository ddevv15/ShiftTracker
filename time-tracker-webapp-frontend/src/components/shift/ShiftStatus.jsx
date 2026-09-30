import { useContext } from 'react';
import { ShiftContext } from '../../context/ShiftContext';

const ShiftStatus = () => {
  const { status, breakType, totalHoursToday, weeklyHours, monthlyHours } = useContext(ShiftContext);
  
  // Helper function to format hours
  const formatHours = (hours) => {
    return parseFloat(hours).toFixed(2);
  };
  
  // Helper function to get status text and icon
  const getStatusInfo = () => {
    switch (status) {
      case 'ACTIVE':
        return {
          text: 'Working',
          bgColor: 'bg-green-100 dark:bg-green-900',
          textColor: 'text-green-800 dark:text-green-200',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'BREAK':
        return {
          text: breakType === 'LUNCH' ? 'Lunch Break' : 'Short Break',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
          )
        };
      default:
        return {
          text: 'Not Working',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-800 dark:text-gray-300',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          )
        };
    }
  };
  
  const statusInfo = getStatusInfo();
  
  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Shift Status</h2>
      
      <div className={`flex items-center p-4 rounded-lg ${statusInfo.bgColor} ${statusInfo.textColor} mb-4`}>
        <div className="mr-3 flex-shrink-0">
          {statusInfo.icon}
        </div>
        <div className="text-lg font-medium">
          {statusInfo.text}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Today</h3>
          <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {formatHours(totalHoursToday)}h
          </div>
        </div>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">This Week</h3>
          <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {formatHours(weeklyHours)}h
          </div>
        </div>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">This Month</h3>
          <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {formatHours(monthlyHours)}h
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftStatus;