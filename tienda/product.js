'use strict';

const params = new URLSearchParams(location.search);
const productId = params.get('id');
const productStatus = document.getElementById('detailStatus');
const productQuantity = document.getElementById('detailQuantity');
const addButton = document.getElementById('detailAdd');
const detailCategoryMenu = document.getElementById('detailCategoryMenu');
const cartKey = 'neyra-store-cart';
const waNumber = '5493512600101';
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
let product;
let allProducts = [];
let quantity = 1;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function artwork(color) {
  const ink = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#2563eb';
  return `<svg viewBox="0 0 160 200" role="img" aria-label="Ilustración del producto"><ellipse cx="80" cy="187" rx="40" ry="6" fill="#17151a" opacity=".12"/><path d="M59 25h42v18l8 10v8h8v105a13 13 0 0 1-13 13H56a13 13 0 0 1-13-13V61h8v-8l8-10z" fill="#fdfdfd" stroke="#b8b5b9" stroke-width="2"/><path d="M59 25h42v18H59z" fill="#e6e4e6" stroke="#b8b5b9" stroke-width="2"/><path d="M66 13h28v12H66z" fill="#242124"/><path d="M45 105h70v48a13 13 0 0 1-13 13H58a13 13 0 0 1-13-13z" fill="${ink}"/><path d="M53 67h54v30H53z" fill="#fff"/><text x="80" y="80" text-anchor="middle" fill="#242124" font-family="Arial,sans-serif" font-size="10" font-weight="700">EPSON</text><text x="80" y="92" text-anchor="middle" fill="#242124" font-family="Arial,sans-serif" font-size="8">${escapeHtml(product.model || '')}</text><text x="80" y="128" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="9" font-weight="700">${escapeHtml(product.color || '')}</text><text x="80" y="142" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="8">${escapeHtml(product.capacity || '')}</text></svg>`;
}

function updateQuantity() {
  productQuantity.value = String(quantity);
  document.getElementById('detailQuantityMinus').disabled = quantity <= 1;
  document.getElementById('detailQuantityPlus').disabled = false;
  addButton.disabled = false;
}

function buildDeliveryEstimate() {
  if (!product) return { headline: 'Calculando horario…', summary: 'Consultando disponibilidad…' };
  return {
    headline: 'Disponible por encargo',
    summary: 'Si no está disponible en el local, lo encargamos al proveedor el mismo día. Coordinamos la entrega por WhatsApp.'
  };
}

