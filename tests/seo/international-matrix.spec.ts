import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://sportlandmx.com';
const PHASE = process.env.SEO_PHASE ?? 'pre';
const MATRIX_FILE = process.env.SEO_MATRIX_CSV ?? 'data/seo/matriz-p0-p1.csv';
const REPORT_DIR = path.resolve(process.cwd(), 'artifacts/seo-international');
const PREFIXES = /^\/(?:de-de|de-us|en-us|es-de|de|en)(?:\/|$)/i;

type Status =
  | 'REDIRECT_OK'
  | 'LOCALE_ACTIVE'
  | 'MAPPING_REQUIRED'
  | 'PROTECTED_ORIGINAL'
  | 'EDITORIAL_REVIEW'
  | 'CONTENT_REVIEW'
  | 'NEEDS_REVIEW';

type MatrixRow = {
  priority: string;
  source: string;
  type: string;
  proposedTarget: string;
  cluster: string;
  clicks: number;
  impressions: number;
};

type AuditRow = MatrixRow & {
  status: number;
  location: string;
  destination: string;
  targetStatus: number | '';
  result: Status;
  note: string;
};

function getInternalURL(value: string): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value, BASE_URL);
    return url.origin === BASE_URL && url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function csvCell(value: string | number): string {
  let output = String(value ?? '');
  // Evitar que Excel ejecute texto externo como una fórmula.
  if (/^[=+@\-]/.test(output) && typeof value === 'string') output = "'" + output;
  return `"${output.replace(/"/g, '""')}"`;
}

/**
 * Lee CSV UTF-8 (comillas, escapes y saltos de línea incluidos).
 * No requiere ExcelJS ni interpreta un archivo XLSX.
 */
function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error('CSV inválido: comillas sin cerrar');
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

async function readMatrix(): Promise<MatrixRow[]> {
  const file = path.resolve(process.cwd(), MATRIX_FILE);
  const csv = await fs.readFile(file, 'utf8');
  const table = parseCsv(csv);
  if (table.length < 2) throw new Error(`La matriz CSV está vacía: ${file}`);

  const requiredHeaders = new Map<number, string>([
    [0, 'Prioridad'],
    [1, 'URL original GSC'],
    [3, 'Tipo'],
    [10, 'Clics tabla'],
    [11, 'Impr. tabla'],
    [13, 'Destino candidato español'],
  ]);
  for (const [column, expected] of requiredHeaders) {
    const found = (table[0]?.[column] ?? '').trim();
    if (found !== expected) {
      throw new Error(`Columna ${column + 1}: esperaba "${expected}", encontré "${found}". No se procesa la matriz.`);
    }
  }

  const rows: MatrixRow[] = [];
  for (const columns of table.slice(1)) {
    const priority = (columns[0] ?? '').trim().toUpperCase();
    if (priority !== 'P0' && priority !== 'P1') continue;
    const source = (columns[1] ?? '').trim();
    if (!source) continue;
    rows.push({
      priority,
      source,
      type: (columns[3] ?? '').trim(),
      clicks: Number(columns[10]) || 0,
      impressions: Number(columns[11]) || 0,
      proposedTarget: (columns[13] ?? '').trim(),
      cluster: (columns[14] ?? '').trim(),
    });
  }
  return rows;
}

function makeCsv(rows: AuditRow[]): string {
  const columns: (keyof AuditRow)[] = [
    'priority', 'cluster', 'type', 'source', 'clicks', 'impressions',
    'status', 'location', 'proposedTarget', 'destination',
    'targetStatus', 'result', 'note',
  ];
  return [
    columns.join(','),
    ...rows.map(row => columns.map(col => csvCell(row[col])).join(',')),
  ].join('\n') + '\n';
}

