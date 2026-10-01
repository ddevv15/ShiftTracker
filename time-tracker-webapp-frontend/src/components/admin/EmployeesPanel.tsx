import { useState } from 'react';
import axios from 'axios';
import { Employee, errorMessage, inputClass, thClass, tdClass } from './types';

interface Props {
  employees: Employee[];
  currentUserId?: string;
  onChanged: () => void;
}

const EmployeesPanel = ({ employees, currentUserId, onChanged }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      onChanged();
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong'));
    } finally {
      setBusyId(null);
    }
  };

  const createEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    run('new', async () => {
      await axios.post('/api/admin/employees', form);
      setForm({ name: '', email: '', password: '', role: 'employee' });
      setShowForm(false);
    }, `Account created for ${form.email}. Share the temporary password with them securely.`);
  };

  const toggleRole = (employee: Employee) =>
    run(employee._id, () => axios.put('/api/admin/employees/role', {
      userId: employee._id,
      role: employee.role === 'admin' ? 'employee' : 'admin'
    }), `${employee.name} is now ${employee.role === 'admin' ? 'an employee' : 'an admin'}.`);

  const toggleActive = (employee: Employee) =>
    run(employee._id, () => axios.put('/api/admin/employees/status', {
      userId: employee._id,
      active: !employee.active
    }), `${employee.name} has been ${employee.active ? 'deactivated' : 'reactivated'}.`);

  const resetPassword = (employee: Employee) => {
    const password = window.prompt(`New temporary password for ${employee.name} (min 6 characters):`);
    if (!password) return;
    run(employee._id, () => axios.put('/api/admin/employees/password', {
      userId: employee._id,
      password
    }), `Password reset for ${employee.name}.`);
  };

  const editEmail = (employee: Employee) => {
    const email = window.prompt(`New login email for ${employee.name}:`, employee.email)?.trim();
    if (!email || email.toLowerCase() === employee.email) return;
    run(employee._id, () => axios.put('/api/admin/employees/email', {
      userId: employee._id,
      email
    }), `${employee.name} now signs in with ${email.toLowerCase()}. Let them know.`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Employees</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Add employee'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm dark:bg-red-900 dark:text-red-200 dark:border-red-700" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded text-sm dark:bg-green-900 dark:text-green-200 dark:border-green-700" role="status">
          {notice}
        </div>
      )}

      {showForm && (
        <form onSubmit={createEmployee} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <input className={inputClass} placeholder="Full name" required
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className={inputClass} placeholder="Email" type="email" required
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className={inputClass} placeholder="Temporary password" type="text" required minLength={6}
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <select className={inputClass} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn btn-primary" disabled={busyId === 'new'}>
            {busyId === 'new' ? 'Creating…' : 'Create account'}
          </button>
        </form>
      )}

      {employees.length === 0 ? (
        <p className="text-center py-4 text-gray-500 dark:text-gray-400">No employees found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className={thClass}>Name</th>
                <th scope="col" className={thClass}>Email</th>
                <th scope="col" className={thClass}>Role</th>
                <th scope="col" className={thClass}>Status</th>
                <th scope="col" className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {employees.map(employee => {
                const isSelf = employee._id === currentUserId;
                const busy = busyId === employee._id;
                return (
                  <tr key={employee._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className={`${tdClass} font-medium text-gray-800 dark:text-gray-200`}>
                      {employee.name}{isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                    </td>
                    <td className={tdClass}>{employee.email}</td>
                    <td className={tdClass}>
                      {employee.role === 'admin' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Admin</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Employee</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {employee.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Inactive</span>
                      )}
                    </td>
                    <td className={`${tdClass} space-x-3`}>
                      <button onClick={() => toggleRole(employee)} disabled={isSelf || busy}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 disabled:opacity-40 disabled:cursor-not-allowed">
                        {employee.role === 'admin' ? 'Make employee' : 'Make admin'}
                      </button>
                      <button onClick={() => toggleActive(employee)} disabled={isSelf || busy}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 disabled:opacity-40 disabled:cursor-not-allowed">
                        {employee.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => editEmail(employee)} disabled={busy}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 disabled:opacity-40 disabled:cursor-not-allowed">
                        Edit email
                      </button>
                      <button onClick={() => resetPassword(employee)} disabled={busy}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 disabled:opacity-40 disabled:cursor-not-allowed">
                        Reset password
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployeesPanel;
