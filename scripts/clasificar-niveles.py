"""Nivel de cada página para el interlinking: dinero, tráfico que monetiza o tráfico.

Uso:  python3 -I scripts/clasificar-niveles.py [--solo-sin-dato]
Salida: data/seo/niveles-paginas-2026-11-27.csv  (fuente única de verdad)

REGLA (dos ejes):
  intención  = qué quiere quien llega (GSC; ver scripts/clasificar-intencion.py)
  monetiza   = la página EN VIVO tiene enlaces de afiliado de Amazon o a productos
               de Sportland (se mide hoy en el cuerpo publicado, no en un CSV viejo)

  dinero             intención comercial o transaccional  Y  monetiza
  trafico_monetiza   otra intención                       Y  monetiza
  trafico            no monetiza
  hub / inicio       páginas de navegación (fijas)

Uso en el interlinking: el dinero RECIBE enlaces; los dos niveles de tráfico DONAN.

Intención de las páginas «entidad ambigua» (consultas de 1-3 palabras sin verbo):
  1. Si la mezcla de GSC trae otra intención con 25% o más, se usa esa.
  2. Si no, se decide por el tipo de consulta (tabla AMBIGUAS, con motivo).
     Es criterio, no dato: confianza «media»; confirmarlo mirando la SERP.
"""
import csv, re, sys, time, urllib.error, urllib.request
from pathlib import Path

HOY = '2026-11-27'
SALIDA = Path(f'data/seo/niveles-paginas-{HOY}.csv')
COMERCIAL = {'investigacion_comercial', 'transaccional'}

# Páginas nuevas sin histórico en GSC: intención por su formato (hipótesis).
NUEVAS = {
    '/blogs/noticias/talla-nike-air-force-1-guia': ('investigacion_comercial', 'Duda de talla antes de comprar'),
    '/blogs/noticias/como-lavar-tenis-en-lavadora': ('informativa', 'Cómo hacer algo con tenis que ya tienes'),
    '/blogs/noticias/como-saber-si-mis-adidas-superstar-son-originales': ('verificacion', 'Originalidad de un par que ya tienes'),
    '/blogs/noticias/mejores-tenis-para-jugar-tenis': ('investigacion_comercial', '«Mejores tenis para…»'),
    '/blogs/padel/los-mejores-zapatos-de-padel-elige-sabiamente-para-un-rendimiento-optimo': ('investigacion_comercial', '«Mejores zapatos de…»'),
    '/blogs/noticias/como-agrandar-tenis': ('informativa', 'Cómo hacer algo con tenis que ya tienes'),
}

# Ambiguas sin intención secundaria clara: decisión por tipo de consulta.
MODELO = ('investigacion_comercial', 'Nombre de modelo: quien lo busca está evaluando comprarlo')
TECNO = ('informativa', 'Nombre de tecnología o material: quien lo busca quiere entender qué es')
MEJORES = ('investigacion_comercial', 'Busca el mejor tenis para un uso («best…», «tenis para…»)')
NOTICIA = ('noticia_tendencia', 'Lanzamiento o colaboración')
AMBIGUAS = {
    'cloudfoam-adidas-que-es-y-cuales-son-sus-beneficios': TECNO,
    'evertrack-descubre-la-tecnologia-que-puma-pone-a-tus-pies': TECNO,
    'tenis-adidas-superstar-concha': MODELO,
    'adidas-climacool-que-es-y-que-beneficios-tiene': TECNO,
    'suelas-antiderrapante-que-son-y-como-identificarlas': TECNO,
    'adidas-stan-smith-resena-detallada': MODELO,
    'nike-air-zoom-winflo-8-resena-y-opiniones': MODELO,
    'suela-all-court-que-es-y-para-que-sirve': TECNO,
    'suela-de-espiga-que-es-y-que-beneficios-tiene': TECNO,
    'tecnologia-ignite-puma-que-es-y-cuales-son-sus-beneficios': TECNO,
    'la-colaboracion-puma-x-minecraft-que-todos-estabamos-esperando': NOTICIA,
    'tenis-nike-anchos-que-mejorarian-tu-calidad-de-vida-top-5': MEJORES,
    'nike-zoom-hyperace-resena-caracteristicas-y-opiniones': MODELO,
    'resena-de-rendimiento-de-nike-react-hyperset-en-volleyball': MEJORES,
    'adidas-response-caracteristicas-comodidad-amortiguacion-y-para-que-sirven': MODELO,
    'como-combinar-mis-tenis-blancos-1': ('estilo', 'Cómo combinar tenis'),
    'juego-de-padel-smash-todo-lo-que-debes-saber': MEJORES,
    'lanzamiento-de-air-jordan-11-s-en-cool-grey': NOTICIA,
    'los-mejores-tenis-para-basketball-top-5-2022': MEJORES,
    'puma-slipstream-caracteristicas-materiales-comodidad-y-para-que-sirven': MODELO,
    'que-es-la-suela-clay-y-para-que-sirve-descubre-sus-beneficios': TECNO,
    'que-es-puma-netfit': TECNO,
    'suela-boost-todo-sobre-la-suela-boost-adidas': TECNO,
    'tenis-mas-comodos-del-2022-top-5': MEJORES,
    'nike-kyrie-infinity-resena-caracteristicas-y-opiniones': MODELO,
    'nike-zoom-gravity-resena-opiniones-y-caracteristicas': MODELO,
    'top-mejores-marcas-de-tenis-en-2022': MEJORES,
    'resena-de-nike-lebron-20-la-combinacion-perfecta-de-comodidad-y-rendimiento': MODELO,
    'adidas-advantage-vs-stan-smith': MODELO,
    'que-son-lo-tenis-sneakers': ('informativa', 'Qué son / diferencias: quiere entender'),
}

