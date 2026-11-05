'use strict';

const productGrid = document.getElementById('productGrid');
const productSearch = document.getElementById('productSearch');
const categoryFilter = document.getElementById('categoryFilter');
const subcategoryFilter = document.getElementById('subcategoryFilter');
const brandFilter = document.getElementById('brandFilter');
const priceFilter = document.getElementById('priceFilter');
const sortProducts = document.getElementById('sortProducts');
const categoryMenuItems = document.getElementById('categoryMenuItems');
const categoryHighlights = document.getElementById('categoryHighlights');
const catalogResultCount = document.getElementById('catalogResultCount');
const offersSection = document.getElementById('offers');
const offerGrid = document.getElementById('offerGrid');
const storeStatus = document.getElementById('storeStatus');
const sampleNotice = document.getElementById('sampleNotice');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartOpen = document.getElementById('cartOpen');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartCount = document.getElementById('cartCount');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartShipping = document.getElementById('cartShipping');
const cartTotal = document.getElementById('cartTotal');
const clearCartButton = document.getElementById('clearCartButton');
const checkoutButton = document.getElementById('checkoutButton');
const whatsappNumber = '5493512600101';
const cartStorageKey = 'neyra-store-cart';
const formatCurrency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

let products = [];
let cart = readCart();
let lastFocus = null;
let checkoutInProgress = false;
const initialParams = new URLSearchParams(location.search);

const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  const current = theme === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = current;
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(current === 'dark'));
    themeToggle.setAttribute('aria-label', current === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    themeToggle.innerHTML = current === 'dark' ? '<span aria-hidden="true">☀️</span>' : '<span aria-hidden="true">🌙</span>';
  }
}

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(cartStorageKey) || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0));
  } catch {
    return {};
  }
}

