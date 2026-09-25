import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'experience.css', 'experience.js', 'event-page.js', 'server.mjs', 'package.json', 'package-lock.json']) await copyFile(file, `dist/${file}`);
await cp('assets', 'dist/assets', { recursive: true });
await cp('cms', 'dist/cms', { recursive: true });
await cp('admin', 'dist/admin', { recursive: true });
await cp('scripts', 'dist/scripts', { recursive: true });
console.log('Server deployment bundle built in dist/. Run npm ci and npm start there; persistent data is not copied.');
