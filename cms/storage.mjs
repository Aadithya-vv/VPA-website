import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { id, fail } from './database.mjs';
export function createStorage(config) {
  if (config.storage === 's3') {
    if (!config.bucket) throw new Error('S3_BUCKET is required for S3 storage.');
    const client = new S3Client({ region: config.region || 'auto', endpoint: config.endpoint || undefined, forcePathStyle: true });
    return {
      async put(key, data, type) { await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: data, ContentType: type })); },
      async get(key) { const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key })); return Buffer.from(await result.Body.transformToByteArray()); },
      async delete(key) { await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key })); }
    };
  }
  if (config.storage !== 'local') throw new Error('STORAGE_DRIVER must be local or s3.');
  const location = key => { if (!/^[a-zA-Z0-9/-]+\.[a-z0-9]+$/.test(key) || key.includes('..')) throw fail(400, 'Invalid image location.'); return path.join(config.mediaDir, key); };
  return {
    async put(key, data) { const file = location(key); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, data, { flag: 'wx' }); },
    get: key => readFile(location(key)),
    async delete(key) { await unlink(location(key)).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  };
}
export async function prepareImage(buffer) {
  if (!buffer?.length || buffer.length > 10 * 1024 * 1024) throw fail(400, 'Choose an image smaller than 10 MB.');
  try {
    const metadata = await sharp(buffer, { limitInputPixels: 40000000, failOn: 'error' }).metadata();
    if (!['jpeg', 'png', 'webp', 'avif'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error('format');
    const base = sharp(buffer, { limitInputPixels: 40000000, failOn: 'error' }).rotate();
    const large = await base.clone().resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
    const small = await base.clone().resize({ width: 640, height: 960, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    return { original: buffer, extension: metadata.format === 'jpeg' ? 'jpg' : metadata.format, originalType: `image/${metadata.format}`, large, small };
  } catch { throw fail(400, 'This is not a supported image. Use a valid JPG, PNG, WebP or AVIF (up to 40 megapixels).'); }
}
export async function storeImage(storage, image) {
  const key = id(); const written = [];
  const original = `originals/${key}.${image.extension}`, large = `images/${key}.webp`, small = `images/${key}-640.webp`;
  try {
    for (const [name, data, type] of [[original, image.original, image.originalType], [large, image.large.data, 'image/webp'], [small, image.small.data, 'image/webp']]) { await storage.put(name, data, type); written.push(name); }
  } catch (error) { await Promise.allSettled(written.map(name => storage.delete(name))); throw error; }
  return { storage_key: large, source: 'upload', mime_type: 'image/webp', file_size: image.large.data.length, width: image.large.info.width, height: image.large.info.height, variants: JSON.stringify({ original, small, smallWidth: image.small.info.width }) };
}
