'use strict';

const authScreen = document.getElementById('authScreen');
const adminApp = document.getElementById('adminApp');
const setupForm = document.getElementById('setupForm');
const setupTokenGroup = document.getElementById('setupTokenGroup');
const setupTokenInput = document.getElementById('setupToken');
const loginForm = document.getElementById('loginForm');
const authMessage = document.getElementById('authMessage');
const authCopy = document.getElementById('authCopy');
const productForm = document.getElementById('productForm');
const productMessage = document.getElementById('productMessage');
const contentForm = document.getElementById('siteContentForm');
const contentMessage = document.getElementById('contentMessage');
const productList = document.getElementById('productList');
const productCount = document.getElementById('productCount');
const listSearch = document.getElementById('listSearch');
let csrfToken = '';
let products = [];
let currentTab = 'products';
const formatMoney = value => `$ ${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (csrfToken && !['/api/admin/login', '/api/admin/setup'].includes(path)) headers.set('X-CSRF-Token', csrfToken);
  const response = await fetch(path, { ...options, headers, credentials: 'same-origin' });
  if (response.status === 204) return null;
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('La API no respondió correctamente. Verificá que el Worker esté funcionando y tenga configurada la base de datos D1. Para probar localmente ejecutá npm run dev.');
  }
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}

function setMessage(element, message, kind = '') {
  element.textContent = message;
  element.className = `admin-message${kind ? ` is-${kind}` : ''}`;
}

function showAdmin() {
  authScreen.hidden = true;
  adminApp.hidden = false;
  loadProducts();
  loadCategories();
  loadSiteContent();
}

function showAuth(message = '') {
  adminApp.hidden = true;
  authScreen.hidden = false;
  if (message) setMessage(authMessage, message, 'error');
}

async function inspectSession() {
  try {
    const session = await request('/api/admin/session');
    if (session.authenticated) {
      csrfToken = session.csrfToken;
      showAdmin();
      return;
    }
    setupForm.hidden = !session.setupRequired;
    loginForm.hidden = session.setupRequired;
    setupTokenGroup.hidden = !session.setupTokenRequired;
    setupTokenInput.required = Boolean(session.setupTokenRequired);
    authCopy.textContent = session.setupRequired
      ? 'Creá una contraseña para habilitar el acceso privado a este panel.'
      : 'Iniciá sesión para gestionar productos y contenido del sitio.';
  } catch (error) {
    setMessage(authMessage, error.message, 'error');
  }
}

async function submitAuth(form, endpoint) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage(authMessage, 'Verificando…');
  try {
    const result = await request(endpoint, {
      method: 'POST',
      headers: endpoint.endsWith('/setup') && !setupTokenGroup.hidden ? { 'X-Setup-Token': new FormData(form).get('setupToken') } : {},
      body: JSON.stringify({ password: new FormData(form).get('password') })
    });
    csrfToken = result.csrfToken;
    setMessage(authMessage, 'Acceso habilitado.', 'success');
    showAdmin();
  } catch (error) {
    setMessage(authMessage, error.message, 'error');
    if (endpoint.endsWith('/login') && /configurá|configura/i.test(error.message)) {
      setupForm.hidden = false;
      loginForm.hidden = true;
      authCopy.textContent = 'Creá una contraseña para habilitar el acceso privado a este panel.';
    }
  } finally {
    button.disabled = false;
  }
}

async function loadProducts() {
  try {
    products = await request('/api/admin/products');
    renderProducts();
    populateMovementProducts();
    loadFinancialData();
  } catch (error) {
    showAuth(error.message);
  }
}

function renderProducts() {
  const query = listSearch.value.trim().toLocaleLowerCase('es-AR');
  const filtered = products.filter(product => `${product.name} ${product.sku} ${product.category}`.toLocaleLowerCase('es-AR').includes(query));
  productCount.textContent = `${products.length} ${products.length === 1 ? 'producto' : 'productos'}`;
  if (!filtered.length) {
    productList.innerHTML = '<p class="list-empty">No hay productos para mostrar.</p>';
    return;
  }
  productList.innerHTML = filtered.map(product => `
    <article class="admin-product-row">
      <div class="admin-product-thumb">${product.image && /^media\/store\/[a-zA-Z0-9._-]+$/.test(product.image) ? `<img src="/${escapeHtml(product.image)}" alt="">` : '<span>NEYRA</span>'}</div>
      <div>
        <h4 class="admin-product-name">${escapeHtml(product.name)}</h4>
        <p class="admin-product-meta">${escapeHtml([product.sku, product.brand, product.model, product.category, product.subcategory].filter(Boolean).join(' · '))} · ${formatMoney(product.price)} · costo ${formatMoney(product.unitCost)}${product.salePrice > 0 ? ' · oferta configurada' : ''} · ${product.active ? 'Publicado' : 'Oculto'}${product.isSample ? ' · Muestra' : ''}</p>
      </div>
      <div class="admin-product-actions">
        <button class="row-button" type="button" data-edit="${escapeHtml(product.id)}">Editar</button>
        <button class="row-button is-danger" type="button" data-delete="${escapeHtml(product.id)}">Eliminar</button>
      </div>
    </article>`).join('');
}

function resetProductForm() {
  productForm.reset();
  document.getElementById('productId').value = '';
  document.getElementById('productActive').checked = true;
  document.getElementById('productColor').value = '#2563eb';
  document.getElementById('productFormTitle').textContent = 'Agregar producto';
  document.getElementById('saveProduct').textContent = 'Guardar producto';
  document.getElementById('productImage').value = '';
  document.getElementById('imageFileName').textContent = 'Hasta 4 MB';
  document.getElementById('productPreview').hidden = true;
  setMessage(productMessage, '');
}

function editProduct(product) {
  document.getElementById('productId').value = product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productSku').value = product.sku || '';
  document.getElementById('productCategory').value = product.category;
  document.getElementById('productSubcategory').value = product.subcategory || '';
  document.getElementById('productBrand').value = product.brand || '';
  document.getElementById('productModel').value = product.model || '';
  document.getElementById('productColorName').value = product.color || '';
  document.getElementById('productCapacity').value = product.capacity || '';
  document.getElementById('productCompatibility').value = product.compatibility || '';
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productUnitCost').value = product.unitCost || 0;
  document.getElementById('productSalePrice').value = product.salePrice || '';
  document.getElementById('productSaleStartsAt').value = (product.saleStartsAt || '').slice(0, 16);
  document.getElementById('productSaleEndsAt').value = (product.saleEndsAt || '').slice(0, 16);
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('productColor').value = /^#[0-9a-f]{6}$/i.test(product.inkColor || '') ? product.inkColor : '#2563eb';
  document.getElementById('productActive').checked = Boolean(product.active);
  document.getElementById('productSample').checked = Boolean(product.isSample);
  document.getElementById('imageFileName').textContent = product.image ? 'La foto actual se conserva si no elegís otra.' : 'Hasta 4 MB';
  document.getElementById('productFormTitle').textContent = 'Editar producto';
  document.getElementById('saveProduct').textContent = 'Guardar cambios';
  productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function readImage(file) {
  if (!file) return Promise.resolve('');
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Elegí un archivo de imagen válido.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1200;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, width, height);
        const outputType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        canvas.toBlob(blob => {
          if (!blob) {
            reject(new Error('No se pudo procesar la imagen.'));
            return;
          }
          if (blob.size > 4000000) {
            reject(new Error('La imagen procesada supera los 4 MB. Elegí una imagen más chica o de menor resolución.'));
            return;
          }
          const encodedReader = new FileReader();
          encodedReader.onload = () => resolve(String(encodedReader.result));
          encodedReader.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
          encodedReader.readAsDataURL(blob);
        }, outputType, outputType === 'image/jpeg' ? 0.84 : undefined);
      };
      image.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      image.src = source;
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

async function loadSiteContent() {
  try {
    const content = await request('/api/admin/site-content');
    document.getElementById('contentBadge').value = content.heroBadge;
    document.getElementById('contentAccent').value = content.heroAccent;
    document.getElementById('contentDescription').value = content.heroDescription;
  } catch (error) {
    setMessage(contentMessage, error.message, 'error');
  }
}

function populateMovementProducts() {
  const saleSelect = document.getElementById('saleProduct');
  const orderSelect = document.getElementById('orderProduct');
  if (!saleSelect || !orderSelect) return;
  const options = products.map(product => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}</option>`).join('');
  const sellableOptions = products.filter(product => product.active).map(product => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}</option>`).join('');
  saleSelect.innerHTML = sellableOptions || '<option value="">No hay productos publicados</option>';
  orderSelect.innerHTML = options || '<option value="">No hay productos</option>';
  updateSelectedSalePrice();
}

function updateSelectedSalePrice() {
  const selectedProduct = products.find(product => product.id === document.getElementById('saleProduct').value);
  const priceInput = document.querySelector('#saleForm [name="unitPrice"]');
  const regularPrice = Number(selectedProduct?.price) || 0;
  const salePrice = Number(selectedProduct?.salePrice) || 0;
  const saleStartsAt = Date.parse(selectedProduct?.saleStartsAt || '');
  const saleEndsAt = Date.parse(selectedProduct?.saleEndsAt || '');
  const saleIsActive = salePrice > 0 && salePrice < regularPrice && Number.isFinite(saleStartsAt) && Number.isFinite(saleEndsAt) && Date.now() >= saleStartsAt && Date.now() < saleEndsAt;
  const price = saleIsActive ? salePrice : regularPrice;
  priceInput.value = Number.isFinite(price) && price >= 0 ? String(price) : '';
}

document.getElementById('saleProduct').addEventListener('change', updateSelectedSalePrice);

function renderMovementHistory(sales, expenses) {
  const rows = [
    ...sales.map(item => ({ id: item.id, type: 'sales', kind: 'Venta confirmada', date: item.confirmedAt, title: item.productName, detail: item.costKnown ? `${item.quantity} vendidas · ingreso ${formatMoney(item.revenue)} · margen ${formatMoney(item.grossProfit)}` : `${item.quantity} vendidas · ingreso ${formatMoney(item.revenue)} · costo pendiente` })),
    ...expenses.map(item => ({ id: item.id, type: 'expenses', kind: 'Gasto', date: item.date, title: item.description, detail: `${item.category || 'Sin categoría'} · ${formatMoney(item.amount)}` }))
  ].sort((left, right) => new Date(right.date) - new Date(left.date));
  const history = document.getElementById('movementHistory');
  history.innerHTML = rows.length ? rows.map(row => `<article class="movement-row">
    <div><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.detail)}</span><small>${escapeHtml(row.kind)} · ${new Date(row.date).toLocaleDateString('es-AR')}</small></div>
    <button class="row-button is-danger" type="button" data-delete-movement="${escapeHtml(row.id)}" data-movement-type="${row.type}">Eliminar</button>
  </article>`).join('') : '<p class="list-empty">Todavía no hay ventas ni gastos registrados.</p>';
}

function getOrderStatusLabel(status) {
  return {
    ordered: 'Encargado',
    ready: 'Listo para entregar',
    delivered: 'Entregado',
  }[status] || 'Encargado';
}

function formatOrderQuantity(quantity) {
  const units = Math.max(1, Number(quantity) || 1);
  return `${units} ${units === 1 ? 'unidad' : 'unidades'}`;
}

function renderOrderList(orders) {
  const list = document.getElementById('orderList');
  if (!orders.length) {
    list.innerHTML = '<p class="list-empty">Todavía no hay pedidos registrados.</p>';
    return;
  }
  list.innerHTML = orders.map(order => {
    const product = products.find(item => item.id === order.productId) || { name: order.productName };
    const quantity = Math.max(1, Number(order.quantity) || 1);
    const template = document.getElementById('whatsappTemplate')?.value || 'Hola {nombre}, recibimos tu pedido de {cantidad} {unidades} de {producto}. Te esperamos para retirarlo o coordinamos la entrega.';
    const message = template.replace(/\{nombre\}|\{cantidad\}|\{unidades\}|\{producto\}/g, placeholder => ({
      '{nombre}': order.customerName || 'cliente',
      '{cantidad}': String(quantity),
      '{unidades}': quantity === 1 ? 'unidad' : 'unidades',
      '{producto}': product.name || order.productName || 'producto'
    })[placeholder]);
    const phone = String(order.phoneE164 || '5493512600101').replace(/\D/g, '');
    const buttonLink = `https://wa.me/${phone}?${new URLSearchParams({ text: message })}`;
    const actions = order.status === 'ordered'
      ? `<button class="row-button" type="button" data-order-status="${escapeHtml(order.id)}" data-order-next="ready">Listo</button><button class="row-button" type="button" data-order-status="${escapeHtml(order.id)}" data-order-next="delivered">Entregado</button>`
      : order.status === 'ready'
        ? `<button class="row-button" type="button" data-order-status="${escapeHtml(order.id)}" data-order-next="delivered">Entregado</button>`
        : '';
    return `<article class="movement-row">
      <div><strong>${escapeHtml(product.name || order.productName)}</strong><span>${escapeHtml(formatOrderQuantity(quantity))} · ${escapeHtml(order.customerName)} · ${escapeHtml(order.phoneE164)} · ${escapeHtml(getOrderStatusLabel(order.status))}</span></div>
      <div class="admin-product-actions">
        <a class="row-button" href="${buttonLink}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        ${actions}
        <button class="row-button is-danger" type="button" data-delete-order="${escapeHtml(order.id)}">Eliminar</button>
      </div>
    </article>`;
  }).join('');
}

