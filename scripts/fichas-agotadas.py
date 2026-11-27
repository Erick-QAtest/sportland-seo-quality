"""Clasifica las fichas de producto agotadas y propone qué hacer con cada una.

Uso:  python3 -I scripts/fichas-agotadas.py
Entrada: data/seo/intencion-sitio-2026-11-27.csv (fichas «SIN stock» y clics GSC)
Salida:  data/seo/fichas-agotadas-2026-11-27.csv

Contexto: desde el 27-nov el tema ya no muestra agotados en ningún listado,
así que estas fichas quedaron sin enlaces internos (huérfanas) pero siguen
indexadas. Hay que decidir su destino.

REGLA
  ventas en los últimos 12 meses > 0  -> REPONER: es catálogo vigente que se
      acabó. Se queda publicada; la ficha ofrece alternativas con stock.
  sin ventas en 12 meses              -> DESCONTINUADO: archivar en Shopify y
      301 a la colección de su marca (Shopify solo redirige si la URL da 404,
      por eso primero se archiva).

Ventas: ShopifyQL, FROM sales SHOW net_items_sold GROUP BY product_title,
SINCE -365d, consultado el 27-nov-2026. Se agrupan por TÍTULO, así que aquí
se fijan a mano por handle (los títulos repetidos se revisaron uno a uno).
"""
import csv
from pathlib import Path

ENTRADA = Path('data/seo/intencion-sitio-2026-11-27.csv')
SALIDA = Path('data/seo/fichas-agotadas-2026-11-27.csv')

VENTAS_12M = {
    'copia-de-tenis-puma-retaliate-para-dama': 18,
    'tenis-reebok-flexagon-force-6': 13,
    'tenis-puma-tazon-7-evo': 12,
    'tenis-under-armour-bgs-assert-10': 12,
    'tenis-puma-court-classic-vulc-fs': 12,
    'tenis-puma-electron-2-0': 12,
    'tenis-puma-pacer': 7,
    'tenis-puma-suede-classic': 6,
    'tenis-adidas-own-the-game-2-0': 6,
    'tenis-puma-amare-fresh': 6,
    'tenis-puma-disperse-xt2': 6,
    'tenis-puma-electron-e': 6,
    'tenis-puma-rebound-future-nextgen': 6,
    'tenis-puma-easy-rider-gentle': 6,
    'tenis-puma-st-miler-rise': 6,
    'tenis-fila-disruptor-ii': 3,
    'tenis-reebok-club-c-85': 2,
    'pants-reebok-el-3-4-wvn': 2,
    'glide-ripple-clip': 2,
    'adidas-znsored-hi-prem-lea': 2,
    'tenis-puma-provoke-xt-blanco-para-mujer': 2,
    'tenis-nike-sb-alleyoop': 1,
    'reebok-zig-dynamica-4': 1,
    'tenis-converse-chuck-70-de-luxe-heel-hi': 1,
    'tenis-adidas-lite-racer-negro-para-hombre': 1,
}

# Colección de destino por marca (todas existen y responden 200).
MARCA = [('puma', '/collections/puma'), ('nike', '/collections/nike'), ('jordan', '/collections/nike'),
         ('adidas', '/collections/adidas'), ('converse', '/collections/converse')]


def destino(handle):
    for clave, col in MARCA:
        if clave in handle:
            return col
    return '/collections/ofertas'  # Reebok, DC, Vans, Nautica, Pirma, accesorios: sin colección de marca


filas = []
for r in csv.DictReader(open(ENTRADA, encoding='utf-8')):
    if r['tipo'] != 'producto' or 'SIN stock' not in r['motivo']:
        continue
    handle = r['path'].rsplit('/', 1)[1]
    ventas = VENTAS_12M.get(handle, 0)
    clics = int(r['clics_3m']) + int(r['clics_variantes'])
    if ventas:
        grupo, accion, dest = 'REPONER', 'Mantener publicada; mostrar alternativas con stock en la ficha', ''
    else:
        grupo, accion, dest = 'DESCONTINUADO', 'Archivar y 301 a la colección de su marca', destino(handle)
    filas.append({'path': r['path'], 'grupo': grupo, 'ventas_12m': ventas, 'clics_3m': clics,
                  'accion': accion, 'destino_301': dest})

filas.sort(key=lambda f: (f['grupo'], -f['ventas_12m'], -f['clics_3m']))
with open(SALIDA, 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(filas[0]))
    w.writeheader()
    w.writerows(filas)

from collections import Counter
print(SALIDA, len(filas), 'fichas')
for g in ('REPONER', 'DESCONTINUADO'):
    sub = [f for f in filas if f['grupo'] == g]
    print(g, len(sub), 'fichas;', sum(f['clics_3m'] for f in sub), 'clics;', sum(f['ventas_12m'] for f in sub), 'ventas 12m;',
          sum(1 for f in sub if f['clics_3m']), 'con clics')
print('destinos', Counter(f['destino_301'] for f in filas if f['destino_301']))
assert set(VENTAS_12M) <= {f['path'].rsplit('/', 1)[1] for f in filas}, 'handle con ventas que no está agotado'
