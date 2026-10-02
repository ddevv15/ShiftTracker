import { useState } from 'react';

const TAG_LABEL = { BEFORE: 'Before', DURING: 'During', AFTER: 'After' };

const Row = ({ label, children }) => (
  <div className="space-y-1.5">
    <p className="text-[0.8125rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    {children}
  </div>
);

const Pill = ({ children, tone = 'gray' }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${tone === 'red'
    ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
  >
    {children}
  </span>
);

// Read-only shift report: used in worker history and the admin review
const ReportView = ({ report }) => {
  const [viewing, setViewing] = useState(null);

  if (!report) return null;
  const empty = !report.site && !report.tasks.length && !report.issues.length && !report.note && !report.photos.length;
  if (empty) {
    return <p className="py-6 text-center text-gray-500 dark:text-gray-400">No report was added for this shift.</p>;
  }

  return (
    <div className="space-y-5">
      <Row label="Site">
        <p className="text-base font-semibold text-gray-900 dark:text-white">{report.site?.name || '—'}</p>
      </Row>
      <Row label="Work done">
        {report.tasks.length
          ? <div className="flex flex-wrap gap-2">{report.tasks.map(t => <Pill key={t.id}>{t.label}</Pill>)}</div>
          : <p className="text-gray-500">—</p>}
      </Row>
      {report.issues.length > 0 && (
        <Row label="Issues">
          <div className="flex flex-wrap gap-2">{report.issues.map(i => <Pill key={i.id} tone="red">{i.label}</Pill>)}</div>
        </Row>
      )}
      {report.note && (
        <Row label="Note">
          <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{report.note}</p>
        </Row>
      )}
      <Row label={`Photos (${report.photos.length})`}>
        {report.photos.length ? (
          <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {report.photos.map(photo => (
              <li key={photo._id}>
                <button type="button" onClick={() => setViewing(photo)} className="tap relative block aspect-square w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                  <img src={photo.url} alt={`${TAG_LABEL[photo.tag]} photo`} className="h-full w-full object-cover" loading="lazy" />
                  <span className="absolute left-1 bottom-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {TAG_LABEL[photo.tag]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="text-gray-500">—</p>}
      </Row>

      {viewing && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Photo">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <div className="text-sm">
              <span className="font-semibold">{TAG_LABEL[viewing.tag]}</span>
              <span className="ml-2 text-white/70">{new Date(viewing.takenAt).toLocaleString()}</span>
              {viewing.location && (
                <a
                  href={`https://www.google.com/maps?q=${viewing.location.latitude},${viewing.location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-3 underline text-white/90"
                >
                  Map
                </a>
              )}
            </div>
            <button type="button" onClick={() => setViewing(null)} className="tap rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              Done
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2" onClick={() => setViewing(null)}>
            <img src={viewing.url} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportView;
