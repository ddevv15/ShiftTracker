export interface Employee {
  _id: string;
  name: string;
  email: string;
  role: 'employee' | 'admin';
  active: boolean;
}

export interface AdminShift {
  _id: string;
  employeeId: { _id: string; name: string; email: string } | null;
  startTime: string;
  endTime?: string | null;
  location?: { latitude: number; longitude: number } | null;
  breaks?: Array<{ startTime: string; endTime?: string; type: string }>;
  onBreak: boolean;
  employeeName: string;
  employeeDeleted: boolean;
  open: boolean;
  workingTime: number;
  breakTime: number;
  editedBy?: { _id: string; name: string } | null;
  editedAt?: string;
  editNote?: string;
  // Shift report summary
  site: string | null;
  photoCount: number;
  taskCount: number;
  issues: string[];
  hasNote: boolean;
}

export interface ShiftFilters {
  employeeId: string;
  siteId: string;
  from: string; // YYYY-MM-DD, local date
  to: string;   // YYYY-MM-DD, local date (inclusive)
  hasIssues: boolean;
}

export const formatDuration = (ms: number) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Date -> value for <input type="datetime-local"> in the viewer's timezone
export const toLocalInputValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

// Local date filters -> ISO query params, so "a day" means the admin's day
export const filtersToParams = (filters: ShiftFilters) => {
  const params: Record<string, string> = {};
  if (filters.employeeId) params.employeeId = filters.employeeId;
  if (filters.siteId) params.siteId = filters.siteId;
  if (filters.hasIssues) params.hasIssues = 'true';
  if (filters.from) params.from = new Date(`${filters.from}T00:00`).toISOString();
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00`);
    end.setDate(end.getDate() + 1);
    params.to = end.toISOString();
  }
  return params;
};

export const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const inputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

export const thClass =
  'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider';

export const tdClass = 'px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300';
