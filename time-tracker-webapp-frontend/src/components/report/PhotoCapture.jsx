import { useRef, useState } from 'react';
import { useReport } from './ReportContext';

const TAGS = [
  { value: 'BEFORE', label: 'Before' },
  { value: 'DURING', label: 'During' },
  { value: 'AFTER', label: 'After' }
];
const TAG_LABEL = Object.fromEntries(TAGS.map(t => [t.value, t.label]));

// Circular upload progress
const ProgressRing = ({ progress }) => {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - progress)} style={{ transition: 'stroke-dashoffset 150ms linear' }} />
    </svg>
  );
};

// Camera-first photo capture with Before/During/After tagging.
// `initialTag` lets the wrap-up sheet open straight into "After".
const PhotoCapture = ({ initialTag, compact = false }) => {
  const { photos, uploads, addPhotos, retryUpload, discardUpload, removePhoto, maxPhotos } = useReport();
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);
  const [chosenTag, setChosenTag] = useState(null);

  // Smart default: first photo is "Before", later ones "During"
  const defaultTag = initialTag || (photos.length + uploads.length === 0 ? 'BEFORE' : 'DURING');
  const tag = chosenTag || defaultTag;

  const onFiles = (e) => {
    if (e.target.files?.length) addPhotos(e.target.files, tag);
    e.target.value = '';
    setChosenTag(null);
  };

  const full = photos.length + uploads.length >= maxPhotos;

  return (
    <div className="space-y-3">
      {/* Segmented control */}
      <div role="radiogroup" aria-label="Photo type" className="grid grid-cols-3 rounded-xl bg-gray-100 dark:bg-gray-700/60 p-1">
        {TAGS.map(t => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={tag === t.value}
            onClick={() => setChosenTag(t.value)}
            className={`tap rounded-lg py-2 text-sm font-semibold ${tag === t.value
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={full}
          onClick={() => cameraInput.current?.click()}
          className={`tap btn btn-primary flex-1 rounded-xl ${compact ? 'h-12' : 'h-14'} text-base`}
        >
          <svg className="mr-2 h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.66-.9l.82-1.2A2 2 0 0110.07 4h3.86a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {full ? `${maxPhotos} photo limit` : `Take ${TAG_LABEL[tag]} photo`}
        </button>
        <button
          type="button"
          disabled={full}
          onClick={() => galleryInput.current?.click()}
          aria-label="Choose from gallery"
          className={`tap btn btn-secondary rounded-xl ${compact ? 'h-12 w-12' : 'h-14 w-14'} !px-0`}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 16l-5-5-8 8" />
          </svg>
        </button>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFiles} />
        <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      </div>

      {(photos.length > 0 || uploads.length > 0) && (
        <ul className="grid grid-cols-4 gap-2">
          {photos.map(photo => (
            <li key={photo._id} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
              <img src={photo.previewUrl || photo.url} alt={`${TAG_LABEL[photo.tag]} photo`} className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute left-1 bottom-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {TAG_LABEL[photo.tag]}
              </span>
              <button
                type="button"
                onClick={() => removePhoto(photo._id)}
                aria-label="Remove photo"
                className="tap absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </li>
          ))}
          {uploads.map(upload => (
            <li key={upload.localId} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
              <img src={upload.previewUrl} alt="" className="h-full w-full object-cover opacity-70" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30">
                {upload.status === 'error' ? (
                  <>
                    <button type="button" onClick={() => retryUpload(upload.localId)} className="tap rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-900">
                      Retry
                    </button>
                    <button type="button" onClick={() => discardUpload(upload.localId)} className="tap text-[11px] font-medium text-white underline">
                      Remove
                    </button>
                  </>
                ) : (
                  <ProgressRing progress={upload.status === 'processing' ? 0.05 : upload.progress} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PhotoCapture;
