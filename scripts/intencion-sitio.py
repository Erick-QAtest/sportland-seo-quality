"""Intención de búsqueda de TODAS las URLs de sportlandmx.com.

Uso:  python3 -I scripts/intencion-sitio.py <carpeta-del-export-gsc-global>
Salida: data/seo/intencion-sitio-2026-11-27.csv

Universo: el sitemap en español (productos, colecciones, páginas, blogs y
artículos). Las variantes /en-us/ y /de-de/ usan el mismo handle y el mismo
contenido: no se clasifican aparte, pero sus clics se suman en
`clics_variantes` para ver cuánto tráfico entra por ellas.

Cómo se decide la intención (gana el primer paso que aplica):
  1. Plantilla. Producto = transaccional; colección = transaccional;
     índice de blog = navegacional; páginas fijas = tabla PAGINAS.
     El tipo de página ya define qué se puede hacer en ella.
  2. Artículos ya resueltos en niveles-paginas-2026-11-27.csv: se respeta
     esa intención (fuente única; ahí se resolvieron las ambiguas).
  3. Resto de artículos: consultas de GSC atribuidas por palabras del slug
     (mismo método que clasificar-intencion.py, ahora sobre los 283).
  4. Sin consultas: reglas de texto sobre el TÍTULO (INTENCION, luego TITULO
     para noticias y títulos en inglés o alemán).
  5. Sin coincidencia en el título: reglas sobre el slug (FORMATO).
  6. Nada coincide: informativa, confianza baja.

confianza: alta = plantilla o GSC claro (≥60%); media = GSC mezclado, título
o decisión previa; baja = solo el slug o valor por defecto.
"""
import csv, json, re, sys, time, urllib.error, urllib.request
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from intencion_reglas import FORMATO, INTENCION, intencion, tokens  # noqa: E402

HOY = '2026-11-27'
SALIDA = Path(f'data/seo/intencion-sitio-{HOY}.csv')
GSC = Path(sys.argv[1])
BASE = 'https://sportlandmx.com'
PREFIJO = re.compile(r'^/(?:de-de|de-us|en-us|es-de|de|en)(?=/)')

# Páginas fijas: la intención la define su función, no las consultas.
PAGINAS = {
    # Utilidad: no deberían posicionar; existen para el usuario ya dentro del sitio.
    'avada-sitemap': ('utilidad', 'Mapa del sitio HTML'),
    'avada-sitemap-products': ('utilidad', 'Mapa del sitio HTML'),
    'avada-sitemap-blogs': ('utilidad', 'Mapa del sitio HTML'),
    'avada-sitemap-articles': ('utilidad', 'Mapa del sitio HTML'),
    'avada-sitemap-collections': ('utilidad', 'Mapa del sitio HTML'),
    'avada-sitemap-pages': ('utilidad', 'Mapa del sitio HTML'),
    'html-sitemap': ('utilidad', 'Mapa del sitio HTML'),
    'wishlist': ('utilidad', 'Lista de deseos del usuario'),
    'shared-wishlists': ('utilidad', 'Lista de deseos compartida'),
    'reviews': ('utilidad', 'Widget de reseñas'),
    'leds': ('utilidad', 'Formulario de suscripción'),
    '2do-suscribete': ('utilidad', 'Confirmación de suscripción'),
    'gracias-por-suscribirte': ('utilidad', 'Confirmación de suscripción'),
    'bienvenido-a-nuestra-comunidad': ('utilidad', 'Bienvenida tras registrarse'),
    'tu-aventura-empieza-aqui': ('utilidad', 'Bienvenida tras registrarse'),
    'video-de-meses-sin-intereses': ('utilidad', 'Video de apoyo al pago'),
    'data-sharing-opt-out': ('utilidad', 'Privacidad (obligatoria)'),
    # Marca y soporte: las busca quien ya conoce Sportland.
    'opinion-de-nuestros-clientes': ('navegacional', 'Confianza en la marca'),
    'politica-de-envio': ('navegacional', 'Soporte antes o después de comprar'),
    'terminos-y-condiciones': ('navegacional', 'Soporte legal'),
    'nuestra-historia': ('navegacional', 'Sobre la marca'),
    'noe-cortes': ('navegacional', 'Autor (E-E-A-T)'),
    'blogs': ('navegacional', 'Índice de blogs'),
    'guias': ('navegacional', 'Índice de guías'),
    # Compra.
    'caza-una-oferta-a-tu-medida': ('transaccional', 'Ofertas'),
    'oferta-exclusiva': ('transaccional', 'Ofertas'),
    'tambien-encuentranos-en': ('transaccional', 'Sucursales: compra en tienda física'),
    'tienda-tenis-guadalajara': ('transaccional', '«Tienda de tenis en Guadalajara»: compra local'),
    'guia-de-tallas': ('investigacion_comercial', 'Duda de talla antes de comprar'),
    # Hubs de contenido: heredan la intención de las guías que agrupan.
    'guias-tenis-originales': ('verificacion', 'Hub: ¿son originales?'),
    'verificador-tenis-originales': ('verificacion', 'Herramienta: ¿son originales?'),
    'tecnologias-de-tenis': ('informativa', 'Hub: qué es cada tecnología'),
    'marcas-de-tenis-origen-tecnologias-y-modelos': ('informativa', 'Hub: historia y origen de marcas'),
    'cuidado-de-tenis': ('informativa', 'Hub: cuidar tenis que ya tienes'),
    'que-talla-de-tenis-eres-aprende-a-medir-tu-pie': ('investigacion_comercial', 'Hub: talla antes de comprar'),
    'guia-running-tenis-para-correr': ('investigacion_comercial', 'Hub: elegir tenis para correr'),
    'guia-de-padel': ('investigacion_comercial', 'Hub: elegir zapatos de pádel'),
    'resenas-de-tenis': ('investigacion_comercial', 'Hub: comparar modelos'),
    'que-tenis-necesitas-para-entrenar-aprende-a-elegirlos': ('investigacion_comercial', 'Hub: elegir tenis para entrenar'),
    'que-tenis-deberias-elegir-empieza-por-lo-que-necesitas': ('investigacion_comercial', 'Hub: elegir tenis'),
    'tenis-segun-actividad-y-necesidad': ('investigacion_comercial', 'Hub: tenis por actividad'),
}
# Reglas para TÍTULOS de artículo (es/en/de). Las de INTENCION se escribieron
# para consultas en español y no reconocen noticias ni títulos extranjeros.
# Van después de INTENCION y antes del slug. Gana la primera que coincide.
TITULO = [
    ('fuera_de_tema', r'apuestas|casino|crash'),
    ('verificacion', r'authentic|echt'),
    ('noticia_tendencia', r'lanza|lanzamiento|imagenes|coleccion|colabora|zusammenarbeit|anuncia|celebra|metaverso'
                          r'|nikeland|entrevista|subasta|regresan|llegaron|se burla|cancela|tendencias|mas vendidos'
                          r'|cuestan|neuer|neue |homenaje|most expensive|worst|creacion|se prepara|lgbt|barberos'
                          r'|sustentables|air max day|historia detras'),
    ('investigacion_comercial', r'\bbest|beste|bewertung|uberprufung|meinungen|tipos de tenis|tipos de air|what kind'
                                r'|para hombre|perfectos para'),
    ('informativa', r'what are|was sind|was ist|unterschied|regeln|rules|court|cancha|tennisplatz|everything you need'
                    r'|alles, was|how to wash|quitar|todo lo que|materiales|materials|stretching|tipos de suelas'
                    r'|technology|smash'),
    ('estilo', r'wear a shirt|outfit'),
]
COLECCION_COMPARA = {'comfort-finder-tecnologias': 'Selector por tecnología: compara antes de comprar'}


