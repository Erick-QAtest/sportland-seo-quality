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
import csv, sys
from collections import defaultdict
from pathlib import Path

GSC = Path(sys.argv[1])
SE_QUEDAN = {'NUCLEO_INVENTARIO', 'NUCLEO_AFILIADO', 'MEJORAR_O_FUSIONAR'}

# Reglas compartidas con scripts/intencion-sitio.py.
sys.path.insert(0, str(Path(__file__).parent))
from intencion_reglas import FORMATO, INTENCION, STOP, intencion, norm, tokens  # noqa: E402

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