function saveCart() {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  } catch {
    storeStatus.textContent = 'No se pudo guardar el carrito en este navegador.';
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function productArtwork(color) {
  const ink = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#2563eb';
  return `<svg viewBox="0 0 160 200" role="img" aria-label="Botella de tinta Epson">
    <ellipse cx="80" cy="187" rx="40" ry="6" fill="#17151a" opacity=".12"/>
    <path d="M59 25h42v18l8 10v8h8v105a13 13 0 0 1-13 13H56a13 13 0 0 1-13-13V61h8v-8l8-10z" fill="#fdfdfd" stroke="#b8b5b9" stroke-width="2"/>
    <path d="M59 25h42v18H59z" fill="#e6e4e6" stroke="#b8b5b9" stroke-width="2"/>
    <path d="M66 13h28v12H66z" rx="3" fill="#242124"/>
    <path d="M45 105h70v48a13 13 0 0 1-13 13H58a13 13 0 0 1-13-13z" fill="${ink}" opacity=".9"/>
    <path d="M53 67h54v30H53z" fill="#fff"/>
    <text x="80" y="80" text-anchor="middle" fill="#242124" font-family="Arial,sans-serif" font-size="10" font-weight="700">EPSON</text>
    <text x="80" y="92" text-anchor="middle" fill="#242124" font-family="Arial,sans-serif" font-size="8">544</text>
    <text x="80" y="128" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="9" font-weight="700">INK BOTTLE</text>
    <text x="80" y="142" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="8">65 ml</text>
  </svg>`;
}

function productImage(product, eager = false) {
  const image = String(product.image || '');
  if (/^media\/store\/[a-zA-Z0-9._-]+$/.test(image)) {
    return `<img src="/${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
  }
  if (String(product.category || '').toLocaleLowerCase('es-AR') === 'tintas') {
    return productArtwork(product.inkColor);
  }
  return '<span class="product-image-placeholder">Foto no disponible</span>';
}

function renderProduct(product, eagerImage = false) {
  const saleActive = Boolean(product.saleActive && !product.isSample);
  const price = Number(saleActive ? product.effectivePrice : product.price) || 0;
  const regularPrice = Number(product.price) || 0;
  const discount = saleActive && regularPrice > 0 ? Math.round((1 - price / regularPrice) * 100) : 0;
  const countdown = saleActive && product.saleEndsAt
    ? `<div class="offer-countdown" data-countdown="${escapeHtml(product.saleEndsAt)}">Calculando tiempo restante…</div>`
    : '';
  return `<article class="product-card" aria-label="Ver detalle de ${escapeHtml(product.name)}">
    <a class="product-card-link" href="/tienda/product.html?id=${encodeURIComponent(product.id)}" aria-label="Ver detalle de ${escapeHtml(product.name)}">
      <div class="product-art">
        ${saleActive ? `<span class="offer-label">-${discount}%</span>` : ''}
        ${productImage(product, eagerImage)}
      </div>
      <div class="product-body">
        <h2 class="product-name">${escapeHtml(product.name)}</h2>
        <div class="product-bottom">
          <span class="product-price ${price ? '' : 'is-query'}">${saleActive ? `<s>${formatCurrency.format(regularPrice)}</s> ` : ''}${price ? formatCurrency.format(price) : 'Consultar precio'}</span>
        </div>
        ${countdown}
      </div>
    </a>
    <div class="product-card-actions">
      <button class="add-product" type="button" data-add="${escapeHtml(product.id)}"><span aria-hidden="true">＋</span> Agregar</button>
    </div>
  </article>`;
}

function setCategoryScene(categoryName) {
  const target = String(categoryName || '').trim();
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
  const resolved = sceneMap[target.toLowerCase()] || 'default';
  document.body.dataset.categoryScene = resolved;
}

function renderCategoryHighlights() {
  if (!categoryHighlights) return;
  const category = categoryFilter.value;
  const source = category
    ? products.filter(product => product.category === category)
    : products;
  const categories = [...new Set(source.map(product => product.category).filter(Boolean))].sort();
  if (!categories.length) {
    categoryHighlights.innerHTML = '';
    return;
  }
  const highlightMarkup = categories.map(currentCategory => {
    const items = products.filter(product => product.category === currentCategory && product.active !== false);
    const bestSeller = items.reduce((best, product) => (!best || Number(product.salesCount || 0) > Number(best.salesCount || 0) ? product : best), null) || items[0];
    const cheapest = items.reduce((best, product) => (!best || Number(product.effectivePrice ?? product.price) < Number(best.effectivePrice ?? best.price) ? product : best), null) || items[0];
    const mostExpensive = items.reduce((best, product) => (!best || Number(product.effectivePrice ?? product.price) > Number(best.effectivePrice ?? best.price) ? product : best), null) || items[0];
    return `<article class="category-highlight">
      <h3>${escapeHtml(currentCategory)}</h3>
      <div class="category-highlight-grid">
        <div><span>Más vendido</span><strong>${escapeHtml(bestSeller?.name || 'Sin datos')}</strong></div>
        <div><span>Más barato</span><strong>${escapeHtml(cheapest?.name || 'Sin datos')}</strong></div>
        <div><span>Más caro</span><strong>${escapeHtml(mostExpensive?.name || 'Sin datos')}</strong></div>
      </div>
    </article>`;
  }).join('');
  categoryHighlights.innerHTML = highlightMarkup;
}

function applySortFromNav(event) {
  const link = event.currentTarget;
  const sortValue = link.dataset.storeSort;
  if (!sortValue) return;
  event.preventDefault();
  sortProducts.value = sortValue;
  renderProducts();
  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderProducts() {
  const query = productSearch.value.trim().toLocaleLowerCase('es-AR');
  const category = categoryFilter.value;
  const subcategory = subcategoryFilter.value;
  const brand = brandFilter.value;
  const sort = sortProducts.value;
  const priceRange = priceFilter?.value || '';
  setCategoryScene(category || (products[0] && products[0].category) || 'default');
  const visible = products.filter(product => {
    const searchable = `${product.name} ${product.sku || ''} ${product.description || ''} ${product.brand || ''} ${product.model || ''} ${product.compatibility || ''} ${product.subcategory || ''} ${product.color || ''}`.toLocaleLowerCase('es-AR');
    const price = Number(product.effectivePrice ?? product.price) || 0;
    const priceMatch = !priceRange || (() => {
      const [min, max] = priceRange.split('-').map(value => Number(value));
      return price >= min && price <= max;
    })();
    return priceMatch && (!query || searchable.includes(query)) && (!category || product.category === category) && (!subcategory || product.subcategory === subcategory) && (!brand || product.brand === brand);
  });
  visible.sort((left, right) => {
    if (sort === 'popular') return Number(right.salesCount || 0) - Number(left.salesCount || 0) || left.name.localeCompare(right.name, 'es');
    if (sort === 'price-asc') return Number(left.effectivePrice ?? left.price) - Number(right.effectivePrice ?? right.price);
    if (sort === 'price-desc') return Number(right.effectivePrice ?? right.price) - Number(left.effectivePrice ?? left.price);
    if (sort === 'newest') return String(right.createdAt || '').localeCompare(String(left.createdAt || '')) || left.name.localeCompare(right.name, 'es');
    return left.name.localeCompare(right.name, 'es');
  });
  productGrid.innerHTML = visible.length
    ? visible.map((product, index) => renderProduct(product, index < 6)).join('')
    : '<p class="empty-results">No encontramos productos con esos filtros.</p>';
  storeStatus.textContent = `${visible.length} ${visible.length === 1 ? 'producto' : 'productos'}`;
  catalogResultCount.textContent = `${visible.length} resultados`;
  renderCategoryHighlights();
  renderCountdowns();
}

function renderCategories() {
  const categories = [...new Set(products.map(product => product.category).filter(Boolean))].sort();
  const selectedCategory = categoryFilter.value;
  categoryFilter.innerHTML = '<option value="">Todas</option>' + categories.map(category =>
    `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
  ).join('');
  categoryFilter.value = selectedCategory;
  categoryMenuItems.innerHTML = categories.map(category => {
    const subcategories = [...new Set(products
      .filter(product => product.category === category)
      .map(product => product.subcategory)
      .filter(Boolean))].sort();
    return `<div class="category-menu-group">
      <button class="category-menu-main" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
      ${subcategories.length ? `<div class="category-menu-subitems">${subcategories.map(subcategory =>
        `<button type="button" data-category="${escapeHtml(category)}" data-subcategory="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</button>`
      ).join('')}</div>` : ''}
    </div>`;
  }).join('');
  renderSubcategories();
  const brands = [...new Set(products.map(product => product.brand).filter(Boolean))].sort();
  brandFilter.innerHTML = '<option value="">Todas</option>' + brands.map(brand => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`).join('');
}

function renderSubcategories() {
  const selected = subcategoryFilter.value;
  const matching = products.filter(product => !categoryFilter.value || product.category === categoryFilter.value);
  const subcategories = [...new Set(matching.map(product => product.subcategory).filter(Boolean))].sort();
  subcategoryFilter.innerHTML = '<option value="">Todas</option>' + subcategories.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
  subcategoryFilter.value = subcategories.includes(selected) ? selected : '';
}

function renderOffers() {
  const offers = products.filter(product => product.saleActive && !product.isSample);
  offersSection.hidden = offers.length === 0;
  offerGrid.innerHTML = offers.map((product, index) => renderProduct(product, index < 3)).join('');
  renderCountdowns();
}

function renderCountdowns() {
  let offerExpired = false;
  document.querySelectorAll('[data-countdown]').forEach(node => {
    const remaining = Date.parse(node.dataset.countdown) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      node.textContent = 'Oferta finalizada';
      offerExpired = true;
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const clock = [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
    node.textContent = days ? `Termina en ${days} d ${clock}` : `Termina en ${clock}`;
  });
  if (offerExpired && !renderCountdowns.refreshing) {
    renderCountdowns.refreshing = true;
    fetch('/api/products').then(response => response.json()).then(items => {
      products = Array.isArray(items) ? items : [];
      renderCategories();
      renderOffers();
      renderProducts();
      renderCart();
    }).finally(() => { renderCountdowns.refreshing = false; });
  }
}

function getCartProducts() {
  return Object.entries(cart).map(([id, quantity]) => ({
    product: products.find(product => product.id === id),
    quantity
  })).filter(line => line.product && line.product.active !== false);
}

function syncCartWithCatalog({ showMessage = false } = {}) {
  const before = { ...cart };
  const nextCart = {};
  let cartChanged = false;
  const latestById = new Map(products.map(product => [product.id, product]));

  Object.entries(cart).forEach(([id, quantity]) => {
    const latest = latestById.get(id);
    if (!latest || latest.active === false) {
      cartChanged = true;
      return;
    }
    nextCart[id] = quantity;
  });

  if (cartChanged) {
    cart = nextCart;
    saveCart();
    renderCategories();
    renderOffers();
    renderProducts();
    renderCart();
    if (showMessage) {
      storeStatus.textContent = 'Se actualizó el catálogo o el precio de algunos productos. Revisá el carrito antes de continuar.';
    }
  }

  return Object.keys(before).length !== Object.keys(nextCart).length || JSON.stringify(before) !== JSON.stringify(nextCart);
}

function renderCart() {
  const lines = getCartProducts();
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.product.effectivePrice ?? line.product.price) || 0) * line.quantity, 0);
  const shipping = subtotal > 0 && subtotal < 60000 ? 2500 : subtotal > 0 ? 0 : 0;
  const totalPrice = subtotal + shipping;
  cartCount.textContent = String(totalQuantity);
  cartOpen.setAttribute('aria-label', `Abrir carrito, ${totalQuantity} productos`);
  cartEmpty.classList.toggle('is-visible', lines.length === 0);
  if (clearCartButton) {
    clearCartButton.disabled = lines.length === 0;
  }
  cartItems.innerHTML = lines.map(({ product, quantity }) => `
    <article class="cart-line">
      <div class="cart-line-art">${productImage(product)}</div>
      <div>
        <h3 class="cart-line-name">${escapeHtml(product.name)}</h3>
        <p class="cart-line-price">${formatCurrency.format(Number(product.effectivePrice ?? product.price) || 0)} c/u</p>
        <p class="cart-line-subtotal">Subtotal: ${formatCurrency.format((Number(product.effectivePrice ?? product.price) || 0) * quantity)}</p>
      </div>
      <div class="cart-line-actions" aria-label="Cantidad de ${escapeHtml(product.name)}">
        <button class="quantity-button" type="button" data-quantity="${escapeHtml(product.id)}" data-delta="-1" aria-label="Quitar una unidad">−</button>
        <span class="quantity-value">${quantity}</span>
        <button class="quantity-button" type="button" data-quantity="${escapeHtml(product.id)}" data-delta="1" aria-label="Agregar una unidad">+</button>
      </div>
      <button class="cart-remove" type="button" data-remove="${escapeHtml(product.id)}">Quitar</button>
    </article>`).join('');
  cartSubtotal.textContent = formatCurrency.format(subtotal);
  cartShipping.textContent = formatCurrency.format(shipping);
  cartTotal.textContent = formatCurrency.format(totalPrice);

  if (lines.length) {
    const order = lines.map(({ product, quantity }) => {
      const productName = product.name.replace(/,\s*(\d+(?:[.,]\d+)?\s*(?:ml|l|g|kg))$/i, ' de $1');
      return `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} de ${productName}`;
    }).join(', ');
    checkoutButton.href = `https://wa.me/${whatsappNumber}?${new URLSearchParams({ text: `Hola, me interesa hacer un pedido de ${order}.` })}`;
    checkoutButton.classList.remove('is-disabled');
    checkoutButton.setAttribute('aria-disabled', 'false');
  } else {
    checkoutButton.href = '#';
    checkoutButton.classList.add('is-disabled');
    checkoutButton.setAttribute('aria-disabled', 'true');
  }
}

