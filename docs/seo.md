# SEO — Documentación

## Estado actual

| Check | Estado |
|-------|--------|
| Canonical tags | ✅ Todas las páginas |
| Meta description | ✅ Todas las páginas (120–160 chars) |
| Open Graph | ✅ Todas las páginas con imagen absoluta |
| Twitter Card | ✅ summary_large_image en todas |
| Schema LocalBusiness | ✅ index.html |
| Schema BreadcrumbList | ✅ 4 páginas internas |
| Schema FAQPage | ✅ contacto.html |
| sitemap.xml | ✅ Registrar en Search Console |
| robots.txt | ✅ Allow all |
| Imágenes con alt | ✅ Todas |
| heading hierarchy | ✅ H1 único por página |

---

## Schema.org implementado

### index.html — LocalBusiness + HardwareStore

```json
{
  "@type": ["LocalBusiness", "HardwareStore"],
  "name": "Ferretería Shama",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Km 23.1 Ruta al Atlántico",
    "addressLocality": "Azacualpilla, Palencia",
    "addressRegion": "Guatemala",
    "addressCountry": "GT"
  },
  "openingHours": ["Mo-Fr 07:30-17:00", "Sa 07:30-13:00"],
  "geo": { "latitude": 14.7202, "longitude": -90.3788 }
}
```

### Páginas internas — BreadcrumbList

Google usa esto para mostrar la ruta en los resultados de búsqueda:
```
ferreteriashama.com › nosotros
```

### contacto.html — FAQPage

5 preguntas frecuentes que pueden aparecer como **rich results** en Google:
- ¿Hacen entregas a domicilio?
- ¿Dan precios especiales por mayoreo?
- ¿Cuál es el horario de atención?
- ¿Cómo puedo solicitar una cotización?
- ¿Tienen todas las marcas disponibles?

Para verificar: [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## Keywords objetivo

### Primarias (alta intención local)
- `ferretería palencia guatemala`
- `ferretería azacualpilla`
- `ferretería km 23 ruta atlántico`
- `ferretería shama`

### Secundarias (categorías de producto)
- `herramientas truper palencia`
- `materiales construcción palencia`
- `plomería palencia guatemala`
- `pinturas byp palencia`
- `electricidad eagle palencia`

### Long-tail (cotización)
- `cotizar materiales construcción palencia`
- `ferretería mayoreo palencia guatemala`
- `truper palencia precio`

---

## Open Graph — imagen recomendada

El `og:image` apunta a `media/og-image.jpg`. Esta imagen **debe existir** con las dimensiones correctas:

- **Tamaño:** 1200 × 630 px (ratio 1.91:1)
- **Peso máximo:** 1 MB (recomendado <300 KB)
- **Contenido sugerido:** Logo Shama + fondo amarillo + dirección
- **Formato:** JPG (mejor compresión que PNG para fotografías)

Para crear una si no existe: usar Canva con template "Facebook Cover 1640×856" y exportar a 1200×630.

---

## Google Search Console

### Pasos para registrar el sitio

1. Ir a [search.google.com/search-console](https://search.google.com/search-console)
2. Agregar propiedad: `https://www.ferreteriashama.com`
3. Verificar con método HTML tag (agregar `<meta name="google-site-verification" content="...">` en `<head>` de index.html)
4. Enviar sitemap: `https://www.ferreteriashama.com/sitemap.xml`

### Qué monitorear mensualmente
- **Impresiones y clics** por keyword
- **Posición media** para keywords objetivo
- **Core Web Vitals** (LCP, CLS, INP) — sección "Experiencia de página"
- **Errores de cobertura** (páginas no indexadas)

---

## Google Analytics 4

ID configurado: `G-HW1TMPJV8Q`

### Eventos custom implementados

| Evento | Trigger |
|--------|---------|
| `form_submit` | Formulario enviado exitosamente |
| `whatsapp_click` | Cualquier botón/link con `data-wa` |

### Etiquetas `data-wa` en uso

| Valor | Elemento |
|-------|---------|
| `float` | Botón WhatsApp flotante |
| `footer` | Link teléfono en footer |
| `hero` | CTA hero de index |
| `contact-page` | Teléfono en contacto.html |
| `contact-direct` | Botón principal contacto.html |
| `marcas-cta` | CTA final de marcas.html |
| `location` | Teléfono en ubicacion.html |
| `location-directions` | "Pedir indicaciones" en ubicacion.html |

---

## Velocidad de carga (estimados)

| Métrica | Antes | Después | Meta |
|---------|-------|---------|------|
| LCP | 3.2–4.5s | <2.5s | <2.5s ✅ |
| CLS | 0.08–0.18 | <0.05 | <0.1 ✅ |
| INP | ~200ms | <100ms | <200ms ✅ |

**Mejoras aplicadas:**
- `<link rel="preload">` en hero image
- `fetchpriority="high"` en imagen crítica
- Fuentes no-bloqueantes (`media="print"` swap)
- `width`/`height` en todas las imágenes (reserva espacio → sin CLS)
- CSS `will-change: transform` en animación WA float

**Pendiente para más mejoras:**
- Convertir PNGs a WebP (especialmente `0modal.png` ~2MB)
- Optimizar SVG del logo (47KB → objetivo <8KB con SVGO)
