"""Arma mapa-interlinking.html: enlaces de los CSV de planes + nivel de data/seo/niveles-paginas-*.csv."""
import csv, json, re
from pathlib import Path

D = Path('artifacts/grafo-interlinking')
datos = json.loads((D / 'datos.json').read_text(encoding='utf-8'))
NIVELES = sorted(Path('data/seo').glob('niveles-paginas-*.csv'))[-1]
nivel = {r['path']: r for r in csv.DictReader(open(NIVELES, encoding='utf-8'))}
nodos = {e['s'] for e in datos['edges']} | {e['t'] for e in datos['edges']}
falta = nodos - set(nivel)
assert not falta, f'Páginas del grafo sin nivel: {falta}'
datos['nivel'] = {p: nivel[p] for p in nodos}
etiquetas = json.loads((D / 'etiquetas.json').read_text(encoding='utf-8'))
html = (D / 'plantilla.html').read_text(encoding='utf-8')
html = html.replace('__DATA__', json.dumps(datos, ensure_ascii=False)).replace('__LABELS__', json.dumps(etiquetas, ensure_ascii=False))
(D / 'mapa-interlinking.html').write_text(html, encoding='utf-8')
print('Nivel desde', NIVELES, '·', len(nodos), 'páginas')
