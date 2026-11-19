import { test, expect } from '@playwright/test';

import {
  auditHttpChain,
  type HttpFetcher,
  type HttpResponseSnapshot,
} from '../../services/http-transport';

function createFakeFetcher(
  responses: Record<string, HttpResponseSnapshot>
): {
  fetcher: HttpFetcher;
  calls: string[];
} {
  const calls: string[] = [];

  const fetcher: HttpFetcher = async url => {
    calls.push(url);

    const response = responses[url];

    if (!response) {
      throw new Error(
        `No existe una respuesta simulada para: ${url}`
      );
    }

    return response;
  };

  return {
    fetcher,
    calls,
  };
}

test.describe('HTTP transport: cadenas de redirección', () => {
  test('audita una respuesta 200 sin redirecciones', async () => {
    const pageUrl =
      'https://sportlandmx.com/pages/tecnologias-de-tenis';

    const { fetcher, calls } = createFakeFetcher({
      [pageUrl]: {
        url: pageUrl,
        status: 200,
        headers: {
          'Content-Type':
            'text/html; charset=utf-8',
        },
      },
    });

    const result = await auditHttpChain(
      pageUrl,
      fetcher
    );

    expect(result).toMatchObject({
      requestedUrl: pageUrl,
      finalUrl: pageUrl,
      finalStatus: 200,
      contentType: 'text/html; charset=utf-8',
      redirected: false,
      redirects: [],
      severity: 'pass',
      blocksGate: false,
    });

    expect(calls).toEqual([pageUrl]);
  });

  test('sigue una cadena 301 → 302 → 200', async () => {
    const initialUrl =
      'https://sportlandmx.com/legacy';
    const intermediateUrl =
      'https://sportlandmx.com/intermediate';
    const finalUrl =
      'https://sportlandmx.com/final';

    const { fetcher, calls } = createFakeFetcher({
      [initialUrl]: {
        url: initialUrl,
        status: 301,
        headers: {
          Location: '/intermediate',
        },
      },
      [intermediateUrl]: {
        url: intermediateUrl,
        status: 302,
        headers: {
          location: '/final',
        },
      },
      [finalUrl]: {
        url: finalUrl,
        status: 200,
        headers: {
          'content-type': 'text/html',
        },
      },
    });

    const result = await auditHttpChain(
      initialUrl,
      fetcher
    );

    expect(result.finalUrl).toBe(finalUrl);
    expect(result.finalStatus).toBe(200);
    expect(result.redirected).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.blocksGate).toBe(false);

    expect(result.redirects).toEqual([
      {
        fromUrl: initialUrl,
        status: 301,
        location: '/intermediate',
        toUrl: intermediateUrl,
      },
      {
        fromUrl: intermediateUrl,
        status: 302,
        location: '/final',
        toUrl: finalUrl,
      },
    ]);

    expect(calls).toEqual([
      initialUrl,
      intermediateUrl,
      finalUrl,
    ]);
  });

  test('bloquea el gate cuando una redirección termina en 404', async () => {
    const initialUrl =
      'https://sportlandmx.com/old-page';
    const missingUrl =
      'https://sportlandmx.com/missing-page';

    const { fetcher } = createFakeFetcher({
      [initialUrl]: {
        url: initialUrl,
        status: 301,
        headers: {
          location: '/missing-page',
        },
      },
      [missingUrl]: {
        url: missingUrl,
        status: 404,
        headers: {
          'content-type': 'text/html',
        },
      },
    });

    const result = await auditHttpChain(
      initialUrl,
      fetcher
    );

    expect(result).toMatchObject({
      finalUrl: missingUrl,
      finalStatus: 404,
      redirected: true,
      severity: 'error',
      blocksGate: true,
    });

    expect(result.redirects).toHaveLength(1);
  });

  test('detecta un ciclo de redirección', async () => {
    const firstUrl =
      'https://sportlandmx.com/page-a';
    const secondUrl =
      'https://sportlandmx.com/page-b';

    const { fetcher, calls } = createFakeFetcher({
      [firstUrl]: {
        url: firstUrl,
        status: 301,
        headers: {
          location: '/page-b',
        },
      },
      [secondUrl]: {
        url: secondUrl,
        status: 302,
        headers: {
          location: '/page-a',
        },
      },
    });

    await expect(
      auditHttpChain(firstUrl, fetcher)
    ).rejects.toThrow(
      `Ciclo de redirección detectado: ${firstUrl}`
    );

    expect(calls).toEqual([
      firstUrl,
      secondUrl,
    ]);
  });

  test('rechaza una redirección hacia otro dominio', async () => {
    const initialUrl =
      'https://sportlandmx.com/out';
    const externalUrl =
      'https://example.com/final';

    const { fetcher, calls } = createFakeFetcher({
      [initialUrl]: {
        url: initialUrl,
        status: 301,
        headers: {
          location: externalUrl,
        },
      },
    });

    await expect(
      auditHttpChain(initialUrl, fetcher)
    ).rejects.toThrow(
      `Redirección externa no permitida: ${externalUrl}`
    );

    expect(calls).toEqual([initialUrl]);
  });

  test('rechaza una redirección sin encabezado Location', async () => {
    const pageUrl =
      'https://sportlandmx.com/broken-redirect';

    const { fetcher } = createFakeFetcher({
      [pageUrl]: {
        url: pageUrl,
        status: 302,
        headers: {},
      },
    });

    await expect(
      auditHttpChain(pageUrl, fetcher)
    ).rejects.toThrow(
      `Redirección sin Location: ${pageUrl}`
    );
  });

  test('detiene cadenas que exceden el límite permitido', async () => {
    const firstUrl =
      'https://sportlandmx.com/redirect-1';
    const secondUrl =
      'https://sportlandmx.com/redirect-2';

    const { fetcher, calls } = createFakeFetcher({
      [firstUrl]: {
        url: firstUrl,
        status: 301,
        headers: {
          location: '/redirect-2',
        },
      },
      [secondUrl]: {
        url: secondUrl,
        status: 302,
        headers: {
          location: '/redirect-3',
        },
      },
    });

    await expect(
      auditHttpChain(
        firstUrl,
        fetcher,
        {
          maxRedirects: 1,
        }
      )
    ).rejects.toThrow(
      'Límite de 1 redirecciones excedido'
    );

    expect(calls).toEqual([
      firstUrl,
      secondUrl,
    ]);
  });
});