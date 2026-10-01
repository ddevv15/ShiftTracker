import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EditShiftModal from './EditShiftModal';
import {
  AdminShift, Employee, ShiftFilters,
  errorMessage, filtersToParams, formatDuration, inputClass, thClass, tdClass
} from './types';

const PAGE_SIZE = 25;

interface Props {
  employees: Employee[];
}

const ShiftsPanel = ({ employees }: Props) => {
  const [filters, setFilters] = useState<ShiftFilters>({ employeeId: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ shifts: [] as AdminShift[], pages: 1, total: 0, totalWorkingTime: 0, openCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminShift | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/admin/shifts', {
        params: { ...filtersToParams(filters), page, limit: PAGE_SIZE }
      });
      setData(response.data);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load shifts'));
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = (key: keyof ShiftFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const exportCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      // Fetched with the auth header, then saved as a file
      const response = await axios.get('/api/admin/shifts/export', {
        params: { ...filtersToParams(filters), tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shifts_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err, 'Failed to export shifts'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Shifts</h2>
        <button onClick={exportCsv} disabled={isExporting || data.total === 0} className="btn btn-primary">
          {isExporting ? 'Exporting…' : `Export ${data.total} to CSV`}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Employee
          <select className={`${inputClass} mt-1`} value={filters.employeeId}
            onChange={e => updateFilter('employeeId', e.target.value)}>
            <option value="">All employees</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          From
          <input type="date" className={`${inputClass} mt-1`} value={filters.from}
            onChange={e => updateFilter('from', e.target.value)} />
        </label>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          To
          <input type="date" className={`${inputClass} mt-1`} value={filters.to}
            onChange={e => updateFilter('to', e.target.value)} />
        </label>
      </div>

      {/* Range summary */}
      <div className="flex flex-wrap gap-6 mb-4 text-sm text-gray-600 dark:text-gray-300">
        <span><strong className="text-gray-900 dark:text-white">{data.total}</strong> shifts</span>
        <span><strong className="text-gray-900 dark:text-white">{formatDuration(data.totalWorkingTime)}</strong> worked</span>
        {data.openCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            <strong>{data.openCount}</strong> still open
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm dark:bg-red-900 dark:text-red-200 dark:border-red-700" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : data.shifts.length === 0 ? (
        <p className="text-center py-4 text-gray-500 dark:text-gray-400">No shifts match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className={thClass}>Employee</th>
                <th scope="col" className={thClass}>Date</th>
                <th scope="col" className={thClass}>Start</th>
                <th scope="col" className={thClass}>End</th>
                <th scope="col" className={thClass}>Breaks</th>
                <th scope="col" className={thClass}>Worked</th>
                <th scope="col" className={thClass}></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {data.shifts.map(shift => (
                <tr key={shift._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className={`${tdClass} font-medium text-gray-800 dark:text-gray-200`}>
                    {shift.employeeId?.name || 'Deleted user'}
                    {!shift.location && (
                      <span title="Clocked in without GPS location"
                        className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 cursor-help">
                        no GPS
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>{new Date(shift.startTime).toLocaleDateString()}</td>
                  <td className={tdClass}>
                    {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className={tdClass}>
                    {shift.endTime ? (
                      new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        {shift.onBreak ? 'On break' : 'Open'}
                      </span>
                    )}
                  </td>
                  <td className={tdClass}>
                    {shift.breaks?.length ? `${shift.breaks.length} · ${formatDuration(shift.breakTime)}` : 'None'}
                  </td>
                  <td className={tdClass}>
                    {formatDuration(shift.workingTime)}
                    {shift.editedAt && (
                      <span title={`Edited by ${shift.editedBy?.name || 'admin'}: ${shift.editNote || ''}`}
                        className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 cursor-help">
                        edited
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <button onClick={() => setEditing(shift)}
                      className="text-primary-600 hover:text-primary-800 dark:text-primary-400">
                      {shift.open ? 'Close' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm text-gray-600 dark:text-gray-300">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {data.pages}</span>
          <button className="btn btn-secondary" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {editing && (
        <EditShiftModal
          shift={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

export default ShiftsPanel;
