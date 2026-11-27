"""Comprueba que el VideoObject de cada artículo con video lleve uploadDate con hora y zona horaria.

Uso:  python3 -I scripts/verificar-uploaddate.py [preview_theme_id]
Sin argumento revisa el sitio en vivo; con un id de tema revisa su vista previa.
"""
import csv, http.cookiejar, json, re, sys, time, urllib.request

tema = sys.argv[1] if len(sys.argv) > 1 else None
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
rows = [r for r in csv.DictReader(open('data/seo/videos-articulos-2026-11-24.csv', encoding='utf-8')) if r['articulo']]
ok, malos = 0, []
for r in rows:
    url = f"https://sportlandmx.com{r['articulo']}?v={int(time.time())}" + (f'&preview_theme_id={tema}' if tema else '')
    page = opener.open(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
    fechas = re.findall(r'"uploadDate"\s*:\s*"([^"]*)"', page)
    bloques = [b for b in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', page, re.S) if 'VideoObject' in b]
    try:
        validos = all(json.loads(b) is not None for b in bloques) and bool(bloques)
    except ValueError:
        validos = False
    bien = validos and fechas and all(re.fullmatch(r'\d{4}-\d\d-\d\dT12:00:00-06:00', f) for f in fechas)
    ok += bool(bien)
    if not bien:
        malos.append((r['articulo'], fechas, validos))
    time.sleep(0.3)
print(f'{ok} de {len(rows)} con uploadDate completo y JSON-LD válido')
for m in malos:
    print('  REVISAR', *m)
sys.exit(0 if not malos else 1)
