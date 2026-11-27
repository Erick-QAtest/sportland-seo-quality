"""Inserta las frases puente del lote 1 al final de una sección concreta de cada artículo.

Entrada:  artifacts/backup-articulos-2026-11-24/<handle>.body-antes.html
Salida:   artifacts/backup-articulos-2026-11-24/<handle>.body-nuevo.html
          data/seo/frases-puente-lote1-2026-11-24.csv  (lo que verifica Playwright)

Cada frase va al final de la sección cuyo encabezado contiene `seccion`,
justo antes del siguiente <h2>/<h3>. Si el encabezado no existe o aparece
más de una vez, el script falla: nunca inserta "a ciegas".
"""
import csv, html, re, sys
from pathlib import Path

DIR = Path('artifacts/backup-articulos-2026-11-24')
MARK = 'SL-PUENTE-LOTE1-20261124'

def a(href, text):
    return f'<a href="{href}">{text}</a>'

AF1 = '/blogs/noticias/como-saber-si-mis-air-force-1-son-originales'
CONV_ET = '/blogs/originales-o-fake/eiqueta-de-converse-originales-revision-detallada'
J4 = '/blogs/noticias/como-saber-si-mis-jordan-retro-4-son-originales'
J1_ET = '/blogs/originales-o-fake/etiqueta-de-los-jordan-1-originales-compara-su-autenticidad'
FILA = '/blogs/noticias/donde-se-fabrican-los-tenis-fila-originales'
J11 = '/blogs/noticias/como-saber-si-mis-jordan-retro-11-son-originales-te-damos-la-solucion'
QR = '/blogs/originales-o-fake/el-codigo-qr-de-tus-converse-te-dirigen-a-vmdmx-revisa-esto'

# (origen, texto del encabezado de la sección, destino, ancla, frase)
PUENTES = [
    ('/blogs/originales-o-fake/el-codigo-qr-de-tus-converse-te-dirigen-a-vmdmx-revisa-esto',
     '¿Qué debo revisar si el QR de mis Converse me genera dudas?', AF1, 'Nike Air Force 1 originales',
     'Este criterio no es exclusivo de Converse: en nuestra guía para revisar unos {a} verás que el código tampoco basta para autenticar un par de Nike.'),
    ('/blogs/originales-o-fake/el-codigo-qr-de-tus-converse-te-dirigen-a-vmdmx-revisa-esto',
     '¿Por qué un QR no demuestra por sí solo', J4, 'Jordan 4 son originales',
     'Pasa lo mismo con Jordan: al revisar si unos {a}, el QR o el UPC solo confirman que el código existe, no que el par sea auténtico.'),

    ('/blogs/originales-o-fake/etiqueta-de-los-jordan-1-originales-compara-su-autenticidad',
     '¿Qué es el SKU o Style Code de unos Jordan 1?', CONV_ET, 'etiqueta de Converse originales',
     'Otras marcas usan un formato distinto: si también tienes Converse, revisa cómo leer la {a}, donde el SKU y la PO DATE funcionan de otra manera.'),
    ('/blogs/originales-o-fake/etiqueta-de-los-jordan-1-originales-compara-su-autenticidad',
     '¿El país de fabricación de la etiqueta indica si son originales?', FILA, 'dónde se fabrican los tenis FILA originales',
     'Esto aplica a cualquier marca: en {a} explicamos por qué un mismo modelo puede producirse en varios países.'),

    (J4, '3. Revisa la etiqueta interior', CONV_ET, 'Etiqueta de Converse originales: cómo revisarla',
     'Cada marca organiza su etiqueta de forma distinta; si también tienes Converse, consulta nuestra guía {a}.'),
    (J4, '5. ¿Made in China significa que mis Jordan 4 son falsos?', FILA, 'dónde se fabrican los tenis FILA originales',
     'Lo mismo ocurre en otras marcas; por ejemplo, revisa {a} y por qué el país no autentica un par.'),
    (J4, '8. Conoce la arquitectura general del Air Jordan 4', J11, 'cómo saber si unos Jordan 11 son originales',
     'Cada silueta Jordan tiene puntos propios: si revisas otro modelo, consulta {a}, donde el charol y la placa de fibra de carbono son claves.'),

    ('/blogs/noticias/como-saber-si-mis-ultraboost-son-originales',
     '4. Revisa la etiqueta interior', CONV_ET, 'Etiqueta de Converse originales: cómo revisarla',
     'El formato de la etiqueta cambia entre marcas; si también tienes Converse, revisa {a}.'),
    ('/blogs/noticias/como-saber-si-mis-ultraboost-son-originales',
     '17. ¿El código QR confirma que son originales?', J4, 'Cómo saber si mis Jordan 4 son originales',
     'El mismo criterio aplica a Nike; lo explicamos en {a}.'),

    (AF1, 'Cómo revisar la etiqueta de unos Nike Air Force 1 originales', CONV_ET, 'Etiqueta de Converse originales: cómo revisarla',
     'Si también tienes Converse, su etiqueta tiene otro formato; revisa {a}.'),
    (AF1, '¿Buscar el SKU o código en Google sirve?', J1_ET, 'cómo saber si tus Jordan 1 son originales por su etiqueta',
     'Si también tienes Jordan, aquí explicamos {a}, campo por campo.'),
    (AF1, '¿El país de fabricación indica si los Air Force 1 son originales?', FILA, 'dónde se fabrican los tenis FILA originales',
     'Pasa lo mismo en otras marcas: lee {a}.'),

    ('/blogs/noticias/suela-de-converse-que-las-hace-suela-tan-especiales',
     'Si eres un fan de la marca Converse', CONV_ET, 'Etiqueta de Converse originales: cómo revisarla',
     'La suela es solo una parte de la revisión: si quieres confirmar que tus Converse son originales, consulta también {a}.'),

    ('/blogs/noticias/c-mo-saber-si-mis-converse-son-originales',
     '1. Identifica el modelo y el SKU de tus Converse', J4, 'cómo saber si unas Jordan 4 son originales',
     'Si también tienes Jordan, el código se llama Style Code y se revisa distinto; mira {a}.'),
    ('/blogs/noticias/c-mo-saber-si-mis-converse-son-originales',
     '2. Revisa la etiqueta interior', J1_ET, 'Etiqueta de Jordan 1 originales: cómo revisarla',
     'Para comparar con el formato de Nike, revisa {a}.'),

    (CONV_ET, '1. Revisa el SKU de tus Converse', J1_ET, 'Etiqueta de Jordan 1 originales: cómo revisarla',
     'Nike usa otro formato, el Style Code; puedes compararlo en {a}.'),
    (CONV_ET, '8. Identifica los elementos principales de la etiqueta', FILA, 'de dónde es la marca FILA',
     'El país de la etiqueta tampoco indica el origen de la marca: muchos se preguntan {a}, que hoy fabrica en varios países.'),
    (CONV_ET, '13. La etiqueta no sustituye revisar el tenis completo', J4, 'Jordan 4 son originales',
     'Esto aplica a cualquier modelo: para saber si unos {a} también se revisan puntera, talón y materiales.'),

    ('/blogs/noticias/como-saber-si-mis-tenis-son-originales',
     '3. Revisa la etiqueta interior', J1_ET, 'Etiqueta de Jordan 1 originales: cómo revisarla',
     'Si tienes Jordan, consulta {a} para ver cada campo explicado.'),
    ('/blogs/noticias/como-saber-si-mis-tenis-son-originales',
     '4. ¿El país de fabricación indica si unos tenis son originales?', FILA, 'dónde se fabrican los tenis FILA originales',
     'Por ejemplo, en {a} explicamos por qué una misma marca produce en varios países.'),

    (FILA, '¿El país de fabricación sirve para saber si unos FILA son originales?', J4, 'Cómo saber si mis Jordan 4 son originales',
     'Pasa lo mismo con Nike: en {a} explicamos por qué "Made in China" no significa que un par sea falso.'),
    (FILA, 'El país no autentica unos tenis', QR, 'Converse QR code',
     'Tampoco lo hace un código: por ejemplo, el {a} puede llevarte a VMDMX y eso no prueba nada por sí solo.'),
]

