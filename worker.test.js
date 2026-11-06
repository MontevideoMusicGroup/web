import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
const workerPromise = import('./worker.js').then(m => m.default);
function environment() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('cloudflare/migrations/0001_initial.sql', import.meta.url), 'utf8'));
  function prepare(sql) {
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async first() { return sqlite.prepare(sql).get(...args) || null; },
      async all() { return { results:sqlite.prepare(sql).all(...args) }; },
      async run() { const r = sqlite.prepare(sql).run(...args); return { meta:{ changes:r.changes } }; }
    };
  }
  const images = new Map(), assets = [];
  return { sqlite, images, assets, SETUP_TOKEN:'deployment-secret', DB:{ prepare, async batch(ops) { sqlite.exec('BEGIN'); try { const results = []; for (const op of ops) results.push(await op.run()); sqlite.exec('COMMIT'); return results; } catch (e) { sqlite.exec('ROLLBACK'); throw e; } } }, IMAGES:{ async put(key,bytes,options) { images.set(key,{ body:bytes, httpMetadata:options.httpMetadata, httpEtag:'"test"' }); }, async get(key) { return images.get(key); } }, ASSETS:{ async fetch(request) { assets.push(new URL(request.url).pathname); return new Response('asset'); } } };
}
async function call(env,path,method = 'GET',data,headers = {}) {
  const worker = await workerPromise;
  return worker.fetch(new Request(`https://example.com${path}`,{ method, headers:{ ...(data !== undefined ? { 'Content-Type':'application/json' } : {}), ...headers }, ...(data !== undefined ? { body:JSON.stringify(data) } : {}) }),env);
}
async function auth(env) {
  const response = await call(env,'/api/admin/setup','POST',{ password:'a strong test password' },{ 'X-Setup-Token':env.SETUP_TOKEN });
  assert.equal(response.status,201);
  const value = await response.json();
  return { Cookie:response.headers.get('set-cookie').split(';')[0], 'X-CSRF-Token':value.csrfToken };
}
const payload = { name:'Tinta', category:'Tintas', price:100, unitCost:40, active:true, salePrice:80, saleStartsAt:'2020-01-01', saleEndsAt:'2099-01-01' };
test('setup fails closed, password hashing, hashed sessions, origin and CSRF checks',async () => {
  const env = environment();
  const missingTokenEnv = environment(); delete missingTokenEnv.SETUP_TOKEN;
  assert.equal((await call(missingTokenEnv,'/api/admin/setup','POST',{ password:'a strong test password' },{ 'X-Setup-Token':'anything' })).status,403);
  assert.equal((await call(env,'/api/admin/setup','POST',{ password:'a strong test password' })).status,403);
  const h = await auth(env);
  const admin = JSON.parse(env.sqlite.prepare("SELECT value FROM settings WHERE key='admin'").get().value);
  assert.equal(admin.iterations,100000);
  assert.equal(admin.algorithm,'PBKDF2-SHA256');
  assert.notEqual(env.sqlite.prepare('SELECT id FROM sessions').get().id,h.Cookie.split('=')[1]);
  assert.equal((await call(env,'/api/admin/products','POST',payload,{ Cookie:h.Cookie })).status,403);
  assert.equal((await call(env,'/api/admin/products','GET',undefined,{ ...h, Origin:'https://attacker.test' })).status,403);
  assert.equal((await call(env,'/api/admin/login','POST',{ password:'wrong' })).status,401);
  const loggedIn = await call(env,'/api/admin/login','POST',{ password:'a strong test password' });
  assert.equal(loggedIn.status,200);
  assert.match(loggedIn.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await call(env,'/api/admin/logout','POST',{},h)).status,204);
  assert.equal((await call(env,'/api/admin/products','GET',undefined,h)).status,401);
});
test('D1 login/setup rate limits are atomic and expire',async () => {
  const env = environment();
  for (let i=0;i<10;i++) assert.equal((await call(env,'/api/admin/setup','POST',{})).status,403);
  assert.equal((await call(env,'/api/admin/setup','POST',{})).status,429);
  env.sqlite.prepare('UPDATE login_attempts SET expires=0').run();
  assert.equal((await call(env,'/api/admin/setup','POST',{})).status,403);
});
test('products preserve pricing, never expose unit cost, validate images and fields',async () => {
  const env = environment(), h = await auth(env);
  let r = await call(env,'/api/admin/products','POST',payload,h);
  assert.equal(r.status,201);
  const p = await r.json();
  r = await call(env,`/api/products/${p.id}`);
  const safe = await r.json();
  assert.equal(safe.effectivePrice,80); assert.equal(safe.saleActive,true); assert.equal('unitCost' in safe,false);
  assert.equal('unitCost' in (await (await call(env,'/api/products')).json())[0],false);
  assert.equal((await call(env,'/api/admin/products','POST',{ ...payload, price:'NaN' },h)).status,400);
  assert.equal((await call(env,'/api/admin/products','POST',{ ...payload, active:'false' },h)).status,400);
  assert.equal((await call(env,'/api/admin/products','POST',{ ...payload, imageData:'data:image/png;base64,YWJjZA==' },h)).status,400);
  r = await call(env,`/api/admin/products/${p.id}`,'PUT',{ ...payload, imageData:'data:image/png;base64,iVBORw0KGgo=' },h);
  assert.equal(r.status,200);
  const updated = await r.json(); assert.match(updated.image,/^media\/store\/[a-f0-9]{32}\.png$/);
  const image = await call(env,`/${updated.image}`); assert.equal(image.headers.get('content-type'),'image/png');
  const noImages = environment(); delete noImages.IMAGES;
  const noImagesAuth = await auth(noImages);
  assert.equal((await call(noImages,'/api/admin/products','POST',{ ...payload, imageData:'data:image/png;base64,iVBORw0KGgo=' },noImagesAuth)).status,503);
  assert.equal((await call(noImages,'/media/store/existente.png')).status,200);
  assert.equal((await call(env,`/api/admin/products/${p.id}`,'DELETE',undefined,h)).status,204);
  assert.deepEqual(await (await call(env,'/api/products')).json(),[]);
});
test('orders generate exactly one sale and financial summary tracks unknown cost',async () => {
  const env = environment(), h = await auth(env);
  const p = await (await call(env,'/api/admin/products','POST',payload,h)).json();
  const r = await call(env,'/api/admin/orders','POST',{ customerName:'Cliente', phoneE164:'011 5555 5555', productId:p.id, quantity:2, status:'ordered' },h);
  assert.equal(r.status,201); const order = await r.json(); assert.equal(order.phoneE164,'+541155555555');
  assert.equal((await call(env,`/api/admin/orders/${order.id}`,'PUT',{ status:'ready' },h)).status,200);
  assert.equal((await call(env,`/api/admin/orders/${order.id}`,'PUT',{ status:'ordered' },h)).status,400);
  assert.equal((await call(env,`/api/admin/orders/${order.id}`,'PUT',{ status:'delivered' },h)).status,200);
  assert.equal((await call(env,`/api/admin/orders/${order.id}`,'PUT',{ status:'delivered' },h)).status,200);
  const sales = await (await call(env,'/api/admin/sales','GET',undefined,h)).json(); assert.equal(sales.length,1); assert.equal(sales[0].grossProfit,80);
  assert.equal((await call(env,'/api/admin/expenses','POST',{ description:'Envío', amount:10 },h)).status,201);
  let summary = await (await call(env,'/api/admin/financial-summary','GET',undefined,h)).json(); assert.equal(summary.netProfitEstimate,70);
  assert.equal((await call(env,`/api/admin/orders/${order.id}`,'DELETE',undefined,h)).status,204);
  assert.deepEqual(await (await call(env,'/api/admin/sales','GET',undefined,h)).json(),[]);
  const unknown = await (await call(env,'/api/admin/products','POST',{ ...payload, unitCost:0 },h)).json();
  assert.equal((await call(env,'/api/admin/sales','POST',{ productId:unknown.id, quantity:1 },h)).status,201);
  summary = await (await call(env,'/api/admin/financial-summary','GET',undefined,h)).json(); assert.equal(summary.profitComplete,false); assert.equal(summary.grossProfit,null);
});
test('category batches rename products, reorder, and enforce dependency deletion',async () => {
  const env = environment(), h = await auth(env);
  const category = await (await call(env,'/api/admin/categories','POST',{ name:'Tintas' },h)).json();
  const child = await (await call(env,'/api/admin/categories','POST',{ name:'Epson', parentId:category.id },h)).json();
  await call(env,'/api/admin/products','POST',payload,h);
  assert.equal((await call(env,`/api/admin/categories/${category.id}`,'PUT',{ name:'Tinta nueva', active:true },h)).status,200);
  assert.equal((await (await call(env,'/api/products')).json())[0].category,'Tinta nueva');
  assert.equal((await call(env,'/api/admin/categories/reorder','POST',{ ids:[child.id,category.id] },h)).status,200);
  assert.equal((await call(env,'/api/admin/categories/reorder','POST',{ ids:[child.id,child.id] },h)).status,400);
  assert.equal((await call(env,`/api/admin/categories/${category.id}`,'DELETE',undefined,h)).status,409);
  assert.equal((await call(env,`/api/admin/categories/${child.id}`,'DELETE',undefined,h)).status,204);
});
test('content/settings contracts and body validation',async () => {
  const env = environment(), h = await auth(env);
  assert.equal((await call(env,'/api/site-content')).status,200);
  const content = { heroBadge:'Badge', heroAccent:'Accent', heroDescription:'Description' };
  assert.equal((await call(env,'/api/admin/site-content','PUT',content,h)).status,200);
  assert.deepEqual(await (await call(env,'/api/site-content')).json(),content);
  assert.equal((await call(env,'/api/admin/order-settings','PUT',{ whatsappTemplate:'Hola' },h)).status,400);
  assert.equal((await call(env,'/api/admin/order-settings','PUT',{ whatsappTemplate:'Hola {nombre}: {cantidad} {producto}' },h)).status,200);
  const worker = await workerPromise;
  assert.equal((await call(env,'/api/admin/products','POST',payload,{ ...h, 'Content-Length':'6000001' })).status,413);
  assert.equal((await call(env,'/api/admin/products','POST',[],h)).status,400);
  assert.equal((await worker.fetch(new Request('https://example.com/api/admin/products',{ method:'POST', headers:{ ...h,'Content-Type':'application/json' },body:'{' }),env)).status,400);
  assert.equal((await worker.fetch(new Request('https://example.com/api/admin/products',{ method:'POST', headers:h,body:'{}' }),env)).status,415);
});
test('assets aliases, R2 fallback, and sensitive paths are never served',async () => {
  const env = environment();
  for (const path of ['/data/products.json','/DATA/a.html','/worker.js','/worker.test.js','/server.ps1','/.git/config','/backup_antes_de_quitar_stock_2026-10-23/index.html','/source/index.html','/src/main.js','/node_modules/a.js','/%2564ata/products.html']) assert.equal((await call(env,path)).status,404,path);
  for (const [path,target] of [['/manifest.json','/manifest.json'],['/store/','/tienda/index.html'],['/store/product.js','/tienda/product.js'],['/admin','/admin/index.html'],['/media/store/old.png','/media/store/old.png']]) { assert.equal((await call(env,path)).status,200); assert.equal(env.assets.at(-1),target); }
  assert.equal((await call(env,'/api/missing')).status,404);
  assert.equal((await call(env,'/index.html','POST',{})).status,405);
});
