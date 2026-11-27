import { test, expect } from '@playwright/test';
import { readCsv } from '../../services/csv';

/*
 * Artículos con video propio (24-nov-2026).
 *
 * Google solo indexa un video cuando es prominente en la página y tiene
 * datos estructurados. Cada artículo del CSV debe:
 *   1. Mostrar su video (en el cuerpo o en el bloque del tema
 *      SL-VIDEO-DESTACADO, que lo pone arriba del contenido).
 *   2. Tener un VideoObject válido que apunte a ESE video.
 *
 * El video y sus datos salen de los metacampos de artículo
 * custom.video_youtube_id / video_titulo / video_fecha.
 *
 * DATOS: data/seo/videos-articulos-2026-11-24.csv
 */
const VIDEOS = readCsv('data/seo/videos-articulos-2026-11-24.csv').filter((v) => v.articulo);

test.describe('Artículos con video propio @flujo-critico', () => {
  for (const v of VIDEOS) {
    test(`${v.articulo} muestra y declara el video ${v.video_id}`, async ({ page }) => {
      const response = await page.goto(v.articulo);
      expect(response?.status(), 'el artículo responde').toBe(200);

      await test.step('el video está en la página', async () => {
        await expect(page.locator(`iframe[src*="embed/${v.video_id}"]`).first()).toBeAttached();
      });

      await test.step('VideoObject válido para ese video', async () => {
        const schemas = await page
          .locator('script[type="application/ld+json"]')
          .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ''));
        const video = schemas
          .filter((s) => s.includes('VideoObject') && s.includes(v.video_id))
          .map((s) => JSON.parse(s));
        expect(video.length, 'falta VideoObject (¿se publicó el tema?)').toBeGreaterThan(0);
        expect(video[0].thumbnailUrl).toBeTruthy();
        expect(video[0].uploadDate).toBeTruthy();
      });
    });
  }
});
