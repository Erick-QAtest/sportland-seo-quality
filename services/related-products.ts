export const MAX_RELATED_PRODUCTS = 4;

// Lo que el Page Object extrae de la página.
export interface RelatedBlockSnapshot {
  present: boolean;
  collectionHref: string | null;   // href de "Ver todos"
  productPaths: string[];          // /products/<handle> de cada tarjeta
}

// Lo que dice el oráculo independiente (/products/<handle>.js).
export type AvailabilityLookup = Record<string, boolean | 'BLOCKED'>;

export interface FlowViolation {
  rule: string;
  message: string;
}

export function collectionHandleFromHref(href: string | null): string | null {
  if (!href) return null;
  const match = new URL(href, 'https://sportlandmx.com')
    .pathname.match(/^\/(?:[a-z]{2}-[a-z]{2}\/)?collections\/([^/?#]+)/);
  return match ? match[1] : null;
}

export function validateRelatedBlock(
  snapshot: RelatedBlockSnapshot,
  expectedCollection: string,
  availability: AvailabilityLookup = {}
): FlowViolation[] {
  const violations: FlowViolation[] = [];

  if (!snapshot.present) {
    return [{ rule: 'BLOCK_MISSING', message: 'El bloque "Modelos relacionados" no se renderiza' }];
  }

  const count = snapshot.productPaths.length;
  if (count === 0) {
    violations.push({ rule: 'BLOCK_EMPTY', message: 'El bloque no muestra productos' });
  }
  if (count > MAX_RELATED_PRODUCTS) {
    violations.push({ rule: 'TOO_MANY', message: `Muestra ${count}, máximo ${MAX_RELATED_PRODUCTS}` });
  }

  const actual = collectionHandleFromHref(snapshot.collectionHref);
  if (actual !== expectedCollection) {
    violations.push({
      rule: 'WRONG_COLLECTION',
      message: `"Ver todos" apunta a "${actual}", se esperaba "${expectedCollection}"`,
    });
  }

  if (new Set(snapshot.productPaths).size !== count) {
    violations.push({ rule: 'DUPLICATE_PRODUCT', message: 'Hay productos repetidos' });
  }

  for (const productPath of snapshot.productPaths) {
    const state = availability[productPath];
    if (state === false) {
      violations.push({ rule: 'UNAVAILABLE_PRODUCT', message: `${productPath} está agotado` });
    }
  }

  return violations;
}