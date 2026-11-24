import { test, expect } from '@playwright/test';

import {
  GOVERNANCE_SCHEMA,
  evaluateReleaseReadiness,
  findComplianceViolations,
  parseDecision,
  retiresContent,
  validateContract,
  type GovernanceFile,
  type GovernanceRecord,
} from '../../services/seo-governance';

/*
 * Cada test parte de un registro válido y le inyecta UN defecto.
 * Si la regla no detecta el defecto, el test falla: así sabemos
 * que la regla protege algo (mutation testing a mano).
 */

function validRecord(
  overrides: Partial<GovernanceRecord> = {}
): GovernanceRecord {
  return {
    id: 'SEO-900',
    source: 'https://sportlandmx.com/blogs/noticias/guia-valida',
    priority: 'P0',
    decision: 'PROTEGER_ES',
    approval: 'PROTEGIDA',
    approved_destination: '/blogs/noticias/guia-valida',
    editorial_review: 'REVISADA',
    commercial_review: 'EVALUADA',
    qa_evidence: 'PASA',
    approved_by: 'Responsable SEO',
    approval_timestamp: '2026-11-20T16:10:00-06:00',
    ...overrides,
  };
}

function fileWith(
  ...records: GovernanceRecord[]
): GovernanceFile {
  return {
    schema: GOVERNANCE_SCHEMA,
    snapshot_date: '2026-11-20',
    records,
  };
}

function rulesOf(
  violations: { rule: string }[]
): string[] {
  return violations.map((violation) => violation.rule);
}

test.describe('Gobernanza SEO: separar acción y estado', () => {
  test('interpreta las decisiones compuestas', () => {
    expect(parseDecision('REDIRECT_ES_APLICADO')).toEqual({
      action: 'REDIRECT_ES',
      applied: true,
    });
    expect(parseDecision('REDIRECT_CHAIN_REVIEW')).toEqual({
      action: 'REDIRECT_CHAIN_REVIEW',
      applied: false,
    });
  });

  test('solo una redirección aplicada retira contenido', () => {
    expect(retiresContent('REDIRECT_ES_APLICADO')).toBe(true);
    expect(retiresContent('REDIRECT_A_DE_APLICADO')).toBe(true);
    expect(retiresContent('REDIRECT_CHAIN_REVIEW')).toBe(false);
    expect(retiresContent('PROTEGER_ES')).toBe(false);
  });
});

test.describe('Gobernanza SEO: contrato de datos', () => {
  test('un archivo válido no tiene violaciones', () => {
    // Control: si este falla, los demás tests no prueban nada.
    expect(validateContract(fileWith(validRecord()))).toEqual([]);
  });

  test('rechaza valores fuera del vocabulario', () => {
    const scenarios = [
      { field: 'decision', value: 'PROTEJER_DE', rule: 'UNKNOWN_DECISION' },
      { field: 'approval', value: 'PENDIENTES', rule: 'UNKNOWN_APPROVAL' },
      { field: 'priority', value: 'P2', rule: 'UNKNOWN_PRIORITY' },
      { field: 'qa_evidence', value: 'OK', rule: 'UNKNOWN_QA_EVIDENCE' },
      { field: 'editorial_review', value: 'LISTA', rule: 'UNKNOWN_EDITORIAL_REVIEW' },
      { field: 'commercial_review', value: 'SI', rule: 'UNKNOWN_COMMERCIAL_REVIEW' },
    ] as const;

    for (const scenario of scenarios) {
      const file = fileWith(
        validRecord({ [scenario.field]: scenario.value })
      );

      expect(
        rulesOf(validateContract(file)),
        `${scenario.field}="${scenario.value}"`
      ).toContain(scenario.rule);
    }
  });

  test('rechaza ids y URLs duplicados', () => {
    const file = fileWith(
      validRecord(),
      validRecord()
    );

    expect(rulesOf(validateContract(file))).toEqual(
      expect.arrayContaining(['DUPLICATE_ID', 'DUPLICATE_SOURCE'])
    );
  });

  test('rechaza URLs externas o inválidas', () => {
    expect(
      rulesOf(validateContract(fileWith(
        validRecord({ source: 'https://otro-sitio.com/blogs/x' })
      )))
    ).toContain('EXTERNAL_HOST');

    expect(
      rulesOf(validateContract(fileWith(
        validRecord({ source: 'no-es-url' })
      )))
    ).toContain('INVALID_URL');
  });

  test('una redirección aplicada necesita destino interno', () => {
    const file = fileWith(
      validRecord({
        decision: 'REDIRECT_ES_APLICADO',
        approved_destination: 'https://otro-sitio.com/x',
      })
    );

    expect(rulesOf(validateContract(file))).toContain(
      'APPLIED_WITHOUT_DESTINATION'
    );
  });

  test('CAMBIO_APROBADO exige todas las revisiones y la firma', () => {
    const file = fileWith(
      validRecord({
        approval: 'CAMBIO_APROBADO',
        qa_evidence: 'PENDIENTE',
      })
    );

    expect(rulesOf(validateContract(file))).toContain(
      'APPROVAL_INCOMPLETE'
    );
  });

  test('rechaza una fecha de aprobación inválida', () => {
    const file = fileWith(
      validRecord({ approval_timestamp: 'ayer' })
    );

    expect(rulesOf(validateContract(file))).toContain(
      'INVALID_TIMESTAMP'
    );
  });
});

test.describe('Gobernanza SEO: cumplimiento', () => {
  test('detecta una redirección aplicada sin responsable', () => {
    const file = fileWith(
      validRecord({
        decision: 'REDIRECT_ES_APLICADO',
        approval: 'APLICADA_PENDIENTE_QA',
        approved_by: null,
        approval_timestamp: null,
      })
    );

    expect(rulesOf(findComplianceViolations(file))).toEqual([
      'APPLIED_UNSIGNED',
    ]);
  });

  test('detecta una URL protegida sin responsable', () => {
    const file = fileWith(
      validRecord({ approved_by: null })
    );

    expect(rulesOf(findComplianceViolations(file))).toEqual([
      'PROTECTED_UNSIGNED',
    ]);
  });

  test('un registro firmado cumple', () => {
    expect(
      findComplianceViolations(fileWith(validRecord()))
    ).toEqual([]);
  });
});

test.describe('Gobernanza SEO: gate de release fail-closed', () => {
  test('aprueba solo cuando todo está resuelto y firmado', () => {
    expect(
      evaluateReleaseReadiness(fileWith(validRecord())).readiness
    ).toBe('CANDIDATE_FOR_RELEASE');
  });

  test('un estado desconocido bloquea el release', () => {
    // Con la lista anterior de "no resueltos", este valor pasaba.
    const readiness = evaluateReleaseReadiness(
      fileWith(validRecord({ approval: 'EN_REVISION' }))
    );

    expect(readiness.readiness).toBe('NO_GO');
    expect(readiness.unresolvedIds).toEqual(['SEO-900']);
  });

  test('un estado resuelto sin firma bloquea el release', () => {
    const readiness = evaluateReleaseReadiness(
      fileWith(validRecord({ approval_timestamp: null }))
    );

    expect(readiness.readiness).toBe('NO_GO');
  });
});
