# SPORTLAND — Cambios en Shopify, 20 de noviembre de 2026

## Alcance
Consolidación del primer grupo de contenidos extranjeros hacia guías publicadas en español. No se modificaron Shopify Markets ni se eliminaron artículos.

## Páginas principales que se conservaron
- `/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma` (PUMA SoftFoam; publicación conservada)
- `/blogs/noticias/suela-vulcanizada-que-es-y-que-beneficios-tiene` (Suela vulcanizada; publicación conservada)

## Contenido
- Suela vulcanizada: añadido un matiz sobre desgaste de la banda lateral de caucho, basado en la información útil de la publicación alemana; añadido enlace contextual a la guía española de PUMA SoftFoam. HTML y URL originales conservados.
- Artículo publicado `shoe-sole-for-flat-feet-which-one-is-the-best-and-why`: enlace al artículo antiguo de SoftFoam en inglés cambiado hacia el artículo español y su texto asociado identificado como guía en español.
- La afirmación histórica del artículo inglés de SoftFoam sobre NASA no se trasladó, al no estar verificada.

## Artículos despublicados — NO eliminados
- `586817077471` — SoftFoam alemán, `/blogs/noticias/was-sind-puma-soft-foam-einlegesohlen-und-was-sind-die-vorteile`.
- `586806984927` — SoftFoam inglés, `/blogs/noticias/what-are-puma-soft-foam-insoles-and-what-are-the-benefits`.
- `603163951327` — Suela vulcanizada alemán, `/blogs/sneaker-sohlen/was-ist-eine-vulkanisierte-sohle-und-welche-vorteile-hat-sie`.

## Redirecciones
- 9 nuevas redirecciones Shopify desde URLs sin prefijo y variantes `/en-us/` y `/de-de/` de los tres artículos despublicados.
- 6 redirecciones Shopify anteriores actualizadas (incluye las rutas `/de-us/` antiguas y alias históricos).
- 15/15 entradas relevantes verificadas posteriormente en el administrador de Shopify; destinos directos a las dos guías españolas, sin destinos `/de-de/` o `/en-us/` entre esas 15.

## Validación
- Confirmado vía Shopify Admin: 2 artículos principales publicados, 3 publicaciones extranjeras despublicadas, enlace de suela a SoftFoam en el HTML y redirecciones configuradas.
- No verificado todavía con una nueva ejecución HTTP del usuario: respuesta real `301`, una sola transición y canonicals de todas las variantes. Los resultados que devuelve un buscador pueden proceder de caché.
- Mercados de Alemania y Estados Unidos siguen activos; otras URLs internacionales y sus redirecciones siguen fuera del alcance de este piloto.

## QA siguiente
Ejecutar `SEO_PHASE=pre` sobre `tests/seo/consolidation-pilot.spec.ts`. Después de desactivar mercados de manera controlada, repetir con `SEO_PHASE=post`.
