import { readFileSync } from 'node:fs';
import path from 'node:path';

/*
 * Reglas de gobernanza SEO.
 *
 * Este módulo no visita el sitio: valida que las decisiones
 * registradas en el JSON estén bien formadas, firmadas y
 * resueltas. La verificación contra el sitio real es otra capa.
 */

export const GOVERNANCE_SCHEMA = 'sportland-seo-governance-v1';

export const DEFAULT_GOVERNANCE_FILE =
  'data/seo/governance-decisions-45.json';

// Vocabularios cerrados: cualquier valor fuera de estas listas es un error.
export const DECISIONS = [
  'REDIRECT_ES', // aprobado, aún sin aplicar en Shopify
  'REDIRECT_ES_APLICADO',
  'REDIRECT_A_DE', // aprobado, sin efecto: bloqueado por mercado activo
  'REDIRECT_A_DE_APLICADO',
  'REDIRECT_CHAIN_REVIEW',
  'PROTEGER_ES',
  'PROTEGER_DE',
  'PROTEGER_DE_TRADUCCION',
  'PROTEGER_EN_TRADUCCION',
  'PROTEGER_DE_ARTICULO_INDEPENDIENTE',
  'PROTEGER_HASTA_REVISION',
  'REVISAR_VARIANTE_ES',
  'REVISAR_TRADUCCION_EN',
  'REVISAR_CONTENIDO',
  'REVISAR_RESTAURACION_EN',
  'EXCEPCION_REVISAR_DE',
  'MAPEO_PENDIENTE',
  'REINTENTAR_429',
] as const;

export const APPROVALS = [
  'PENDIENTE',
  'APLICADA_PENDIENTE_QA',
  'PROTECCION_TEMPORAL',
  'PROTEGIDA',
  'CAMBIO_APROBADO',
] as const;

export const EDITORIAL_REVIEWS = [
  'PENDIENTE',
  'REVISADA',
  'REVISADA_DESACTUALIZADA',
  'REVISADA_REQUIERE_MEJORA',
  'NO_APLICA',
] as const;

export const COMMERCIAL_REVIEWS = [
  'PENDIENTE',
  'EVALUAR_CONVERSIONES',
  'EVALUADA',
  'NO_APLICA',
] as const;

export const QA_EVIDENCE = [
  'PENDIENTE',
  'PENDIENTE_PUBLICO',
  'QA_HTTP_PENDIENTE',
  'QA_CADENA_PENDIENTE',
  'REVALIDAR',
  'PASA',
] as const;

export const PRIORITIES = ['P0', 'P1'] as const;

/*
 * Fail-closed: solo estos estados cuentan como resueltos, y además
 * exigen firma. Cualquier otro valor, incluido uno desconocido,
 * bloquea el release.
 */
export const RESOLVED_APPROVALS: readonly string[] = [
  'PROTEGIDA',
  'CAMBIO_APROBADO',
];

export const SITE_HOSTNAME = 'sportlandmx.com';

export type Decision = (typeof DECISIONS)[number];
export type Approval = (typeof APPROVALS)[number];

export interface GovernanceRecord {
  id: string;
  source: string;
  priority: string;
  decision: string;
  approval: string;
  approved_destination: string;
  editorial_review: string;
  commercial_review: string;
  qa_evidence: string;
  approved_by: string | null;
  approval_timestamp: string | null;
}

export interface GovernanceFile {
  schema: string;
  snapshot_date: string;
  records: GovernanceRecord[];
}

export interface Violation {
  id: string;
  rule: string;
  message: string;
}

export interface ReleaseReadiness {
  readiness: 'CANDIDATE_FOR_RELEASE' | 'NO_GO';
  total: number;
  unresolvedIds: string[];
  approvalCounts: Record<string, number>;
  decisionCounts: Record<string, number>;
}

export function loadGovernanceFile(
  filePath = process.env.SEO_GOVERNANCE_FILE ?? DEFAULT_GOVERNANCE_FILE
): GovernanceFile {
  const absolutePath = path.resolve(process.cwd(), filePath);

  return JSON.parse(
    readFileSync(absolutePath, 'utf8')
  ) as GovernanceFile;
}

/*
 * Separa la acción del estado: "REDIRECT_ES_APLICADO" significa
 * acción "REDIRECT_ES" ya aplicada en Shopify.
 */
export function parseDecision(decision: string): {
  action: string;
  applied: boolean;
} {
  const applied = decision.endsWith('_APLICADO');

  return {
    action: applied
      ? decision.slice(0, -'_APLICADO'.length)
      : decision,
    applied,
  };
}

// Un cambio aplicado que redirige retira la URL original del índice.
export function retiresContent(decision: string): boolean {
  const { action, applied } = parseDecision(decision);

  return applied && action.startsWith('REDIRECT_');
}

export function isSigned(record: GovernanceRecord): boolean {
  return Boolean(
    record.approved_by?.trim() &&
    record.approval_timestamp &&
    !Number.isNaN(Date.parse(record.approval_timestamp))
  );
}

function checkVocabulary(
  violations: Violation[],
  record: GovernanceRecord,
  field: keyof GovernanceRecord,
  allowed: readonly string[],
  rule: string
): void {
  const value = record[field];

  if (typeof value !== 'string' || !allowed.includes(value)) {
    violations.push({
      id: record.id,
      rule,
      message: `${field}="${String(value)}" no está en el vocabulario permitido`,
    });
  }
}

