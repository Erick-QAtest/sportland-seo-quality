"""Clasifica la intención de búsqueda de los artículos que se quedan.

Uso:  python3 scripts/clasificar-intencion.py <carpeta-del-export-gsc>

Limitación del export de la interfaz de Search Console: Consultas.csv y
Páginas.csv vienen separados, así que NO se sabe qué consulta llevó a qué
página. Además, ~2/3 de los clics son consultas anonimizadas.

Método:
  1. Cada consulta recibe una intención (reglas sobre el texto).
  2. Cada consulta se asigna al artículo con el que comparte más palabras
     clave del slug (mínimo 2 palabras, o 1 si es muy distintiva).
     Consultas de 1-3 palabras sin verbo ("cloudfoam", "puma soft foam")
     quedan como entidad_ambigua: la intención la decide la SERP, no el texto.
  3. Intención del artículo = la que suma más impresiones en sus consultas
     (fuente: GSC). Sin consultas asignadas, se infiere del formato del
     artículo (fuente: FORMATO, es una hipótesis, no un dato).

Salidas:
  data/seo/intencion-consultas-2026-11-24.csv
  data/seo/intencion-articulos-2026-11-24.csv
"""
import csv, re, sys, unicodedata
from collections import defaultdict
from pathlib import Path

GSC = Path(sys.argv[1])
SE_QUEDAN = {'NUCLEO_INVENTARIO', 'NUCLEO_AFILIADO', 'MEJORAR_O_FUSIONAR'}

def norm(s):
    s = unicodedata.normalize('NFKD', s.lower())
    return ''.join(c for c in s if not unicodedata.combining(c))

# Gana la primera regla que coincide.
INTENCION = [
    ('navegacional', r'\bsportland\b'),
    ('verificacion', r'original|fake|replica|real\b|autentic|etiqueta|\bqr\b|vmdmx|piratas?|clon|echt'
                     r'|اصلي|ของแท้|оригинал|орг\b'),
    ('transaccional', r'plantilla|insole|inner ?sole|einlegesohle|sohle|talpbet|comprar|precio|kaufen'
                      r'|barat|oferta|venta|donde comprar'),
    ('investigacion_comercial', r'^tenis (para|que)|^zapatos que|^mejores? '),
    ('informativa', r'diferencia entre|que diferencia|que es|que significa|significado|bedeutung|para que sirve|como funciona|donde se fabric'
                    r'|de donde es|vulcaniz|que son|meaning|what is|como blanquear|como limpiar|que talla'),
    ('investigacion_comercial', r'review|resena|mejor|\bvs\b|versus|para (hacer|correr|gym|pierna|estar)'
                                r'|recomend|comparativ|opinion|top \d|good shoes|for lifting|powerlifting'),
    ('estilo', r'outfit|con tenis|combinar|parecen (zapatos|calcetines)|camisa|vestir|look'),
]

# Intención inferida del formato del artículo (cuando no hay consultas).
FORMATO = [
    ('verificacion', r'son-originales|originales|etiqueta|piratas|qr'),
    ('investigacion_comercial', r'top-?\d|mejores|resena|review|-vs-|opiniones|diferencia'),
    ('estilo', r'outfit|combinar|parecen|athleisure'),
    ('informativa', r'que-es|que-son|para-que-sirve|como-|donde-se-fabrican|materiales|tecnologia|beneficios'),
    ('noticia_tendencia', r'colabora|bad-bunny|billie|simpson|minecraft|rick-and-morty|lanzar|disena|raras|caros|peores'),
]

STOP = set('de la el los las un una unos unas y o en con para por que es son mis tus mi tu su sus si como saber '
           'lo al del se te a todo debes tenis top cual cuales mas 2021 2022 2023 the and for of to blogs '
           'noticias resenas adidas_blog originales-o-fake athleisure'.split())

def tokens(s):
    return {t for t in re.split(r'[^a-z0-9]+', norm(s)) if len(t) > 2 and t not in STOP}

def intencion(texto, reglas):
    n = norm(texto)
    return next((i for i, rx in reglas if re.search(rx, n)), None)

