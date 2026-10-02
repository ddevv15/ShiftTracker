import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { errorMessage, inputClass } from './types';

interface Site {
  _id: string;
  name: string;
  address?: string;
  location?: { latitude?: number; longitude?: number };
  active: boolean;
  sortOrder: number;
}

interface ReportOption {
  _id: string;
  type: 'task' | 'issue';
  label: string;
  active: boolean;
  sortOrder: number;
}

type Item = { _id: string; name: string; sub?: string; active: boolean; sortOrder: number };

const hasLocation = (site: Site) => site.location?.latitude != null && site.location?.longitude != null;

const getPosition = () => new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('Location is not available on this device'));
  navigator.geolocation.getCurrentPosition(
    pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    () => reject(new Error('Could not get your location. Allow location access and try again.')),
    { enableHighAccuracy: true, timeout: 15000 }
  );
});

// One editable list: add, rename, reorder, hide/show
const ListEditor = ({
  title, description, placeholder, items, onAdd, onRename, onToggle, onMove, extraAction
}: {
  title: string;
  description: string;
  placeholder: string;
  items: Item[];
  onAdd: (name: string) => Promise<boolean>;
  onRename: (item: Item, name: string) => Promise<boolean>;
  onToggle: (item: Item) => Promise<boolean>;
  onMove: (index: number, direction: -1 | 1) => Promise<boolean>;
  extraAction?: (item: Item) => React.ReactNode;
}) => {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    if (await onAdd(name.trim())) setName('');
    setBusy(false);
  };

  const active = items.filter(i => i.active);
  const hidden = items.filter(i => !i.active);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>

      <form onSubmit={add} className="flex gap-2 mb-4">
        <input className={inputClass} placeholder={placeholder} value={name} maxLength={100}
          onChange={e => setName(e.target.value)} />
        <button type="submit" className="btn btn-primary shrink-0" disabled={busy || !name.trim()}>Add</button>
      </form>

      {active.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Nothing added yet.</p>}
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {active.map((item, index) => (
          <li key={item._id} className="flex items-center gap-3 py-2.5">
            <div className="flex flex-col">
              <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25 leading-none">▲</button>
              <button type="button" aria-label="Move down" disabled={index === active.length - 1} onClick={() => onMove(index, 1)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-25 leading-none">▼</button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
              {item.sub && <p className="truncate text-xs text-gray-500 dark:text-gray-400">{item.sub}</p>}
            </div>
            {extraAction?.(item)}
            <button type="button" onClick={() => {
              const next = window.prompt('Rename to:', item.name)?.trim();
              if (next && next !== item.name) onRename(item, next);
            }} className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400">Rename</button>
            <button type="button" onClick={() => onToggle(item)} className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">Hide</button>
          </li>
        ))}
      </ul>

      {hidden.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">Hidden ({hidden.length})</summary>
          <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-700">
            {hidden.map(item => (
              <li key={item._id} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-400 line-through">{item.name}</span>
                <button type="button" onClick={() => onToggle(item)} className="text-sm text-primary-600 dark:text-primary-400">Show</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};

const SetupPanel = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [options, setOptions] = useState<ReportOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([axios.get('/api/admin/sites'), axios.get('/api/admin/report-options')]);
      setSites(s.data);
      setOptions(o.data);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load setup'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Never throws: shows the error and resolves false instead
  const run = async (action: () => Promise<unknown>, success?: string) => {
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
      await load();
      return true;
    } catch (err) {
      setError(errorMessage(err, (err as Error)?.message || 'Something went wrong'));
      return false;
    }
  };

  // Swap sortOrder with the neighbour (renumbering keeps it stable)
  const move = (base: string, list: Item[]) => async (index: number, direction: -1 | 1) => {
    const reordered = [...list];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(index + direction, 0, moved);
    return run(() => Promise.all(reordered.map((item, i) =>
      item.sortOrder === i ? null : axios.put(`${base}/${item._id}`, { sortOrder: i }))));
  };

  const siteItems: Item[] = sites.map(s => ({
    _id: s._id,
    name: s.name,
    sub: [s.address, hasLocation(s) ? '📍 Location saved' : 'No location'].filter(Boolean).join(' · '),
    active: s.active,
    sortOrder: s.sortOrder
  }));
  const optionItems = (type: 'task' | 'issue'): Item[] => options
    .filter(o => o.type === type)
    .map(o => ({ _id: o._id, name: o.label, active: o.active, sortOrder: o.sortOrder }));

  const saveSiteLocation = (item: Item) => run(async () => {
    const location = await getPosition();
    await axios.put(`/api/admin/sites/${item._id}`, { location });
  }, `Saved your current location for ${item.name}`);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div></div>;
  }

  const taskItems = optionItems('task');
  const issueItems = optionItems('issue');

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm dark:bg-red-900 dark:text-red-200 dark:border-red-700">{error}</div>}
      {notice && <div role="status" className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded text-sm dark:bg-green-900 dark:text-green-200 dark:border-green-700">{notice}</div>}

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Workers pick from these lists in their shift report. Once there is at least one site and one task,
        workers must choose a site and the work they did before ending a shift.
      </p>

      <ListEditor
        title="Sites"
        description="Job sites workers can choose. Stand at a site and tap “Use my location” so the app can suggest it automatically."
        placeholder="e.g. Sunrise Apartments"
        items={siteItems}
        onAdd={name => run(() => axios.post('/api/admin/sites', { name }), `Added ${name}`)}
        onRename={(item, name) => run(() => axios.put(`/api/admin/sites/${item._id}`, { name }))}
        onToggle={item => run(() => axios.put(`/api/admin/sites/${item._id}`, { active: !item.active }))}
        onMove={move('/api/admin/sites', siteItems.filter(i => i.active))}
        extraAction={item => (
          <button type="button" onClick={() => saveSiteLocation(item)} className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 whitespace-nowrap">
            Use my location
          </button>
        )}
      />

      <ListEditor
        title="Work done"
        description="Tasks workers tap to say what they did. Put the most common first."
        placeholder="e.g. AC servicing"
        items={taskItems}
        onAdd={label => run(() => axios.post('/api/admin/report-options', { type: 'task', label }), `Added ${label}`)}
        onRename={(item, label) => run(() => axios.put(`/api/admin/report-options/${item._id}`, { label }))}
        onToggle={item => run(() => axios.put(`/api/admin/report-options/${item._id}`, { active: !item.active }))}
        onMove={move('/api/admin/report-options', taskItems.filter(i => i.active))}
      />

      <ListEditor
        title="Issue flags"
        description="Problems workers can flag. Shifts with issues can be filtered in the Shifts tab."
        placeholder="e.g. Needs return visit"
        items={issueItems}
        onAdd={label => run(() => axios.post('/api/admin/report-options', { type: 'issue', label }), `Added ${label}`)}
        onRename={(item, label) => run(() => axios.put(`/api/admin/report-options/${item._id}`, { label }))}
        onToggle={item => run(() => axios.put(`/api/admin/report-options/${item._id}`, { active: !item.active }))}
        onMove={move('/api/admin/report-options', issueItems.filter(i => i.active))}
      />
    </div>
  );
};

export default SetupPanel;
