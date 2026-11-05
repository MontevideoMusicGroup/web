import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('.', import.meta.url);
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const parse = text => JSON.parse(text.replace(/^\uFEFF/, ''));
async function read(name, jsonl = false) {
  if (jsonl) {
    try {
      return (await readFile(new URL(`data/${name}.jsonl`, root), 'utf8')).replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim()).map(parse).flat(Infinity);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  try {
    return parse(await readFile(new URL(`data/${name}.json`, root), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return [];
  }
}
const statements = [];
for (const collection of ['products', 'categories', 'orders', 'sales', 'expenses']) {
  const records = [await read(collection, collection !== 'categories')].flat(Infinity).filter(Boolean);
  const ids = new Set();
  for (let record of records) {
    if (!record.id || ids.has(record.id)) throw new Error(`Identificador ausente o duplicado en ${collection}.`);
    ids.add(record.id);
    if (collection === 'products') {
      record = { subcategory: '', brand: '', model: '', color: '', capacity: '', compatibility: '', unitCost: 0, salePrice: 0, saleStartsAt: '', saleEndsAt: '', createdAt: new Date().toISOString(), ...record };
      for (const field of ['stock', 'minStock', 'saleStock']) delete record[field];
    }
    if (collection === 'orders') {
      if (record.status === 'waiting-stock') record.status = 'ordered';
      delete record.stockReserved;
    }
    statements.push(`INSERT OR IGNORE INTO records(collection,id,data) VALUES(${quote(collection)},${quote(record.id)},${quote(JSON.stringify(record))});`);
  }
  console.log(`${collection}: ${records.length} registros preparados.`);
}
for (const key of ['site-content', 'order-settings']) {
  const value = await read(key);
  if (!Array.isArray(value)) statements.push(`INSERT OR IGNORE INTO settings(key,value) VALUES(${quote(key)},${quote(JSON.stringify(value))});`);
}
await writeFile(new URL('cloudflare/local-data.sql', root), statements.join('\n') + '\n');
console.log('Exportación local creada. No incluye credenciales ni sesiones; no sobrescribe registros existentes.');
