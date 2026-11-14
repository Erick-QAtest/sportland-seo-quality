import { expect, type Locator } from '@playwright/test';

export async function getSelectableSizes(
  selector: Locator
): Promise<string[]> {
  const sizes = await selector.locator('option').evaluateAll(
    options => options
      .filter(option => !(option as HTMLOptionElement).disabled)
      .map(option => (option as HTMLOptionElement).value.trim())
      .filter(value => value.length > 0)
  );

  expect(sizes.length).toBeGreaterThan(0);

  return sizes;
}