import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import axios from 'axios';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

interface Shift {
  _id: string;
  employeeId: string;
  startTime: string;
  endTime?: string;
  location?: { latitude: number; longitude: number };
  breaks?: Array<{ startTime: string; endTime?: string; type: string }>;
}

const AdminPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('employees');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch employees
      const employeesResponse = await axios.get('/api/admin/employees');
      setEmployees(Array.isArray(employeesResponse.data) ? employeesResponse.data : []);
      
      // Fetch shifts
      const shiftsResponse = await axios.get('/api/admin/shifts');
      
      // Handle different possible response formats
      if (shiftsResponse.data) {
        if (Array.isArray(shiftsResponse.data)) {
          // If response is directly an array
          setShifts(shiftsResponse.data);
        } else if (shiftsResponse.data.shifts && Array.isArray(shiftsResponse.data.shifts)) {
          // If response has a 'shifts' property that is an array (common pagination format)
          setShifts(shiftsResponse.data.shifts);
        } else {
          // Unexpected format, log for debugging
          console.error('Unexpected shifts response format:', shiftsResponse.data);
          setShifts([]);
        }
      } else {
        setShifts([]);
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error(err);
      // Ensure shifts and employees are arrays even on error
      setShifts([]);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportToCsv = () => {
    // Ensure shifts is an array before attempting to use forEach
    if (!Array.isArray(shifts) || shifts.length === 0) {
      alert('No shift data available to export.');
      return;
    }
    
    // Create CSV content
    let csvContent = 'Employee,Date,Start Time,End Time,Duration,Location\n';
    
    shifts.forEach(shift => {
      const employee = employees.find(emp => emp._id === shift.employeeId)?.name || 'Unknown';
      const date = new Date(shift.startTime).toLocaleDateString();
      const startTime = new Date(shift.startTime).toLocaleTimeString();
      const endTime = shift.endTime ? new Date(shift.endTime).toLocaleTimeString() : 'In Progress';
      
      // Calculate duration
      let duration = 'N/A';
      if (shift.endTime) {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const durationMs = end.getTime() - start.getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${hours}h ${minutes}m`;
      }
      
      const location = shift.location ? `${shift.location.latitude.toFixed(6)}, ${shift.location.longitude.toFixed(6)}` : 'N/A';
      
      csvContent += `"${employee}","${date}","${startTime}","${endTime}","${duration}","${location}"\n`;
    });
    
    // Create a blob and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shifts_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Admin Dashboard</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 dark:bg-red-900 dark:text-red-200 dark:border-red-700" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                onClick={() => setTab('employees')}
                className={`inline-block py-4 px-4 text-sm font-medium ${
                  tab === 'employees'
                    ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Employees
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setTab('shifts')}
                className={`inline-block py-4 px-4 text-sm font-medium ${
                  tab === 'shifts'
                    ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Shifts
              </button>
            </li>
          </ul>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Employees Tab */}
            {tab === 'employees' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 overflow-x-auto">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Employees</h2>
                
                {!Array.isArray(employees) || employees.length === 0 ? (
                  <p className="text-center py-4 text-gray-500 dark:text-gray-400">No employees found.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {employees.map((employee) => (
                        <tr key={employee._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                            {employee.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {employee.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {employee.role === 'admin' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Employee
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {employee.active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            {/* Shifts Tab */}
            {tab === 'shifts' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Shifts</h2>
                  
                  <button
                    onClick={exportToCsv}
                    className="btn btn-secondary"
                    disabled={!Array.isArray(shifts) || shifts.length === 0}
                  >
                    Export to CSV
                  </button>
                </div>
                
                {!Array.isArray(shifts) || shifts.length === 0 ? (
                  <p className="text-center py-4 text-gray-500 dark:text-gray-400">No shifts found.</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Employee
                        </th>
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
                      {shifts.map((shift) => {
                        const employee = Array.isArray(employees) 
                          ? employees.find(emp => emp._id === shift.employeeId)?.name || 'Unknown'
                          : 'Unknown';
                        
                        // Calculate duration
                        let duration = 'In Progress';
                        if (shift.endTime) {
                          const start = new Date(shift.startTime);
                          const end = new Date(shift.endTime);
                          const durationMs = end.getTime() - start.getTime();
                          const hours = Math.floor(durationMs / (1000 * 60 * 60));
                          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                          duration = `${hours}h ${minutes}m`;
                        }
                        
                        return (
                          <tr key={shift._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                              {employee}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              {new Date(shift.startTime).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              {new Date(shift.startTime).toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              {shift.endTime 
                                ? new Date(shift.endTime).toLocaleTimeString()
                                : <span className="text-primary-600 dark:text-primary-400">In Progress</span>
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              {duration}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              {shift.breaks && Array.isArray(shift.breaks) && shift.breaks.length > 0 
                                ? shift.breaks.length
                                : 'None'
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
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

export default AdminPage;