async function loadFinancialData() {
  try {
    const [summary, sales, expenses, orders, settings] = await Promise.all([
      request('/api/admin/financial-summary'),
      request('/api/admin/sales'),
      request('/api/admin/expenses'),
      request('/api/admin/orders'),
      request('/api/admin/order-settings')
    ]);
    document.getElementById('summaryRevenue').textContent = formatMoney(summary.revenue);
    const incompleteCosts = Number(summary.salesWithUnknownCost) > 0;
    document.getElementById('summaryCost').textContent = incompleteCosts ? 'Incompleto' : formatMoney(summary.costOfGoods);
    document.getElementById('summaryGross').textContent = summary.profitComplete ? formatMoney(summary.grossProfit) : 'Incompleta';
    document.getElementById('summaryExpenses').textContent = formatMoney(summary.operatingExpenses);
    document.getElementById('summaryNet').textContent = summary.profitComplete ? formatMoney(summary.netProfitEstimate) : 'Incompleta';
    const warning = document.getElementById('costWarning');
    warning.hidden = summary.profitComplete;
    warning.textContent = `Hay ${summary.salesWithUnknownCost} ventas sin costo de mercadería. Los costos y ganancias no están completos.`;
    renderMovementHistory(sales, expenses);
    renderOrderList(orders);
    if (settings?.whatsappTemplate) {
      document.getElementById('orderMessage').dataset.template = settings.whatsappTemplate;
    }
  } catch (error) {
    setMessage(document.getElementById('saleMessage'), error.message, 'error');
  }
}

