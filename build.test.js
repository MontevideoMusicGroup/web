import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const root = new URL('.', import.meta.url);
test('el despliegue contiene únicamente archivos públicos', async () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root });
  const entries = await readdir(new URL('dist/', root));
  for (const name of ['data', 'cloudflare', 'worker.js', 'server.ps1', 'node_modules', 'package.json', 'migrate-data.mjs']) assert.ok(!entries.includes(name), name);
  for (const name of ['index.html', 'admin', 'tienda', 'media', 'manifest.json']) assert.ok(entries.includes(name), name);
  const html = await readFile(new URL('dist/admin/index.html', root), 'utf8');
  assert.match(html, /name="setupToken"/);
});
