# SPORTLAND — Niveles de página (dinero / tráfico) · 27-nov-2026

Fuente única de verdad: `data/seo/niveles-paginas-2026-11-27.csv`, generado por `scripts/clasificar-niveles.py`. El grafo (`artifacts/grafo-interlinking/construir.py`) y los próximos planes de interlinking leen el nivel de ahí. No se asigna a mano.

## La regla (dos ejes)

| Nivel | Intención de quien llega | ¿La página monetiza hoy? | Papel en el interlinking |
|---|---|---|---|
| **dinero** | investigación comercial o transaccional | sí (afiliado o producto) | **recibe** enlaces |
| **trafico_monetiza** | verificación, informativa, estilo, noticia | sí | **dona** enlaces; monetiza de forma secundaria |
| **trafico** | cualquiera | no | **dona** enlaces |
| hub / inicio | navegación | — | reparten autoridad |

- **Intención**: viene de `scripts/clasificar-intencion.py` (consultas de GSC). Quien busca «cómo saber si mis AF1 son originales» casi siempre ya tiene el par: eso es verificación, no compra.
- **Monetiza**: se mide **en vivo**, en el cuerpo publicado. Cuenta enlaces distintos a Amazon (`amazon.com.mx`, `amzn.to`, `link.amazon`) y a productos de Sportland (`/products/`). No se usa el CSV viejo de afiliados porque varias guías cambiaron después del 24-nov.

## Intención de las páginas «entidad ambigua»

Son consultas de 1 a 3 palabras sin verbo, como «cloudfoam» o «adidas stan smith». Se resuelven así, y el motivo queda en la columna `motivo_intencion`:

1. **Intención secundaria de GSC con 25% o más** → se usa esa. Por ejemplo, SoftFoam tiene 44% de consultas «plantilla…», así que es transaccional.
2. Si no hay, se decide **por el tipo de consulta** (tabla `AMBIGUAS` del script):
   - nombre de modelo → investigación comercial;
   - nombre de tecnología o material → informativa;
   - «best…» o «tenis para…» → investigación comercial;
   - lanzamiento o colaboración → noticia.

Estas decisiones son criterio, no dato, y llevan `confianza = media`. Para confirmarlas, mira qué muestra Google en esa búsqueda: si salen tiendas, es comercial; si salen explicaciones, es informativa.

Las páginas nuevas sin histórico (talla AF1, lavadora, Superstar originales, tenis, pádel, agrandar) tienen su intención en la tabla `NUEVAS`, también con confianza media.

## Resultado al 27-nov (94 páginas)

- dinero: 34
- tráfico que monetiza: 18
- tráfico: 37
- hubs: 4
- inicio: 1

Cambios respecto a la lista manual que usaba el grafo:

| Página | Antes | Ahora | Por qué |
|---|---|---|---|
| Hombre vs mujer | dinero | tráfico que monetiza | Las consultas son «diferencia entre…»: informativa |
| Lavar en lavadora, Agrandar tenis | dinero | tráfico que monetiza | Cómo cuidar un par que ya tienes |
| Superstar originales | dinero | tráfico que monetiza | Verificación |
| SoftFoam | tráfico | **dinero** | 44% de consultas buscan la plantilla y la página tiene afiliados de plantillas |
| AF1 originales, Cloudfoam, Etiqueta Converse, QR Converse, Jordan 4 | tráfico | tráfico que monetiza | Tienen afiliados o productos, pero la intención no es de compra |

## Oportunidades que salen de la regla

- **Comercial pero sin monetizar**: tenis que cambian de color, enfermeras, saltar cuerda, Bad Bunny y marcas de tenis. Agregarles afiliados las convierte en páginas de dinero.
- **Etiqueta Jordan 1** (99 clics) no tiene ni un enlace de afiliado ni de producto: hoy es tráfico puro.

## Cómo actualizarlo

```bash
python3 -I scripts/clasificar-niveles.py              # lee las ~90 páginas en vivo (~3 min)
python3 -I scripts/clasificar-niveles.py --solo-sin-dato   # reintenta solo las que Shopify frenó (429)
python3 -I artifacts/grafo-interlinking/construir.py   # regenera el grafo con los niveles nuevos
```

Si una página nueva o una ambigua no está en `NUEVAS` o `AMBIGUAS`, el script se detiene y pide decidir su intención; no adivina. Una página que no se pudo leer queda como `sin_dato`.
