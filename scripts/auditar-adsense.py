"""Busca código de AdSense en todas las URLs del sitio, en los tres idiomas.

Uso:  python3 -I scripts/auditar-adsense.py [salida.csv]

Por qué tres idiomas: el código de AdSense quedó pegado en traducciones
viejas (de/en) de los artículos. La versión en español está limpia, pero
/de-de/ y /en-us/ sirven el HTML traducido. Desde México esas rutas
redirigen por país, así que se piden como Googlebot (que no se redirige):
es justo lo que Google ve.
"""
import csv, re, sys, time, urllib.error, urllib.request

BASE = 'https://sportlandmx.com'
UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
SALIDA = sys.argv[1] if len(sys.argv) > 1 else 'data/seo/adsense-2026-11-27.csv'
ADS = re.compile(r'adsbygoogle|googlesyndication|ca-pub-\d+', re.I)


def leer(url):
    for n in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code == 429 and n < 4:
                time.sleep(15 * (n + 1))  # Shopify frena: esperar y reintentar
                continue
            return e.code, ''
    return 429, ''


indice = leer(f'{BASE}/sitemap.xml')[1]
paths = set()
for sm in re.findall(r'<loc>([^<]+)</loc>', indice):
    sm = sm.replace('&amp;', '&')
    if '/en-us/' in sm or '/de-de/' in sm or 'agentic' in sm:
        continue
    for u in re.findall(r'<loc>([^<]+)</loc>', leer(sm)[1]):
        paths.add(re.sub(r'^https?://[^/]+', '', u) or '/')
    time.sleep(1)

filas = []
for i, p in enumerate(sorted(paths)):
    for prefijo in ('', '/de-de', '/en-us'):
        status, html = leer(BASE + prefijo + p)
        hallazgos = ADS.findall(html)
        filas.append({'path': p, 'version': prefijo or '/', 'status': status,
                      'adsense': len(hallazgos),
                      'cliente': ','.join(sorted(set(re.findall(r'ca-pub-\d+', html)))),
                      'slots': ','.join(sorted(set(re.findall(r'data-ad-slot="(\d+)"', html))))})
        time.sleep(1.1)
    if i % 50 == 0:
        print(i, '/', len(paths), flush=True)

with open(SALIDA, 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(filas[0]))
    w.writeheader()
    w.writerows(filas)

con = [f for f in filas if f['adsense']]
print(SALIDA, len(filas), 'URLs revisadas;', len(con), 'con AdSense')
print('sin leer (no 200):', sum(1 for f in filas if f['status'] != 200))
