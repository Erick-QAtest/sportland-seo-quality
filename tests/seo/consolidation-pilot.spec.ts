import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

// SPORTLAND SEO — migración de artículos internacionales (piloto 2026-11-20)
// Ejecutar con: SEO_PHASE=pre npx playwright test tests/seo/consolidation-pilot.spec.ts --project=chromium --no-deps --workers=1 --reporter=list
// 'pre': variantes regionales 200 se reportan como pendientes; URLs originales despublicadas deben tener 301.
// 'post': todas las variantes regionales también deben emitir 301 directo al español.

const BASE = 'https://sportlandmx.com';
const PHASE = process.env.SEO_PHASE ?? 'pre';
const SOFT = '/blogs/noticias/cuales-son-los-beneficios-de-las-plantilla-soft-foam-puma';
const VULC = '/blogs/noticias/suela-vulcanizada-que-es-y-que-beneficios-tiene';
const GERMAN_SOFT = '/blogs/noticias/was-sind-puma-soft-foam-einlegesohlen-und-was-sind-die-vorteile';
const ENGLISH_SOFT = '/blogs/noticias/what-are-puma-soft-foam-insoles-and-what-are-the-benefits';
const GERMAN_VULC = '/blogs/sneaker-sohlen/was-ist-eine-vulkanisierte-sohle-und-welche-vorteile-hat-sie';

type Route = { source: string; target: string; kind: 'unpublished-original' | 'legacy-regional' | 'active-market' };

const routes: Route[] = [
  { source: GERMAN_SOFT, target: SOFT, kind: 'unpublished-original' },
  { source: ENGLISH_SOFT, target: SOFT, kind: 'unpublished-original' },
  { source: GERMAN_VULC, target: VULC, kind: 'unpublished-original' },
  { source: `/de-us${GERMAN_SOFT}`, target: SOFT, kind: 'legacy-regional' },
  { source: `/de-us${ENGLISH_SOFT}`, target: SOFT, kind: 'legacy-regional' },
  { source: `/de-us${GERMAN_VULC}`, target: VULC, kind: 'legacy-regional' },
  { source: `/de-de${GERMAN_SOFT}`, target: SOFT, kind: 'active-market' },
  { source: `/en-us${GERMAN_SOFT}`, target: SOFT, kind: 'active-market' },
  { source: `/de-de${ENGLISH_SOFT}`, target: SOFT, kind: 'active-market' },
  { source: `/en-us${ENGLISH_SOFT}`, target: SOFT, kind: 'active-market' },
  { source: `/de-de${GERMAN_VULC}`, target: VULC, kind: 'active-market' },
  { source: `/en-us${GERMAN_VULC}`, target: VULC, kind: 'active-market' },
];

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
function canonicalFromHtml(html: string): string | null {
  const tag = (html.match(/<link\b[^>]*>/gi) ?? [])
    .find(s => /\brel\s*=\s*["']canonical["']/i.test(s));
  const href = tag?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!href) return null;
  try { return new URL(href, BASE).pathname.replace(/\/$/, '') || '/'; }
  catch { return null; }
}

test('SPORTLAND — QA de consolidación SoftFoam y Suela vulcanizada', async ({ request }, testInfo) => {
  test.setTimeout(180_000);
  if (!['pre', 'post'].includes(PHASE)) throw new Error('SEO_PHASE debe ser pre o post');

  const issues: string[] = [];
  const records: Array<Record<string, string | number | null>> = [];

  // Validación de los artículos españoles publicados: 200, canonical y enlazado nuevo.
  for (const target of [SOFT, VULC]) {
    const response = await request.get(BASE + target, { maxRedirects: 0, failOnStatusCode: false });
    const html = response.status() === 200 ? await response.text() : '';
    const canonical = canonicalFromHtml(html);
    const linkExists = target === VULC ? html.includes(SOFT) : true;
    const result = response.status() === 200 && canonical === target && linkExists
      ? 'PROTECTED_OK' : 'TARGET_NEEDS_REVIEW';
    records.push({ kind: 'spanish-target', source: target, status: response.status(), location: null, expected: target, result, canonical });
    if (result !== 'PROTECTED_OK') issues.push(`Destino español incorrecto: ${target} (${response.status()}, canonical=${canonical}, link=${linkExists})`);
  }

  // Validación de redirecciones: no seguir automáticamente la primera respuesta.
  for (const route of routes) {
    const response = await request.get(BASE + route.source, { maxRedirects: 0, failOnStatusCode: false });
    const status = response.status();
    const location = response.headers()['location'] ?? null;
    let destination: URL | null = null;
    try { if (location) destination = new URL(location, BASE + route.source); } catch { /* incorrect URL */ }
    const validRedirect = status === 301 && destination?.origin === BASE && destination.pathname === route.target;
    const pendingMarket = status === 200 && route.kind === 'active-market' && PHASE === 'pre';
    const result = validRedirect ? 'REDIRECT_OK' : pendingMarket ? 'LOCALE_ACTIVE' : 'NEEDS_REVIEW';
    records.push({ kind: route.kind, source: route.source, status, location, expected: route.target, result, canonical: null });
    console.log(`${status} ${result}: ${route.source} → ${location ?? '(sin Location)'}`);
    if (result === 'NEEDS_REVIEW') issues.push(`Ruta no conforme: ${route.source} HTTP ${status} → ${location}`);
  }

  // Siempre guardar evidencia antes de fallar: importante para diagnosticar fallos.
  const dir = path.resolve(process.cwd(), 'artifacts/seo-international');
  await fs.mkdir(dir, { recursive: true });
  const output = path.join(dir, `consolidation-pilot-${PHASE}.csv`);
  const fields = ['kind', 'source', 'status', 'location', 'expected', 'result', 'canonical'];
  const csv = [fields.join(','), ...records.map(row => fields.map(k => csvCell(row[k])).join(','))].join('\n');
  await fs.writeFile(output, csv + '\n', 'utf8');
  await testInfo.attach('consolidation-pilot.csv', { path: output, contentType: 'text/csv' });
  console.log(`\nReporte: ${output}`);
  console.log('Resumen:', records.reduce<Record<string, number>>((acc, row) => { const key = String(row.result); acc[key] = (acc[key] ?? 0) + 1; return acc; }, {}));

  expect(issues, issues.join('\n')).toEqual([]);
});