NAVEGACION = {
    '/': 'inicio',
    '/pages/guias-tenis-originales': 'hub',
    '/pages/que-talla-de-tenis-eres-aprende-a-medir-tu-pie': 'hub',
    '/pages/cuidado-de-tenis': 'hub',
    '/pages/tenis-segun-actividad-y-necesidad': 'hub',
}

AMAZON = re.compile(r'href="(https?://(?:www\.)?(?:amazon\.com(?:\.mx)?|amzn\.to|link\.amazon)[^"]*)"')
PRODUCTO = re.compile(r'href="(?:https://sportlandmx\.com)?/products/[^"#?]+')


def mezcla_secundaria(mezcla):
    """'entidad_ambigua 52%; transaccional 44%' -> 'transaccional' si es >= 25%."""
    for parte in mezcla.split(';'):
        m = re.match(r'\s*(\w+) (\d+)%', parte)
        if m and m.group(1) != 'entidad_ambigua' and int(m.group(2)) >= 25:
            return m.group(1)
    return None


def cuerpo_en_vivo(path):
    for intento in range(5):
        req = urllib.request.Request(f'https://sportlandmx.com{path}?v={int(time.time())}',
                                     headers={'User-Agent': 'Mozilla/5.0'})
        try:
            page = urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
            break
        except urllib.error.HTTPError as e:
            if e.code != 429 or intento == 4:
                raise
            time.sleep(10 * (intento + 1))  # Shopify frena: esperar y reintentar
    else:
        raise RuntimeError('sin respuesta')
    i = page.find('<rte-formatter>', page.find('blog-post-content rte'))
    if i < 0:
        return page  # páginas (hubs): se revisa todo el HTML
    return page[i:page.find('</rte-formatter>', i)]


articulos = list(csv.DictReader(open('data/seo/intencion-articulos-2026-11-24.csv', encoding='utf-8')))
PREVIA = {}
if '--solo-sin-dato' in sys.argv and SALIDA.exists():
    PREVIA = {r['path']: r for r in csv.DictReader(open(SALIDA, encoding='utf-8'))}
filas = []
paths = [a['path'] for a in articulos] + [p for p in NUEVAS if p not in {a['path'] for a in articulos}]
por_path = {a['path']: a for a in articulos}

for path in list(NAVEGACION) + paths:
    a = por_path.get(path, {})
    if path in NAVEGACION:
        filas.append({'path': path, 'nivel': NAVEGACION[path], 'intencion': 'navegacion',
                      'fuente_intencion': 'fija', 'confianza': 'alta', 'motivo_intencion': 'Página de navegación',
                      'afiliados_amazon': '', 'productos_sportland': '', 'monetiza_con': '',
                      'clics_3m': a.get('clics_3m', '')})
        continue

    intencion, fuente, motivo, confianza = a.get('intencion_dominante'), a.get('fuente', ''), '', 'alta'
    if path in NUEVAS:
        intencion, motivo = NUEVAS[path]
        fuente, confianza = 'formato (página nueva)', 'media'
    elif intencion == 'entidad_ambigua':
        sec = mezcla_secundaria(a.get('mezcla', ''))
        if sec:
            intencion, fuente, motivo = sec, 'GSC (intención secundaria)', f"Mezcla de consultas: {a['mezcla']}"
            confianza = 'media'
        else:
            slug = path.rstrip('/').split('/')[-1]
            # Prefijo de 40 caracteres: tolera variantes del final del slug (-top-3, -top-5…).
            claves = [k for k in AMBIGUAS if slug[:40] == k[:40]]
            if len(claves) != 1:
                raise SystemExit(f'Falta decidir la intención de la ambigua {slug} en AMBIGUAS')
            intencion, motivo = AMBIGUAS[claves[0]]
            fuente, confianza = 'tipo de consulta', 'media'
    elif fuente.startswith('FORMATO'):
        confianza = 'media'
        motivo = 'Sin consultas asignadas: se infiere del formato del artículo'
    else:
        motivo = f"Mezcla de consultas: {a.get('mezcla', '')}"

    previa = PREVIA.get(path)
    if previa and previa['nivel'] != 'sin_dato':
        # --solo-sin-dato: reutiliza lo ya medido; solo se vuelve a leer lo que falló.
        amz, prods = int(previa['afiliados_amazon']), int(previa['productos_sportland'])
    else:
        try:
            body = cuerpo_en_vivo(path)
            amz = len(set(AMAZON.findall(body)))
            prods = len(set(PRODUCTO.findall(body)))
        except Exception as e:  # noqa: BLE001 - una página caída no debe parar el resto
            print('No se pudo leer', path, e)
            amz = prods = None
        time.sleep(1.2)

    monetiza = [n for n, c in (('afiliado', amz), ('inventario', prods)) if c]
    if amz is None:
        nivel = 'sin_dato'  # no se pudo leer en vivo: no se adivina
    elif not monetiza:
        nivel = 'trafico'
    elif intencion in COMERCIAL:
        nivel = 'dinero'
    else:
        nivel = 'trafico_monetiza'

    filas.append({'path': path, 'nivel': nivel, 'intencion': intencion, 'fuente_intencion': fuente,
                  'confianza': confianza, 'motivo_intencion': motivo,
                  'afiliados_amazon': amz, 'productos_sportland': prods, 'monetiza_con': '+'.join(monetiza),
                  'clics_3m': a.get('clics_3m', '')})

with open(SALIDA, 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(filas[0]))
    w.writeheader()
    w.writerows(filas)

from collections import Counter
print(SALIDA, len(filas), 'páginas')
print(Counter(f['nivel'] for f in filas))
