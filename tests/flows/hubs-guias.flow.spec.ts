import { test, expect } from '@playwright/test';
import { readCsv } from '../../services/csv';

/*
 * Cada hub temático enlaza a sus guías de dinero (24-nov-2026).
 * Una guía nueva sin enlace desde su hub crece mucho más lento:
 * este test falla si alguien edita un hub y borra la tarjeta.
 *
 * DATOS: data/seo/hubs-guias-2026-11-24.csv
 */
const FILAS = readCsv('data/seo/hubs-guias-2026-11-24.csv');
const porHub = new Map<string, string[]>();
for (const f of FILAS) porHub.set(f.hub, [...(porHub.get(f.hub) ?? []), f.guia]);

test.describe('Hubs → guías nuevas @flujo-critico', () => {
  for (const [hub, guias] of porHub) {
    test(`${hub} enlaza a ${guias.length} guía(s)`, async ({ page }) => {
      expect((await page.goto(hub))?.status()).toBe(200);
      for (const guia of guias) {
        await test.step(guia, async () => {
          await expect(page.locator(`a[href="${guia}"]`).first()).toBeAttached();
        });
      }
    });
  }
});
