import { useEffect, useMemo, useState } from 'react';
import { currentPosition, distanceMeters, formatDistance, NEARBY_SITE_METERS } from '../../lib/geo';

const SEARCH_THRESHOLD = 8;

// Pick the job site in one tap: suggest the nearest saved site, otherwise
// list sites by distance (search only appears when the list is long)
const SitePicker = ({ sites, selectedId, onSelect }) => {
  const [position, setPosition] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    currentPosition().then(pos => !cancelled && setPosition(pos));
    return () => { cancelled = true; };
  }, []);

  const ranked = useMemo(() => sites
    .map(site => ({
      ...site,
      distance: position && site.location?.latitude != null ? distanceMeters(position, site.location) : null
    }))
    .sort((a, b) => {
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      if (a.distance != null) return -1;
      if (b.distance != null) return 1;
      return 0;
    }), [sites, position]);

  const selected = sites.find(site => String(site._id) === String(selectedId));
  const nearest = ranked[0]?.distance != null && ranked[0].distance <= NEARBY_SITE_METERS ? ranked[0] : null;

  if (selected && !expanded) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary-50 dark:bg-primary-900/30 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-700 dark:text-primary-300">Site</p>
          <p className="truncate text-base font-semibold text-gray-900 dark:text-white">{selected.name}</p>
        </div>
        <button type="button" onClick={() => setExpanded(true)} className="tap shrink-0 rounded-full px-3 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50">
          Change
        </button>
      </div>
    );
  }

  const choose = (site) => {
    onSelect(String(site._id));
    setExpanded(false);
    setQuery('');
  };

  if (nearest && !expanded && !selected) {
    return (
      <div className="rounded-2xl bg-primary-50 dark:bg-primary-900/30 p-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">You seem to be at</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{nearest.name}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => choose(nearest)} className="tap btn btn-primary h-11 flex-1 rounded-xl">
            Yes, I&apos;m here
          </button>
          <button type="button" onClick={() => setExpanded(true)} className="tap btn btn-secondary h-11 rounded-xl">
            Other site
          </button>
        </div>
      </div>
    );
  }

  const filtered = query
    ? ranked.filter(site => site.name.toLowerCase().includes(query.toLowerCase()))
    : ranked;

  return (
    <div className="space-y-2">
      {sites.length > SEARCH_THRESHOLD && (
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search sites"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}
      <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
        {filtered.map(site => (
          <li key={site._id}>
            <button
              type="button"
              onClick={() => choose(site)}
              className="tap flex w-full items-center justify-between gap-3 bg-white dark:bg-gray-800 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/60"
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-medium text-gray-900 dark:text-white">{site.name}</span>
                {site.address && <span className="block truncate text-sm text-gray-500 dark:text-gray-400">{site.address}</span>}
              </span>
              {site.distance != null && (
                <span className="shrink-0 text-sm tabular-nums text-gray-500 dark:text-gray-400">{formatDistance(site.distance)}</span>
              )}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No sites match</li>
        )}
      </ul>
      {selected && (
        <button type="button" onClick={() => setExpanded(false)} className="tap text-sm font-medium text-gray-500 dark:text-gray-400 px-1 py-2">
          Keep {selected.name}
        </button>
      )}
    </div>
  );
};

export default SitePicker;
