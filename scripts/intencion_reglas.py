"""Reglas de intención de búsqueda compartidas.

Las usan scripts/clasificar-intencion.py (artículos que se quedan, con consultas
de GSC) y scripts/intencion-sitio.py (todas las URLs del sitio).
Cambiar una regla aquí cambia la clasificación en los dos.
"""
import re
import unicodedata


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
