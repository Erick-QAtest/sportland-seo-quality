"""Compara el cuerpo publicado de un artículo con el cuerpo nuevo que pegaste.

Uso:  python3 scripts/verificar-cuerpo.py <handle> [sufijo]
      sufijo: body-nuevo (por defecto, frases puente) o body-productos

Detecta lo que el editor de Shopify podría alterar al pegar:
scripts o estilos eliminados, enlaces perdidos o texto cambiado.
"""
import csv, re, sys, time, urllib.request
from pathlib import Path

DIR = Path('artifacts/backup-articulos-2026-11-24')
handle = sys.argv[1]
origen = next(r['origen'] for r in csv.DictReader(open('data/seo/frases-puente-lote1-2026-11-24.csv', encoding='utf-8'))
              if r['origen'].endswith('/' + handle))

req = urllib.request.Request(f'https://sportlandmx.com{origen}?v={int(time.time())}', headers={'User-Agent': 'Mozilla/5.0'})
page = urllib.request.urlopen(req).read().decode('utf-8')
i = page.find('<rte-formatter>', page.find('blog-post-content rte')) + len('<rte-formatter>')
live = page[i:page.find('</rte-formatter>', i)]
sufijo = sys.argv[2] if len(sys.argv) > 2 else 'body-nuevo'
esperado = (DIR / f'{handle}.{sufijo}.html').read_text(encoding='utf-8')

def resumen(b):
    return {
        'frases puente': b.count('SL-PUENTE-LOTE1-20261124'),
        'bloque productos': b.count('SL-PRODUCTOS-CONVERSE-20261124'),
        '<script>': len(re.findall(r'<script', b)),
        '<style>': len(re.findall(r'<style', b)),
        'enlaces': len(re.findall(r'<a\s', b)),
        'texto (caracteres)': len(' '.join(re.sub(r'<[^>]+>', ' ', re.sub(r'<(script|style).*?</\1>', '', b, flags=re.S)).split())),
    }

ok = True
print(f'{"":20} {"esperado":>10} {"publicado":>10}')
for (k, e), (_, l) in zip(resumen(esperado).items(), resumen(live).items()):
    marca = 'OK' if e == l else '<-- REVISAR'
    ok &= e == l
    print(f'{k:20} {e:>10} {l:>10}  {marca}')

idéntico = ' '.join(esperado.split()) == ' '.join(live.split())
print('\nHTML idéntico (ignorando espacios):', 'SÍ' if idéntico else 'NO')
print('RESULTADO:', 'CORRECTO' if ok else 'NO COINCIDE: no sigas con el siguiente artículo')
sys.exit(0 if ok else 1)
