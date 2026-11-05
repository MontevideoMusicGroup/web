# Neyra Servicios â€” Sitio Web

Sitio web estÃ¡tico de **Neyra Servicios**, empresa de tecnologÃ­a con mÃ¡s de 40 aÃ±os de experiencia y sede en La Rioja 361, CÃ³rdoba, Argentina.

ðŸŒ **Sitio oficial:** [neyraservicios.com.ar](https://neyraservicios.com.ar)

---

## Stack

| Capa | TecnologÃ­a |
|------|-----------|
| Markup | HTML5 semÃ¡ntico |
| Estilos | CSS puro â€” Custom Properties, Grid, Flexbox |
| Scripts | Vanilla JS ES2020+, zero dependencias |
| Fuentes | Google Fonts (carga no-bloqueante) |
| Analytics | No configurado |
| Formulario | [FormSubmit.co](https://formsubmit.co), destino de Ventas |
| Iconos de servicios | Font Awesome Free 7.0.1 ([CC BY 4.0](https://fontawesome.com/license/free)) |
| Tienda y panel | PowerShell `HttpListener`, sin dependencias externas |
| PWA | `manifest.json` + theme-color |

> Bootstrap fue **completamente eliminado** en el rewrite 2025. El CSS resultante pesa ~30 KB menos y no tiene dependencias de terceros en runtime.

---

## Estructura del proyecto

```
NeyraServicios/
â”œâ”€â”€ index.html          # Inicio â€” hero, stats, servicios, CTA
â”œâ”€â”€ nosotros.html       # Historia, galerÃ­a, valores
â”œâ”€â”€ marcas.html         # Servicios: hardware, soporte, ciberseguridad y soluciones digitales
â”œâ”€â”€ ubicacion.html      # Mapa, horarios, contacto directo
â”œâ”€â”€ contacto.html       # Formulario + WhatsApp
â”œâ”€â”€ store/              # CatÃ¡logo y carrito de compra
â”œâ”€â”€ admin/              # Panel privado de productos y textos de portada
â”œâ”€â”€ server.ps1          # API y servidor local de tienda
â”œâ”€â”€ data/               # CatÃ¡logo, textos y hash del administrador
â”‚
â”œâ”€â”€ css/
â”‚   â””â”€â”€ main.css        # Estilos compilados (CSS puro, sin Bootstrap)
â”œâ”€â”€ js/
â”‚   â””â”€â”€ main.js         # LÃ³gica del sitio (menÃº, lightbox, contadores, formulario)
â”œâ”€â”€ sass/               # Fuente SCSS (referencia histÃ³rica)
â”‚   â”œâ”€â”€ main.scss
â”‚   â”œâ”€â”€ _variables.scss
â”‚   â”œâ”€â”€ _mixins.scss
â”‚   â”œâ”€â”€ _reset.scss
â”‚   â””â”€â”€ layout/
â”œâ”€â”€ media/              # ImÃ¡genes, logo, Ã­conos
â”‚
â”œâ”€â”€ manifest.json       # PWA manifest
â”œâ”€â”€ sitemap.xml         # Sitemap para Google Search Console
â”œâ”€â”€ robots.txt          # Directivas para crawlers
â””â”€â”€ docs/               # DocumentaciÃ³n tÃ©cnica
    â”œâ”€â”€ arquitectura.md
    â”œâ”€â”€ seo.md
    â””â”€â”€ accesibilidad.md
```

---

## PÃ¡ginas

| PÃ¡gina | URL | DescripciÃ³n |
|--------|-----|-------------|
| Inicio | `/` | Hero animado, contadores, servicios |
| Nosotros | `/nosotros.html` | Historia, galerÃ­a lightbox, valores |
| Servicios | `/marcas.html` | Soluciones tecnolÃ³gicas para empresas y personas |
| UbicaciÃ³n | `/ubicacion.html` | Mapa Google Maps + horarios |
| Contacto | `/contacto.html` | Formulario FormSubmit + WhatsApp directo |
| Tienda | `/tienda/` | CatÃ¡logo, filtros, carrito persistente y pedido por WhatsApp |
| AdministraciÃ³n | `/admin/` | Productos, precios, ventas, gastos, pedidos y textos de portada |

---

## Funcionalidades JS

- **MenÃº mÃ³vil** â€” overlay con gestiÃ³n de foco (WCAG 2.4.3)
- **Contadores animados** â€” `IntersectionObserver` + easing cÃºbico
- **Fade-in por scroll** â€” `IntersectionObserver`, sin GSAP ni librerÃ­as
- **GalerÃ­a / Lightbox** â€” foco guardado y restaurado, cierre con Escape
- **Formulario async** â€” `fetch` + FormSubmit.co, sin recarga de pÃ¡gina
- **Contacto directo** â€” WhatsApp, correo de ventas y soporte tÃ©cnico
- **Header shadow** â€” clase `scrolled` en scroll >20px

---

## SEO & Performance

- `<link rel="canonical">` en todas las pÃ¡ginas
- Open Graph + Twitter Card con URLs absolutas e imÃ¡genes dimensionadas
- Schema.org: `LocalBusiness`, `BreadcrumbList`, `FAQPage`
- Preload del hero image (`fetchpriority="high"`)
- Fuentes con `media="print" onload="this.media='all'"` (no bloquean render)
- `width`/`height` en todas las imÃ¡genes (previene CLS)
- `sitemap.xml` registrado en Google Search Console

---

## Accesibilidad (WCAG 2.1 AA)

- Skip link `#main` en todas las pÃ¡ginas
- `aria-current="page"` en nav activo
- `aria-label` en links externos con "(abre en nueva ventana)"
- Botones de galerÃ­a (`<button>`) con soporte teclado nativo (Enter/Space)
- `:focus-visible` en todos los elementos interactivos
- Contraste AA verificado en textos sobre fondos oscuros
- `prefers-reduced-motion` respetado en animaciones

---

## Desarrollo local

```powershell
# Iniciar API, tienda y panel en http://127.0.0.1:8080
.\server.ps1
```

Al entrar por primera vez a `/admin/`, creÃ¡ una contraseÃ±a de al menos 12 caracteres. Los controles **Mostrar contraseÃ±a** y **Ocultar contraseÃ±a** permiten verla mientras la escribÃ­s; el servidor sigue guardando Ãºnicamente el hash en `data/admin.json`. Para restablecer el acceso local, eliminÃ¡ `data/admin.json` y reiniciÃ¡ `.\server.ps1`; al abrir `/admin/` podrÃ¡s crear una contraseÃ±a nueva. Los productos se guardan en `data/products.json` y las fotos en `media/tienda/`.

La tienda envÃ­a un solo mensaje de WhatsApp por pedido, agrupando las unidades del mismo producto (por ejemplo, 2 unidades); si se incluyen productos distintos, los lista juntos en ese mismo mensaje. Los pedidos rÃ¡pidos tambiÃ©n guardan una sola entrada con la cantidad total y el botÃ³n de WhatsApp usa esa cantidad. La plantilla admite `{nombre}`, `{cantidad}`, `{unidades}` (unidad/unidades) y `{producto}`. El sitio no procesa pagos ni controla existencias: los productos se ofrecen por encargo y la disponibilidad se confirma al coordinar la entrega. El precio de los cuatro Epson T544 cargados inicialmente es ilustrativo y aparece marcado como muestra. Para publicar el backend fuera de la PC hace falta un servidor HTTPS que pueda ejecutar PowerShell y escribir en `data/` y `media/tienda/`; el sitio estÃ¡tico actual por sÃ­ solo no alcanza.

La copia completa previa a la eliminaciÃ³n del control de stock estÃ¡ en `backup_antes_de_quitar_stock_2026-10-23/`. No publiques esa carpeta: contiene una copia Ã­ntegra de los datos y archivos del proyecto.

---

## Contacto del negocio

- ðŸ“ La Rioja 361, CÃ³rdoba, Argentina Â· C.P. 5003
- ðŸ“§ Ventas: ventas@neyraservicios.com.ar Â· Servicio tÃ©cnico: st@neyraservicios.com.ar Â· Info: info@neyraservicios.com.ar
- â˜Ž Ventas: (0351) 15 260-0101 Â· Servicio tÃ©cnico: (0351) 15 368-6439 Â· Fijo: (0351) 422-3214
- ðŸ• Lunes a viernes, 9:00â€“17:00

---

