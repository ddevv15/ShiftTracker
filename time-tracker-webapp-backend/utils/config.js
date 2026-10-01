// Centralised, validated configuration. Fails fast on unsafe settings so a
// misconfigured server never starts (e.g. with a guessable JWT secret).

const PLACEHOLDER_SECRETS = ['your_jwt_secret_key_here', 'your-secret-key'];

const validateConfig = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || PLACEHOLDER_SECRETS.includes(secret) || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a random value of at least 32 characters. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }
};

const getJwtSecret = () => process.env.JWT_SECRET;

// CORS_ORIGIN: comma-separated allowed origins. If unset, production allows
// same-origin only (frontend served by this server); development allows all.
const getCorsOrigin = () => {
  const origins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  if (origins.length > 0) return origins;
  return process.env.NODE_ENV === 'production' ? false : true;
};

// REQUIRE_LOCATION=true rejects clock-in/out and breaks without GPS
const isLocationRequired = () => process.env.REQUIRE_LOCATION === 'true';

module.exports = {
  validateConfig,
  getJwtSecret,
  getCorsOrigin,
  isLocationRequired
};
