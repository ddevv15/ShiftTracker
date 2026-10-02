import { useEffect, useState } from 'react';
import axios from 'axios';
import ReportView from '../report/ReportView';
import { AdminShift, errorMessage, formatDuration } from './types';

interface Props {
  shift: AdminShift;
  onClose: () => void;
}

// Admin review of one shift's report (site, work, issues, note, photos)
const ReportModal = ({ shift, onClose }: Props) => {
  const [report, setReport] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get(`/api/admin/shifts/${shift._id}/report`)
      .then(res => setReport(res.data.report))
      .catch(err => setError(errorMessage(err, 'Failed to load report')));
  }, [shift._id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const start = new Date(shift.startTime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-full overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{shift.employeeName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' – '}
              {shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'open'}
              {' · '}{formatDuration(shift.workingTime)} worked
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary shrink-0">Close</button>
        </div>
        <div className="px-6 py-5">
          {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
          {!report && !error && (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div></div>
          )}
          {report && <ReportView report={report} />}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
