import { test, expect } from '@playwright/test';
import {
  validateRelatedBlock,
  collectionHandleFromHref,
  type RelatedBlockSnapshot,
} from '../../services/related-products';

const valid = (overrides: Partial<RelatedBlockSnapshot> = {}): RelatedBlockSnapshot => ({
  present: true,
  collectionHref: '/collections/tenis-puma-con-softfoam-y-softfoam',
  productPaths: ['/products/a', '/products/b'],
  ...overrides,
});
const rules = (v: { rule: string }[]) => v.map(x => x.rule);
const EXPECTED = 'tenis-puma-con-softfoam-y-softfoam';

test.describe('Flujo 1: reglas del bloque de productos', () => {
  test('un bloque válido no tiene violaciones (control)', () => {
    expect(validateRelatedBlock(valid(), EXPECTED)).toEqual([]);
  });

  test('detecta bloque ausente', () => {
    expect(rules(validateRelatedBlock(valid({ present: false }), EXPECTED))).toEqual(['BLOCK_MISSING']);
  });

  test('detecta bloque vacío', () => {
    expect(rules(validateRelatedBlock(valid({ productPaths: [] }), EXPECTED))).toContain('BLOCK_EMPTY');
  });

  test('detecta colección equivocada', () => {
    const snapshot = valid({ collectionHref: '/collections/ofertas' });
    expect(rules(validateRelatedBlock(snapshot, EXPECTED))).toContain('WRONG_COLLECTION');
  });

  test('detecta producto agotado según el oráculo', () => {
    const v = validateRelatedBlock(valid(), EXPECTED, { '/products/a': false });
    expect(rules(v)).toEqual(['UNAVAILABLE_PRODUCT']);
  });

  test('un 429 del oráculo no cuenta como falla', () => {
    expect(validateRelatedBlock(valid(), EXPECTED, { '/products/a': 'BLOCKED' })).toEqual([]);
  });

  test('entiende URLs con prefijo de mercado', () => {
    expect(collectionHandleFromHref('/en-us/collections/puma')).toBe('puma');
  });
});