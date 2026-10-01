// Accept only a well-formed { latitude, longitude, accuracy }; anything else is null
const parseLocation = (location) => {
  if (!location || typeof location !== 'object') return null;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const accuracy = Number(location.accuracy);
  return {
    latitude,
    longitude,
    ...(Number.isFinite(accuracy) ? { accuracy } : {})
  };
};

module.exports = { parseLocation };
