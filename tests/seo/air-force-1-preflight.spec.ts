import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const origin = 'https://sportlandmx.com';
const input = path.resolve(process.cwd(), 'data/seo/air-force-1-review.json');
const outputDir = path.resolve(process.cwd(), 'artifacts/seo-governance');

type PageRule = {
  kind: string;
  path: string;
  country: string;
  clicks: number;
  impressions: number;
  decision: string;
  expected_lang: string;
  expected_status: number;
};
type Manifest = {
  schema: string;
  audit_summary: {
    german_translation: { body_html_outdated: boolean };
    english_translation: { body_html_outdated: boolean };
  };
  pages: PageRule[];
};
type Observation = PageRule & {
  status: number;
  location: string;
  finalStatus: number;
  finalPath: string;
  hops: number;
  canonical: string;
  htmlLang: string;
  alternateCount: number;
  issues: string[];
};
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
const escapeCSV = (v: unknown): string => {
  const s = String(v ?? '');
  return `"${s.replace(/"/g, '""')}"`;
};
function findCanonical(html: string): string {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const link of links) {
    if (!/\brel\s*=\s*["']canonical["']/i.test(link)) continue;
    const href = link.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) return href;
  }
  return '';
}

test('Air Force 1 — observación SEO preflight, sin mutaciones', async ({ request }) => {
  if (!existsSync(input)) throw new Error(`No existe ${input}. Descomprime el paquete en la raíz del proyecto.`);
  const manifest = JSON.parse(readFileSync(input, 'utf8')) as Manifest;
  expect(manifest.schema).toBe('sportland-air-force-1-review-v1');
  expect(manifest.pages).toHaveLength(6);

  const observations: Observation[] = [];
  for (const page of manifest.pages) {
    let current = new URL(page.path, origin).toString();
    const seen = new Set<string>();
    let initialStatus = 0;
    let initialLocation = '';
    let status = 0;
    let hops = 0;
    let html = '';
    const issues: string[] = [];

    for (let step = 0; step < 6; step++) {
      if (seen.has(current)) { issues.push('REDIRECT_CYCLE'); break; }
      seen.add(current);
      const resp = await request.get(current, { maxRedirects: 0, failOnStatusCode: false });
      status = resp.status();
      const location = resp.headers()['location'] ?? '';
      if (step === 0) { initialStatus = status; initialLocation = location; }
      if (status === 429) { issues.push('HTTP_RATE_LIMIT'); break; }
      if (status >= 300 && status < 400) {
        if (!location) { issues.push('REDIRECT_NO_LOCATION'); break; }
        const next = new URL(location, current);
        if (next.origin !== origin) { issues.push('CROSS_DOMAIN_REDIRECT'); break; }
        hops++;
        current = next.toString();
        continue;
      }
      if (status === 200) html = await resp.text();
      break;
    }
    if (hops >= 5) issues.push('TOO_MANY_REDIRECTS');
    if (initialStatus !== page.expected_status) issues.push('UNEXPECTED_SOURCE_HTTP');
    if (status !== 200) issues.push('TARGET_NOT_200');

    const lang = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
    const canonical = findCanonical(html);
    const alternates = (html.match(/<link\b[^>]*\bhreflang\s*=/gi) ?? []).length;
    const finalPath = new URL(current).pathname;
    if (html && (!lang || !lang.toLowerCase().startsWith(page.expected_lang))) issues.push('HTML_LANG_REVIEW');
    if (html && !canonical) issues.push('MISSING_CANONICAL');
    if (html && canonical) {
      try {
        const canonicalPath = new URL(canonical, origin).pathname;
        if (canonicalPath !== finalPath) issues.push('CANONICAL_REVIEW');
      } catch { issues.push('CANONICAL_INVALID'); }
    }
    if (page.expected_status === 200 && hops !== 0) issues.push('PRIMARY_PAGE_REDIRECTED');
    if (page.expected_status === 301 && hops > 1) issues.push('REDIRECT_CHAIN_REVIEW');
    const observation = {
      ...page,
      status: initialStatus,
      location: initialLocation,
      finalStatus: status,
      finalPath,
      hops,
      canonical,
      htmlLang: lang,
      alternateCount: alternates,
      issues,
    };
    observations.push(observation);
    console.log(`[${page.kind}] status=${initialStatus} -> ${status}, hops=${hops}, htmlLang=${lang || 'n/a'}, canonical=${canonical || 'n/a'}, issues=${issues.join(';') || 'none'}`);
  }

  mkdirSync(outputDir, { recursive: true });
  const csvHeaders = [
    'kind','source','country','clicks','impressions','expectedStatus','status','location',
    'finalStatus','finalPath','hops','htmlLang','canonical','alternateCount','issues','decision',
  ];
  const lines = [csvHeaders.map(escapeCSV).join(',')];
  for (const o of observations) lines.push([
    o.kind,`${origin}${o.path}`,o.country,o.clicks,o.impressions,o.expected_status,
    o.status,o.location,o.finalStatus,o.finalPath,o.hops,o.htmlLang,o.canonical,
    o.alternateCount,o.issues.join(';'),o.decision,
  ].map(escapeCSV).join(','));
  writeFileSync(path.join(outputDir, 'air-force-1-preflight.csv'), lines.join('\n') + '\n', 'utf8');

  const summary = {
    checkedAt: new Date().toISOString(),
    count: observations.length,
    issues: observations.filter(x => x.issues.length > 0).map(x => ({ kind:x.kind, issues:x.issues })),
    deTranslationOutdated: manifest.audit_summary.german_translation.body_html_outdated,
    enTranslationOutdated: manifest.audit_summary.english_translation.body_html_outdated,
    readiness: 'NO_GO',
    note: 'La auditoría HTTP no constituye aprobación editorial. Se requiere confirmar canonical/hreflang, actualizar traducciones y revisar duplicidad DE antes de retirar mercados.',
  };
  writeFileSync(path.join(outputDir, 'air-force-1-preflight-summary.json'), JSON.stringify(summary,null,2),'utf8');

  // En preflight registramos diferencias sin ocultarlas como un release aprobado.
  expect(observations.length).toBe(6);
  if (process.env.SEO_AF1_GATE === 'release') {
    const blockers = [
      ...summary.issues,
      ...(summary.deTranslationOutdated ? [{kind:'DE_TRANSLATION',issues:['OUTDATED_TRANSLATION']}] : []),
      ...(summary.enTranslationOutdated ? [{kind:'EN_TRANSLATION',issues:['OUTDATED_TRANSLATION']}] : []),
      {kind:'EDITORIAL_DECISION',issues:['UNAPPROVED_DE_LANGUAGE_CONSOLIDATION']},
    ];
    expect(blockers, 'NO_GO: revisar antes de mover o despublicar Air Force 1').toEqual([]);
  }
});
