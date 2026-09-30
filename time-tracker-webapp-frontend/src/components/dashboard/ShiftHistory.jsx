import { useContext, useEffect, useState } from 'react';
import { ShiftContext } from '../../context/ShiftContext';
import { format, parseISO, differenceInMilliseconds } from 'date-fns';

const ShiftHistory = () => {
  const { shiftHistory, fetchShiftHistory, isLoading } = useContext(ShiftContext);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    loadShiftHistory();
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect to handle the structure of shiftHistory
  useEffect(() => {
    if (shiftHistory) {
      // Check if shiftHistory is an object with a shifts property (API might return { shifts, page, total, etc. })
      if (shiftHistory.shifts && Array.isArray(shiftHistory.shifts)) {
        setShifts(shiftHistory.shifts);
        
        // Set total pages if available
        if (shiftHistory.pages) {
          setTotalPages(shiftHistory.pages);
        }
      } 
      // If shiftHistory is already an array
      else if (Array.isArray(shiftHistory)) {
        setShifts(shiftHistory);
      } 
      // Default to empty array if we can't determine the structure
      else {
        console.error('Unexpected shiftHistory structure:', shiftHistory);
        setShifts([]);
      }
    } else {
      setShifts([]);
    }
  }, [shiftHistory]);

  const loadShiftHistory = async () => {
    try {
      setError(null);
      await fetchShiftHistory(currentPage, 5);
    } catch (err) {
      setError('Failed to load shift history');
      console.error(err);
    }
  };

  // Calculate duration between two dates
  const calculateDuration = (start, end, breaks = []) => {
    const startDate = parseISO(start);
    const endDate = end ? parseISO(end) : new Date();
    
    let totalMs = differenceInMilliseconds(endDate, startDate);
    
    // Subtract break durations
    if (breaks && breaks.length > 0) {
      const breakMs = breaks.reduce((total, breakPeriod) => {
        const breakStart = parseISO(breakPeriod.startTime);
        const breakEnd = breakPeriod.endTime ? parseISO(breakPeriod.endTime) : new Date();
        return total + differenceInMilliseconds(breakEnd, breakStart);
      }, 0);
      
      totalMs -= breakMs;
    }
    
    // Convert to hours and minutes
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Shift History</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 dark:bg-red-900 dark:text-red-200 dark:border-red-700" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {shifts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No shift history found. Start your first shift to track your working hours.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Start Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      End Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Breaks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {shifts.map((shift) => (
                    <tr key={shift._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                        {format(parseISO(shift.startTime), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {format(parseISO(shift.startTime), 'hh:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {shift.endTime 
                          ? format(parseISO(shift.endTime), 'hh:mm a')
                          : <span className="text-primary-600 dark:text-primary-400">In Progress</span>
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {calculateDuration(shift.startTime, shift.endTime, shift.breaks)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {shift.breaks && shift.breaks.length > 0 
                          ? shift.breaks.length
                          : 'None'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="btn btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
                className="btn btn-secondary text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShiftHistory;