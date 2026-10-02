import { useState } from 'react';
import { useReport } from './ReportContext';
import SitePicker from './SitePicker';
import ChipGroup from './ChipGroup';
import PhotoCapture from './PhotoCapture';

export const SaveIndicator = () => {
  const { saveState } = useReport();
  const text = { saving: 'Saving…', saved: 'Saved', error: 'Not saved' }[saveState];
  if (!text) return null;
  return (
    <span aria-live="polite" className={`text-xs font-medium ${saveState === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
      {saveState === 'saved' && '✓ '}{text}
    </span>
  );
};

export const Section = ({ title, hint, children }) => (
  <section className="space-y-3">
    <div className="flex items-baseline justify-between">
      <h3 className="text-[0.8125rem] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
      {hint && <span className="text-xs text-gray-400 dark:text-gray-500">{hint}</span>}
    </div>
    {children}
  </section>
);

export const NoteField = () => {
  const { draft, setNote } = useReport();
  const [open, setOpen] = useState(Boolean(draft.note));
  if (!open && !draft.note) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="tap text-sm font-medium text-primary-600 dark:text-primary-400 py-1">
        + Add note
      </button>
    );
  }
  return (
    <div>
      <textarea
        value={draft.note}
        onChange={e => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        autoFocus={!draft.note}
        placeholder="Anything else? (optional)"
        className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <p className="mt-1 text-right text-xs tabular-nums text-gray-400">{draft.note.length}/500</p>
    </div>
  );
};

// "Today's job": everything about the shift's work, filled in by tapping
const JobCard = () => {
  const { shiftId, options, draft, setSite, toggleTask, toggleIssue, error, clearError } = useReport();
  if (!shiftId || !options) return null;

  return (
    <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-md p-5 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Today&apos;s job</h2>
        <SaveIndicator />
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <span>{error}</span>
          <button type="button" onClick={clearError} className="tap font-semibold">OK</button>
        </div>
      )}

      {options.sites.length > 0 && (
        <Section title="Site">
          <SitePicker sites={options.sites} selectedId={draft.siteId} onSelect={setSite} />
        </Section>
      )}

      <Section title="Photos">
        <PhotoCapture />
      </Section>

      {options.tasks.length > 0 && (
        <Section title="Work done" hint="Tap all that apply">
          <ChipGroup label="Work done" items={options.tasks} selectedIds={draft.taskIds} onToggle={toggleTask} />
        </Section>
      )}

      {options.issues.length > 0 && (
        <Section title="Any issues?">
          <ChipGroup label="Issues" variant="issue" items={options.issues} selectedIds={draft.issueIds} onToggle={toggleIssue} />
        </Section>
      )}

      <NoteField />
    </div>
  );
};

export default JobCard;
