"""Compara el cuerpo publicado (en vivo) con <clave>.body-nuevo.html del lote 2.

Uso:  python3 scripts/verificar-lote2.py <clave> [<clave> ...]
Normaliza entidades, &nbsp; y espacios; muestra el primer punto donde difieren.
"""
import csv, html, re, sys, time, urllib.request
from pathlib import Path

DIR = Path('artifacts/interlinking-lote2-2026-11-24/articulos')
MARK = 'SL-PUENTE-LOTE2-20261125'
sys.path.insert(0, 'scripts')
RUTAS = {}
src = Path('scripts/insertar-frases-puente-lote2.py').read_text(encoding='utf-8')
for clave, ruta in re.findall(r"\('([a-z-]+)', '(/blogs/[^']+)'", src):
    RUTAS[clave] = ruta

def norm(b):
    b = html.unescape(b).replace(' ', ' ')
    b = re.sub(r'<meta charset="utf-8"\s*/?>', '', b)
    return ' '.join(b.split())

fallo = False
for clave in sys.argv[1:]:
    url = f'https://sportlandmx.com{RUTAS[clave]}?v={int(time.time())}'
    page = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
    i = page.find('<rte-formatter>', page.find('blog-post-content rte')) + len('<rte-formatter>')
    live = norm(page[i:page.find('</rte-formatter>', i)])
    esp = norm((DIR / f'{clave}.body-nuevo.html').read_text(encoding='utf-8'))
    ok = live == esp and MARK in live
    fallo |= not ok
    msg = 'IDÉNTICO' if ok else 'DIFIERE'
    if not ok:
        n = next((k for k, (a, b) in enumerate(zip(esp, live)) if a != b), min(len(esp), len(live)))
        msg += f' en car {n}\n  esperado: {esp[max(0,n-60):n+80]!r}\n  en vivo:  {live[max(0,n-60):n+80]!r}'
    print(f'{clave:20} marca={MARK in live}  {msg}')
sys.exit(1 if fallo else 0)