def leer(url, intentos=5):
    for n in range(intentos):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            return urllib.request.urlopen(req, timeout=30).read().decode('utf-8')
        except urllib.error.HTTPError as e:
            if e.code != 429 or n == intentos - 1:
                raise
            time.sleep(15 * (n + 1))  # Shopify frena: esperar y reintentar


def sin_marca(titulo):
    """Los títulos llevan «| SPORTLAND»: sin quitarlo, todo saldría navegacional."""
    return re.sub(r'(?i)[|\-–—:]*\s*sportland(\s*mx)?\s*', ' ', titulo or '').strip()


def ruta(url):
    return re.sub(r'^https?://[^/]+', '', url).split('?')[0].rstrip('/') or '/'


# --- 1. Universo: sitemap en español
indice = leer(f'{BASE}/sitemap.xml')
urls = []
for sm in re.findall(r'<loc>([^<]+)</loc>', indice):
    sm = sm.replace('&amp;', '&')
    if PREFIJO.match(ruta(sm)) or 'agentic' in sm:
        continue
    urls += re.findall(r'<loc>([^<]+)</loc>', leer(sm))
    time.sleep(1)
paths = sorted({ruta(u) for u in urls} | {'/'})

# --- 2. Datos que ya tenemos
clasif = {r['path']: r for r in csv.DictReader(open('data/seo/clasificacion-articulos-2026-11-23.csv', encoding='utf-8-sig'))}
niveles = {r['path']: r for r in csv.DictReader(open('data/seo/niveles-paginas-2026-11-27.csv', encoding='utf-8'))}

clics, clics_var = Counter(), Counter()
for r in csv.DictReader(open(GSC / 'Páginas.csv', encoding='utf-8-sig')):
    p = ruta(r['Páginas principales'])
    base = PREFIJO.sub('', p) or '/'
    (clics_var if base != p else clics)[base] += int(r['Clics'])

# Disponibilidad pública de productos (products.json, 250 por página).
disponible = {}
for pagina in range(1, 10):
    lote = json.loads(leer(f'{BASE}/products.json?limit=250&page={pagina}'))['products']
    if not lote:
        break
    for pr in lote:
        disponible[pr['handle']] = any(v['available'] for v in pr['variants'])
    time.sleep(2)