function updateCart(id, quantity) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  const next = Math.max(0, quantity);
  if (next) cart[id] = next;
  else delete cart[id];
  saveCart();
  renderCart();
}

function openCart() {
  lastFocus = document.activeElement;
  cartDrawer.classList.add('is-open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  cartDrawer.inert = false;
  cartBackdrop.hidden = false;
  cartOpen.setAttribute('aria-expanded', 'true');
  document.body.classList.add('cart-open');
  cartClose.focus();
}

function closeCart() {
  cartDrawer.classList.remove('is-open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  cartDrawer.inert = true;
  cartBackdrop.hidden = true;
  cartOpen.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('cart-open');
  lastFocus?.focus();
}

productGrid.addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const product = products.find(item => item.id === button.dataset.add);
  if (!product) return;
  updateCart(product.id, (Number(cart[product.id]) || 0) + 1);
  openCart();
});

productGrid.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.closest('.product-art')) return;
  const placeholder = document.createElement('span');
  placeholder.className = 'product-image-placeholder';
  placeholder.textContent = 'No se pudo cargar la imagen';
  image.replaceWith(placeholder);
}, true);

cartItems.addEventListener('click', event => {
  const quantityButton = event.target.closest('[data-quantity]');
  if (quantityButton) {
    const id = quantityButton.dataset.quantity;
    updateCart(id, (Number(cart[id]) || 0) + Number(quantityButton.dataset.delta));
    return;
  }
  const removeButton = event.target.closest('[data-remove]');
  if (removeButton) updateCart(removeButton.dataset.remove, 0);
});

