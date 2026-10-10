import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AddShiftModal from './AddShiftModal';
import EditShiftModal from './EditShiftModal';
import ReportModal from './ReportModal';
import {
  AdminShift, Employee, ShiftFilters,
  LONG_SHIFT_MS, errorMessage, filtersToParams, formatDuration, inputClass, thClass, tdClass
} from './types';

const PAGE_SIZE = 25;

interface Props {
  employees: Employee[];
}

const ShiftsPanel = ({ employees }: Props) => {
  const [filters, setFilters] = useState<ShiftFilters>({ employeeId: '', siteId: '', from: '', to: '', hasIssues: false, needsReview: false });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ shifts: [] as AdminShift[], pages: 1, total: 0, totalWorkingTime: 0, openCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AdminShift | null>(null);
  const [viewing, setViewing] = useState<AdminShift | null>(null);
  const [sites, setSites] = useState<Array<{ _id: string; name: string }>>([]);

  useEffect(() => {
    axios.get('/api/admin/sites').then(res => setSites(res.data)).catch(() => {});
  }, []);

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

  const updateFilter = <K extends keyof ShiftFilters>(key: K, value: ShiftFilters[K]) => {
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
        <div className="flex gap-2">
          <button onClick={() => setAdding(true)} className="btn btn-secondary">Add timesheet</button>
          <button onClick={exportCsv} disabled={isExporting || data.total === 0} className="btn btn-primary">
            {isExporting ? 'Exporting…' : `Export ${data.total} to CSV`}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 items-end">
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
          Site
          <select className={`${inputClass} mt-1`} value={filters.siteId}
            onChange={e => updateFilter('siteId', e.target.value)}>
            <option value="">All sites</option>
            {sites.map(site => (
              <option key={site._id} value={site._id}>{site.name}</option>
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
        <label className="flex items-center gap-2 h-[38px] text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-red-600" checked={filters.hasIssues}
            onChange={e => updateFilter('hasIssues', e.target.checked)} />
          Only with issues
        </label>
        <label className="flex items-center gap-2 h-[38px] text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          title="Open shifts and shifts longer than 24 hours, usually a forgotten clock-out">
          <input type="checkbox" className="h-4 w-4 accent-amber-600" checked={filters.needsReview}
            onChange={e => updateFilter('needsReview', e.target.checked)} />
          Needs review
        </label>
      </div>

      {/* Range summary */}
      <div className="flex flex-wrap gap-6 mb-4 text-sm text-gray-600 dark:text-gray-300">
        <span><strong className="text-gray-900 dark:text-white">{data.total}</strong> shifts</span>
        <span><strong className="text-gray-900 dark:text-white">{formatDuration(data.totalWorkingTime)}</strong> worked</span>
        {data.openCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            <strong>{data.openCount}</strong> still open
            {!filters.needsReview && (
              <button type="button" onClick={() => updateFilter('needsReview', true)} className="ml-2 underline">
                Review
              </button>
            )}
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
                <th scope="col" className={thClass}>Worked</th>
                <th scope="col" className={thClass}>Report</th>
                <th scope="col" className={thClass}></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {data.shifts.map(shift => (
                <tr key={shift._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className={`${tdClass} font-medium text-gray-800 dark:text-gray-200`}>
                    {shift.employeeName}
                    {shift.manual && (
                      <span title={`Added by ${shift.editedBy?.name || 'admin'}: ${shift.editNote || ''}`}
                        className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-help">
                        manual
                      </span>
                    )}
                    {!shift.location && !shift.manual && (
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
                    {formatDuration(shift.workingTime)}
                    {shift.endTime && new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime() > LONG_SHIFT_MS && (
                      <span title="Longer than 24 hours, possibly a forgotten clock-out. Use Edit to correct the end time."
                        className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 cursor-help">
                        over 24h
                      </span>
                    )}
                    {shift.editedAt && !shift.manual && (
                      <span title={`Edited by ${shift.editedBy?.name || 'admin'}: ${shift.editNote || ''}`}
                        className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 cursor-help">
                        edited
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} whitespace-normal min-w-[12rem]`}>
                    {shift.site || shift.taskCount || shift.photoCount || shift.issues.length || shift.hasNote ? (
                      <button type="button" onClick={() => setViewing(shift)} className="text-left group">
                        <span className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                          {shift.site || 'No site'}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          {shift.photoCount > 0 && `📷 ${shift.photoCount}`}
                        </span>
                        {shift.issues.length > 0 && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {shift.issues.map(issue => (
                              <span key={issue} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                {issue}
                              </span>
                            ))}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-right space-x-3`}>
                    <button onClick={() => setViewing(shift)}
                      className="text-primary-600 hover:text-primary-800 dark:text-primary-400">
                      Report
                    </button>
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

      {viewing && <ReportModal shift={viewing} onClose={() => setViewing(null)} />}

      {adding && (
        <AddShiftModal
          employees={employees}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); }}
        />
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
