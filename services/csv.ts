import { readFileSync } from 'node:fs';
import path from 'node:path';

// Lee un CSV con encabezados. Soporta BOM de Excel y comillas.
export function readCsv(relativePath: string): Record<string, string>[] {
  const text = readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
    .replace(/^\uFEFF/, '');

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => v.trim() !== '')) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }

  const [header, ...body] = rows;
  return body.map(values =>
    Object.fromEntries(header.map((key, i) => [key.trim(), (values[i] ?? '').trim()]))
  );
}