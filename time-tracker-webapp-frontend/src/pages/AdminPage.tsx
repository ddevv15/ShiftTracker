import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import Header from '../components/layout/Header';
import { AuthContext } from '../context/AuthContext';
import EmployeesPanel from '../components/admin/EmployeesPanel';
import ShiftsPanel from '../components/admin/ShiftsPanel';
import { Employee, errorMessage } from '../components/admin/types';

const AdminPage = () => {
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'employees' | 'shifts'>('shifts');

  const fetchEmployees = useCallback(async () => {
    setError(null);
    try {
      const response = await axios.get('/api/admin/employees');
      setEmployees(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load employees. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const tabClass = (name: string) =>
    `inline-block py-4 px-4 text-sm font-medium ${
      tab === name
        ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400'
        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
    }`;

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
              <button onClick={() => setTab('shifts')} className={tabClass('shifts')}>Shifts</button>
            </li>
            <li className="mr-2">
              <button onClick={() => setTab('employees')} className={tabClass('employees')}>Employees</button>
            </li>
          </ul>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : tab === 'shifts' ? (
          <ShiftsPanel employees={employees} />
        ) : (
          <EmployeesPanel employees={employees} currentUserId={user?.id} onChanged={fetchEmployees} />
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
