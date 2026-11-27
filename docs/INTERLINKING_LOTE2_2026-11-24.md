# SPORTLAND — Interlinking con óptica de monetización (lote 2) · 24-nov-2026

## Estrategia

La arquitectura se ordena en 4 niveles y la autoridad debe terminar en las páginas que generan dinero:

| Nivel | Qué es | Páginas | Función |
|---|---|---|---|
| 0 · Home | La página con más autoridad | `/` | Repartir autoridad a los hubs |
| 1 · Hubs | Portadas temáticas | Actividad, Originalidad, Tallas, Tecnología, Cuidado, Marcas | Agrupar y pasar autoridad a sus guías |
| 2 · Páginas de dinero | Guías con afiliado y video | Pierna, voleibol, tenis, pádel, estar de pie, crossfit, talla AF1, hombre vs mujer, Superstar, lavadora | **Convertir** |
| 3 · Páginas de tráfico | Artículos informativos con visitas | AF1 originales (368 clics), Cloudfoam (199), SoftFoam (190), etiqueta Converse (187), J1 (99), QR (83), J4 (76) | **Donar** autoridad y visitantes al nivel 2 |

**Reglas:**
1. De tráfico a dinero, solo cuando el tema conecta (responder la siguiente pregunta del lector).
2. Un ancla exacta por destino.
3. Hermanos del mismo hub se enlazan entre sí; máximo 3 a 5 enlaces de texto por artículo.
4. Toda guía de dinero recibe enlace desde su hub y tiene breadcrumb hacia él (metacampo `custom.hub`).

## Hecho (verificado en vivo)

### Hubs actualizados (por API, `pageUpdate`)

| Hub | Cambio | Marcador |
|---|---|---|
| `/pages/guias-tenis-originales` | Tarjeta **Superstar originales** junto a Ultraboost | `SL-HUB-LOTE2-20261124` |
| `/pages/que-talla-de-tenis-eres-aprende-a-medir-tu-pie` | Tarjeta destacada **Talla Air Force 1** (a lo ancho, junto a hombre vs mujer) | `SL-HUB-LOTE2-20261124` |
| `/pages/cuidado-de-tenis` | La tarjeta "¿Se pueden lavar tenis en lavadora?" (antes sin enlace) ahora enlaza a la **guía de lavadora**, más un enlace en "Sigue aprendiendo" | `SL-HUB-LOTE2-20261124` |
| `/pages/tenis-segun-actividad-y-necesidad` | (antes, mismo día) Tenis y pádel agregados, destacadas con video | `SL-HUB-20261124` |
| Home | Tarjeta destacada "Deporte y actividad" arriba de los 6 hubs | `SL-HOME-HUB-ACTIVIDAD-20261124` |

Respaldos: `artifacts/interlinking-lote2-2026-11-24/hub-*.body-antes.html`. Los 3 cuerpos publicados son idénticos a `hub-*.body-nuevo.html`.

### Breadcrumb hacia el hub (metacampo `custom.hub`)

- Hub de actividades: 20 guías.
- Hub de tallas: talla AF1, hombre vs mujer.
- Hub de cuidado: lavadora, agrandar tenis, quitar arrugas de AF1.
- Las guías de originalidad ya tenían breadcrumb por la detección de grupo del tema.

### Puentes desde páginas de tráfico (antes, mismo día)

- AF1 originales → talla AF1 (`SL-PUENTE-TALLA-AF1-20261124`).
- Talla AF1 ↔ hombre vs mujer ↔ cómo saber tu talla.
- Tenis ↔ pádel.

## Puentes del lote 2 en artículos (25-nov-2026)

Generados con `scripts/insertar-frases-puente-lote2.py` (marca `SL-PUENTE-LOTE2-20261125`, clase `sl-bridge-link`). Cada frase va después del último párrafo de la sección indicada. Un ancla exacta por destino:

| Origen (clics 3 meses) | Sección | Destino · ancla | Estado |
|---|---|---|---|
| Etiqueta Converse (187) | 2. Comprueba la talla y sus conversiones | Hombre vs mujer · "convertir tu talla de mujer a hombre" | En vivo (API) |
| Cómo saber si mis Converse (42) | 2. Revisa la etiqueta interior | Hombre vs mujer · misma ancla | En vivo (API) |
| Suela EVA | ¿Vale la pena comprar tenis con espuma EVA? | Estar de pie · "tenis para estar de pie todo el día" | En vivo (API) |
| Guía general de originales (23) | Cómo revisar la autenticidad de unos Adidas | Superstar originales · "cómo saber si unos adidas Superstar son originales" | En vivo (API) |
| Superstar "concha" (11) | 3. ¿Cómo saber si mis tenis Adidas Superstar son originales? | Superstar originales · misma ancla | En vivo (API) |
| Pierna | Tenis de training | CrossFit mujer · "mejores tenis para CrossFit de mujer" | En vivo (API) |
| SoftFoam (190) | ¿Sirven para caminar? | Estar de pie · misma ancla | En vivo (pegado) |
| Cloudfoam (199) | ¿Cloudfoam es bueno para caminar? | Estar de pie · misma ancla | En vivo (pegado) |

Fuera de este lote: voleibol → basketball (sin guía de basketball todavía).

Verificación: `python3 -I scripts/verificar-lote2.py <clave>` compara el cuerpo en vivo con `artifacts/interlinking-lote2-2026-11-24/articulos/<clave>.body-nuevo.html` (ignora espacios y entidades). Los 8 están idénticos en vivo (6 por API, 2 pegados). Lección: la página en vivo puede tardar unos minutos en mostrar el cambio por caché (pasó con pierna); vuelve a verificar antes de concluir que falló.

Los cuerpos de más de ~50 KB se pegan en el editor HTML en vez de mandarlos por API: reescribirlos completos en la llamada es lento y arriesgado.

## Pruebas

- `tests/flows/hubs-guias.flow.spec.ts`: cada hub enlaza a sus guías nuevas (`data/seo/hubs-guias-2026-11-24.csv`).
- `tests/flows/hub-breadcrumb.flow.spec.ts`: breadcrumb de 8 guías hacia el hub de actividades, la home enlaza al hub y el hub enlaza de vuelta.
- Estado: en verde (68/68 junto con el proyecto `critical-flows`).
- `tests/flows/bridge-links.flow.spec.ts`: ahora cubre lote 1 y lote 2 (`data/seo/frases-puente-lote2-2026-11-25.csv`). 25-nov: 75/75 en verde.

## Medición

Tecnología ya no es grupo de control (decisión del usuario, 24-nov). El 24-dic-2026 se compara antes contra después:
- Posición y clics de cada página de dinero.
- Clics de afiliado por guía (`affiliate_click`).
- Visitas que pasan de páginas de tráfico a guías de dinero.
