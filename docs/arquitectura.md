# Arquitectura del Sitio

## Visión general

Ferretería Shama es un **sitio estático de 5 páginas** sin framework, sin build system y sin dependencias de runtime. Todo corre directo desde el servidor de archivos (Apache/Nginx/CDN).

```
Navegador
  └── HTML (por página)
        ├── css/main.css        ← un solo archivo CSS
        ├── js/main.js          ← un solo archivo JS
        └── media/              ← imágenes y assets
```

---

## Decisiones de arquitectura

### ¿Por qué sin framework?

El sitio es **marketing puro**: presenta la ferretería, sus productos y su ubicación. No hay estado de usuario, no hay autenticación, no hay datos dinámicos. Agregar React/Vue/Angular introduciría:

- Bundle JS de 40–150 KB extra (sin beneficio real)
- Tiempo de hidratación → peor LCP
- Complejidad de build innecesaria
- Curva de entrada para futuros manteners no-devs

**Vanilla HTML + CSS + JS** es la decisión correcta para este caso de uso.

### ¿Por qué sin Bootstrap?

Bootstrap 4.5 (versión original) aportaba:
- ~30 KB de CSS sin usar (PurgeCSS no configurado)
- `!important` en varios componentes que dificultaban overrides
- Grid de 12 columnas cuando CSS Grid nativo es superior
- Dependencia de jQuery (ya removida en Bootstrap 5, pero la v4 lo requería)

El rewrite usa **CSS Custom Properties** como sistema de diseño:
```css
:root {
  --yellow:  #FFC300;
  --brown:   #2E2725;
  --grey:    #535353;
  /* ... tokens de spacing, border-radius, etc. */
}
```

Esto da control total sobre el output CSS y elimina cualquier overhead.

---

## CSS: metodología

**Convención de nombres:** BEM simplificado (sin doble guión bajo en modificadores simples).

```
.bloque
.bloque__elemento
.bloque--modificador
```

Ejemplos reales:
```css
.pcard              /* product card */
.pcard__img-wrap    /* elemento: image wrapper */
.pcard--rev         /* modificador: layout reversed */

.btn                /* botón base */
.btn--whatsapp      /* modificador: estilo WA */
.btn--lg            /* modificador: tamaño large */
.btn--full          /* modificador: width 100% */
```

**Cascada intencional:** Las reglas base vienen antes, los estados y variantes después, los media queries al final.

---

## JS: patrón de módulos inline

`main.js` es un único archivo con secciones comentadas. No usa módulos ES (`import/export`) para mantener compatibilidad con hosting básico sin MIME types configurados correctamente.

```js
// ── SECCIÓN ──────────────────────────────────────
// Código de la sección
```

Cada sección es **independiente** y hace su propio querySelector. Si un elemento no existe en la página actual, el optional chaining (`?.`) previene errores:

```js
const toggle = document.getElementById('navToggle');
toggle?.addEventListener('click', openMenu);  // No explota si toggle es null
```

---

## Formulario de contacto

Se usa [FormSubmit.co](https://formsubmit.co) como backend-as-a-service:

```
Usuario → fetch POST → FormSubmit.co → Email a fshamakm23@gmail.com
```

Configuración via campos `<input type="hidden">`:
- `_subject` — asunto del email
- `_template` — formato `table` (legible)
- `_captcha` — desactivado (el honeypot `_honey` actúa de filtro)
- `_autoresponse` — respuesta automática al usuario

**Activación:** Al primer envío, FormSubmit manda un email de verificación al correo destino. Hay que confirmar una sola vez.

---

## Hosting recomendado

El sitio es compatible con cualquier hosting estático:

| Opción | Costo | CDN | SSL |
|--------|-------|-----|-----|
| Cloudflare Pages | Gratis | ✅ | ✅ |
| Netlify | Gratis | ✅ | ✅ |
| GitHub Pages | Gratis | ✅ | ✅ |
| Hostinger / cPanel | ~$3/mes | Opcional | ✅ |

**Recomendación:** Cloudflare Pages — CDN global, deploy desde Git, sin configuración.

---

## PWA (Progressive Web App)

El `manifest.json` permite que el sitio sea "instalable" en Android:

```json
{
  "name": "Ferretería Shama",
  "short_name": "Shama",
  "theme_color": "#FFC300",
  "display": "standalone",
  "shortcuts": [
    { "name": "WhatsApp", "url": "https://wa.me/50242173658" },
    { "name": "Ubicación", "url": "/ubicacion.html" }
  ]
}
```

No hay Service Worker activo (sin estrategia de caché offline). Si se requiere en el futuro, agregar `sw.js` con Workbox.

---

## Futuras mejoras técnicas

| Prioridad | Mejora | Impacto |
|-----------|--------|---------|
| Alta | Convertir PNGs grandes a WebP | -60% peso de imágenes |
| Alta | Optimizar `logo 1.svg` con SVGO (47KB → <8KB) | -39KB en cada carga |
| Media | Service Worker con caché offline | PWA completa |
| Media | Lazy-load del iframe de Google Maps | Menos JS de terceros en inicial |
| Baja | Testimonios/reseñas de clientes | SEO + conversión |
| Baja | Página de productos con filtros | Experiencia de usuario |
