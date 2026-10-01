// Private photo storage on Cloudflare R2 (S3-compatible).
// Objects are never public; viewers get short-lived signed URLs.
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const SIGNED_URL_TTL_SECONDS = 60 * 60;

let client = null;

const isConfigured = () => Boolean(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET
);

const getClient = () => {
  if (!isConfigured()) {
    throw new Error('Photo storage is not configured (R2_* environment variables)');
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
  }
  return client;
};

const bucket = () => process.env.R2_BUCKET;

const putPhoto = (key, buffer, contentType) =>
  getClient().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'private, max-age=31536000, immutable'
  }));

const deletePhoto = (key) =>
  getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));

const signedPhotoUrl = (key) =>
  getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS
  });

module.exports = {
  isConfigured,
  putPhoto,
  deletePhoto,
  signedPhotoUrl
};
