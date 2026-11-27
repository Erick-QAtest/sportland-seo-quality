# SPORTLAND — Cambios en la tienda del 27-nov-2026

Hay tres cambios en vivo: dos en el tema y uno en el catálogo. Cada uno se puede revertir de forma independiente.

## 1. Tema: sin AdSense y sin productos agotados

- Tema publicado por el propietario: **«SPORTLAND sin AdSense y sin agotados - 2026-11-27»** (`gid://shopify/OnlineStoreTheme/187672101087`).
- Tema anterior: `187613511903` («SPORTLAND uploadDate zona horaria - 2026-11-25»).
- **Para revertir:** publica el tema anterior desde Tienda online → Temas.

### AdSense

**El problema.** Había código de AdSense (`ca-pub-1156111052759527`) pegado dentro del contenido de los artículos. Venía del español y de traducciones viejas en alemán e inglés. Lo detectó `scripts/auditar-adsense.py`: **301 de 1,719 URLs** lo tenían (298 artículos y 3 páginas, contando las versiones `/`, `/de-de/` y `/en-us/`). La auditoría lee las páginas como Googlebot, porque desde México las rutas regionales redirigen.

**La solución.** El snippet `snippets/sl-sin-adsense.liquid` (hay una copia en `artifacts/tema-2026-11-27/`) quita, al mostrar la página, los `<script>` y `<ins>` de AdSense. Se aplica en tres lugares:

- el cuerpo del artículo (`blocks/_blog-post-content.liquid`, después del arreglo de `uploadDate`);
- el contenido de las páginas (`blocks/page-content.liquid`);
- la descripción de producto (`sections/product-information.liquid`).

**Un caso aparte.** El artículo `lebron-james-se-burla-de-las-nike-lebron-20` traía un `<iframe>` de anuncio de **otro sitio** (`/71161633,…/PARAFR_reescribirtextos`): el texto se había copiado de una herramienta de reescritura junto con su anuncio. Ese iframe se quitó directamente del artículo con `articleUpdate`.

**Verificación.** Revisé de nuevo las 301 URLs con el tema nuevo: **0 con AdSense**. El texto de los artículos queda intacto. Los 28 videos siguen con `uploadDate` completo (`scripts/verificar-uploaddate.py`).

### Productos agotados en listados

Agregué un filtro, marcado como `SL-SIN-AGOTADOS`, en 14 puntos: colección, búsqueda, búsqueda predictiva, recomendaciones (sección y bloque), lista de productos, menú (drawer y mega menú), Comfort Finder, tallas en la ficha y las imágenes de tarjetas de colección.

Con el tema anterior, las colecciones mostraban entre 3 y 8 tarjetas agotadas por página (por ejemplo, 8 en `/collections/all` y 7 en Hombre). Con el nuevo, **0**.

Hay un efecto secundario: las páginas de colección pueden mostrar menos de 24 tarjetas, porque el filtro se aplica después de paginar.

## 2. Catálogo: las 99 fichas agotadas

Los listados ya no las muestran, así que quedaron huérfanas. La regla para decidir: **¿se vendió en los últimos 12 meses?** (ShopifyQL). El script es `scripts/fichas-agotadas.py` y el detalle por ficha está en `data/seo/fichas-agotadas-2026-11-27.csv`.

| Grupo | Fichas | Ventas 12m | Clics 3m | Qué se hizo |
|---|---|---|---|---|
| REPONER | 25 | 151 | 18 | Siguen publicadas (200) |
| DESCONTINUADO | 74 | 0 | 34 | Archivadas + 301 a la colección de su marca |

Para los descontinuados, primero se crearon las 74 redirecciones (`urlRedirectCreate`) y después se archivaron los productos. Shopify solo redirige cuando la URL daría 404, así que en este orden nunca hubo un 404.

**Verificación en vivo:** las 99 fichas respondieron como se esperaba. Las 74 descontinuadas dan 301 al destino correcto y las 25 por reponer dan 200.

**Para revertir una ficha:**

1. Reactiva el producto: Productos → Archivados → Activo.
2. Borra su redirección en Tienda online → Redirecciones de URL.

**Lo que se perdió:** el enlace de Amazon de respaldo de esas 74 fichas. Casi todos eran enlaces de búsqueda de Amazon y entre todos recibían 34 clics en 3 meses.

**Alerta de inventario:** los productos más vendidos del año están agotados: Retaliate 2 (18 vendidos), Flexagon Force 4 (13), Tazon 7 Evo, Electron 2.0, Court Classic Vulc FS y UA BGS Assert 10 (12 cada uno).