test('SPORTLAND — auditoría de la matriz P0/P1', async ({ request }, testInfo) => {
  test.setTimeout(10 * 60 * 1000);
  if (PHASE !== 'pre' && PHASE !== 'post') {
    throw new Error(`SEO_PHASE debe ser "pre" o "post", se recibió: ${PHASE}`);
  }

  const matrix = await readMatrix();
  expect(matrix.length, 'La matriz P0/P1 debe contener URLs').toBeGreaterThan(0);
  console.log('URLs regionales por prefijo:', matrix.filter(r => { const u = getInternalURL(r.source); return !!u && PREFIXES.test(u.pathname); }).length);
  const report: AuditRow[] = [];
  const targetCache = new Map<string, number>();

  for (const item of matrix) {
    const sourceURL = getInternalURL(item.source);
    const targetURL = getInternalURL(item.proposedTarget);
    // La URL manda: algunas variantes regionales fueron mal etiquetadas en la matriz.
    const regional = Boolean(sourceURL && PREFIXES.test(sourceURL.pathname));
    let status = 0;
    let location = '';
    let destination = '';
    let targetStatus: number | '' = '';
    let note = '';
    let result: Status = 'NEEDS_REVIEW';

    if (!sourceURL) {
      note = 'La URL de origen no pertenece a sportlandmx.com o es inválida';
    } else {
      try {
        const response = await request.get(sourceURL.href, {
          maxRedirects: 0,
          failOnStatusCode: false,
          timeout: 20000,
        });
        status = response.status();
        location = response.headers()['location'] ?? '';
        const locationURL = location ? getInternalURL(new URL(location, sourceURL.href).href) : null;
        destination = locationURL?.pathname ?? '';
        if (location && !locationURL) note = 'Location externo o inválido';
      } catch (error) {
        note = `Error de red: ${error instanceof Error ? error.message : String(error)}`;
      }

      if (regional) {
        // Una variante regional de un artículo extranjero NO implica que su
        // contenido se deba redirigir sin revisión editorial previa.
        if (item.type === 'Artículo independiente en otro idioma') {
          if (status === 0 || status >= 400) {
            result = 'NEEDS_REVIEW';
            note = `Variante regional de artículo extranjero con HTTP ${status}`;
          } else {
            result = 'EDITORIAL_REVIEW';
            note = `Variante regional (HTTP ${status}) de artículo extranjero; comparar y aprobar destino antes de retirar el mercado`;
          }
        } else if (!item.proposedTarget || !targetURL || PREFIXES.test(targetURL.pathname)) {
          result = 'MAPPING_REQUIRED';
          note = 'Sin destino español válido y expresamente aprobado en la matriz';
        } else {
          if (targetCache.has(targetURL.href)) {
            targetStatus = targetCache.get(targetURL.href)!;
          } else {
            try {
              const targetResponse = await request.get(targetURL.href, {
                maxRedirects: 0,
                failOnStatusCode: false,
                timeout: 20000,
              });
              targetStatus = targetResponse.status();
              targetCache.set(targetURL.href, targetStatus);
            } catch (error) {
              targetStatus = 0;
              note = `No se pudo verificar destino: ${String(error)}`;
            }
          }

          if (targetStatus !== 200) {
            result = 'NEEDS_REVIEW';
            note = `El destino español respondió ${targetStatus}, debe devolver 200`;
          } else if (status === 301 && destination === targetURL.pathname) {
            result = 'REDIRECT_OK';
          } else if (status === 200) {
            result = 'LOCALE_ACTIVE';
            note = 'Versión regional aún publicada; comprobar 301 después de retirar mercado';
          } else {
            result = 'NEEDS_REVIEW';
            note ||= `Origen HTTP ${status}; destino real no coincide con el esperado`;
          }
        }
      } else if (status !== 200) {
        result = 'NEEDS_REVIEW';
        note ||= 'Página sin prefijo no responde directamente con HTTP 200';
      } else if (item.type === 'Original español') {
        result = 'PROTECTED_ORIGINAL';
      } else if (item.type === 'Artículo independiente en otro idioma') {
        result = 'EDITORIAL_REVIEW';
        note = 'No redirigir automáticamente: comparar con equivalente español';
      } else {
        result = 'CONTENT_REVIEW';
        note = 'Revisar intención de búsqueda y destino; no redirigir automáticamente';
      }
    }

    report.push({
      ...item,
      status,
      location,
      destination,
      targetStatus,
      result,
      note,
    });
  }

  await fs.mkdir(REPORT_DIR, { recursive: true });
  const reportFile = path.join(REPORT_DIR, `international-matrix-${PHASE}.csv`);
  await fs.writeFile(reportFile, makeCsv(report), 'utf8');
  await testInfo.attach(`international-matrix-${PHASE}.csv`, {
    path: reportFile,
    contentType: 'text/csv',
  });

  const summary = report.reduce<Record<string, number>>((acc, row) => {
    acc[row.result] = (acc[row.result] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\n=== SPORTLAND — MATRIZ SEO (${PHASE.toUpperCase()}) ===`);
  console.log('Filas revisadas:', report.length);
  console.table(summary);
  console.log('Reporte:', reportFile);
  console.log('\nPrimeras incidencias o decisiones pendientes:');
  console.table(
    report.filter(r => ['NEEDS_REVIEW', 'MAPPING_REQUIRED', 'LOCALE_ACTIVE'].includes(r.result))
      .slice(0, 15)
      .map(r => ({ priority: r.priority, status: r.status, result: r.result, path: getInternalURL(r.source)?.pathname, target: r.proposedTarget || '(sin mapa)' }))
  );

  if (PHASE === 'post') {
    const failures = report.filter(r =>
      r.result === 'NEEDS_REVIEW' ||
      (Boolean(getInternalURL(r.source) && PREFIXES.test(getInternalURL(r.source)!.pathname)) && r.result !== 'REDIRECT_OK')
    );
    expect(failures, 'No aprobar la migración si faltan redirecciones P0/P1').toEqual([]);
  } else {
    console.log('PRE = inventario: un test verde NO significa migración terminada.');
  }
});
