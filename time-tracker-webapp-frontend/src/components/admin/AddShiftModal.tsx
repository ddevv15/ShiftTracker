import { useState } from 'react';
import axios from 'axios';
import { Employee, inputClass, inputDuration, shiftSaveError } from './types';
import LongShiftConfirm from './LongShiftConfirm';

interface Props {
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}

const AddShiftModal = ({ employees, onClose, onSaved }: Props) => {
  const [employeeId, setEmployeeId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakMinutes, setBreakMinutes] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLongConfirm, setNeedsLongConfirm] = useState(false);
  const [allowLong, setAllowLong] = useState(false);

  // Changing the times invalidates an earlier "yes, it was that long"
  const changeTimes = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setAllowLong(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // datetime-local values are parsed as the admin's local time
      await axios.post('/api/admin/shifts', {
        employeeId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        breakMinutes: breakMinutes === '' ? 0 : Number(breakMinutes),
        note,
        allowLong
      });
      onSaved();
    } catch (err) {
      const result = shiftSaveError(err, 'Failed to add timesheet');
      setError(result.message);
      setNeedsLongConfirm(result.needsLongConfirm);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
      <form onSubmit={save} className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add timesheet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            For a day the employee forgot to clock in · times are in your local timezone
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm dark:bg-red-900 dark:text-red-200 dark:border-red-700" role="alert">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Employee
          <select required className={`${inputClass} mt-1`} value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}>
            <option value="">Select an employee</option>
            {employees.filter(emp => emp.active).map(emp => (
              <option key={emp._id} value={emp._id}>{emp.name}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start
            <input type="datetime-local" required className={`${inputClass} mt-1`}
              value={startTime} onChange={changeTimes(setStartTime)} />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            End
            <input type="datetime-local" required className={`${inputClass} mt-1`}
              value={endTime} onChange={changeTimes(setEndTime)} />
          </label>
        </div>

        {inputDuration(startTime, endTime) && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Shift length: <strong>{inputDuration(startTime, endTime)}</strong></p>
        )}

        {needsLongConfirm && <LongShiftConfirm checked={allowLong} onChange={setAllowLong} />}

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Unpaid break (minutes) <span className="text-gray-400 font-normal">optional</span>
          <input type="number" min={0} step={1} className={`${inputClass} mt-1`}
            placeholder="e.g. 30" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} />
        </label>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Reason
          <textarea required maxLength={500} rows={2} className={`${inputClass} mt-1`}
            placeholder="e.g. Forgot to clock in, hours confirmed with employee"
            value={note} onChange={e => setNote(e.target.value)} />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving…' : 'Add timesheet'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddShiftModal;
