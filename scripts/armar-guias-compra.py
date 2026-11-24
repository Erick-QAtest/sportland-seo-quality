"""Arma los cuerpos finales de las guías de compra (24-nov-2026).

Agrega a cada guía el script SL-AFFILIATE-EVENT (mide los clics a Amazon con
el handle y el título de esa guía) si todavía no lo tiene, valida el HTML y
escribe <guia>.body-final.html + <guia>.payload.json para la Admin API.

Uso: python3 scripts/armar-guias-compra.py
"""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

D = Path('artifacts/guias-compra-2026-11-24')
BLOG = 'gid://shopify/Blog/50128781366'  # noticias
SEO = lambda t, d: [{'namespace': 'global', 'key': 'title_tag', 'type': 'single_line_text_field', 'value': t},
                    {'namespace': 'global', 'key': 'description_tag', 'type': 'single_line_text_field', 'value': d}]

GUIAS = {
  'superstar': dict(op='create', handle='como-saber-si-mis-adidas-superstar-son-originales', cluster='originality',
      title='Cómo saber si unos adidas Superstar son originales: guía paso a paso',
      seo=SEO('Adidas Superstar originales vs réplicas: cómo identificarlos',
              'Revisa si tus adidas Superstar son originales: etiqueta y caja, texto dorado, puntera de concha, franjas y costuras. Con video comparativo y mitos frecuentes.')),
  'tenis-tenis': dict(op='update', id='gid://shopify/Article/588457640159', handle='mejores-tenis-para-jugar-tenis', redirect=True,
      cluster='sports', title='Mejores tenis para jugar tenis (2026): qué buscar y 5 modelos',
      seo=SEO('Mejores tenis para jugar tenis: qué buscar y 5 modelos (2026)',
              'Qué tenis usar para jugar tenis de campo según tu cancha y tu juego: soporte lateral, suela y amortiguación. Comparamos ASICS, adidas, Babolat y Mizuno. Con video.')),
  'lavadora': dict(op='update', id='gid://shopify/Article/556983222468', handle='como-lavar-tenis-en-lavadora', cluster='care',
      title='Cómo lavar tenis en lavadora sin dañarlos: paso a paso',
      seo=SEO('Cómo lavar tenis en lavadora sin dañarlos (paso a paso)',
              '¿Se pueden lavar los tenis en la lavadora? Qué materiales sí y cuáles no, el paso a paso con agua fría y ciclo delicado, y cómo secarlos sin que se despeguen.')),
  'padel': dict(op='update', id='gid://shopify/Article/603489894623', handle='los-mejores-zapatos-de-padel-elige-sabiamente-para-un-rendimiento-optimo',
      cluster='padel', title='Mejores tenis para pádel: qué buscar y 4 modelos recomendados',
      seo=SEO('Mejores tenis para pádel: qué buscar y 4 modelos',
              'Qué tenis usar para jugar pádel: suela de espiga, estabilidad lateral y puntera reforzada. Comparamos ASICS, Babolat, Wilson y Joma. Con video.')),
  'talla-af1': dict(op='body', id='gid://shopify/Article/635242938591', handle='talla-nike-air-force-1-guia', cluster='originality',
      title='Talla de Nike Air Force 1: ¿vienen grandes o chicos? Guía por tipo de pie'),
  'hombre-mujer': dict(op='body', id='gid://shopify/Article/586837360863', handle='cual-es-la-diferencia-entre-tenis-nike-hombre-y-mujer', cluster='sizing',
      title='Tenis de hombre vs mujer: 5 diferencias reales y cómo convertir tu talla'),
}

# El script de medición se toma de un artículo ya publicado, para que sea idéntico.
plantilla = (D / 'padel.body-nuevo.html').read_text(encoding='utf-8')
m = re.search(r'<!-- SL-AFFILIATE-EVENT-20261002 -->\n<script>.*?</script>\n', plantilla, re.S)
TRACK = m.group(0)

class Check(HTMLParser):
    VOID = {'br', 'img', 'meta', 'link', 'input', 'hr', 'source', 'iframe'}
    def __init__(s): super().__init__(); s.st = []; s.err = []
    def handle_starttag(s, t, a):
        if t not in s.VOID: s.st.append(t)
    def handle_endtag(s, t):
        if t == 'iframe': return
        if s.st and s.st[-1] == t: s.st.pop()
        else: s.err.append(t)

for g, cfg in GUIAS.items():
    body = (D / f'{g}.body-nuevo.html').read_text(encoding='utf-8')
    if 'SL-AFFILIATE-EVENT' not in body:
        track = (TRACK.replace('los-mejores-zapatos-de-padel-elige-sabiamente-para-un-rendimiento-optimo', cfg['handle'])
                      .replace('Mejores tenis para pádel: qué buscar y 4 modelos recomendados', cfg['title'])
                      .replace('cluster: "padel"', f'cluster: "{cfg["cluster"]}"'))
        body = body.replace('\n<style>', '\n' + track + '\n<style>', 1)
    for a in re.findall(r'<a [^>]*(?:amazon\.com\.mx|amzn\.to|link\.amazon)[^>]*>', body):
        if 'sponsored' not in a: sys.exit(f'ERROR {g}: enlace de Amazon sin sponsored: {a}')
    c = Check(); c.feed(body)
    if c.st or c.err: sys.exit(f'ERROR {g}: HTML mal cerrado {c.st} {c.err}')
    if body.count(cfg['handle']) < 1: sys.exit(f'ERROR {g}: el script de medición no tiene el handle')
    (D / f'{g}.body-final.html').write_text(body, encoding='utf-8')

    art = {'body': body}
    if cfg['op'] in ('create', 'update'):
        art.update(title=cfg['title'], author={'name': 'Noe Cortés'}, metafields=cfg['seo'])
    if cfg['op'] == 'create':
        art.update(blogId=BLOG, handle=cfg['handle'], isPublished=True)
        payload = {'article': art}
    else:
        if cfg.get('redirect'):
            art.update(handle=cfg['handle'], redirectNewHandle=True)
        payload = {'id': cfg['id'], 'article': art}
    (D / f'{g}.payload.json').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    texto = re.sub(r'<(script|style).*?</\1>', '', body, flags=re.S)
    print(f'{g:14} {cfg["op"]:6} {len(body):>6} B  palabras {len(re.sub("<[^>]+>", " ", texto).split()):>5}  '
          f'afiliados {len(re.findall(r"amazon.com.mx|amzn.to|link.amazon", texto)):>2}  medición {"SL-AFFILIATE-EVENT" in body}')
