import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  evaluateReleaseReadiness,
  findComplianceViolations,
  loadGovernanceFile,
  validateContract,
  type GovernanceFile,
} from '../../services/seo-governance';

/*
 * Contrato sobre el JSON real de gobernanza.
 * No visita el sitio ni modifica Shopify.
 *
 * - "contrato" debe estar siempre en verde: si falla, el JSON está roto.
 * - "cumplimiento" puede estar en rojo mientras falten firmas.
 * - "release" solo bloquea con SEO_GOVERNANCE_GATE=release.
 */

const SUMMARY_FILE = path.resolve(
  process.cwd(),
  'artifacts/seo-governance/summary.json'
);

const SOFTFOAM_DE =
  '/blogs/noticias/was-sind-puma-soft-foam-einlegesohlen-und-was-sind-die-vorteile';

/*
 * Candados de decisiones de negocio: si alguien cambia una de estas
 * decisiones, este test obliga a hacerlo de forma consciente.
 */
const LOCKED_DECISIONS: Record<string, string> = {
  'SEO-002': 'PROTEGER_DE',
  'SEO-006': 'PROTEGER_ES',
  'SEO-007': 'PROTEGER_DE_TRADUCCION',
  'SEO-034': 'PROTEGER_EN_TRADUCCION',
  'SEO-043': 'PROTEGER_DE_ARTICULO_INDEPENDIENTE',
  'SEO-025': 'REDIRECT_CHAIN_REVIEW',
};

let governance: GovernanceFile;

test.beforeAll(() => {
  governance = loadGovernanceFile();
});

test.describe('SPORTLAND SEO — Gobernanza (contrato del JSON)', () => {
  test('contrato: los datos están bien formados', () => {
    // 45 del corte del 20-nov + SEO-046 (QR Converse en inglés, 27-nov).
    expect(governance.records).toHaveLength(46);

    const violations = validateContract(governance);

    expect(
      violations,
      violations.map((v) => `${v.id} ${v.rule}: ${v.message}`).join('\n')
    ).toEqual([]);
  });

  test('candados: decisiones protegidas sin cambios no autorizados', () => {
    for (const [id, decision] of Object.entries(LOCKED_DECISIONS)) {
      const record = governance.records.find((r) => r.id === id);

      expect(record, `Falta el registro ${id}`).toBeDefined();
      expect(record?.decision, `Cambio no autorizado en ${id}`).toBe(decision);
    }
  });

  test('candados: variantes del SoftFoam alemán apuntan al alemán', () => {
    const variants = governance.records.filter(
      (r) =>
        // Aplicada (SEO-005) o aprobada sin efecto por mercado activo (SEO-004, SEO-015).
        // El candado vigila el destino, no el estado de la aplicación.
        r.decision.startsWith('REDIRECT_A_DE') &&
        new URL(r.source).pathname.endsWith(SOFTFOAM_DE)
    );

    expect(variants.map((r) => r.id).sort()).toEqual([
      'SEO-004',
      'SEO-005',
      'SEO-015',
    ]);

    for (const record of variants) {
      expect(record.approved_destination, record.id).toBe(SOFTFOAM_DE);
    }
  });

  test('cumplimiento: cada decisión aplicada o protegida tiene responsable', () => {
    const violations = findComplianceViolations(governance);

    expect(
      violations,
      violations.map((v) => `${v.id} ${v.rule}: ${v.message}`).join('\n')
    ).toEqual([]);
  });

  test('release: reporte fail-closed y gate opcional', async ({}, testInfo) => {
    const readiness = evaluateReleaseReadiness(governance);

    const summary = {
      snapshot_date: governance.snapshot_date,
      ...readiness,
    };

    mkdirSync(path.dirname(SUMMARY_FILE), { recursive: true });
    writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2), 'utf8');

    await testInfo.attach('governance-summary.json', {
      path: SUMMARY_FILE,
      contentType: 'application/json',
    });

    testInfo.annotations.push({
      type: 'readiness',
      description: `${readiness.readiness}: ${readiness.unresolvedIds.length} de ${readiness.total} sin resolver`,
    });

    if (process.env.SEO_GOVERNANCE_GATE === 'release') {
      expect(
        readiness.unresolvedIds,
        'NO_GO: hay decisiones sin resolver o sin firma'
      ).toEqual([]);
    }
  });
});
