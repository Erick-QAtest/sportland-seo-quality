"""Lote 2 de frases puente (25-nov-2026): de páginas de tráfico a páginas de dinero.

Entrada:  artifacts/interlinking-lote2-2026-11-24/articulos/<clave>.body-antes.html
Salida:   artifacts/interlinking-lote2-2026-11-24/articulos/<clave>.body-nuevo.html
          data/seo/frases-puente-lote2-2026-11-25.csv (lo que verifica Playwright)

Cada frase va después del último párrafo de la sección cuyo encabezado
contiene `seccion` (no "antes del siguiente título": aquí muchas secciones
viven dentro de tarjetas). Falla si el encabezado no aparece
exactamente una vez o si la sección ya enlaza al destino.
Un ancla exacta por destino (si dos orígenes apuntan al mismo destino,
usan la misma ancla).
"""
import csv, html, re, sys
from pathlib import Path

DIR = Path('artifacts/interlinking-lote2-2026-11-24/articulos')
MARK = 'SL-PUENTE-LOTE2-20261125'

HM = '/blogs/noticias/cual-es-la-diferencia-entre-tenis-nike-hombre-y-mujer'
PIE = '/blogs/noticias/tenis-para-estar-de-pie-mucho-tiempo-top-5-2021'
SS = '/blogs/noticias/como-saber-si-mis-adidas-superstar-son-originales'
CF = '/blogs/noticias/los-mejores-tenis-para-crossfit-de-mujer-top-5-2023'

A_HM = 'convertir tu talla de mujer a hombre'
A_PIE = 'tenis para estar de pie todo el día'
A_SS = 'cómo saber si unos adidas Superstar son originales'
A_CF = 'mejores tenis para CrossFit de mujer'

# (clave, ruta de origen, texto del encabezado, destino, ancla, frase con {a})
PUENTES = [
    ('converse-etiqueta', '/blogs/originales-o-fake/eiqueta-de-converse-originales-revision-detallada',
     '2. Comprueba la talla y sus conversiones', HM, A_HM,
     'Los Chuck Taylor se venden en talla unisex de hombre: si eres mujer y quieres {a}, en Converse se resta 2 a tu talla US.'),
    ('converse-como', '/blogs/noticias/c-mo-saber-si-mis-converse-son-originales',
     '2. Revisa la etiqueta interior', HM, A_HM,
     'La etiqueta muestra la talla en numeración unisex; antes de comprar otro par, revisa cómo {a} para no equivocarte de número.'),
    ('softfoam', '/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma',
     '¿Sirven para caminar?', PIE, A_PIE,
     'Si además pasas muchas horas parado en el trabajo, compara opciones en nuestra guía de {a}, con video y 5 modelos.'),
    ('eva', '/blogs/noticias/que-es-una-suela-eva-y-cuales-son-sus-beneficios',
     '¿Vale la pena comprar tenis con espuma EVA?', PIE, A_PIE,
     'Si lo que buscas es comodidad para jornadas largas, revisa nuestra guía de {a}.'),
    ('cloudfoam', '/blogs/noticias/cloudfoam-adidas-que-es-y-cuales-son-sus-beneficios',
     '¿Cloudfoam es bueno para caminar?', PIE, A_PIE,
     'Si trabajas muchas horas parado, compara también nuestra guía de {a}.'),
    ('originales-general', '/blogs/noticias/como-saber-si-mis-tenis-son-originales',
     'Cómo revisar la autenticidad de unos Adidas', SS, A_SS,
     '¿Tienes unos Superstar? Revisa {a}: etiqueta y caja, texto dorado, puntera de concha y franjas, con video.'),
    ('superstar-concha', '/blogs/noticias/tenis-adidas-superstar-concha',
     '3. ¿Cómo Saber Si Mis Tenis Adidas Superstar Son Originales?', SS, A_SS,
     'Actualizamos esta revisión en una guía completa con video: {a}.'),
    ('pierna', '/blogs/noticias/los-5-mejores-tenis-para-hacer-pierna-y-porqu',
     'Tenis de training', CF, A_CF,
     'Si eres mujer y entrenas CrossFit, compara también los {a}.'),
]

HEAD = re.compile(r'<h([23])[^>]*>(.*?)</h\1>', re.S)
def norm(s):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', '', s)).split())

rows = []
for clave, origen, seccion, destino, ancla, frase in PUENTES:
    body = (DIR / f'{clave}.body-antes.html').read_text(encoding='utf-8')
    heads = [m for m in HEAD.finditer(body) if norm(m.group(2)) == norm(seccion) or seccion in norm(m.group(2))]
    if len(heads) != 1:
        sys.exit(f'ERROR {clave}: "{seccion}" aparece {len(heads)} veces')
    nxt = HEAD.search(body, heads[0].end())
    fin = nxt.start() if nxt else len(body)
    if f'href="{destino}"' in body[heads[0].end():fin]:
        sys.exit(f'ERROR {clave}: la sección ya enlaza a {destino}')
    # Va después del último párrafo de la sección: en estos artículos muchas
    # secciones viven dentro de tarjetas y el siguiente título puede estar
    # dentro de otra tarjeta (o después de un <style>).
    ultimo = body.rfind('</p>', heads[0].end(), fin)
    if ultimo < 0:
        sys.exit(f'ERROR {clave}: la sección "{seccion}" no tiene párrafos')
    pos = ultimo + len('</p>')
    p = (f'\n<!-- {MARK} -->\n<p class="sl-bridge-link">'
         f'{frase.format(a=f"<a href=\"{destino}\">{ancla}</a>")}</p>')
    nuevo = body[:pos] + p + body[pos:]
    (DIR / f'{clave}.body-nuevo.html').write_text(nuevo, encoding='utf-8')
    rows.append({'origen': origen, 'seccion': seccion, 'destino': destino, 'ancla': ancla})
    print(f'{clave:20} {len(body):>7} B -> {len(nuevo):>7} B  | antes de: {norm(nxt.group(2))[:45] if nxt else "(fin)"}')

with open('data/seo/frases-puente-lote2-2026-11-25.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['origen', 'seccion', 'destino', 'ancla'])
    w.writeheader(); w.writerows(rows)
print(f'{len(rows)} frases')
