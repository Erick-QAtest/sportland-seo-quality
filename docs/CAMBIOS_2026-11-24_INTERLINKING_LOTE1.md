# SPORTLAND — Interlinking lote 1 (Originalidad) y reescritura de Jordan 11 (24-nov-2026)

## 1. Jordan 11 reescrito — APLICADO en Shopify

Artículo `gid://shopify/Article/593044865247`, URL sin cambios:
`/blogs/noticias/como-saber-si-mis-jordan-retro-11-son-originales-te-damos-la-solucion`

| Campo | Antes | Después |
| --- | --- | --- |
| Título (H1) | ¿Cómo saber si mis jordan retro 11 son originales? Te damos la solución | Cómo saber si unos Jordan 11 son originales: guía paso a paso |
| SEO title | ¿Cómo saber si mis jordan retro 11 son originales? Solución a un Click | Cómo saber si unos Jordan 11 son originales: guía completa |
| Meta description | (vacía) | Revisa si tus Jordan 11 son originales: Style Code por talla, etiqueta y caja, charol, placa de fibra de carbono, suela y talón. Mitos y preguntas frecuentes. |
| Cuerpo | 5 pasos genéricos, errores de traducción ("la Q debe comenzar con la palabra hacer"), 5 capturas tomadas de otros sitios | 10 pasos específicos del AJ11, mitos, FAQ |

**Por qué el contenido anterior no podía rankear:** su similitud con cualquier otra guía era 0.14–0.17. No hablaba de lo que hace único al AJ11 (charol, placa de fibra de carbono, suela translúcida, códigos por categoría de talla). Por eso ningún artículo podía enlazarlo de forma natural.

**Lo que aporta la versión nueva:**
- La comprobación Style Code ↔ categoría de talla (378037 adulto, 378038 GS, 378039 PS, 378040 TD, verificada con el Concord 2018 378037-100). Es la señal más objetiva que puede revisar un comprador.
- Desmiente falsas alarmas (suela amarilla, charol arrugado, "Made in China"). Encaja con la postura de las guías hermanas: ningún punto aislado autentica un par.
- Se conservan el enlace de afiliado (ahora `rel="sponsored nofollow"`), el script de eventos de afiliado y el enlace a Jordan 4.
- Se quitaron las 5 capturas de terceros (riesgo de derechos de autor). **Pendiente:** fotos propias de etiqueta, placa y talón.

Respaldo: `artifacts/backup-articulos-2026-11-24/jordan-11-body-antes.html` y `jordan-11-metadatos-antes.json`.

**Medición:** el Jordan 11 cambió de contenido y de enlaces a la vez, así que **se mide aparte** y no cuenta en la comparación tratamiento/control.

## 2. Frases puente del lote 1 — APLICADO (10 artículos, 24-nov-2026)

Pegadas a mano en el editor HTML de Shopify y verificadas una por una con `scripts/verificar-cuerpo.py`. En los 10 artículos el HTML publicado es idéntico al generado: el editor no alteró `<script>` ni `<style>`.

Son 22 frases, cada una al final de la sección que habla del mismo tema (etiqueta → etiqueta, país → país, QR → QR). Todas van marcadas con `<!-- SL-PUENTE-LOTE1-20261124 -->` y la clase `sl-bridge-link`.

Los cuerpos completos ya modificados están en `artifacts/backup-articulos-2026-11-24/<handle>.body-nuevo.html`, generados con `scripts/insertar-frases-puente.py`. El script falla si no encuentra la sección exacta o si esa sección ya enlaza al destino.

### Cómo pegarlo (por artículo, ~1 min)

1. Copia el cuerpo nuevo al portapapeles:
   `pbcopy < artifacts/backup-articulos-2026-11-24/<handle>.body-nuevo.html`
2. Shopify → Contenido → Entradas de blog → abre el artículo.
3. En el editor de contenido pulsa **`<>` (Mostrar HTML)**, selecciona todo y pega.
4. Guarda.

| # | Artículo (handle) | Frases |
| --- | --- | --- |
| 1 | el-codigo-qr-de-tus-converse-te-dirigen-a-vmdmx-revisa-esto | 2 |
| 2 | etiqueta-de-los-jordan-1-originales-compara-su-autenticidad | 2 |
| 3 | como-saber-si-mis-jordan-retro-4-son-originales | 3 |
| 4 | como-saber-si-mis-ultraboost-son-originales | 2 |
| 5 | como-saber-si-mis-air-force-1-son-originales | 3 |
| 6 | suela-de-converse-que-las-hace-suela-tan-especiales | 1 |
| 7 | c-mo-saber-si-mis-converse-son-originales | 2 |
| 8 | eiqueta-de-converse-originales-revision-detallada | 3 |
| 9 | como-saber-si-mis-tenis-son-originales | 2 |
| 10 | donde-se-fabrican-los-tenis-fila-originales | 2 |

**Importante:** los cuerpos se generaron con el contenido publicado el 24-nov. Si alguien edita uno de estos artículos antes de pegarlo, hay que regenerar ese cuerpo con el script.

## 3. Verificación automática

`tests/flows/bridge-links.flow.spec.ts` (proyecto `critical-flows`, corre a diario en CI) lee `data/seo/frases-puente-lote1-2026-11-24.csv` y comprueba que cada uno de los 23 enlaces exista **dentro del cuerpo** del artículo, con su ancla exacta.

Estado al 24-nov, después de pegar: **12/12 en verde**. Están los 23 enlaces en los 11 artículos de origen, y los 7 destinos responden 200 sin redirección.

## 4. Cómo revertir

- Jordan 11: `articleUpdate` con `jordan-11-body-antes.html` y los valores de `jordan-11-metadatos-antes.json`.
- Frases puente: pegar `<handle>.body-antes.html`, o borrar los párrafos marcados con `SL-PUENTE-LOTE1-20261124`.

## 5. Medición

- Tratamiento: los 7 destinos de Originalidad, **excepto Jordan 11**, que cambió de contenido.
- Control: Tecnología, sin tocar hasta el 24-dic-2026.
- Fecha de aplicación: 24-nov-2026. Fecha de medición: **24-dic-2026**.
