import {
  test,
  type APIRequestContext,
  type APIResponse,
  type Page,
  type Response,
} from '@playwright/test';

// Un solo lugar que sabe tratar el límite de Shopify (HTTP 429).
//
// Por qué existe: en GitHub Actions todas las pruebas salen de la misma IP
// y Shopify la frena. Un 429 no dice nada de la página: solo que no pudimos
// mirarla. Por eso:
//   1. Se espera lo que el servidor pide (Retry-After), con un tope.
//   2. Si sigue frenando, el resultado es 'BLOCKED', no un fallo.
//   3. skipIfBlocked() marca la prueba como «omitida» con el motivo visible
//      en el reporte. Rojo = la página está mal. Omitida = no se pudo medir.

export const BLOCKED = 'BLOCKED' as const;
type Blocked = typeof BLOCKED;

type RetryOptions = { attempts?: number; maxWaitSeconds?: number };

function waitSeconds(retryAfter: string | undefined, attempt: number, max: number): number {
  const pedido = Number(retryAfter);
  const base = Number.isFinite(pedido) && pedido > 0 ? pedido : 5 * attempt;
  return Math.min(base, max);
}

const sleep = (s: number) => new Promise(resolve => setTimeout(resolve, s * 1000));

/** request.get que respeta el 429. Acepta las mismas opciones (maxRedirects, etc.). */
export async function getRespectingRateLimit(
  request: APIRequestContext,
  url: string,
  options: Parameters<APIRequestContext['get']>[1] = {},
  { attempts = 3, maxWaitSeconds = 30 }: RetryOptions = {}
): Promise<APIResponse | Blocked> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await request.get(url, { failOnStatusCode: false, ...options });
    if (response.status() !== 429) return response;
    if (attempt < attempts) {
      await sleep(waitSeconds(response.headers()['retry-after'], attempt, maxWaitSeconds));
    }
  }
  return BLOCKED;
}

/** page.goto que respeta el 429. */
export async function gotoRespectingRateLimit(
  page: Page,
  url: string,
  { attempts = 3, maxWaitSeconds = 30 }: RetryOptions = {}
): Promise<Response | null | Blocked> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await page.goto(url);
    if (response?.status() !== 429) return response;
    if (attempt < attempts) {
      await sleep(waitSeconds(response.headers()['retry-after'], attempt, maxWaitSeconds));
    }
  }
  return BLOCKED;
}

/** Si Shopify siguió frenando, omite la prueba con el motivo en el reporte. */
export function skipIfBlocked<T>(result: T | Blocked, what: string): asserts result is T {
  test.skip(result === BLOCKED, `BLOCKED — Shopify respondió 429 al pedir ${what}`);
}