# --- 3. Consultas de GSC → artículo (todos los artículos, no solo los que se quedan)
articulos = [p for p in paths if re.match(r'^/blogs/[^/]+/[^/]+$', p)]
tok = {p: tokens(p.rsplit('/', 1)[1]) for p in articulos}
df = Counter(t for ts in tok.values() for t in ts)
por_art, ejemplos = defaultdict(Counter), defaultdict(list)
for r in csv.DictReader(open(GSC / 'Consultas.csv', encoding='utf-8-sig')):
    q, imp = r['Consultas principales'], int(r['Impresiones'])
    qt, mejor, puntos = tokens(q), None, 0.0
    for p in articulos:
        comunes = qt & tok[p]
        if comunes and any(df[t] <= 2 for t in comunes):
            s = sum(1 / df[t] for t in comunes)
            if s > puntos:
                mejor, puntos = p, s
    if mejor:
        i = intencion(q, INTENCION) or 'entidad_ambigua'
        por_art[mejor][i] += imp
        ejemplos[mejor].append((imp, q))

# --- 4. Clasificar
filas = []
for p in paths:
    partes = p.strip('/').split('/')
    c = clasif.get(p, {})
    titulo, idioma, motivo, consultas = c.get('title', ''), c.get('idioma', 'es'), '', ''
    tipo = {'products': 'producto', 'collections': 'coleccion', 'pages': 'pagina', 'blogs': 'articulo' if len(partes) == 3 else 'blog'}.get(partes[0], 'inicio')

    if tipo == 'inicio':
        i, fuente, conf, motivo = 'navegacional', 'plantilla', 'alta', 'Búsquedas de marca'
    elif tipo == 'producto':
        i, fuente, conf = 'transaccional', 'plantilla', 'alta'
        estado = disponible.get(partes[1])
        motivo = {True: 'Ficha con stock', False: 'Ficha SIN stock: intención de compra que no puede convertir',
                  None: 'Disponibilidad desconocida'}[estado]
    elif tipo == 'coleccion':
        i, fuente, conf = 'transaccional', 'plantilla', 'alta'
        motivo = 'Listado de productos'
        if partes[1] in COLECCION_COMPARA:
            i, motivo = 'investigacion_comercial', COLECCION_COMPARA[partes[1]]
    elif tipo == 'blog':
        i, fuente, conf, motivo = 'navegacional', 'plantilla', 'alta', 'Índice del blog'
    elif tipo == 'pagina':
        if partes[1] not in PAGINAS:
            raise SystemExit(f'Falta decidir la intención de /pages/{partes[1]} en PAGINAS')
        i, motivo = PAGINAS[partes[1]]
        fuente, conf = 'función de la página', 'alta'
    elif p in niveles:
        n = niveles[p]
        i, fuente, conf, motivo = n['intencion'], f"niveles ({n['fuente_intencion']})", n['confianza'], n['motivo_intencion']
    elif por_art.get(p) and sum(v for k, v in por_art[p].items() if k != 'entidad_ambigua'):
        m = por_art[p]
        claras = Counter({k: v for k, v in m.items() if k != 'entidad_ambigua'})
        i, v = claras.most_common(1)[0]
        parte = v / sum(m.values())
        fuente, conf = 'GSC', 'alta' if parte >= 0.6 else 'media'
        motivo = 'Mezcla: ' + '; '.join(f'{k} {x / sum(m.values()):.0%}' for k, x in m.most_common(3))
    elif intencion(sin_marca(titulo), INTENCION):
        i, fuente, conf, motivo = intencion(sin_marca(titulo), INTENCION), 'título', 'media', f'Título: «{titulo[:70]}»'
    elif intencion(sin_marca(titulo), TITULO):
        i, fuente, conf, motivo = intencion(sin_marca(titulo), TITULO), 'título', 'media', f'Título: «{titulo[:70]}»'
    elif intencion(p, FORMATO):
        i, fuente, conf, motivo = intencion(p, FORMATO), 'slug', 'baja', 'Solo por palabras del slug'
    else:
        i, fuente, conf, motivo = 'informativa', 'por defecto', 'baja', 'Ninguna regla coincide'

    if ejemplos.get(p):
        consultas = ' | '.join(q for _, q in sorted(ejemplos[p], reverse=True)[:3])
    filas.append({'path': p, 'tipo': tipo, 'idioma': idioma, 'titulo': titulo,
                  'intencion': i, 'fuente': fuente, 'confianza': conf, 'motivo': motivo,
                  'consultas_ejemplo': consultas, 'clics_3m': clics.get(p, 0),
                  'clics_variantes': clics_var.get(p, 0),
                  'resolucion': c.get('resolucion', ''), 'nivel': niveles.get(p, {}).get('nivel', '')})

with open(SALIDA, 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(filas[0]))
    w.writeheader()
    w.writerows(filas)

print(SALIDA, len(filas), 'URLs (× 3 con /en-us/ y /de-de/)')
for campo in ('tipo', 'intencion', 'confianza', 'fuente'):
    print(campo, dict(Counter(f[campo] for f in filas).most_common()))
