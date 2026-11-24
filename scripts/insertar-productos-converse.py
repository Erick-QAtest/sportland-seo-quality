"""Cambia el CTA genérico de los artículos de Converse por productos Converse en stock.

Entrada:  artifacts/backup-articulos-2026-11-24/<handle>.body-nuevo.html   (lo publicado hoy)
Salida:   artifacts/backup-articulos-2026-11-24/<handle>.body-productos.html
          data/seo/productos-en-articulos-2026-11-24.csv  (lo que verifica Playwright)

Por qué: quien revisa si sus Converse son originales está a un paso de
comprar unos. El CTA anterior mandaba a una colección general; ahora
muestra Converse originales en stock (venta propia, sin afiliado).

El script falla si no encuentra exactamente una sección <section class="...__store">.
"""
import csv, re, sys
from pathlib import Path

DIR = Path('artifacts/backup-articulos-2026-11-24')
MARK = 'SL-PRODUCTOS-CONVERSE-20261124'
CDN = 'https://cdn.shopify.com/s/files/1/0264/1562/8342/files/'

# Converse activos con stock al 24-nov-2026 (Admin API). Run Star Hike quedó
# fuera: 1 sola pieza, se agotaría y dejaría un enlace a producto agotado.
PRODUCTOS = [
    ('tenis-converse-all-star-ox-black', 'Converse All Star Ox Black',
     'chuck-taylor-all-star-choclo-lona-unisex-negro-m9166c-1_y4xuivi1qm5g5zjk_c530900c-5ece-4ba1-b241-1d6a4606a1da.jpg?v=1790367506'),
    ('tenis-converse-all-star-ox-navy', 'Converse All Star Ox Navy',
     'chuck-taylor-all-star-choclo-lona-unisex-azul-m9697c-1_grzdntqddklcswd9.jpg?v=1790367633'),
    ('tenis-converse-all-star-hi-navy', 'Converse All Star Hi Navy',
     'chuck-taylor-core-bota-lona-unisex-azul-m9622c-1_vrua5lnumejjj7gm.jpg?v=1790367440'),
    ('tenis-converse-all-star-hi-red', 'Converse All Star Hi Red',
     'chuck-taylor-core-bota-lona-unisex-rojo-m9621c-1_8v9ruw1ok3e1ocww.webp?v=1790367555'),
]

# (handle del artículo, prefijo de clase del tema, texto de entrada)
ARTICULOS = [
    ('eiqueta-de-converse-originales-revision-detallada', 'sl-clabel',
     'Si después de revisar la etiqueta prefieres no arriesgarte, estos Converse originales '
     'están disponibles en Sportland, con vendedor identificable y comprobante de compra.'),
    ('el-codigo-qr-de-tus-converse-te-dirigen-a-vmdmx-revisa-esto', 'sl-vmdmx',
     'Un QR no prueba que un par sea original; comprar en una tienda identificable sí reduce el riesgo. '
     'Estos Converse originales están disponibles en Sportland.'),
    ('c-mo-saber-si-mis-converse-son-originales', 'sl-converse-auth',
     'La forma más simple de no tener dudas es comprar en una tienda identificable. '
     'Estos Converse originales están disponibles en Sportland.'),
]

STYLE = """<style>
.sl-stock-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}
@media(min-width:750px){.sl-stock-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.sl-stock-card{display:block;text-decoration:none;color:inherit;border:1px solid rgba(0,0,0,.12);border-radius:8px;padding:8px;text-align:center}
.sl-stock-card img{width:100%;height:auto;aspect-ratio:1/1;object-fit:contain;margin:0 0 6px}
.sl-stock-card span{display:block;font-size:14px;line-height:1.3}
</style>"""

def seccion(prefijo, intro):
    cards = '\n'.join(
        f'    <a class="sl-stock-card" href="/products/{h}">\n'
        f'      <img src="{CDN}{img}&amp;width=360" alt="Tenis {name} originales" width="360" height="360" loading="lazy">\n'
        f'      <span>{name}</span>\n    </a>'
        for h, name, img in PRODUCTOS)
    return f"""<!-- {MARK} -->
  <section class="{prefijo}__store sl-stock-products">

    <span class="{prefijo}__eyebrow">
      SPORTLAND MX
    </span>

    <h2>
      ¿Prefieres ir a la segura? Converse originales disponibles
    </h2>

    <p>
      {intro}
    </p>

    <div class="sl-stock-grid">
{cards}
    </div>

    <a href="/collections/converse" class="{prefijo}__button">
      Ver todos los Converse
      <span aria-hidden="true">→</span>
    </a>

  </section>
{STYLE}"""

rows = []
for handle, prefijo, intro in ARTICULOS:
    body = (DIR / f'{handle}.body-nuevo.html').read_text(encoding='utf-8')
    if MARK in body:
        sys.exit(f'ERROR {handle}: ya tiene el bloque de productos')
    rx = re.compile(rf'<section class="{re.escape(prefijo)}__store">.*?</section>', re.S)
    found = rx.findall(body)
    if len(found) != 1:
        sys.exit(f'ERROR {handle}: la sección {prefijo}__store aparece {len(found)} veces')
    nuevo = rx.sub(lambda _: seccion(prefijo, intro), body)
    (DIR / f'{handle}.body-productos.html').write_text(nuevo, encoding='utf-8')
    blog = 'noticias' if handle.startswith('c-mo') else 'originales-o-fake'
    for h, name, _ in PRODUCTOS:
        rows.append({'origen': f'/blogs/{blog}/{handle}', 'destino': f'/products/{h}', 'texto': name})
    rows.append({'origen': f'/blogs/{blog}/{handle}', 'destino': '/collections/converse',
                 'texto': 'Ver todos los Converse'})

with open('data/seo/productos-en-articulos-2026-11-24.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['origen', 'destino', 'texto'])
    w.writeheader(); w.writerows(rows)
print(f'{len(ARTICULOS)} artículos; {len(rows)} enlaces a verificar')