clearCartButton?.addEventListener('click', () => {
  if (!Object.keys(cart).length) return;
  cart = {};
  saveCart();
  renderCart();
  storeStatus.textContent = 'Carrito vaciado.';
});

cartOpen.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && cartDrawer.classList.contains('is-open')) closeCart();
});
checkoutButton.addEventListener('click', async event => {
  if (checkoutButton.getAttribute('aria-disabled') === 'true' || checkoutInProgress) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  const checkoutWindow = window.open('', '_blank');
  if (!checkoutWindow) {
    storeStatus.textContent = 'Permití abrir una nueva pestaña para continuar por WhatsApp.';
    return;
  }
  checkoutWindow.opener = null;
  checkoutInProgress = true;
  checkoutButton.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/products', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo verificar la disponibilidad actual.');
    const latestProducts = await response.json();
    const latestById = new Map(latestProducts.map(product => [product.id, product]));
    const previousById = new Map(products.map(product => [product.id, product]));
    const updatedCart = {};
    let cartChanged = false;

    Object.entries(cart).forEach(([id, quantity]) => {
      const latest = latestById.get(id);
      const previous = previousById.get(id);
      if (!latest || latest.active === false) {
        cartChanged = true;
        return;
      }
      const previousPrice = Number(previous?.effectivePrice ?? previous?.price) || 0;
      const latestPrice = Number(latest.effectivePrice ?? latest.price) || 0;
      if (previousPrice !== latestPrice) cartChanged = true;
      updatedCart[id] = quantity;
    });

    products = latestProducts;
    sampleNotice.hidden = !products.some(product => product.isSample);
    cart = updatedCart;
    saveCart();
    renderCategories();
    renderOffers();
    renderProducts();
    renderCart();
    if (cartChanged) {
      checkoutWindow.close();
      storeStatus.textContent = 'Actualizamos los precios o el catálogo. Revisá el carrito y confirmá nuevamente.';
      return;
    }
    checkoutWindow.location.href = checkoutButton.href;
  } catch {
    checkoutWindow.close();
    storeStatus.textContent = 'No se pudo verificar el catálogo. Intentá nuevamente antes de continuar.';
  } finally {
    checkoutInProgress = false;
    checkoutButton.removeAttribute('aria-busy');
  }
});
document.querySelectorAll('[data-store-sort]').forEach(link => link.addEventListener('click', applySortFromNav));
productSearch.addEventListener('input', renderProducts);
document.getElementById('searchForm')?.addEventListener('submit', event => {
  event.preventDefault();
  const url = new URL(location.href);
  const term = productSearch.value.trim();
  if (term) url.searchParams.set('q', term); else url.searchParams.delete('q');
  history.replaceState(null, '', url);
  renderProducts();
  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
categoryFilter.addEventListener('change', () => { renderSubcategories(); renderProducts(); });
subcategoryFilter.addEventListener('change', renderProducts);
brandFilter.addEventListener('change', renderProducts);
priceFilter?.addEventListener('change', renderProducts);
sortProducts.addEventListener('change', renderProducts);
categoryMenuItems.addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  categoryFilter.value = button.dataset.category;
  renderSubcategories();
  subcategoryFilter.value = button.dataset.subcategory || '';
  renderProducts();
  document.querySelector('.store-category-menu').open = false;
  document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
});

