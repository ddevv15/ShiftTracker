import { useState, useEffect, useContext } from 'react';
import { ShiftContext } from '../../context/ShiftContext';

const ShiftTimer = () => {
  const { currentShift, status } = useContext(ShiftContext);
  const [elapsedTime, setElapsedTime] = useState('0h 0m 0s');
  const [totalBreakTime, setTotalBreakTime] = useState('0h 0m 0s');
  
  useEffect(() => {
    if (!currentShift) {
      setElapsedTime('0h 0m 0s');
      setTotalBreakTime('0h 0m 0s');
      return;
    }
    
    // Calculate initial total break time
    if (currentShift.breaks && currentShift.breaks.length > 0) {
      let totalBreakMs = 0;
      
      currentShift.breaks.forEach(breakPeriod => {
        const start = new Date(breakPeriod.startTime);
        const end = breakPeriod.endTime ? new Date(breakPeriod.endTime) : new Date();
        totalBreakMs += end - start;
      });
      
      setTotalBreakTime(formatDuration(totalBreakMs));
    }
    
    // Set up timer interval
    const intervalId = setInterval(() => {
      const startTime = new Date(currentShift.startTime);
      let endTime;
      
      if (currentShift.endTime) {
        endTime = new Date(currentShift.endTime);
      } else {
        endTime = new Date();
      }
      
      // Calculate total elapsed time
      let totalMs = endTime - startTime;
      
      // Calculate break time
      let breakMs = 0;
      if (currentShift.breaks && currentShift.breaks.length > 0) {
        breakMs = currentShift.breaks.reduce((total, breakPeriod) => {
          const start = new Date(breakPeriod.startTime);
          const end = breakPeriod.endTime ? new Date(breakPeriod.endTime) : new Date();
          return total + (end - start);
        }, 0);
        
        setTotalBreakTime(formatDuration(breakMs));
      }
      
      // Calculate working time (total time - break time)
      const workingMs = totalMs - breakMs;
      setElapsedTime(formatDuration(workingMs));
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [currentShift, status]);
  
  // Helper function to format duration
  const formatDuration = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };
  
  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Shift Timer</h2>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Working Time</div>
          <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">{elapsedTime}</div>
        </div>
        
        {status !== 'INACTIVE' && currentShift && (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Break Time</div>
            <div className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 tabular-nums">{totalBreakTime}</div>
          </div>
        )}
        
        {currentShift && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Started At</div>
              <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                {new Date(currentShift.startTime).toLocaleTimeString()}
              </div>
            </div>
            
            {currentShift.endTime && (
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ended At</div>
                <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                  {new Date(currentShift.endTime).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftTimer;