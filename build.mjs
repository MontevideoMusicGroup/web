import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const allowedDirectories = new Set(['admin', 'css', 'js', 'media', 'tienda']);
const allowedExtensions = new Set(['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.gif', '.mp4', '.webm', '.pdf']);
async function copyPublic(directory, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const source = path.join(directory, entry.name);
    const target = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyPublic(source, target);
    else if (entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase())) await cp(source, target);
  }
}
for (const entry of await readdir(root, { withFileTypes: true })) {
  const source = path.join(root, entry.name);
  const target = path.join(output, entry.name);
  if (entry.isDirectory() && allowedDirectories.has(entry.name)) await copyPublic(source, target);
  else if (entry.isFile() && (/\.(html|jpg|jpeg|webp|png|ico)$/i.test(entry.name) || ['manifest.json', 'robots.txt', 'sitemap.xml'].includes(entry.name))) await cp(source, target);
}
console.log('Archivos públicos preparados en dist; datos y código de servidor excluidos.');
