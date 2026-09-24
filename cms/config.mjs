import path from 'node:path';
export function configuration(overrides = {}) {
  const production = process.env.NODE_ENV === 'production';
  const config = { root: process.cwd(), production, origin: process.env.APP_ORIGIN || 'http://127.0.0.1:5173', dbPath: path.resolve(process.env.DATABASE_PATH || 'data/vpa.sqlite'), mediaDir: path.resolve(process.env.MEDIA_DIR || 'data/media'), storage: process.env.STORAGE_DRIVER || 'local', bucket: process.env.S3_BUCKET, endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, sessionHours: Number(process.env.SESSION_HOURS || 8), ...overrides };
  if (!Number.isFinite(config.sessionHours) || config.sessionHours <= 0 || config.sessionHours > 24) throw new Error('SESSION_HOURS must be between 0 and 24.');
  if (config.production && (!config.origin.startsWith('https://') || process.env.PERSISTENT_DATA_CONFIRMED !== 'true' || !process.env.DATABASE_PATH || (config.storage === 'local' && !process.env.MEDIA_DIR))) throw new Error('Production requires an HTTPS APP_ORIGIN, an explicit persistent DATABASE_PATH, MEDIA_DIR for local storage, and PERSISTENT_DATA_CONFIRMED=true.');
  return config;
}
