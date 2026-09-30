import { useContext, useState } from 'react';
import { ShiftContext } from '../../context/ShiftContext';

const ShiftActions = () => {
  const { 
    status, 
    breakType, 
    startShift, 
    endShift, 
    startBreak, 
    endBreak, 
    isLoading 
  } = useContext(ShiftContext);
  
  const [error, setError] = useState(null);
  const [showBreakOptions, setShowBreakOptions] = useState(false);

  const handleStartShift = async () => {
    try {
      setError(null);
      await startShift();
    } catch {
      setError('Failed to start shift. Please check your location permissions.');
    }
  };

  const handleEndShift = async () => {
    try {
      setError(null);
      await endShift();
    } catch {
      setError('Failed to end shift. Please try again.');
    }
  };

  const handleStartBreak = async (type) => {
    try {
      setError(null);
      await startBreak(type);
      setShowBreakOptions(false);
    } catch {
      setError(`Failed to start ${type.toLowerCase()} break. Please try again.`);
    }
  };

  const handleEndBreak = async () => {
    try {
      setError(null);
      await endBreak();
    } catch {
      setError('Failed to end break. Please try again.');
    }
  };

  // Helper function to get break type display text
  const getBreakTypeText = () => {
    if (!breakType) return 'Break';
    return breakType === 'LUNCH' ? 'Lunch Break' : 'Short Break';
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Shift Actions</h2>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 dark:bg-red-900 dark:text-red-200 dark:border-red-700" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {status === 'INACTIVE' && (
          <button
            onClick={handleStartShift}
            disabled={isLoading}
            className="btn btn-primary h-12 flex items-center justify-center"
          >
            {isLoading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Start Shift
              </>
            )}
          </button>
        )}

        {status === 'ACTIVE' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowBreakOptions(!showBreakOptions)}
                disabled={isLoading}
                className="btn btn-secondary h-12 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Take Break
              </button>

              <button
                onClick={handleEndShift}
                disabled={isLoading}
                className="btn btn-danger h-12 flex items-center justify-center"
              >
                {isLoading ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    End Shift
                  </>
                )}
              </button>
            </div>

            {showBreakOptions && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  onClick={() => handleStartBreak('LUNCH')}
                  disabled={isLoading}
                  className="btn bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400 h-12 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Lunch Break
                </button>

                <button
                  onClick={() => handleStartBreak('SHORT')}
                  disabled={isLoading}
                  className="btn bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-400 h-12 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Short Break
                </button>
              </div>
            )}
          </>
        )}

        {status === 'BREAK' && (
          <button
            onClick={handleEndBreak}
            disabled={isLoading}
            className="btn btn-success h-12 flex items-center justify-center"
          >
            {isLoading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                End {getBreakTypeText()}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ShiftActions;