# --- artículos que se quedan
articulos = []
with open('data/seo/clasificacion-articulos-2026-11-23.csv', encoding='utf-8-sig') as f:
    for a in csv.DictReader(f):
        if a['resolucion'] in SE_QUEDAN:
            a['_tok'] = tokens(a['path'].rsplit('/', 1)[1])
            articulos.append(a)

# frecuencia de cada token entre artículos: los raros son más distintivos
df = defaultdict(int)
for a in articulos:
    for t in a['_tok']:
        df[t] += 1

def mejor_articulo(q):
    qt = tokens(q)
    best, best_score = None, 0.0
    for a in articulos:
        comunes = qt & a['_tok']
        if not comunes:
            continue
        score = sum(1 / df[t] for t in comunes)
        # Siempre exige una palabra distintiva (≤2 artículos la usan):
        # "nike" o "air" solas no bastan para atribuir una consulta.
        if any(df[t] <= 2 for t in comunes) and score > best_score:
            best, best_score = a, score
    return best

# --- consultas
consultas = []
with open(GSC / 'Consultas.csv', encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        q = r['Consultas principales']
        art = mejor_articulo(q)
        consultas.append({'consulta': q,
                          'intencion': intencion(q, INTENCION) or 'entidad_ambigua',
                          'articulo_probable': art['path'] if art else '',
                          'clics': int(r['Clics']), 'impresiones': int(r['Impresiones']),
                          'posicion': r['Posición']})

with open('data/seo/intencion-consultas-2026-11-24.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(consultas[0]))
    w.writeheader(); w.writerows(consultas)

# --- intención por artículo
por_art = defaultdict(lambda: defaultdict(int))
top_q = defaultdict(list)
for c in consultas:
    if c['articulo_probable']:
        por_art[c['articulo_probable']][c['intencion']] += c['impresiones']
        top_q[c['articulo_probable']].append(c)

out = []
for a in articulos:
    m = por_art.get(a['path'])
    if m:
        total = sum(m.values())
        orden = sorted(m.items(), key=lambda kv: -kv[1])
        dom, fuente = orden[0][0], 'GSC'
        mezcla = '; '.join(f'{i} {v / total:.0%}' for i, v in orden[:3])
        qs = sorted(top_q[a['path']], key=lambda c: -c['impresiones'])[:3]
        ejemplos = ' | '.join(c['consulta'] for c in qs)
    else:
        dom = intencion(a['path'], FORMATO) or 'informativa'
        fuente, mezcla, ejemplos = 'FORMATO (hipótesis)', '', ''
    out.append({'path': a['path'], 'resolucion': a['resolucion'],
                'intencion_dominante': dom, 'fuente': fuente, 'mezcla': mezcla,
                'consultas_ejemplo': ejemplos, 'clics_3m': a['clics_3m'],
                'inventario': a['inventario'], 'afiliados_amazon': a['afiliados_amazon']})

with open('data/seo/intencion-articulos-2026-11-24.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0]))
    w.writeheader(); w.writerows(out)

# --- reporte
tot = defaultdict(lambda: [0, 0])
for c in consultas:
    tot[c['intencion']][0] += c['clics']; tot[c['intencion']][1] += c['impresiones']
print('CONSULTAS por intención              clics  impresiones')
for i, (cl, im) in sorted(tot.items(), key=lambda kv: -kv[1][0]):
    print(f'  {i:32} {cl:6} {im:11}')
asignadas = sum(c['clics'] for c in consultas if c['articulo_probable'])
print(f'  clics de consultas asignadas a un artículo: {asignadas}')

agg = defaultdict(lambda: [0, 0, 0, 0])
for o in out:
    g = agg[o['intencion_dominante']]
    g[0] += 1; g[1] += int(o['clics_3m'] or 0)
    g[2] += o['inventario'] != 'SIN_INVENTARIO'; g[3] += int(o['afiliados_amazon'] or 0) > 0
print('\nARTÍCULOS que se quedan por intención   arts  clics  con_inv  con_afil')
for i, (n, cl, inv, af) in sorted(agg.items(), key=lambda kv: -kv[1][1]):
    print(f'  {i:36} {n:4} {cl:6} {inv:8} {af:9}')
print(f'\n{len(out)} artículos; fuente GSC: {sum(o["fuente"] == "GSC" for o in out)}; '
      f'hipótesis por formato: {sum(o["fuente"] != "GSC" for o in out)}')
