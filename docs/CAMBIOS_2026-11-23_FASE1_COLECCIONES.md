# SPORTLAND — Fase 1 del interlinking: colección relacionada por artículo (23-nov-2026)

## Qué se cambió en Shopify

- Nueva definición de metafield para artículos: `custom.related_collection`, tipo `collection_reference`, fijada en el administrador ("Colección relacionada"). ID `gid://shopify/MetafieldDefinition/545491878111`.
- Valor escrito en los 41 artículos núcleo según `data/seo/fase1-colecciones-2026-11-23.csv`, sin errores.

| Colección | Artículos |
| --- | --- |
| Casual | 13 |
| adidas | 10 |
| PUMA | 8 |
| Converse | 4 |
| Gym | 2 |
| Nike | 2 |
| Tenis PUMA con SoftFoam y SoftFoam+ | 1 |
| Tenis Adidas con Cloudfoam Comfort | 1 |

### Añadido después (23-nov-2026)

- "Qué es una suela EVA y cuáles son sus beneficios" (`gid://shopify/Article/555980521668`) → **Tenis PUMA con SoftFoam y SoftFoam+**. No es artículo núcleo; se asigna porque EVA es la base genérica y el artículo funciona como puente hacia SoftFoam. Primero se asignó Comfort Finder, pero esa colección no está publicada en la tienda online (404), así que se reasignó el mismo día. Total con colección asignada: 42 artículos.

## Qué NO se cambió

- El tema publicado (`SPORTLAND QA SEO-LINK-01 SoftFoam - 2026-11-11`) sigue con "Mostrar productos" apagado en las plantillas `article` y `article.af1-originalidad`. Mientras siga apagado, los visitantes no ven ningún cambio.
- Texto de artículos, menú, redirecciones y poda: sin cambios.

## Para activarlo (manual, en el editor del tema)

En las dos plantillas de artículo (predeterminada y `af1-originalidad`), sección de la entrada del blog → "Productos relacionados automáticos" → activar **Mostrar productos**. El bloque muestra hasta 4 productos disponibles de la colección del metafield y enlaza a esa colección.

## Cómo revertir

- Apagar **Mostrar productos** oculta el bloque de inmediato.
- Borrar los valores del metafield devuelve cada artículo a la selección automática por palabras clave del tema.

## Verificación pendiente

- [ ] Revisar en vista previa del editor: AF1 (Casual), SoftFoam (colección SoftFoam), Converse etiqueta (Converse).
- [ ] Test Playwright: cada artículo del CSV muestra ≥ 1 producto disponible y el enlace a la colección esperada.