/*
 * Contrato: ¿los datos están bien formados?
 * Debe estar siempre en verde. Si falla, el JSON está roto.
 */
export function validateContract(
  file: GovernanceFile
): Violation[] {
  const violations: Violation[] = [];

  if (file.schema !== GOVERNANCE_SCHEMA) {
    violations.push({
      id: '*',
      rule: 'SCHEMA',
      message: `schema="${file.schema}", se esperaba "${GOVERNANCE_SCHEMA}"`,
    });
  }

  const seenIds = new Set<string>();
  const seenSources = new Set<string>();

  for (const record of file.records) {
    if (seenIds.has(record.id)) {
      violations.push({
        id: record.id,
        rule: 'DUPLICATE_ID',
        message: 'El id aparece más de una vez',
      });
    }
    seenIds.add(record.id);

    if (seenSources.has(record.source)) {
      violations.push({
        id: record.id,
        rule: 'DUPLICATE_SOURCE',
        message: `La URL ${record.source} aparece más de una vez`,
      });
    }
    seenSources.add(record.source);

    try {
      const hostname = new URL(record.source).hostname;

      if (hostname !== SITE_HOSTNAME) {
        violations.push({
          id: record.id,
          rule: 'EXTERNAL_HOST',
          message: `La URL pertenece a ${hostname}`,
        });
      }
    } catch {
      violations.push({
        id: record.id,
        rule: 'INVALID_URL',
        message: `source="${record.source}" no es una URL válida`,
      });
    }

    checkVocabulary(violations, record, 'priority', PRIORITIES, 'UNKNOWN_PRIORITY');
    checkVocabulary(violations, record, 'decision', DECISIONS, 'UNKNOWN_DECISION');
    checkVocabulary(violations, record, 'approval', APPROVALS, 'UNKNOWN_APPROVAL');
    checkVocabulary(violations, record, 'editorial_review', EDITORIAL_REVIEWS, 'UNKNOWN_EDITORIAL_REVIEW');
    checkVocabulary(violations, record, 'commercial_review', COMMERCIAL_REVIEWS, 'UNKNOWN_COMMERCIAL_REVIEW');
    checkVocabulary(violations, record, 'qa_evidence', QA_EVIDENCE, 'UNKNOWN_QA_EVIDENCE');

    if (
      record.approval_timestamp &&
      Number.isNaN(Date.parse(record.approval_timestamp))
    ) {
      violations.push({
        id: record.id,
        rule: 'INVALID_TIMESTAMP',
        message: `approval_timestamp="${record.approval_timestamp}" no es una fecha válida`,
      });
    }

    if (
      retiresContent(record.decision) &&
      !record.approved_destination?.startsWith('/')
    ) {
      violations.push({
        id: record.id,
        rule: 'APPLIED_WITHOUT_DESTINATION',
        message: 'Una redirección aplicada necesita un destino interno que empiece por "/"',
      });
    }

    if (
      record.approval === 'CAMBIO_APROBADO' &&
      (
        record.editorial_review !== 'REVISADA' ||
        record.commercial_review !== 'EVALUADA' ||
        record.qa_evidence !== 'PASA' ||
        !isSigned(record)
      )
    ) {
      violations.push({
        id: record.id,
        rule: 'APPROVAL_INCOMPLETE',
        message: 'CAMBIO_APROBADO exige revisión editorial, evaluación comercial, QA en PASA, responsable y fecha',
      });
    }
  }

  return violations;
}

/*
 * Cumplimiento: ¿las decisiones tienen un responsable?
 * Puede estar en rojo mientras falten firmas: es información
 * para el equipo, no un error del código.
 */
export function findComplianceViolations(
  file: GovernanceFile
): Violation[] {
  const violations: Violation[] = [];

  for (const record of file.records) {
    if (retiresContent(record.decision) && !isSigned(record)) {
      violations.push({
        id: record.id,
        rule: 'APPLIED_UNSIGNED',
        message: `${record.decision} ya está aplicado en Shopify sin approved_by ni approval_timestamp`,
      });
    }

    if (record.approval === 'PROTEGIDA' && !isSigned(record)) {
      violations.push({
        id: record.id,
        rule: 'PROTECTED_UNSIGNED',
        message: 'PROTEGIDA sin responsable ni fecha',
      });
    }
  }

  return violations;
}

function countBy(
  records: GovernanceRecord[],
  field: 'approval' | 'decision'
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const record of records) {
    counts[record[field]] = (counts[record[field]] ?? 0) + 1;
  }

  return counts;
}

// Gate de release fail-closed: lo desconocido o sin firma bloquea.
export function evaluateReleaseReadiness(
  file: GovernanceFile
): ReleaseReadiness {
  const unresolvedIds = file.records
    .filter(
      (record) =>
        !RESOLVED_APPROVALS.includes(record.approval) ||
        !isSigned(record)
    )
    .map((record) => record.id);

  return {
    readiness:
      unresolvedIds.length === 0
        ? 'CANDIDATE_FOR_RELEASE'
        : 'NO_GO',
    total: file.records.length,
    unresolvedIds,
    approvalCounts: countBy(file.records, 'approval'),
    decisionCounts: countBy(file.records, 'decision'),
  };
}
