# SPORTLAND MX — Política SEO internacional v1.0

**Fecha de adopción:** 20 de noviembre de 2026  
**Responsable:** Área digital de Sportland MX  
**Objetivo:** una tienda comercial principal en México, con contenido multilingüe selectivo cuando su utilidad sea demostrable.  
**Ámbito:** blogs, guías, landings, productos y rutas regionales de Shopify.

## Reglas obligatorias

1. **Idioma ≠ mercado.** Un artículo alemán puede ser útil aun cuando la tienda vende principalmente en México. No retirar contenido únicamente por estar en alemán/inglés.
2. **Clics no equivalen a ingresos.** Cualquier clic registrado en el período de referencia activa una **revisión**, no una obligación de conservar permanentemente.
3. **Ninguna despublicación automática de URLs con tráfico.** Requiere identificar consultas, intención, idioma del contenido, conversiones o monetización potencial, destino y propietario de la decisión.
4. **Conservar versiones lingüísticas valiosas.** Por ejemplo, `/blogs/noticias/was-sind-puma-soft-foam-einlegesohlen-und-was-sind-die-vorteile` se protege como página alemana propia. No imponer canonical español a una página realmente alemana con URL propia.
5. **Una URL canónica por contenido/idioma.** Consolidar variantes que realmente dupliquen el contenido dentro del mismo idioma, evitando fragmentación de señales.
6. **Redirigir solo a destinos pertinentes.** Un `301` permanente debe ir directamente a una página `200` cuya intención de búsqueda sea equivalente; si no existe, evaluar `404/410` u otra estrategia expresamente aprobada. Evitar enlaces a home genérica.
7. **Sin 301 entre idiomas por defecto.** Solo si la versión fuente realmente se retira y se justifica que el destino satisface al lector; registrar el riesgo y aprobar manualmente.
8. **Hreflang no sustituye al canonical.** Para traducciones publicadas utilizar alternates recíprocos únicamente entre URLs indexables que respondan `200`; cada versión debe tener canonical coherente con su propio idioma.
9. **No confundir subcarpetas con idioma de contenido.** `/de-de/`, `/de-us/`, `/en-us/` identifican rutas, pero no prueban que el HTML tenga texto en esa lengua. Verificar HTML real.
10. **No tomar 429 como desaparición.** Reintentar con backoff, comprobar HTTP e inventario y no decidir `404` a partir de un límite de peticiones.
11. **Mercados de Shopify: no-go mientras haya dependencias.** Prohibido retirarlos hasta auditar redirecciones salientes, contenido con tráfico, enlaces internos, `hreflang`, sitemaps y canonicals.
12. **Post-implementación.** Exigir una corrida pre y otra post y registrar evolución de GSC a 7, 28 y 90 días. No afirmar preservación de rankings solo por pasar los tests HTTP.

## Workflow para cualquier cambio de URL

**DESCUBRIR → CLASIFICAR → JUSTIFICAR → APROBAR → CAMBIAR → VERIFICAR → MONITOREAR.**

**Precondición para cambiar una URL con tráfico:**
- Evidencia de GSC por URL y país, ventana de observación y consultas principales.
- Confirmación del idioma real y comparación editorial con el destino.
- Evaluación de utilidad de negocio (venta, afiliados, lead o autoridad temática).
- Destino aprobado, publicado, relevante y estable; propietarios informados.
- Plan de reversión y pruebas predefinidas.

**Gate técnico mínimo:**
- Source cambia al comportamiento aprobado (`200` si se conserva, `301` si se retira).
- `301` directo sin cadenas/ciclos/cross-domain no previsto; target `200`.
- Canonical propio de cada versión principal; `lang` y `hreflang` correctos cuando aplique.
- Enlaces internos, sitemap, indexabilidad y contenido conservados.
- GSC monitoreado; si hay caída anómala, investigar antes de continuar lotes.

## Decisiones por el momento

- **PROTEGER**: español SoftFoam, alemán SoftFoam y otros ocho artículos españoles del inventario.
- **REVALIDAR**: tres redirecciones regionales del artículo alemán SoftFoam → versión alemana principal. Shopify indica que el cambio está configurado; la validación HTTP pública debe realizarse después.
- **REVISAR**: SoftFoam inglés y Suela vulcanizada alemán fueron despublicados antes de esta política. Son *excepciones históricas*; no considerar el `301` como aprobación editorial definitiva.
- **BLOQUEAR**: desactivación general de mercados hasta resolver pendientes por URL y pasar el release gate.

### Decisiones del 27-nov-2026 (registradas en `data/seo/governance-decisions-45.json`)

Base: análisis de intención de todo el sitio (`docs/INTENCION_SITIO_2026-11-27.md`). Solo dos páginas extranjeras superan los 14 clics en 3 meses.

- **SEO-002 · SoftFoam alemán → CONSERVAR Y MONETIZAR.** Tiene 123 clics, sumando sus variantes. Las consultas son de compra («einlegesohlen kaufen», «sohle nachkaufen») y Sportland no vende en Alemania, así que se monetiza con el afiliado de Amazon.de.
  - **Bloqueo:** falta la cuenta de Amazon.de PartnerNet, que abre el propietario.
  - **QA en REVALIDAR:** la página responde con `lang="es"` y su hreflang la declara `es` aunque el contenido está en alemán. No cumple el gate técnico («`lang` y `hreflang` correctos»).
- **SEO-046 · QR de Converse en inglés → REDIRIGIR (301) a la guía en español del QR de Converse.** Excepción aprobada a la regla 7.
  - **Datos:** 0 clics en EE. UU., Alemania y España. Las consultas que la traen son «vmdmx», el distribuidor mexicano. La página tiene 192 palabras; la guía en español tiene 1,648 y monetiza.
  - **Precondición:** confirmar en GSC el país de sus clics antes de aplicar.
  - **Reversión:** restaurar el artículo y borrar la redirección.
  - **Estado:** `PENDIENTE` hasta aplicarla y pasar el QA.

## Fuente y limitaciones

Los clics e impresiones del libro provienen de exportaciones GSC de **Alemania, Estados Unidos y España, tipo Web, últimos tres meses**, disponibles como archivos CSV aportados por el propietario. Una URL ausente de los CSV no equivale a cero tráfico: puede ser un límite del listado. Las métricas por país no son métricas de ingresos ni incluyen todos los países. La columna «Estado HTTP anterior» es una **foto previa** a cambios posteriores en Shopify.

Los estados de Shopify verificados el 20/11/2026 son: SoftFoam ES publicado, SoftFoam DE publicado, SoftFoam EN despublicado, Suela vulcanizada ES publicada, Suela vulcanizada DE despublicada, Air Force 1 ES publicado.

Documentación técnica:
- https://developers.google.com/search/docs/specialty/international/localized-versions?hl=es
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=es
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
