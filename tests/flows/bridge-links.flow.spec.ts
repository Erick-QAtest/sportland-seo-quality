import { test, expect } from '@playwright/test';
import { readCsv } from '../../services/csv';

/*
 * Interlinking por frases puente: cada enlace planeado debe existir
 * DENTRO del cuerpo del artículo de origen, con su ancla exacta.
 *
 * Por qué dentro del cuerpo: un enlace en un bloque del tema se repite en
 * todas las páginas y Google le da poco peso. El valor está en el texto.
 *
 * DATOS (una fila por enlace):
 *   lote 1 (24-nov-2026): data/seo/frases-puente-lote1-2026-11-24.csv
 *   lote 2 (25-nov-2026): data/seo/frases-puente-lote2-2026-11-25.csv
 *     tráfico → páginas de dinero (guías con afiliados y video).
 */
const LOTES = [
  { nombre: 'lote 1', csv: 'data/seo/frases-puente-lote1-2026-11-24.csv' },
  { nombre: 'lote 2', csv: 'data/seo/frases-puente-lote2-2026-11-25.csv' },
];

for (const lote of LOTES) {
  const LINKS = readCsv(lote.csv);

  // Un test por artículo de origen: abrir la página una sola vez
  // y revisar todos sus enlaces (menos visitas = menos 429).
  const byOrigin = new Map<string, typeof LINKS>();
  for (const link of LINKS) {
    byOrigin.set(link.origen, [...(byOrigin.get(link.origen) ?? []), link]);
  }

  test.describe(`Interlinking ${lote.nombre}: frases puente @flujo-critico`, () => {
    for (const [origen, links] of byOrigin) {
      test(`${origen} enlaza a ${links.length} destino(s)`, async ({ page }) => {
        const response = await page.goto(origen);
        expect(response?.status(), 'el artículo de origen responde').toBe(200);

        const body = page.locator('.blog-post-content');

        for (const link of links) {
          await test.step(`${link.ancla} → ${link.destino}`, async () => {
            // [href=] exacto: el cuerpo guarda la ruta tal cual, sin prefijo de mercado.
            const anchor = body.locator(`a[href="${link.destino}"]`).filter({
              hasText: link.ancla,
            });

            await expect(
              anchor,
              `falta el enlace en la sección "${link.seccion}"`
            ).toHaveCount(1);
          });
        }
      });
    }

    test('los destinos del lote responden 200 sin redirección', async ({ request }) => {
      const destinos = [...new Set(LINKS.map((link) => link.destino))];

      for (const destino of destinos) {
        const response = await request.get(destino, { maxRedirects: 0, failOnStatusCode: false });
        // 429 no es un fallo del sitio: Shopify está frenando, se anota.
        if (response.status() === 429) {
          test.info().annotations.push({ type: 'BLOCKED', description: destino });
          continue;
        }
        expect(response.status(), destino).toBe(200);
      }
    });
  });
}
