import { useState } from 'react';
import axios from 'axios';
import { AdminShift, errorMessage, inputClass, toLocalInputValue } from './types';

interface Props {
  shift: AdminShift;
  onClose: () => void;
  onSaved: () => void;
}

const EditShiftModal = ({ shift, onClose, onSaved }: Props) => {
  const [startTime, setStartTime] = useState(toLocalInputValue(shift.startTime));
  const [endTime, setEndTime] = useState(toLocalInputValue(shift.endTime));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // datetime-local values are parsed as the admin's local time
      await axios.put(`/api/admin/shifts/${shift._id}`, {
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        note
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, 'Failed to update shift'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
      <form onSubmit={save} className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {shift.open ? 'Close shift' : 'Correct shift'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {shift.employeeId?.name || 'Unknown'} · times are in your local timezone
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm dark:bg-red-900 dark:text-red-200 dark:border-red-700" role="alert">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Start
          <input type="datetime-local" required className={`${inputClass} mt-1`}
            value={startTime} onChange={e => setStartTime(e.target.value)} />
        </label>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          End {shift.open && <span className="text-gray-400 font-normal">(set this to close the shift)</span>}
          <input type="datetime-local" required={!shift.open} className={`${inputClass} mt-1`}
            value={endTime} onChange={e => setEndTime(e.target.value)} />
        </label>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Reason for correction
          <textarea required maxLength={500} rows={2} className={`${inputClass} mt-1`}
            placeholder="e.g. Forgot to clock out, confirmed 17:30 with employee"
            value={note} onChange={e => setNote(e.target.value)} />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditShiftModal;