async function submitMovementForm(form, endpoint, messageId, buildBody) {
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById(messageId);
  button.disabled = true;
  setMessage(message, 'Guardando movimiento…');
  try {
    await request(endpoint, { method: 'POST', body: JSON.stringify(buildBody(new FormData(form))) });
    form.reset();
    setMessage(message, 'Movimiento registrado.', 'success');
    await loadProducts();
  } catch (error) {
    setMessage(message, error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

document.getElementById('saleForm').addEventListener('submit', event => {
  event.preventDefault();
  submitMovementForm(event.currentTarget, '/api/admin/sales', 'saleMessage', data => ({
    productId: document.getElementById('saleProduct').value,
    quantity: Number(data.get('quantity')),
    unitPrice: data.get('unitPrice') ? Number(data.get('unitPrice')) : null,
    confirmedAt: data.get('confirmedAt'),
    channel: String(data.get('channel') || '').trim(),
    note: String(data.get('note') || '').trim()
  }));
});

document.getElementById('expenseForm').addEventListener('submit', event => {
  event.preventDefault();
  submitMovementForm(event.currentTarget, '/api/admin/expenses', 'expenseMessage', data => ({
    description: String(data.get('description') || '').trim(),
    amount: Number(data.get('amount')),
    category: String(data.get('category') || '').trim(),
    date: data.get('date')
  }));
});

document.getElementById('orderForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const payload = {
    customerName: String(data.get('customerName') || '').trim(),
    phoneE164: String(data.get('phoneE164') || '').trim(),
    productId: document.getElementById('orderProduct').value,
    quantity: Number(data.get('quantity')),
    status: data.get('status'),
    note: String(data.get('note') || '').trim()
  };
  setMessage(document.getElementById('orderMessage'), 'Guardando pedido…');
  try {
    await request('/api/admin/orders', { method: 'POST', body: JSON.stringify(payload) });
    form.reset();
    setMessage(document.getElementById('orderMessage'), 'Pedido guardado.', 'success');
    await loadProducts();
  } catch (error) {
    setMessage(document.getElementById('orderMessage'), error.message, 'error');
  }
});

document.getElementById('orderList').addEventListener('click', async event => {
  const deleteButton = event.target.closest('[data-delete-order]');
  if (deleteButton) {
    if (!confirm('¿Eliminar este pedido? Si tiene una venta asociada, también se eliminará.')) return;
    try {
      await request(`/api/admin/orders/${deleteButton.dataset.deleteOrder}`, { method: 'DELETE' });
      setMessage(document.getElementById('orderMessage'), 'Pedido eliminado.', 'success');
      await loadProducts();
    } catch (error) {
      setMessage(document.getElementById('orderMessage'), error.message, 'error');
    }
    return;
  }
  const statusButton = event.target.closest('[data-order-status]');
  if (!statusButton) return;
  const orderId = statusButton.dataset.orderStatus;
  const nextStatus = statusButton.dataset.orderNext;
  try {
    await request(`/api/admin/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) });
    await loadProducts();
  } catch (error) {
    setMessage(document.getElementById('orderMessage'), error.message, 'error');
  }
});

document.getElementById('movementHistory').addEventListener('click', async event => {
  const button = event.target.closest('[data-delete-movement]');
  if (!button || !confirm('¿Eliminar este movimiento?')) return;
  try {
    await request(`/api/admin/${button.dataset.movementType}/${button.dataset.deleteMovement}`, { method: 'DELETE' });
    setMessage(document.getElementById(button.dataset.movementType === 'sales' ? 'saleMessage' : 'expenseMessage'), 'Movimiento eliminado.', 'success');
    await loadProducts();
  } catch (error) {
    setMessage(document.getElementById(button.dataset.movementType === 'sales' ? 'saleMessage' : 'expenseMessage'), error.message, 'error');
  }
});

setupForm.addEventListener('submit', event => {
  event.preventDefault();
  submitAuth(setupForm, '/api/admin/setup');
});
loginForm.addEventListener('submit', event => {
  event.preventDefault();
  submitAuth(loginForm, '/api/admin/login');
});

document.querySelectorAll('[data-password-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
    button.setAttribute('aria-pressed', String(visible));
  });
});

document.getElementById('logoutButton').addEventListener('click', async () => {
  try { await request('/api/admin/logout', { method: 'POST', body: '{}' }); } catch { }
  csrfToken = '';
  showAuth();
  loginForm.hidden = false;
  setupForm.hidden = true;
  loginForm.reset();
});

document.querySelectorAll('[data-tab]').forEach(button => {
  button.addEventListener('click', () => {
    currentTab = button.dataset.tab;
    document.querySelectorAll('[data-tab]').forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle('is-current', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    document.getElementById('productsPanel').hidden = currentTab !== 'products';
    document.getElementById('financialPanel').hidden = currentTab !== 'financial';
    document.getElementById('categoriesPanel').hidden = currentTab !== 'categories';
    document.getElementById('contentPanel').hidden = currentTab !== 'content';
  });
});

document.getElementById('productImage').addEventListener('change', event => {
  const file = event.target.files[0];
  const preview = document.getElementById('productPreview');
  if (!file) { preview.hidden = true; return; }
  document.getElementById('imageFileName').textContent = file.name;
  document.getElementById('previewImage').src = URL.createObjectURL(file);
  preview.hidden = false;
});

async function loadCategories() {
  try {
    const categories = await request('/api/admin/categories');
    const ordered = [...categories].sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0) || String(left.name).localeCompare(String(right.name), 'es'));
    const parentOptions = ordered.filter(item => !item.parentId).map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
    const parentSelect = document.getElementById('categoryParent');
    const activeParent = parentSelect?.value || '';
    parentSelect.innerHTML = '<option value="">Principal</option>' + parentOptions;
    if (activeParent && [...ordered.filter(item => !item.parentId).map(item => item.id)].includes(activeParent)) {
      parentSelect.value = activeParent;
    }
    cachedCategories = ordered;
    const datalist = document.getElementById('categoryOptions');
    if (datalist) {
      datalist.innerHTML = ordered
        .filter(item => !item.parentId)
        .map(item => `<option value="${escapeHtml(item.name)}"></option>`).join('');
    }
    const subDatalist = document.getElementById('subcategoryOptions');
    if (subDatalist) {
      subDatalist.innerHTML = ordered
        .filter(item => item.parentId)
        .map(item => `<option value="${escapeHtml(item.name)}"></option>`).join('');
    }
    const list = document.getElementById('categoryList');
    list.innerHTML = ordered.length ? ordered.map((item, index) => {
      const parentName = ordered.find(category => category.id === item.parentId)?.name || '';
      return `<article class="movement-row">
        <div><strong>${escapeHtml(item.name)}</strong><span>${item.parentId ? `Subcategoría de ${escapeHtml(parentName || item.parentId)}` : 'Categoría principal'}</span></div>
        <div class="admin-product-actions">
          <button class="row-button" type="button" data-category-up="${escapeHtml(item.id)}" aria-label="Subir categoría">↑</button>
          <button class="row-button" type="button" data-category-down="${escapeHtml(item.id)}" aria-label="Bajar categoría">↓</button>
          <button class="row-button" type="button" data-category-edit="${escapeHtml(item.id)}">Editar</button>
          <button class="row-button is-danger" type="button" data-category-delete="${escapeHtml(item.id)}">Eliminar</button>
        </div>
      </article>`;
    }).join('') : '<p class="list-empty">Todavía no hay categorías.</p>';
    const template = await request('/api/admin/order-settings');
    document.getElementById('whatsappTemplate').value = template.whatsappTemplate || 'Hola {nombre}, recibimos tu pedido de {cantidad} {unidades} de {producto}. Te esperamos para retirarlo o coordinamos la entrega.';
  } catch (error) {
    setMessage(document.getElementById('categoryMessage'), error.message, 'error');
  }
}

function resetCategoryForm() {
  const form = document.getElementById('categoryForm');
  form.reset();
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryOrder').value = 10;
  document.getElementById('categoryFormTitle').textContent = 'Agregar categoría';
  document.getElementById('categorySubmit').textContent = 'Guardar categoría';
  setMessage(document.getElementById('categoryMessage'), '');
}

document.getElementById('categoryForm').addEventListener('submit', async event => {
  event.preventDefault();
  const categoryId = document.getElementById('categoryId').value;
  const payload = {
    name: document.getElementById('categoryName').value.trim(),
    parentId: document.getElementById('categoryParent').value,
    sortOrder: Number(document.getElementById('categoryOrder').value || 10)
  };
  setMessage(document.getElementById('categoryMessage'), categoryId ? 'Actualizando categoría…' : 'Guardando categoría…');
  try {
    if (categoryId) {
      await request(`/api/admin/categories/${categoryId}`, { method: 'PUT', body: JSON.stringify(payload) });
      setMessage(document.getElementById('categoryMessage'), 'Categoría actualizada.', 'success');
    } else {
      await request('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
      setMessage(document.getElementById('categoryMessage'), 'Categoría guardada.', 'success');
    }
    resetCategoryForm();
    await loadCategories();
  } catch (error) {
    setMessage(document.getElementById('categoryMessage'), error.message, 'error');
  }
});

document.getElementById('categoryList').addEventListener('click', async event => {
  const editButton = event.target.closest('[data-category-edit]');
  if (editButton) {
    const categories = await request('/api/admin/categories');
    const category = categories.find(item => item.id === editButton.dataset.categoryEdit);
    if (!category) return;
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryParent').value = category.parentId || '';
    document.getElementById('categoryOrder').value = category.sortOrder || 10;
    document.getElementById('categoryFormTitle').textContent = 'Editar categoría';
    document.getElementById('categorySubmit').textContent = 'Guardar cambios';
    document.getElementById('categoryName').focus();
    return;
  }
  const deleteButton = event.target.closest('[data-category-delete]');
  if (deleteButton) {
    try {
      await request(`/api/admin/categories/${deleteButton.dataset.categoryDelete}`, { method: 'DELETE' });
      resetCategoryForm();
      await loadCategories();
    } catch (error) {
      setMessage(document.getElementById('categoryMessage'), error.message, 'error');
    }
    return;
  }
  const upButton = event.target.closest('[data-category-up]');
  const downButton = event.target.closest('[data-category-down]');
  if (!upButton && !downButton) return;
  try {
    const categories = await request('/api/admin/categories');
    const ordered = [...categories].sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0) || String(left.name).localeCompare(String(right.name), 'es'));
    const targetId = upButton ? upButton.dataset.categoryUp : downButton.dataset.categoryDown;
    const currentIndex = ordered.findIndex(item => item.id === targetId);
    const swapIndex = upButton ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
    const swapped = [...ordered];
    [swapped[currentIndex], swapped[swapIndex]] = [swapped[swapIndex], swapped[currentIndex]];
    await request('/api/admin/categories/reorder', { method: 'POST', body: JSON.stringify({ ids: swapped.map(item => item.id) }) });
    await loadCategories();
  } catch (error) {
    setMessage(document.getElementById('categoryMessage'), error.message, 'error');
  }
});

document.getElementById('resetCategory').addEventListener('click', resetCategoryForm);

// ── CATEGORY AUTOCOMPLETE + QUICK-ADD ────────────
let cachedCategories = [];
const productCategoryInput = document.getElementById('productCategory');
const categoryQuickAdd = document.getElementById('categoryQuickAdd');
const categorySuggest = document.getElementById('categorySuggest');
let categorySuggestIndex = -1;

function closeCategorySuggest() {
  if (categorySuggest) { categorySuggest.innerHTML = ''; categorySuggest.hidden = true; }
  categorySuggestIndex = -1;
}

function refreshCategoryQuickAdd() {
  if (!categoryQuickAdd || !productCategoryInput) return;
  const value = productCategoryInput.value.trim();
  const exists = value && cachedCategories.some(item => item.name.toLocaleLowerCase('es-AR') === value.toLocaleLowerCase('es-AR'));
  categoryQuickAdd.hidden = !value || Boolean(exists);
  categoryQuickAdd.textContent = `＋ Crear "${value}"`;
}

function renderCategorySuggest() {
  if (!categorySuggest || !productCategoryInput) return;
  const term = productCategoryInput.value.trim().toLocaleLowerCase('es-AR');
  categorySuggestIndex = -1;
  const parents = cachedCategories.filter(item => !item.parentId);
  const matches = (term ? parents.filter(item => item.name.toLocaleLowerCase('es-AR').includes(term)) : parents).slice(0, 8);
  const exact = term && parents.some(item => item.name.toLocaleLowerCase('es-AR') === term);
  const createRow = term && !exact
    ? `<li class="is-new" role="option" data-create="1"><span>＋ Crear "${escapeHtml(productCategoryInput.value.trim())}"</span></li>`
    : `<li class="is-new" role="option" data-create="1"><span>＋ Agregar nueva categoría</span></li>`;
  if (!matches.length && !term) { closeCategorySuggest(); categorySuggest.innerHTML = createRow; categorySuggest.hidden = false; return; }
  categorySuggest.innerHTML =
    matches.map(item => `<li role="option" data-name="${escapeHtml(item.name)}"><span>${escapeHtml(item.name)}</span></li>`).join('') + createRow;
  categorySuggest.hidden = false;
}

async function createCategoryFromInput() {
  const name = productCategoryInput.value.trim();
  if (!name) return;
  try {
    await request('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name, parentId: '', sortOrder: 10 }) });
    await loadCategories();
    refreshCategoryQuickAdd();
    closeCategorySuggest();
  } catch (error) {
    setMessage(document.getElementById('categoryMessage'), error.message, 'error');
  }
}

productCategoryInput?.addEventListener('input', () => { renderCategorySuggest(); refreshCategoryQuickAdd(); });
productCategoryInput?.addEventListener('focus', renderCategorySuggest);
productCategoryInput?.addEventListener('keydown', event => {
  const options = [...(categorySuggest?.querySelectorAll('li') || [])];
  if (event.key === 'Escape') { closeCategorySuggest(); return; }
  if (!options.length) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    categorySuggestIndex = event.key === 'ArrowDown'
      ? (categorySuggestIndex + 1) % options.length
      : (categorySuggestIndex - 1 + options.length) % options.length;
    options.forEach((li, i) => li.classList.toggle('active', i === categorySuggestIndex));
  } else if (event.key === 'Enter' && categorySuggestIndex >= 0) {
    event.preventDefault();
    options[categorySuggestIndex].dispatchEvent(new Event('pick'));
  }
});
function handleCategorySuggestPick(item) {
  if (item.dataset.create) {
    const term = productCategoryInput.value.trim();
    const exact = term && cachedCategories.some(cat => !cat.parentId && cat.name.toLocaleLowerCase('es-AR') === term.toLocaleLowerCase('es-AR'));
    if (term && !exact) { createCategoryFromInput(); return; }
    closeCategorySuggest();
    document.getElementById('categoriesTab')?.click();
    const nameInput = document.getElementById('categoryName');
    if (nameInput) { nameInput.value = term; nameInput.focus(); }
    return;
  }
  productCategoryInput.value = item.dataset.name;
  closeCategorySuggest();
  refreshCategoryQuickAdd();
}
categorySuggest?.addEventListener('pick', event => {
  const item = event.target.closest('li');
  if (item) handleCategorySuggestPick(item);
});
categorySuggest?.addEventListener('mousedown', event => {
  event.preventDefault();
  const item = event.target.closest('li');
  if (item) handleCategorySuggestPick(item);
});
productCategoryInput?.addEventListener('blur', () => setTimeout(closeCategorySuggest, 120));
categoryQuickAdd?.addEventListener('click', createCategoryFromInput);

document.getElementById('orderTemplateForm').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.getElementById('whatsappTemplate').value.trim();
  setMessage(document.getElementById('orderTemplateMessage'), 'Guardando plantilla…');
  try {
    await request('/api/admin/order-settings', { method: 'PUT', body: JSON.stringify({ whatsappTemplate: message }) });
    setMessage(document.getElementById('orderTemplateMessage'), 'Plantilla guardada.', 'success');
    await loadFinancialData();
  } catch (error) {
    setMessage(document.getElementById('orderTemplateMessage'), error.message, 'error');
  }
});

document.getElementById('resetProduct').addEventListener('click', resetProductForm);
listSearch.addEventListener('input', renderProducts);

productList.addEventListener('click', async event => {
  const editButton = event.target.closest('[data-edit]');
  if (editButton) {
    const product = products.find(item => item.id === editButton.dataset.edit);
    if (product) editProduct(product);
    return;
  }
  const deleteButton = event.target.closest('[data-delete]');
  if (!deleteButton || !confirm('¿Eliminar este producto del catálogo?')) return;
  try {
    await request(`/api/admin/products/${deleteButton.dataset.delete}`, { method: 'DELETE' });
    products = products.filter(item => item.id !== deleteButton.dataset.delete);
    renderProducts();
    setMessage(productMessage, 'Producto eliminado.', 'success');
  } catch (error) {
    setMessage(productMessage, error.message, 'error');
  }
});

productForm.addEventListener('submit', async event => {
  event.preventDefault();
  const saveButton = document.getElementById('saveProduct');
  saveButton.disabled = true;
  setMessage(productMessage, 'Guardando…');
  try {
    const imageData = await readImage(document.getElementById('productImage').files[0]);
    const id = document.getElementById('productId').value;
    const body = {
      name: document.getElementById('productName').value.trim(),
      sku: document.getElementById('productSku').value.trim(),
      category: document.getElementById('productCategory').value.trim(),
      subcategory: document.getElementById('productSubcategory').value.trim(),
      brand: document.getElementById('productBrand').value.trim(),
      model: document.getElementById('productModel').value.trim(),
      color: document.getElementById('productColorName').value.trim(),
      capacity: document.getElementById('productCapacity').value.trim(),
      compatibility: document.getElementById('productCompatibility').value.trim(),
      price: Number(document.getElementById('productPrice').value),
      unitCost: Number(document.getElementById('productUnitCost').value),
      salePrice: Number(document.getElementById('productSalePrice').value || 0),
      saleStartsAt: document.getElementById('productSaleStartsAt').value,
      saleEndsAt: document.getElementById('productSaleEndsAt').value,
      description: document.getElementById('productDescription').value.trim(),
      inkColor: document.getElementById('productColor').value,
      active: document.getElementById('productActive').checked,
      isSample: document.getElementById('productSample').checked,
      imageData
    };
    const saved = await request(id ? `/api/admin/products/${id}` : '/api/admin/products', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(body)
    });
    const index = products.findIndex(item => item.id === saved.id);
    if (index < 0) products.unshift(saved);
    else products[index] = saved;
    renderProducts();
    resetProductForm();
    setMessage(productMessage, 'Producto guardado.', 'success');
  } catch (error) {
    setMessage(productMessage, error.message, 'error');
  } finally {
    saveButton.disabled = false;
  }
});

contentForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    await request('/api/admin/site-content', {
      method: 'PUT',
      body: JSON.stringify({
        heroBadge: document.getElementById('contentBadge').value.trim(),
        heroAccent: document.getElementById('contentAccent').value.trim(),
        heroDescription: document.getElementById('contentDescription').value.trim()
      })
    });
    setMessage(contentMessage, 'Textos de portada guardados.', 'success');
  } catch (error) {
    setMessage(contentMessage, error.message, 'error');
  }
});

inspectSession();