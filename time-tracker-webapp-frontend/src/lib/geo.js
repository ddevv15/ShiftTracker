// Distance in metres between two { latitude, longitude } points (haversine)
export const distanceMeters = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const NEARBY_SITE_METERS = 300;

export const formatDistance = (meters) =>
  meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;

// Best-effort current position; resolves null instead of failing
export const currentPosition = () => new Promise(resolve => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    pos => resolve({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy
    }),
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
});
