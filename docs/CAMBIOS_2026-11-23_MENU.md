# SPORTLAND — Menú principal `menu-2026` (23-nov-2026)

## Respaldo del menú anterior (para revertir)

Menú `gid://shopify/Menu/259982524639`, handle `menu-2026`, título "Menu-2026":

| Orden | Título | Tipo | URL | Recurso | ID del elemento |
| --- | --- | --- | --- | --- | --- |
| 1 | Hombre | COLLECTION | /collections/hombre | gid://shopify/Collection/507394752735 | gid://shopify/MenuItem/626502795487 |
| 2 | Mujer | COLLECTION | /collections/mujer | gid://shopify/Collection/507395604703 | gid://shopify/MenuItem/626502828255 |
| 3 | Nuevos | COLLECTION | /collections/disponible-para-envio-inmediato | gid://shopify/Collection/471731306719 | gid://shopify/MenuItem/626502861023 |
| 4 | Ofertas | COLLECTION | /collections/ofertas | gid://shopify/Collection/507396358367 | gid://shopify/MenuItem/626502893791 |
| 5 | Marcas | COLLECTIONS | /collections | — | gid://shopify/MenuItem/626503418079 |

## Motivo del cambio

- "Nuevos" apuntaba a "Disponible para envío inmediato" (119 productos), no a novedades; la colección "Nuevos" real tiene 5.
- "Marcas" apuntaba a la lista genérica de colecciones, que incluye colecciones vacías.
- El menú no llevaba al diferenciador (SoftFoam con 32 modelos con stock, Cloudfoam, Comfort Finder) ni a las guías, por donde entra el 90% del tráfico orgánico.

## Aplicado (verificado en la portada publicada)

| Menú | Enlace | Submenú |
| --- | --- | --- |
| Hombre | /collections/hombre | — |
| Mujer | /collections/mujer | — |
| Comodidad | /pages/tecnologias-de-tenis | Tenis PUMA con SoftFoam · Tenis adidas con Cloudfoam · Tecnologías de tenis |
| Marcas | /collections | PUMA · adidas · Converse · Nike |
| Ofertas | /collections/ofertas | — |
| Guías | /pages/guias | ¿Son originales? Revísalos · Guías de originalidad · Tecnologías de tenis · Guía de tallas · Cuidado de tenis |

Los 15 destinos responden 200. Hombre y Mujer quedan sin submenú porque Casual, Running y Gym no están separadas por género. No existe colección Reebok.

## Incidente corregido el mismo día

La primera versión enlazaba "Comodidad" y su submenú a `/collections/comfort-finder-tecnologias`, que devuelve **404**: la colección existe en el administrador pero no está publicada en la tienda online. Se corrigió en minutos apuntando "Comodidad" a `/pages/tecnologias-de-tenis`.

El artículo "Qué es una suela EVA" tenía esa misma colección en su metafield `custom.related_collection`; se reasignó a "Tenis PUMA con SoftFoam y SoftFoam+". Comfort Finder sigue sin publicar.

## Cómo revertir

Restaurar los 5 elementos del respaldo con `menuUpdate`, usando sus mismos ID.
