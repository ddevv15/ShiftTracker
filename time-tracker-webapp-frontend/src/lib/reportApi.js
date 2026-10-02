import axios from 'axios';

export const messageFrom = (err, fallback) => err?.response?.data?.message || fallback;

export const getReportOptions = () =>
  axios.get('/api/report-options').then(res => res.data);

export const getCurrentReport = () =>
  axios.get('/api/shifts/current/report').then(res => res.data);

export const saveReport = (patch) =>
  axios.patch('/api/shifts/current/report', patch).then(res => res.data);

export const uploadPhoto = (blob, { tag, takenAt, location }, onProgress) => {
  const params = { tag, takenAt: takenAt.toISOString() };
  if (location) {
    params.lat = location.latitude;
    params.lng = location.longitude;
    if (location.accuracy) params.acc = Math.round(location.accuracy);
  }
  return axios.post('/api/shifts/current/photos', blob, {
    params,
    headers: { 'Content-Type': 'image/jpeg' },
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(event.loaded / event.total);
    }
  }).then(res => res.data);
};

export const deletePhoto = (photoId) =>
  axios.delete(`/api/shifts/current/photos/${photoId}`);

export const getShiftReport = (shiftId) =>
  axios.get(`/api/shifts/${shiftId}/report`).then(res => res.data);
