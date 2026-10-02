import { useState } from 'react';
import Sheet from './Sheet';
import { useReport } from './ReportContext';
import { Section, NoteField } from './JobCard';
import SitePicker from './SitePicker';
import ChipGroup from './ChipGroup';
import PhotoCapture from './PhotoCapture';
import { messageFrom } from '../../lib/reportApi';

// Clock-out wrap-up: already filled in from the shift; asks only for gaps
const WrapUpSheet = ({ open, onClose, onEndShift }) => {
  const {
    options, draft, photos, setSite, toggleTask, toggleIssue,
    missing, pendingUploads, failedUploads, flush
  } = useReport();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!options) return null;

  const hasAfterPhoto = photos.some(photo => photo.tag === 'AFTER');
  const blocked = missing.length > 0 || pendingUploads > 0 || failedUploads > 0;

  let buttonLabel = 'End shift & submit';
  if (pendingUploads > 0) buttonLabel = `Finishing ${pendingUploads} upload${pendingUploads > 1 ? 's' : ''}…`;
  else if (failedUploads > 0) buttonLabel = 'Retry or remove failed photos';
  else if (missing.includes('site') && missing.includes('tasks')) buttonLabel = 'Pick your site and work done';
  else if (missing.includes('site')) buttonLabel = 'Pick your site';
  else if (missing.includes('tasks')) buttonLabel = 'Pick the work you did';

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await flush();
      await onEndShift();
      onClose();
    } catch (err) {
      setError(messageFrom(err, err?.message || 'Could not end your shift. Try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Wrap up your shift"
      dismissible={!submitting}
      footer={
        <button
          type="button"
          onClick={submit}
          disabled={blocked || submitting}
          className="tap btn btn-danger h-14 w-full rounded-2xl text-base"
        >
          {submitting ? 'Ending shift…' : buttonLabel}
        </button>
      }
    >
      <div className="space-y-6 pt-1">
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>
        )}

        {options.sites.length > 0 && (
          <Section title="Site" hint={missing.includes('site') ? 'Required' : undefined}>
            <SitePicker sites={options.sites} selectedId={draft.siteId} onSelect={setSite} />
          </Section>
        )}

        {options.tasks.length > 0 && (
          <Section title="Work done" hint={missing.includes('tasks') ? 'Required' : `${draft.taskIds.length} selected`}>
            <ChipGroup label="Work done" items={options.tasks} selectedIds={draft.taskIds} onToggle={toggleTask} />
          </Section>
        )}

        <Section title="Photos" hint={`${photos.length} added`}>
          {!hasAfterPhoto && (
            <p className="text-sm text-gray-600 dark:text-gray-300">Add an <strong>After</strong> photo to show the finished work?</p>
          )}
          <PhotoCapture initialTag={hasAfterPhoto ? undefined : 'AFTER'} compact />
        </Section>

        {options.issues.length > 0 && (
          <Section title="Any issues?">
            <ChipGroup label="Issues" variant="issue" items={options.issues} selectedIds={draft.issueIds} onToggle={toggleIssue} />
          </Section>
        )}

        <NoteField />
      </div>
    </Sheet>
  );
};

export default WrapUpSheet;