function renderCategoryMenu(items) {
  if (!detailCategoryMenu) return;
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort();
  detailCategoryMenu.innerHTML = categories.map(category => {
    const subcategories = [...new Set(items.filter(item => item.category === category).map(item => item.subcategory).filter(Boolean))].sort();
    return `<div class="category-menu-group">
      <button class="category-menu-main" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
      ${subcategories.length ? `<div class="category-menu-subitems">${subcategories.map(subcategory => `<button type="button" data-category="${escapeHtml(category)}" data-subcategory="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</button>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
}

function renderProduct() {
  const sceneMap = {
    tintas: 'tintas',
    impresoras: 'impresoras',
    cartuchos: 'cartuchos',
    toners: 'toners',
    'insumos de impresión': 'insumos',
    accesorios: 'accesorios',
    repuestos: 'repuestos',
    otros: 'otros'
  };
  const categoryName = String(product.category || '').trim();
  document.body.dataset.categoryScene = sceneMap[categoryName.toLowerCase()] || 'default';
  document.title = `${product.name} | Neyra Servicios`;
  const imagePath = /^media\/store\/[a-zA-Z0-9._-]+$/.test(product.image || '') ? `/${product.image}` : '';
  document.getElementById('detailArt').innerHTML = imagePath
    ? `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(product.name)}">`
    : String(product.category || '').toLocaleLowerCase('es-AR') === 'tintas'
      ? artwork(product.inkColor)
      : '<p class="product-image-placeholder">Foto no disponible</p>';
  document.getElementById('productCategory').textContent = product.category || 'Producto';
  document.getElementById('productBrandLine').textContent = [product.brand, product.sku].filter(Boolean).join(' · ');
  document.getElementById('productTitle').textContent = product.name;
  document.getElementById('productDescription').textContent = product.description || 'Consultá por más información de este producto.';
  document.getElementById('fullDescription').textContent = product.description || 'Consultá por más información de este producto.';

  const saleActive = Boolean(product.saleActive && !product.isSample);
  const regularPrice = Number(product.price) || 0;
  const effectivePrice = Number(saleActive ? product.effectivePrice : product.price) || 0;
  const originalPrice = document.getElementById('originalPrice');
  originalPrice.hidden = !saleActive;
  originalPrice.textContent = saleActive ? money.format(regularPrice) : '';
  document.getElementById('productPrice').textContent = effectivePrice ? money.format(effectivePrice) : 'Consultar precio';

  document.getElementById('productAvailability').textContent = 'Disponibilidad a confirmar al realizar el pedido.';
  const delivery = buildDeliveryEstimate();
  document.getElementById('deliveryEstimate').textContent = delivery.headline;
  document.getElementById('deliverySummary').textContent = delivery.summary;
  document.getElementById('detailLabels').innerHTML = [
    product.isNew ? '<span class="detail-label">Nuevo</span>' : '',
    saleActive ? `<span class="detail-label is-offer">Oferta · ahorrás ${Math.round((1 - effectivePrice / regularPrice) * 100)}%</span>` : '',
    Number(product.salesCount) > 0 ? `<span class="detail-label">${Number(product.salesCount)} vendidos</span>` : ''
  ].filter(Boolean).join('');

  const specs = [
    ['Marca', product.brand], ['Modelo', product.model], ['Color', product.color],
    ['Capacidad / presentación', product.capacity], ['Tipo de producto', product.category],
    ['Compatibilidad', product.compatibility], ['SKU', product.sku], ['Garantía', product.warranty]
  ].filter(([, value]) => value);
  document.getElementById('specGrid').innerHTML = specs.map(([label, value]) => `<div class="spec-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
  document.getElementById('specSection').hidden = specs.length === 0;

  const variants = allProducts.filter(item => item.id !== product.id && item.active !== false && item.category === product.category && item.brand === product.brand && item.model === product.model && product.model);
  const variantField = document.getElementById('variantField');
  variantField.hidden = variants.length === 0;
  if (variants.length) {
    document.getElementById('variantSelect').innerHTML = `<option value="${escapeHtml(product.id)}">${escapeHtml(product.color || product.name)}</option>` + variants.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.color || item.name)}</option>`).join('');
  }

  const productModel = String(product.model || '').trim().toLocaleLowerCase('es-AR');
  const productCompatibility = String(product.compatibility || '').toLocaleLowerCase('es-AR');
  const related = allProducts.filter(item => {
    if (item.id === product.id || item.active === false) return false;
    if (item.category === product.category) return true;
    const itemModel = String(item.model || '').trim().toLocaleLowerCase('es-AR');
    const itemCompatibility = String(item.compatibility || '').toLocaleLowerCase('es-AR');
    return Boolean(
      (productModel && itemCompatibility.includes(productModel)) ||
      (itemModel && productCompatibility.includes(itemModel))
    );
  }).slice(0, 3);
  const relatedSection = document.getElementById('relatedSection');
  relatedSection.hidden = related.length === 0;
  document.getElementById('relatedGrid').innerHTML = related.map(item => `<a class="related-card" href="/tienda/product.html?id=${encodeURIComponent(item.id)}">${/^media\/store\/[a-zA-Z0-9._-]+$/.test(item.image || '') ? `<img src="/${escapeHtml(item.image)}" alt="">` : `<span class="related-swatch" style="--swatch:${/^#[0-9a-f]{6}$/i.test(item.inkColor || '') ? item.inkColor : '#2563eb'}"></span>`}<span><strong>${escapeHtml(item.name)}</strong><span>${money.format(Number(item.effectivePrice ?? item.price) || 0)}</span></span></a>`).join('');

  const clock = document.getElementById('detailOfferClock');
  clock.hidden = !saleActive;
  updateOfferClock();
  updateQuantity();
}

function updateOfferClock() {
  const clock = document.getElementById('detailOfferClock');
  if (!clock || !product?.saleActive) return;
  const remaining = Date.parse(product.saleEndsAt) - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) {
    clock.textContent = 'La oferta terminó; actualizando precio…';
    setTimeout(loadProduct, 1200);
    return;
  }
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  clock.textContent = `Oferta real hasta ${new Date(product.saleEndsAt).toLocaleString('es-AR')} · ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

async function loadProduct() {
  if (!productId) { productStatus.textContent = 'No se indicó qué producto querés consultar.'; return; }
  try {
    const [response, allResponse] = await Promise.all([fetch(`/api/products/${encodeURIComponent(productId)}`), fetch('/api/products')]);
    if (!response.ok) throw new Error('No encontramos ese producto.');
    product = await response.json();
    allProducts = await allResponse.json();
    renderCategoryMenu(Array.isArray(allProducts) ? allProducts : []);
    detailCategoryMenu?.addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      const category = button.dataset.category || '';
      const subcategory = button.dataset.subcategory || '';
      const query = new URLSearchParams({ category, subcategory }).toString();
      location.href = `/tienda/?${query}#catalog`;
    }, { once: false });
    productStatus.hidden = true;
    document.getElementById('detailLayout').hidden = false;
    renderProduct();
  } catch (error) {
    productStatus.textContent = error.message || 'No se pudo cargar el producto.';
  }
}

document.getElementById('detailQuantityMinus').addEventListener('click', () => { quantity = Math.max(1, quantity - 1); updateQuantity(); });
document.getElementById('detailQuantityPlus').addEventListener('click', () => { quantity += 1; updateQuantity(); });
document.getElementById('variantSelect').addEventListener('change', event => {
  if (event.target.value !== product.id) location.href = `/tienda/product.html?id=${encodeURIComponent(event.target.value)}`;
});
document.getElementById('detailAdd').addEventListener('click', () => {
  if (!product) return;
  if (!product || addButton.disabled) return;
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem(cartKey) || '{}'); } catch { cart = {}; }
  cart[product.id] = (Number(cart[product.id]) || 0) + quantity;
  localStorage.setItem(cartKey, JSON.stringify(cart));
  document.getElementById('detailConfirmation').textContent = `${quantity} unidad${quantity === 1 ? '' : 'es'} agregada${quantity === 1 ? '' : 's'} al carrito.`;
  setTimeout(() => { location.href = '/tienda/?openCart=1'; }, 350);
});

const themeToggle = document.getElementById('themeToggle');
function applyTheme(theme) {
  const current = theme === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = current;
  themeToggle.setAttribute('aria-pressed', String(current === 'dark'));
  themeToggle.setAttribute('aria-label', current === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  themeToggle.innerHTML = current === 'dark' ? '<span aria-hidden="true">☀️</span>' : '<span aria-hidden="true">🌙</span>';
}
try { applyTheme(localStorage.getItem('neyra-theme') || 'light'); } catch { applyTheme('light'); }
themeToggle.addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('neyra-theme', next); } catch { }
  applyTheme(next);
});
loadProduct();
setInterval(updateOfferClock, 1000);