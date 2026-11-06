const CONTENT = { heroBadge: 'Más de 40 años acompañando a empresas y personas', heroAccent: 'tecnología', heroDescription: 'Soluciones tecnológicas para trabajar mejor: equipamiento, soporte, seguridad y herramientas digitales para tu negocio.' };
const ORDER_SETTINGS = { whatsappTemplate: 'Hola {nombre}, recibimos tu pedido de {cantidad} {unidades} de {producto}. Te esperamos para retirarlo o coordinamos la entrega.' };
const encoder = new TextEncoder();
class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new ApiError(status, message); };
const uuid = () => crypto.randomUUID().replaceAll('-', '');
const now = () => new Date().toISOString();
const json = (value, status = 200, headers = {}) => new Response(status === 204 ? null : JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
function text(value, max, required = false) {
  if (value == null) value = '';
  if (typeof value !== 'string') fail(400, 'El texto enviado no es válido.');
  value = value.trim();
  if (value.length > max || (required && !value)) fail(400, `El texto debe tener ${required ? 'entre 1 y' : 'hasta'} ${max} caracteres.`);
  return value;
}
function number(value, max = 1000000000, min = 0, integer = false) {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') fail(400, 'Ingresá un importe o cantidad válido.');
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) fail(400, 'Ingresá un importe o cantidad válido.');
  return n;
}
function bool(value) {
  if (value == null) return false;
  if (typeof value !== 'boolean') fail(400, 'El valor debe ser booleano.');
  return value;
}
function date(value, fallback = '') {
  const s = text(value, 80);
  if (!s) return fallback;
  if (!Number.isFinite(Date.parse(s))) fail(400, 'Ingresá una fecha válida.');
  return s;
}
function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') fail(403, 'Origen no permitido.');
}
async function body(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) fail(415, 'Enviá JSON.');
  if (Number(request.headers.get('Content-Length')) > 6000000) fail(413, 'El archivo enviado supera el límite de 6 MB.');
  const reader = request.body?.getReader();
  let size = 0;
  const chunks = [];
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 6000000) { await reader.cancel(); fail(413, 'El archivo enviado supera el límite de 6 MB.'); }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let result;
  try { result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail(400, 'JSON inválido.'); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) fail(400, 'Enviá un objeto JSON.');
  return result;
}
const statement = (env, sql, ...args) => env.DB.prepare(sql).bind(...args);
async function list(env, collection) {
  const rows = await statement(env, 'SELECT data FROM records WHERE collection = ? ORDER BY rowid', collection).all();
  return rows.results.map(row => JSON.parse(row.data));
}
async function get(env, collection, id) {
  const row = await statement(env, 'SELECT data FROM records WHERE collection = ? AND id = ?', collection, id).first();
  return row ? JSON.parse(row.data) : null;
}
const insert = (env, collection, item) => statement(env, 'INSERT INTO records(collection,id,data) VALUES(?,?,?)', collection, item.id, JSON.stringify(item));
const remove = (env, collection, id) => statement(env, 'DELETE FROM records WHERE collection = ? AND id = ?', collection, id);
const update = (env, collection, item, previous) => statement(env, 'UPDATE records SET data = ? WHERE collection = ? AND id = ? AND json(data) = json(?)', JSON.stringify(item), collection, item.id, JSON.stringify(previous));
async function setting(env, key, fallback = null) {
  const row = await statement(env, 'SELECT value FROM settings WHERE key = ?', key).first();
  return row ? JSON.parse(row.value) : fallback;
}
async function saveSetting(env, key, value) {
  await statement(env, 'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, JSON.stringify(value)).run();
}
function equal(a, b) {
  const x = encoder.encode(a), y = encoder.encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}
const base64 = bytes => btoa(String.fromCharCode(...bytes));
const random = () => base64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
async function digest(s) { return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(s)))); }
async function passwordHash(password, salt, iterations = 100000) {
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100000) fail(503, 'La credencial requiere restablecimiento seguro.');
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return base64(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(atob(salt), c => c.charCodeAt(0)), iterations, hash: 'SHA-256' }, key, 256)));
}
function cookie(id, clear = false) { return `neyra_admin=${id}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${clear ? 0 : 28800}`; }
async function session(request, env, required = false, csrf = false) {
  sameOrigin(request);
  const token = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)neyra_admin=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
  const s = token ? await statement(env, 'SELECT id,csrf,expires FROM sessions WHERE id = ? AND expires > ?', await digest(token), Date.now()).first() : null;
  if (required && !s) fail(401, 'Iniciá sesión para continuar.');
  if (s && csrf && !equal(request.headers.get('X-CSRF-Token') || '', s.csrf)) fail(403, 'Token de seguridad inválido.');
  return s;
}
async function newSession(request, env, status) {
  const old = await session(request, env);
  const token = random(), csrfToken = random();
  const ops = [statement(env, 'DELETE FROM sessions WHERE expires <= ?', Date.now()), statement(env, 'INSERT INTO sessions(id,csrf,expires) VALUES(?,?,?)', await digest(token), csrfToken, Date.now() + 28800000)];
  if (old) ops.push(statement(env, 'DELETE FROM sessions WHERE id = ?', old.id));
  await env.DB.batch(ops);
  return json({ authenticated: true, csrfToken }, status, { 'Set-Cookie': cookie(token) });
}
async function rateLimit(request, env, route) {
  const key = await digest(`${route}:${request.headers.get('CF-Connecting-IP') || 'unknown'}`);
  const t = Date.now();
  const row = await statement(env, 'INSERT INTO login_attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires <= ? THEN 1 ELSE count+1 END, expires=CASE WHEN expires <= ? THEN excluded.expires ELSE expires END RETURNING count', key, t + 900000, t, t).first();
  if (row.count > 10) fail(429, 'Demasiados intentos. Esperá 15 minutos.');
}
function effectivePrice(p) {
  return p.salePrice > 0 && p.salePrice < p.price && Date.now() >= Date.parse(p.saleStartsAt) && Date.now() < Date.parse(p.saleEndsAt) ? p.salePrice : p.price;
}
function publicProduct(p, sales) {
  const { unitCost, stock, minStock, saleStock, ...safe } = p;
  const effective = effectivePrice(p);
  return { ...safe, effectivePrice: effective, saleActive: effective < p.price, salesCount: sales.filter(s => s.productId === p.id).reduce((n, s) => n + s.quantity, 0) };
}
async function image(data, env) {
  if (!env.IMAGES) fail(503, 'La subida de imágenes no está habilitada en esta instalación.');
  if (typeof data !== 'string') fail(400, 'La imagen no es válida.');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) fail(400, 'La imagen debe ser PNG, JPG o WebP.');
  let bytes;
  try { bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0)); } catch { fail(400, 'Imagen base64 inválida.'); }
  if (!bytes.length || bytes.length > 4000000) fail(400, 'La imagen no puede superar los 4 MB.');
  const signature = match[1] === 'png' ? [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v) : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
  if (!signature) fail(400, 'El contenido no coincide con el tipo de imagen.');
  const key = `media/store/${uuid()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  await env.IMAGES.put(key, bytes, { httpMetadata: { contentType: `image/${match[1]}` } });
  return key;
}
async function product(b, existing, env) {
  const p = { id: existing?.id || uuid(), name: text(b.name,140,true), sku: text(b.sku,140), category: text(b.category,60,true), description: text(b.description,1600), price: number(b.price), unitCost: number(b.unitCost ?? 0), salePrice: number(b.salePrice ?? 0), saleStartsAt: date(b.saleStartsAt), saleEndsAt: date(b.saleEndsAt), createdAt: existing?.createdAt || now(), image: existing?.image || '', inkColor: /^#[0-9a-f]{6}$/i.test(b.inkColor || '') ? b.inkColor : '#2563eb', active: bool(b.active), isSample: bool(b.isSample) };
  for (const field of ['subcategory','brand','model','color','capacity','compatibility']) p[field] = text(b[field], field === 'compatibility' ? 1600 : 140);
  if (p.salePrice > 0 && (p.salePrice >= p.price || !p.saleStartsAt || !p.saleEndsAt || Date.parse(p.saleEndsAt) <= Date.parse(p.saleStartsAt))) fail(400, 'Ingresá un precio de oferta menor y fechas válidas de inicio y fin.');
  const products = await list(env, 'products');
  if (p.sku && products.some(x => x.id !== p.id && x.sku?.toLowerCase() === p.sku.toLowerCase())) fail(409, 'Ya existe un producto con ese SKU.');
  if (b.imageData) p.image = await image(b.imageData, env);
  return p;
}
function sale(p, quantity, unitPrice, channel, note, orderId) {
  const unitCost = Number(p.unitCost) || 0, costKnown = unitCost > 0, revenue = unitPrice * quantity;
  return { id: orderId || uuid(), ...(orderId ? { orderId } : {}), productId: p.id, productName: p.name, quantity, unitPrice, unitCost: costKnown ? unitCost : null, revenue, costOfGoods: costKnown ? unitCost * quantity : null, grossProfit: costKnown ? revenue - unitCost * quantity : null, costKnown, confirmedAt: now(), channel, note };
}
function phone(value) {
  let digits = text(value,80,true).replace(/\D/g,'');
  if (digits.startsWith('54')) digits = digits.slice(2); else if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^(?:[1-9]\d{2}\d{7,8}|9[1-9]\d{9})$/.test(digits)) fail(400, 'Ingresá un WhatsApp argentino válido y normalizado.');
  return `+54${digits}`;
}
function status(value) { if (!['ordered','ready','delivered'].includes(value)) fail(400, 'El estado del pedido no es válido.'); return value; }
const sortCategories = items => items.sort((a,b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
async function api(request, env, path) {
  const method = request.method;
  let match;
  if (method === 'GET' && (path === '/api/products' || (match = /^\/api\/products\/([\w-]+)$/.exec(path)))) {
    const sales = await list(env, 'sales');
    if (match) { const p = await get(env, 'products', match[1]); if (!p?.active) fail(404, 'Producto no encontrado.'); return json(publicProduct(p,sales)); }
    return json((await list(env,'products')).filter(p => p.active).map(p => publicProduct(p,sales)));
  }
  if (method === 'GET' && path === '/api/categories') return json(sortCategories((await list(env,'categories')).filter(c => c.active)));
  if (method === 'GET' && path === '/api/site-content') return json(await setting(env,'site-content',CONTENT));
  if (path === '/api/admin/session' && method === 'GET') {
    const s = await session(request,env);
    return json(s ? { authenticated:true, csrfToken:s.csrf } : { authenticated:false, setupRequired: !await setting(env,'admin'), setupTokenRequired: Boolean(env.SETUP_TOKEN) });
  }
  if (['/api/admin/setup','/api/admin/login'].includes(path) && method === 'POST') {
    sameOrigin(request);
    await rateLimit(request,env,path);
    const setup = path.endsWith('/setup');
    if (setup && env.SETUP_TOKEN && !equal(request.headers.get('X-Setup-Token') || '', env.SETUP_TOKEN)) fail(403,'Token de configuración inválido.');
    const admin = await setting(env,'admin');
    if (setup && admin) fail(409,'El administrador ya fue configurado.');
    if (!setup && !admin) return json({ setupRequired:true, error:'Configurá la contraseña de administración.' },409);
    const b = await body(request), password = b.password;
    if (typeof password !== 'string' || !password.length || password.length > 1024) fail(400,'Ingresá una contraseña válida de hasta 1024 caracteres.');
    if (setup) {
      if (password.length < 12) fail(400,'Usá una contraseña de al menos 12 caracteres.');
      const salt = base64(crypto.getRandomValues(new Uint8Array(24)));
      const value = { salt, hash:await passwordHash(password,salt), iterations:100000, algorithm:'PBKDF2-SHA256' };
      const result = await statement(env,'INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)','admin',JSON.stringify(value)).run();
      if (!result.meta.changes) fail(409,'El administrador ya fue configurado.');
    } else if (!equal(await passwordHash(password,admin.salt,admin.iterations), admin.hash)) fail(401,'La contraseña no coincide.');
    return newSession(request,env,setup ? 201 : 200);
  }
  if (!path.startsWith('/api/admin/')) fail(404,'Ruta de API inexistente.');
  const s = await session(request,env,true,!['GET','HEAD'].includes(method));
  if (path === '/api/admin/logout' && method === 'POST') {
    await statement(env,'DELETE FROM sessions WHERE id = ?',s.id).run();
    return json(null,204,{ 'Set-Cookie':cookie('',true) });
  }
  if (['/api/admin/site-content','/api/admin/order-settings'].includes(path)) {
    const content = path.endsWith('site-content'), key = content ? 'site-content' : 'order-settings';
    if (method === 'GET') return json(await setting(env,key,content ? CONTENT : ORDER_SETTINGS));
    if (method === 'PUT') {
      const b = await body(request);
      const value = content ? { heroBadge:text(b.heroBadge,120,true), heroAccent:text(b.heroAccent,45,true), heroDescription:text(b.heroDescription,400,true) } : { whatsappTemplate:text(b.whatsappTemplate,600,true) };
      if (!content && ['{nombre}','{cantidad}','{producto}'].some(p => !value.whatsappTemplate.includes(p))) fail(400,'La plantilla debe incluir {nombre}, {cantidad} y {producto}.');
      await saveSetting(env,key,value); return json(value);
    }
    fail(405,'Método no permitido.');
  }
  if (path === '/api/admin/financial-summary' && method === 'GET') {
    const sales = await list(env,'sales'), expenses = await list(env,'expenses');
    const sum = (items,key) => items.reduce((n,x) => n + (Number(x[key]) || 0),0);
    const revenue = sum(sales,'revenue'), costOfGoods = sum(sales,'costOfGoods'), operatingExpenses = sum(expenses,'amount'), unknown = sales.filter(s => !s.costKnown).length, grossProfit = unknown ? null : revenue - costOfGoods;
    return json({ confirmedSales:sales.length, revenue, costOfGoods, grossProfit, operatingExpenses, netProfitEstimate:grossProfit === null ? null : grossProfit - operatingExpenses, profitComplete:!unknown, salesWithUnknownCost:unknown });
  }
  if ((match = /^\/api\/admin\/(products|sales|expenses|orders)$/.exec(path))) {
    const collection = match[1];
    if (method === 'GET') { const items = await list(env,collection); return json(collection === 'orders' ? items.sort((a,b) => b.createdAt.localeCompare(a.createdAt)) : items); }
    if (method !== 'POST') fail(405,'Método no permitido.');
    const b = await body(request);
    let item;
    if (collection === 'products') item = await product(b,null,env);
    if (collection === 'expenses') item = { id:uuid(), description:text(b.description,160,true), category:text(b.category,140), amount:number(b.amount,1000000000,0.01), date:date(b.date,now()) };
    if (['sales','orders'].includes(collection)) {
      const p = await get(env,'products',text(b.productId,140,true));
      if (!p) fail(400,'Seleccioná un producto válido.');
      const quantity = number(b.quantity,100000,1,true), unitPrice = b.unitPrice ? number(b.unitPrice) : effectivePrice(p), note = text(b.note,1600);
      if (collection === 'sales') { item = sale(p,quantity,unitPrice,text(b.channel,140),note); item.confirmedAt = date(b.confirmedAt,now()); }
      else {
        item = { id:uuid(), customerName:text(b.customerName,100,true), phoneE164:phone(b.phoneE164), productId:p.id, productName:p.name, quantity, unitPrice, status:status(b.status), createdAt:now(), updatedAt:now(), note, saleId:'' };
        if (item.status === 'delivered') { const movement = sale(p,quantity,unitPrice,'Pedido del panel',note,item.id); item.saleId = movement.id; await env.DB.batch([insert(env,'orders',item),insert(env,'sales',movement)]); return json(item,201); }
      }
    }
    await insert(env,collection,item).run(); return json(item,201);
  }
  if ((match = /^\/api\/admin\/(products|sales|expenses|orders)\/([\w-]+)$/.exec(path))) {
    const [,collection,id] = match, old = await get(env,collection,id);
    if (!old) fail(404,'No encontramos ese registro.');
    if (method === 'DELETE') {
      const ops = [remove(env,collection,id)];
      if (collection === 'orders') ops.push(statement(env,"DELETE FROM records WHERE collection='sales' AND (id=? OR json_extract(data,'$.orderId')=?)",old.saleId || '',id));
      await env.DB.batch(ops); return json(null,204);
    }
    if (method === 'PUT' && ['products','orders'].includes(collection)) {
      const b = await body(request);
      let item, movement;
      if (collection === 'products') item = await product(b,old,env);
      else {
        const next = status(b.status);
        if (next === old.status) return json(old);
        if (!(old.status === 'ordered' && ['ready','delivered'].includes(next) || old.status === 'ready' && next === 'delivered')) fail(400,'Ese cambio de estado no está permitido. Los pedidos avanzan: encargado, listo y entregado.');
        item = { ...old, status:next, updatedAt:now() };
        if (next === 'delivered') {
          const p = await get(env,'products',old.productId) || { id:old.productId, name:old.productName, unitCost:0 };
          movement = sale(p,old.quantity,old.unitPrice,'Pedido del panel',old.note,old.id); item.saleId = movement.id;
        }
      }
      const ops = [update(env,collection,item,old)];
      if (movement) ops.push(statement(env,'INSERT OR IGNORE INTO records(collection,id,data) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE collection = ? AND id = ? AND data = ?)','sales',movement.id,JSON.stringify(movement),'orders',item.id,JSON.stringify(item)));
      const result = await env.DB.batch(ops);
      if (!result[0].meta.changes) fail(409,'El registro cambió. Actualizá e intentá nuevamente.');
      return json(item);
    }
    fail(405,'Método no permitido.');
  }
  if (path === '/api/admin/categories' || path.startsWith('/api/admin/categories/')) {
    const categories = await list(env,'categories');
    if (path === '/api/admin/categories' && method === 'GET') return json(sortCategories(categories));
    if (path === '/api/admin/categories/reorder' && method === 'POST') {
      const b = await body(request), ids = b.ids;
      if (!Array.isArray(ids) || ids.length !== categories.length || new Set(ids).size !== categories.length || ids.some(id => !categories.some(c => c.id === id))) fail(400,'La lista de categorías no coincide con las categorías guardadas.');
      if (ids.length) await env.DB.batch(ids.map((id,i) => statement(env,"UPDATE records SET data=json_set(data,'$.sortOrder',?) WHERE collection='categories' AND id=?",(i+1)*10,id)));
      return json(sortCategories(await list(env,'categories')));
    }
    if (path === '/api/admin/categories' && method === 'POST') {
      const b = await body(request), name = text(b.name,60,true), parentId = text(b.parentId,140);
      if (parentId && !categories.some(c => c.id === parentId && !c.parentId)) fail(400,'La categoría principal no existe.');
      const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      if (!slug) fail(400,'Ingresá un nombre de categoría válido.');
      const id = parentId ? `${parentId}-${slug}` : slug;
      if (categories.some(c => c.id === id || c.parentId === parentId && c.name.toLowerCase() === name.toLowerCase())) fail(409,'Ya existe esa categoría en este nivel.');
      const item = { id, name, parentId, active:true, sortOrder:b.sortOrder ? number(b.sortOrder,1000000000,0,true) : Math.max(0,...categories.filter(c => c.parentId === parentId).map(c => c.sortOrder)) + 10 };
      await insert(env,'categories',item).run(); return json(item,201);
    }
    const id = /^\/api\/admin\/categories\/([\w-]+)$/.exec(path)?.[1], old = categories.find(c => c.id === id);
    if (!old) fail(404,'No encontramos esa categoría.');
    if (method === 'PUT') {
      const b = await body(request), name = text(b.name,60,true);
      if (categories.some(c => c.id !== id && c.parentId === old.parentId && c.name.toLowerCase() === name.toLowerCase())) fail(409,'Ya existe esa categoría en este nivel.');
      const item = { ...old, name, active:bool(b.active) }, field = old.parentId ? 'subcategory' : 'category';
      const result = await env.DB.batch([update(env,'categories',item,old),statement(env,`UPDATE records SET data=json_set(data,'$.${field}',?) WHERE collection='products' AND json_extract(data,'$.${field}')=? AND EXISTS(SELECT 1 FROM records WHERE collection='categories' AND id=? AND data=?)`,name,old.name,id,JSON.stringify(item))]);
      if (!result[0].meta.changes) fail(409,'La categoría cambió. Actualizá e intentá nuevamente.');
      return json(item);
    }
    if (method === 'DELETE') {
      const result = await statement(env,"DELETE FROM records WHERE collection='categories' AND id=? AND NOT EXISTS(SELECT 1 FROM records WHERE collection='categories' AND json_extract(data,'$.parentId')=?) AND NOT EXISTS(SELECT 1 FROM records WHERE collection='products' AND (json_extract(data,'$.category')=? OR json_extract(data,'$.subcategory')=?))",id,id,old.name,old.name).run();
      if (!result.meta.changes) fail(409,'Hay productos o subcategorías asignados. Reasignalos antes de eliminar la categoría.');
      return json(null,204);
    }
    fail(405,'Método no permitido.');
  }
  fail(404,'Ruta de API inexistente.');
}
async function assets(request, env, path) {
  if (!['GET','HEAD'].includes(request.method)) return json({ error:'Método no permitido.' },405);
  if (path === '/manifest.json') return env.ASSETS.fetch(request);
  if (/[%\\\u0000-\u001f]/.test(path) || path.split('/').some(s => s.startsWith('.') || /^(?:data|node_modules|backup.*|source|src|tests?)$/i.test(s)) || /\.(?:ps1|jsonl?|toml|sql|md|map|tmp|env|log)$/i.test(path) || /\/(?:worker(?:\.test)?|server|package(?:-lock)?)\.[^/]+$/i.test(path)) return new Response(null,{ status:404 });
  if (/^\/media\/store\/[\w-]+\.(?:png|jpe?g|webp)$/i.test(path)) {
    const object = await env.IMAGES?.get(path.slice(1));
    if (object) return new Response(request.method === 'HEAD' ? null : object.body,{ headers:{ 'Content-Type':object.httpMetadata?.contentType || 'application/octet-stream', 'ETag':object.httpEtag, 'Cache-Control':'public, max-age=31536000, immutable', 'X-Content-Type-Options':'nosniff' } });
  }
  const aliases = { '/':'/index.html', '/tienda':'/tienda/index.html', '/tienda/':'/tienda/index.html', '/admin':'/admin/index.html', '/admin/':'/admin/index.html', '/store':'/tienda/index.html', '/store/':'/tienda/index.html' };
  let target = aliases[path] || path;
  if (/^\/store\/(?:index\.html|product\.(?:html|css|js)|store\.(?:css|js))$/.test(path)) target = path.replace('/store/','/tienda/');
  if (!/\.(?:html|css|js|svg|png|jpe?g|webp|ico|woff2?|ttf|otf|avif|gif|txt|xml|webmanifest)$/i.test(target)) return new Response(null,{ status:404 });
  const url = new URL(request.url); url.pathname = target;
  return env.ASSETS.fetch(new Request(url,request));
}
export default {
  async fetch(request, env) {
    try {
      let path;
      try { path = decodeURIComponent(new URL(request.url).pathname); } catch { fail(400,'Ruta inválida.'); }
      if (path === '/api' || path.startsWith('/api/')) return await api(request,env,path);
      return await assets(request,env,path);
    } catch (error) {
      if (error instanceof ApiError) return json({ error:error.message },error.status);
      console.error('Worker request failed', error?.name || 'Error');
      return json({ error:'No se pudo completar la operación.' },500);
    }
  }
};
