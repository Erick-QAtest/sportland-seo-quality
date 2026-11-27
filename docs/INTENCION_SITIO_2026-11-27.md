# SPORTLAND — Intención de búsqueda de todo el sitio · 27-nov-2026

Datos: `data/seo/intencion-sitio-2026-11-27.csv`, generado por `scripts/intencion-sitio.py`.
Clics: export global de GSC del 24-nov (últimos 3 meses).

## Universo

El sitemap tiene **573 URLs únicas**. Cada una se repite en `/en-us/` y `/de-de/`, así que hay **1,719 URLs públicas**. Las variantes usan el mismo handle y el mismo contenido, así que no se clasifican aparte: sus clics se suman en `clics_variantes`.

| Tipo | URLs | Clics (3 meses) |
|---|---|---|
| Artículos | 283 | 2,425 (92%) |
| Productos | 208 | 79 |
| Inicio | 1 | 96 |
| Páginas | 41 | 24 |
| Colecciones | 17 | 11 |
| Índices de blog | 23 | 0 |

**El tráfico orgánico es el blog.** Las páginas de tienda (productos y colecciones) reciben el 3% de los clics. Por eso la estrategia es llevar a la gente de los artículos a los productos y a los afiliados.

## Cómo se decidió la intención

Para cada URL se usa el primer paso que aplica:

1. **Por tipo de página.** Producto y colección son transaccionales; un índice de blog es navegacional; las páginas fijas siguen la tabla `PAGINAS`.
2. **Artículos que ya están en `niveles-paginas-2026-11-27.csv`.** Se respeta la intención que tienen ahí.
3. **Consultas de GSC asignadas al artículo** por palabras del slug.
4. **Reglas sobre el título.** Primero las de consultas (`INTENCION`); luego `TITULO`, que reconoce noticias y títulos en inglés o alemán.
5. **Reglas sobre el slug** (`FORMATO`).
6. **Valor por defecto:** informativa, con confianza baja.

Las reglas compartidas están en `scripts/intencion_reglas.py`.

Resultado por confianza:

- **alta: 329**, casi todas decididas por el tipo de página;
- **media: 234**;
- **baja: 10**, que hay que revisar a mano.

La intención de casi todos los artículos sale del título. Eso es una hipótesis, no un dato.

## Resultado

| Intención | URLs | Clics + variantes | % de clics |
|---|---|---|---|
| verificación | 30 | 1,178 | 45% |
| informativa | 61 | 515 | 20% |
| transaccional | 241 | 489 | 19% |
| investigación comercial | 127 | 270 | 10% |
| navegacional | 31 | 99 | 4% |
| estilo | 11 | 68 | 3% |
| noticia | 53 | 14 | 1% |
| utilidad | 17 | 2 | 0% |
| fuera de tema | 2 | 0 | 0% |

Las 241 URLs transaccionales tienen el 19% de los clics, pero casi todos vienen de dos artículos de SoftFoam (el español y el alemán), no de las fichas de producto.

## Hallazgos

1. **30 páginas de verificación traen el 45% del tráfico.** Quien llega ya tiene el par, así que monetizan de forma secundaria. Es el activo más grande del sitio.
2. **99 de 208 productos (48%) no tienen stock.** Son páginas transaccionales que no pueden vender. Hay que decidir si quedan indexadas, si redirigen a la colección o si muestran alternativas.
3. **17 páginas de utilidad están en el sitemap:** mapas HTML de Avada, wishlist, páginas de «gracias por suscribirte» y bienvenida. No deberían indexarse. Limpiarlas es de bajo riesgo.
4. **2 artículos de apuestas online** (`el-auge-de-las-apuestas-deportivas-online` y `la-revolucion-de-las-apuestas-online-y-los-juegos-de-crash`). No tienen relación con tenis y dan una mala señal de calidad. Ya estaban en PODAR; conviene retirarlos primero.
5. **Las noticias no traen tráfico:** 53 artículos, 14 clics. Confirma que el plan de PODAR es correcto.
6. **Hay 119 artículos de investigación comercial, pero casi todos están en salida:**
   - 35 en PODAR, 42 por consolidar y 3 por retirar;
   - solo 12 son núcleo y 25 están por mejorar.
   - La mayoría casi no tiene clics, así que perderlos cuesta poco.
7. **Hay dos páginas extranjeras con tráfico real, las dos con la decisión pendiente** (`EXTRANJERO_DECIDIR`):
   - SoftFoam en alemán: 123 clics, transaccional («Einlegesohle»);
   - QR de Converse en inglés: 58 clics, verificación.

   Después de estas dos, ninguna página extranjera pasa de 14 clics.

## Cómo actualizarlo

```bash
python3 -I scripts/intencion-sitio.py <carpeta-del-export-gsc-global>
```

Si aparece una página fija nueva en `/pages/`, el script se detiene y pide decidir su intención en `PAGINAS`. No adivina.
