# SPORTLAND MX — Decisión SEO del lote Air Force 1

**Fecha:** 20 de noviembre de 2026  
**Estado:** `NO_GO` para retirar mercados, eliminar artículos o consolidar URLs de AF1.

## Evidencia de Search Console disponible

Exportaciones Web de DE/US/ES, aproximadamente **19 agosto–18 noviembre 2026** (no tráfico del sitio completo; valores por URL, no usuarios únicos):

| Página | País | Clics | Impresiones | Estado |
|---|---|---:|---:|---|
| `/blogs/noticias/como-saber-si-mis-air-force-1-son-originales` | DE/US/ES | 7 | 811 | Proteger ES |
| `/de-de/blogs/noticias/como-saber-si-mis-air-force-1-son-originales` | DE | 7 | 351 | Proteger traducción DE (outdated) |
| `/blogs/noticias/woher-weiss-ich-ob-meine-air-force-1-sneaker-original-sind` | DE | 1 | 17 | Proteger temporal, revisión calidad |
| `/en-us/blogs/noticias/how-to-know-if-my-af1-are-legit` | US | 1 | 76 | Proteger traducción EN (outdated) |
| `/de-us/blogs/noticias/how-to-know-if-my-af1-are-legit` | DE | 1 | 252 | Revisar redirección heredada |
| `/de-us/blogs/noticias/woher-weiss-ich-ob-meine-air-force-1-sneaker-original-sind` | DE | 0 | 23 | Revisar alias regional (0 clics ≠ 0 demanda) |

*No sumar impresiones de fragmentos `#...` como páginas independientes.*

## Investigación Shopify

- El artículo español `gid://shopify/Article/587240440031` está publicado; cuerpo extenso actualizado, con 12 señales y un test guiado. Recomendación: **mantener URL, contenido y H1**.
- La traducción **alemana** de ese mismo artículo existe, incluye título local y cuerpo breve; Shopify marca `body_html` y meta SEO `outdated: true`.
- La traducción **inglesa** también existe (handle `how-to-know-if-my-af1-are-legit`), y Shopify marca `body_html` y metadatos SEO `outdated: true`.
- El artículo alemán independiente `gid://shopify/Article/590594375903` está publicado, pero incluye generalizaciones demasiado absolutas sobre etiquetas, Swoosh y acabados. Su contenido debe actualizarse antes de convertirlo en página alemana principal.
- `gid://shopify/UrlRedirect/601670582495` enlaza `/de-us/blogs/noticias/how-to-know-if-my-af1-are-legit` hacia `/de-de/blogs/noticias/how-to-know-if-my-af1-are-legit`; la ruta DE podría volver a redirigir al handle español original bajo `/de-de/`, creando una cadena.
- La redirección creada previamente para `/de-de/blogs/noticias/como-saber-si-mis-air-force-1-son-originales` → ES no necesariamente se ejecuta mientras la página DE responde 200; no alterar antes de QA y decisión editorial.

## Decisión del lote

1. **Proteger ES**, **proteger temporalmente DE traducida**, **EN traducida** y **DE independiente**.
2. **No despublicar** ni agregar nuevas redirecciones a español en este lote.
3. Revisar las dos publicaciones alemanas: elegir cuál preserva mejor intención, contenido actualizado, GSC y enlaces; después proponer **una URL alemana principal** con plan de reversión. No es obligatorio que sea la del artículo independiente.
4. Actualizar traducciones DE/EN antes de pensar en retirar el mercado o migrar rutas; las URLs actuales dependen de Markets.
5. Auditar cadenas y canonicals con Playwright; no tomar 200 o 301 como evidencia suficiente de valor SEO.
6. Evaluar afiliados y leads en países extranjeros. La tienda vende en México; los clics internacionales no demuestran transacciones.

## Cambios y estado del proyecto

**Mutaciones de Shopify en lote Air Force 1: 0.** Lecturas solamente. Las páginas siguen como estaban; no se desactivaron mercados. El Excel y `governance-decisions-45.json` sí se actualizaron con la decisión de protección y la evidencia pendiente.

## Condiciones de aprobación futura

- Comparación editorial DE vs DE y actualización de traducciones desactualizadas.
- Revisión por idioma de `html lang`, canonical, hreflang, sitemap, enlazado interno, indexabilidad, estados HTTP y cadenas.
- Decisión comercial y autorización del responsable digital.
- Pruebas antes/después, seguimiento GSC 7/28/90 días.

## Fuentes de investigación

- Shopify Admin article y translatableResource (20 nov 2026), IDs arriba.
- Exportaciones GSC `Páginas(1).csv`, `Páginas(2).csv`, `Páginas(3).csv` y sus hojas complementarias (archivos entregados por el usuario).
- https://sportlandmx.com/de-de/blogs/noticias/como-saber-si-mis-air-force-1-son-originales
- https://sportlandmx.com/blogs/noticias/woher-weiss-ich-ob-meine-air-force-1-sneaker-original-sind
- https://developers.google.com/search/docs/specialty/international/localized-versions