HEAD = re.compile(r'<h([23])[^>]*>(.*?)</h\1>', re.S)
def norm(s):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', '', s)).split())

bodies, rows = {}, []
for origen, seccion, destino, ancla, frase in PUENTES:
    h = origen.rsplit('/', 1)[1]
    body = bodies.get(h) or (DIR / f'{h}.body-antes.html').read_text(encoding='utf-8')
    heads = [m for m in HEAD.finditer(body) if seccion in norm(m.group(2))]
    if len(heads) != 1:
        sys.exit(f'ERROR {h}: "{seccion}" aparece {len(heads)} veces')
    nxt = HEAD.search(body, heads[0].end())
    pos = nxt.start() if nxt else len(body)
    if f'href="{destino}"' in body[heads[0].end():pos]:
        sys.exit(f'ERROR {h}: la sección ya enlaza a {destino}')
    p = f'<!-- {MARK} -->\n<p class="sl-bridge-link">{frase.format(a=a(destino, ancla))}</p>\n'
    bodies[h] = body[:pos] + p + body[pos:]
    rows.append({'origen': origen, 'seccion': seccion, 'destino': destino, 'ancla': ancla})

# El enlace del Jordan 11 hacia la etiqueta de Jordan 1 va dentro del artículo reescrito.
rows.append({'origen': J11, 'seccion': '3. Haz coincidir la etiqueta interior con la caja',
             'destino': J1_ET, 'ancla': 'etiqueta de Jordan 1 originales: cómo revisarla'})

for h, b in bodies.items():
    (DIR / f'{h}.body-nuevo.html').write_text(b, encoding='utf-8')
with open('data/seo/frases-puente-lote1-2026-11-24.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['origen', 'seccion', 'destino', 'ancla'])
    w.writeheader(); w.writerows(rows)
print(f'{len(PUENTES)} frases en {len(bodies)} artículos; {len(rows)} enlaces a verificar')