themeToggle?.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('neyra-theme', nextTheme);
  } catch {}
  applyTheme(nextTheme);
});

try {
  const savedTheme = localStorage.getItem('neyra-theme');
  applyTheme(savedTheme || 'light');
} catch {
  applyTheme('light');
}

fetch('/api/products')
  .then(response => {
    if (!response.ok) throw new Error('No se pudo consultar el catálogo.');
    return response.json();
  })
  .then(items => {
    products = Array.isArray(items) ? items : [];
    sampleNotice.hidden = !products.some(product => product.isSample);
    const initialCategory = initialParams.get('category') || '';
    const initialSubcategory = initialParams.get('subcategory') || '';
    const initialSort = ['popular', 'price-asc', 'price-desc', 'newest'].includes(initialParams.get('sort')) ? initialParams.get('sort') : 'featured';
    productSearch.value = initialParams.get('q') || '';
    renderCategories();
    if (initialCategory && [...categoryFilter.options].some(option => option.value === initialCategory)) {
      categoryFilter.value = initialCategory;
    }
    renderSubcategories();
    if (initialSubcategory && [...subcategoryFilter.options].some(option => option.value === initialSubcategory)) {
      subcategoryFilter.value = initialSubcategory;
    }
    sortProducts.value = initialSort;
    renderOffers();
    renderProducts();
    renderCart();
    if (initialParams.get('openCart') === '1') openCart();
  })
  .catch(() => {
    storeStatus.textContent = 'No se pudo cargar el catálogo. Abrí la tienda desde el servidor local.';
    productGrid.innerHTML = '<p class="empty-results">La tienda necesita el backend activo para cargar productos.</p>';
    renderCart();
  });