import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ShiftContext } from '../../context/ShiftContext';
import { compressImage } from '../../lib/compressImage';
import { currentPosition } from '../../lib/geo';
import {
  getReportOptions, getCurrentReport, saveReport, uploadPhoto, deletePhoto, messageFrom
} from '../../lib/reportApi';

export const ReportContext = createContext(null);
export const useReport = () => useContext(ReportContext);

const AUTOSAVE_DELAY_MS = 600;
const MAX_PHOTOS = 20;

const emptyDraft = { siteId: null, taskIds: [], issueIds: [], note: '' };

const draftFromReport = (report) => ({
  siteId: report?.site?.id || null,
  taskIds: (report?.tasks || []).map(task => String(task.id)),
  issueIds: (report?.issues || []).map(issue => String(issue.id)),
  note: report?.note || ''
});

let localIdCounter = 0;

// Shift report state for the open shift: pick-lists, an optimistic draft that
// autosaves, and the photo upload queue. Shared by the job card and wrap-up.
export const ReportProvider = ({ children }) => {
  const { currentShift, status } = useContext(ShiftContext);
  const shiftId = status !== 'INACTIVE' ? currentShift?._id : null;

  const [options, setOptions] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [photos, setPhotos] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState(null);

  const pendingPatch = useRef({});
  const saveTimer = useRef(null);
  const savePromise = useRef(Promise.resolve());

  // Load options + report whenever a shift is open
  useEffect(() => {
    if (!shiftId) {
      setDraft(emptyDraft);
      setPhotos([]);
      setUploads([]);
      setSaveState('idle');
      return;
    }
    let cancelled = false;
    Promise.all([getReportOptions(), getCurrentReport()])
      .then(([opts, report]) => {
        if (cancelled) return;
        setOptions(opts);
        setDraft(draftFromReport(report));
        setPhotos(report?.photos || []);
      })
      .catch(err => !cancelled && setError(messageFrom(err, 'Could not load your job details')));
    return () => { cancelled = true; };
  }, [shiftId]);

  // Options are also needed while clocked out (to know if a report applies)
  useEffect(() => {
    if (!shiftId && !options) {
      getReportOptions().then(setOptions).catch(() => {});
    }
  }, [shiftId, options]);

  const runSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    const patch = pendingPatch.current;
    if (Object.keys(patch).length === 0) return savePromise.current;
    pendingPatch.current = {};
    setSaveState('saving');
    savePromise.current = savePromise.current
      .catch(() => {})
      .then(() => saveReport(patch))
      .then(() => {
        setSaveState(Object.keys(pendingPatch.current).length ? 'saving' : 'saved');
        setError(null);
      })
      .catch(err => {
        // Put the failed fields back so the next change (or flush) retries them
        pendingPatch.current = { ...patch, ...pendingPatch.current };
        setSaveState('error');
        setError(messageFrom(err, 'Could not save. Check your connection.'));
        throw err;
      });
    return savePromise.current;
  }, []);

  const queueSave = useCallback((fields) => {
    pendingPatch.current = { ...pendingPatch.current, ...fields };
    setSaveState('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { runSave().catch(() => {}); }, AUTOSAVE_DELAY_MS);
  }, [runSave]);

  // Save anything pending right now (before ending the shift)
  const flush = useCallback(() => runSave(), [runSave]);

  const update = (changes) => {
    setDraft(prev => ({ ...prev, ...changes }));
    queueSave(changes);
  };

  const setSite = (siteId) => update({ siteId });
  const toggleIn = (list, id) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  const toggleTask = (id) => update({ taskIds: toggleIn(draft.taskIds, id) });
  const toggleIssue = (id) => update({ issueIds: toggleIn(draft.issueIds, id) });
  const setNote = (note) => update({ note });

  const patchUpload = (localId, changes) =>
    setUploads(prev => prev.map(u => (u.localId === localId ? { ...u, ...changes } : u)));

  const sendUpload = useCallback(async (upload) => {
    patchUpload(upload.localId, { status: 'uploading', progress: 0, error: null });
    try {
      const photo = await uploadPhoto(upload.blob, upload.meta, progress =>
        patchUpload(upload.localId, { progress }));
      setPhotos(prev => [...prev, { ...photo, previewUrl: upload.previewUrl }]);
      setUploads(prev => prev.filter(u => u.localId !== upload.localId));
    } catch (err) {
      patchUpload(upload.localId, { status: 'error', error: messageFrom(err, 'Upload failed') });
    }
  }, []);

  const addPhotos = async (files, tag) => {
    const room = MAX_PHOTOS - photos.length - uploads.length;
    const accepted = Array.from(files).slice(0, Math.max(room, 0));
    if (accepted.length < files.length) {
      setError(`You can add up to ${MAX_PHOTOS} photos per shift`);
    }
    // One GPS fix for the batch; wait at most 2s so uploads never stall on weak GPS
    const locationPromise = Promise.race([
      currentPosition(),
      new Promise(resolve => setTimeout(() => resolve(null), 2000))
    ]);
    for (const file of accepted) {
      const localId = `local-${++localIdCounter}`;
      const previewUrl = URL.createObjectURL(file);
      const base = { localId, previewUrl, tag, status: 'processing', progress: 0 };
      setUploads(prev => [...prev, base]);
      try {
        const blob = await compressImage(file);
        const upload = { ...base, blob, meta: { tag, takenAt: new Date(), location: await locationPromise } };
        setUploads(prev => prev.map(u => (u.localId === localId ? upload : u)));
        sendUpload(upload);
      } catch (err) {
        patchUpload(localId, { status: 'error', error: err.message });
      }
    }
  };

  const retryUpload = (localId) => {
    const upload = uploads.find(u => u.localId === localId);
    if (upload?.blob) sendUpload(upload);
  };

  const discardUpload = (localId) => {
    setUploads(prev => prev.filter(u => u.localId !== localId));
  };

  const removePhoto = async (photoId) => {
    const previous = photos;
    setPhotos(prev => prev.filter(p => p._id !== photoId)); // optimistic
    try {
      await deletePhoto(photoId);
    } catch (err) {
      setPhotos(previous);
      setError(messageFrom(err, 'Could not remove that photo'));
    }
  };

  const configured = Boolean(options && (options.sites.length > 0 || options.tasks.length > 0));
  const missing = [];
  if (options?.required && !draft.siteId) missing.push('site');
  if (options?.required && draft.taskIds.length === 0) missing.push('tasks');

  const value = {
    shiftId,
    options,
    configured,
    draft,
    photos,
    uploads,
    pendingUploads: uploads.filter(u => u.status !== 'error').length,
    failedUploads: uploads.filter(u => u.status === 'error').length,
    saveState,
    error,
    clearError: () => setError(null),
    missing,
    maxPhotos: MAX_PHOTOS,
    setSite,
    toggleTask,
    toggleIssue,
    setNote,
    addPhotos,
    retryUpload,
    discardUpload,
    removePhoto,
    flush
  };

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
};
