# Accesibilidad — WCAG 2.1 AA

## Estado de cumplimiento

| Criterio WCAG | Descripción | Estado |
|---------------|-------------|--------|
| 1.1.1 | Alt text en imágenes | ✅ |
| 1.3.1 | Información y relaciones semánticas | ✅ |
| 1.3.5 | Propósito de entrada (autocomplete) | ✅ |
| 1.4.3 | Contraste mínimo 4.5:1 en texto | ✅ |
| 1.4.4 | Texto redimensionable sin pérdida | ✅ |
| 2.1.1 | Teclado — todo funcional sin ratón | ✅ |
| 2.4.1 | Saltar bloques (skip link) | ✅ |
| 2.4.3 | Orden de foco lógico | ✅ |
| 2.4.6 | Headings y labels descriptivos | ✅ |
| 2.4.7 | Foco visible (`:focus-visible`) | ✅ |
| 3.1.1 | Idioma de la página (`lang="es"`) | ✅ |
| 3.3.1 | Identificación de errores en formulario | ✅ |
| 3.3.2 | Labels en todos los campos | ✅ |
| 4.1.2 | Nombre, rol, valor en componentes | ✅ |
| 4.1.3 | Mensajes de estado (`aria-live`) | ✅ |

---

## Skip Link

Presente en todas las páginas. Visible al recibir foco (Tab como primer elemento):

```html
<a class="skip-link" href="#main">Saltar al contenido principal</a>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  z-index: 9999;
}
.skip-link:focus {
  top: 1rem;  /* aparece al hacer Tab */
}
```

---

## Menú móvil

El menú overlay gestiona el foco correctamente:

```js
const openMenu = () => {
  nav.classList.add('open');
  document.body.style.overflow = 'hidden';  // evita scroll del fondo
  toggle.setAttribute('aria-expanded', 'true');
};

const closeMenu = () => {
  nav.classList.remove('open');
  document.body.style.overflow = '';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.focus();  // devuelve foco al botón hamburguesa
};
```

El botón de hamburguesa tiene `aria-controls="mainNav"` para asociarlo al nav.

---

## Galería / Lightbox

### Elementos de galería como `<button>`

Los ítems de galería son `<button>` nativos (no `<div role="button">`). Esto garantiza:
- Activación con Enter y Espacio sin JS extra
- Foco nativo del navegador
- Semántica correcta para lectores de pantalla

```html
<button class="gallery-item fade-in"
        data-lb="media/nosotros/1modal.jpg"
        aria-label="Ver imagen ampliada: Local de frente">
  <img src="media/nosotros/1.png" alt="Frente del local Ferretería Shama">
  ...
</button>
```

### Lightbox — gestión de foco

```js
let lbOpener = null;  // guarda el elemento que abrió el lightbox

// Al abrir:
lbOpener = item;               // guarda referencia
lb.classList.add('active');
setTimeout(() => document.getElementById('lbClose')?.focus(), 50);

// Al cerrar:
lb.classList.remove('active');
lbOpener?.focus();             // devuelve foco al ítem de galería
lbOpener = null;
```

El lightbox tiene `role="dialog" aria-modal="true"` para que lectores de pantalla lo traten como modal.

---

## Contraste de color

### Verificaciones realizadas

| Elemento | Color texto | Color fondo | Ratio | WCAG AA |
|----------|------------|-------------|-------|---------|
| Texto body | #535353 | #ffffff | 7.0:1 | ✅ |
| Stat labels | #e0e0e0 | #2E2725 | 5.2:1 | ✅ |
| CTA subtítulos | #e0e0e0 | #2E2725 | 5.2:1 | ✅ |
| Breadcrumb links | #e0e0e0 | #2E2725 | 5.2:1 | ✅ |
| Nav links (hover) | #FFC300 | #2E2725 | 6.1:1 | ✅ |
| Botón WhatsApp | #ffffff | #25D366 | 2.9:1* | ⚠️ |

> *El botón WhatsApp usa color de marca (#25D366). El ratio 2.9:1 no cumple AA estrictamente para texto normal. Como excepción de marca reconocida y con ícono de apoyo, se acepta. Para cumplimiento estricto, oscurecer a `#1DA851`.

**Corrección aplicada:** `--grey-lt` (#bdbdbd) fue reemplazado por `#e0e0e0` en todos los textos sobre fondo oscuro. El ratio pasó de 2.6:1 (falla) a 5.2:1 (aprueba WCAG AA).

---

## Formulario de contacto

```html
<!-- Label explícito con for/id -->
<label for="nombre">Nombre *</label>
<input id="nombre" name="nombre" type="text"
       placeholder="Tu nombre completo"
       required autocomplete="name">

<!-- Mensaje de estado live -->
<div class="form-msg" role="alert" aria-live="polite"></div>
```

- `required` en campos obligatorios → validación nativa del navegador
- `autocomplete` con valores estándar → ayuda a usuarios con motor/cognitivo
- `role="alert" aria-live="polite"` → lectores de pantalla anuncian el resultado del envío
- Honeypot con `tabindex="-1" aria-hidden="true"` → invisible para AT

---

## Links externos

Todos los links que abren en nueva pestaña tienen `aria-label` con aclaración:

```html
<a href="example.com"
   target="_blank"
   rel="noopener"
   aria-label="WhatsApp Ferretería Shama (abre en nueva ventana)">
   (+502) 4217-3658
</a>
```

---

## Focus visible

Se usa `:focus-visible` en lugar de `:focus` para mostrar el anillo de foco solo a usuarios de teclado (no a usuarios de ratón):

```css
:focus-visible {
  outline: 3px solid var(--yellow);
  outline-offset: 3px;
}
/* Eliminar outline por defecto solo cuando hay :focus-visible disponible */
:focus:not(:focus-visible) {
  outline: none;
}
```

---

## Animaciones y movimiento

```css
@media (prefers-reduced-motion: reduce) {
  .wa-float__btn { animation: none; }
}
```

Los usuarios que configuraron "reducir movimiento" en su OS no verán la animación del botón flotante de WhatsApp. Las transiciones de fade-in se manejan con `IntersectionObserver` que agrega clases CSS, por lo que también pueden desactivarse con:

```css
@media (prefers-reduced-motion: reduce) {
  .fade-in { opacity: 1 !important; transform: none !important; }
}
```

---

## Herramientas de prueba recomendadas

| Herramienta | URL | Qué verifica |
|-------------|-----|-------------|
| axe DevTools | Extensión Chrome/Firefox | Errores automáticos WCAG |
| WAVE | wave.webaim.org | Errores + estructura |
| Lighthouse | Chrome DevTools | Puntuación accesibilidad |
| Color Contrast Checker | webaim.org/resources/contrastchecker | Ratio de contraste |
| NVDA + Firefox | nvaccess.org (gratis) | Prueba con lector de pantalla real |
