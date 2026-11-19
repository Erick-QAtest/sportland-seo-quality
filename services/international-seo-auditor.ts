export type InternationalMarket =
  | 'mx-default'
  | 'en-US'
  | 'de-DE';

export type InternationalSeoSeverity =
  | 'warning'
  | 'error';

export type InternationalSeoFindingCode =
  | 'missing-market-snapshot'
  | 'duplicate-market-snapshot'
  | 'http-status'
  | 'requested-url-mismatch'
  | 'final-url-mismatch'
  | 'html-lang-mismatch'
  | 'missing-title'
  | 'canonical-count'
  | 'canonical-mismatch'
  | 'duplicate-hreflang'
  | 'missing-hreflang'
  | 'hreflang-target-mismatch'
  | 'unexpected-hreflang'
  | 'identical-titles';

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

export interface InternationalSeoSnapshot {
  market: InternationalMarket;
  requestedUrl: string;
  finalUrl: string;
  status: number;
  htmlLang: string;
  title: string;
  canonicals: string[];
  alternates: HreflangAlternate[];
}

export interface InternationalMarketExpectation {
  market: InternationalMarket;
  url: string;
  htmlLang: string;
  hreflang: string;
}

export interface InternationalSeoExpectation {
  markets: InternationalMarketExpectation[];
  xDefaultUrl: string;
}

export interface InternationalSeoFinding {
  code: InternationalSeoFindingCode;
  severity: InternationalSeoSeverity;
  message: string;
  market?: InternationalMarket;
  url?: string;
  expected?: unknown;
  actual?: unknown;
}

export interface InternationalSeoAuditResult {
  findings: InternationalSeoFinding[];
  errors: InternationalSeoFinding[];
  warnings: InternationalSeoFinding[];
  blocksGate: boolean;
}

function normalizeUrl(
  value: string
): string {
  const url = new URL(value.trim());

  url.hash = '';

  if (
    url.pathname.length > 1 &&
    url.pathname.endsWith('/')
  ) {
    url.pathname = url.pathname.replace(
      /\/+$/,
      ''
    );
  }

  return url.toString();
}

function tryNormalizeUrl(
  value: string
): string | undefined {
  try {
    return normalizeUrl(value);
  } catch {
    return undefined;
  }
}

function normalizeLanguage(
  value: string
): string {
  return value.trim().toLowerCase();
}

function normalizeTitle(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function validateExpectation(
  expectation: InternationalSeoExpectation
): void {
  if (expectation.markets.length === 0) {
    throw new Error(
      'La expectativa debe contener al menos un mercado'
    );
  }

  normalizeUrl(expectation.xDefaultUrl);

  const markets =
    new Set<InternationalMarket>();

  const hreflangs = new Set<string>();

  for (
    const marketExpectation
    of expectation.markets
  ) {
    if (
      markets.has(
        marketExpectation.market
      )
    ) {
      throw new Error(
        `Mercado duplicado en expectativa: ${marketExpectation.market}`
      );
    }

    markets.add(
      marketExpectation.market
    );

    normalizeUrl(
      marketExpectation.url
    );

    if (
      !marketExpectation.htmlLang.trim()
    ) {
      throw new Error(
        `htmlLang vacío para ${marketExpectation.market}`
      );
    }

    const hreflang = normalizeLanguage(
      marketExpectation.hreflang
    );

    if (!hreflang) {
      throw new Error(
        `hreflang vacío para ${marketExpectation.market}`
      );
    }

    if (
      hreflang === 'x-default' ||
      hreflangs.has(hreflang)
    ) {
      throw new Error(
        `hreflang duplicado en expectativa: ${marketExpectation.hreflang}`
      );
    }

    hreflangs.add(hreflang);
  }
}

export function auditInternationalSeoCluster(
  snapshots: readonly InternationalSeoSnapshot[],
  expectation: InternationalSeoExpectation
): InternationalSeoAuditResult {
  validateExpectation(expectation);

  const findings:
    InternationalSeoFinding[] = [];

  const snapshotsByMarket = new Map<
    InternationalMarket,
    InternationalSeoSnapshot[]
  >();

  for (const snapshot of snapshots) {
    const current =
      snapshotsByMarket.get(
        snapshot.market
      ) ?? [];

    current.push(snapshot);

    snapshotsByMarket.set(
      snapshot.market,
      current
    );
  }

  const expectedAlternates =
    new Map<string, string>();

  expectedAlternates.set(
    'x-default',
    normalizeUrl(
      expectation.xDefaultUrl
    )
  );

  for (
    const marketExpectation
    of expectation.markets
  ) {
    expectedAlternates.set(
      normalizeLanguage(
        marketExpectation.hreflang
      ),
      normalizeUrl(
        marketExpectation.url
      )
    );
  }

  const auditedSnapshots:
    InternationalSeoSnapshot[] = [];

  for (
    const marketExpectation
    of expectation.markets
  ) {
    const marketSnapshots =
      snapshotsByMarket.get(
        marketExpectation.market
      ) ?? [];

    if (marketSnapshots.length === 0) {
      findings.push({
        code:
          'missing-market-snapshot',
        severity: 'error',
        market:
          marketExpectation.market,
        url:
          marketExpectation.url,
        message:
          `Falta el snapshot de ${marketExpectation.market}`,
      });

      continue;
    }

    if (marketSnapshots.length > 1) {
      findings.push({
        code:
          'duplicate-market-snapshot',
        severity: 'error',
        market:
          marketExpectation.market,
        url:
          marketExpectation.url,
        message:
          `Hay ${marketSnapshots.length} snapshots para ${marketExpectation.market}`,
        expected: 1,
        actual:
          marketSnapshots.length,
      });
    }

    const snapshot =
      marketSnapshots[0];

    auditedSnapshots.push(snapshot);

    const expectedUrl = normalizeUrl(
      marketExpectation.url
    );

    if (snapshot.status !== 200) {
      findings.push({
        code: 'http-status',
        severity: 'error',
        market:
          snapshot.market,
        url:
          snapshot.requestedUrl,
        message:
          `La URL respondió HTTP ${snapshot.status}`,
        expected: 200,
        actual: snapshot.status,
      });
    }

    const requestedUrl =
      tryNormalizeUrl(
        snapshot.requestedUrl
      );

    if (requestedUrl !== expectedUrl) {
      findings.push({
        code:
          'requested-url-mismatch',
        severity: 'error',
        market:
          snapshot.market,
        url:
          snapshot.requestedUrl,
        message:
          'La URL solicitada no coincide con la URL esperada',
        expected: expectedUrl,
        actual:
          snapshot.requestedUrl,
      });
    }

    const finalUrl =
      tryNormalizeUrl(
        snapshot.finalUrl
      );

    if (finalUrl !== expectedUrl) {
      findings.push({
        code:
          'final-url-mismatch',
        severity: 'error',
        market:
          snapshot.market,
        url:
          snapshot.requestedUrl,
        message:
          'La navegación terminó en una URL distinta',
        expected: expectedUrl,
        actual:
          snapshot.finalUrl,
      });
    }

    const actualHtmlLang =
      normalizeLanguage(
        snapshot.htmlLang
      );

    const expectedHtmlLang =
      normalizeLanguage(
        marketExpectation.htmlLang
      );

    if (
      actualHtmlLang !==
      expectedHtmlLang
    ) {
      findings.push({
        code:
          'html-lang-mismatch',
        severity: 'error',
        market:
          snapshot.market,
        url:
          snapshot.finalUrl,
        message:
          'El idioma del documento no coincide con el mercado',
        expected:
          marketExpectation.htmlLang,
        actual:
          snapshot.htmlLang,
      });
    }

    if (!snapshot.title.trim()) {
      findings.push({
        code: 'missing-title',
        severity: 'error',
        market:
          snapshot.market,
        url:
          snapshot.finalUrl,
        message:
          'La página no tiene title',
      });
    }

    if (
      snapshot.canonicals.length !== 1
    ) {
      findings.push({
        code: 'canonical-count',
        severity: 'error',
        market:
          snapshot.market,
        url:
          snapshot.finalUrl,
        message:
          'La página debe tener exactamente un canonical',
        expected: 1,
        actual:
          snapshot.canonicals.length,
      });
    } else {
      const canonical =
        tryNormalizeUrl(
          snapshot.canonicals[0]
        );

      if (canonical !== expectedUrl) {
        findings.push({
          code:
            'canonical-mismatch',
          severity: 'error',
          market:
            snapshot.market,
          url:
            snapshot.finalUrl,
          message:
            'El canonical no es autorreferencial',
          expected: expectedUrl,
          actual:
            snapshot.canonicals[0],
        });
      }
    }

    const alternatesByLanguage =
      new Map<
        string,
        HreflangAlternate[]
      >();

    for (
      const alternate
      of snapshot.alternates
    ) {
      const hreflang =
        normalizeLanguage(
          alternate.hreflang
        );

      const current =
        alternatesByLanguage.get(
          hreflang
        ) ?? [];

      current.push(alternate);

      alternatesByLanguage.set(
        hreflang,
        current
      );
    }

    for (
      const [
        hreflang,
        alternates,
      ] of alternatesByLanguage
    ) {
      if (alternates.length > 1) {
        findings.push({
          code:
            'duplicate-hreflang',
          severity: 'error',
          market:
            snapshot.market,
          url:
            snapshot.finalUrl,
          message:
            `hreflang duplicado: ${hreflang}`,
          expected: 1,
          actual:
            alternates.length,
        });
      }
    }

    for (
      const [
        expectedHreflang,
        expectedTarget,
      ] of expectedAlternates
    ) {
      const alternates =
        alternatesByLanguage.get(
          expectedHreflang
        ) ?? [];

      if (alternates.length === 0) {
        findings.push({
          code:
            'missing-hreflang',
          severity: 'error',
          market:
            snapshot.market,
          url:
            snapshot.finalUrl,
          message:
            `Falta hreflang ${expectedHreflang}`,
          expected:
            expectedTarget,
        });

        continue;
      }

      const actualTarget =
        tryNormalizeUrl(
          alternates[0].href
        );

      if (
        actualTarget !==
        expectedTarget
      ) {
        findings.push({
          code:
            'hreflang-target-mismatch',
          severity: 'error',
          market:
            snapshot.market,
          url:
            snapshot.finalUrl,
          message:
            `hreflang ${expectedHreflang} apunta a una URL incorrecta`,
          expected:
            expectedTarget,
          actual:
            alternates[0].href,
        });
      }
    }

    for (
      const hreflang
      of alternatesByLanguage.keys()
    ) {
      if (
        !expectedAlternates.has(
          hreflang
        )
      ) {
        findings.push({
          code:
            'unexpected-hreflang',
          severity: 'warning',
          market:
            snapshot.market,
          url:
            snapshot.finalUrl,
          message:
            `hreflang no esperado: ${hreflang}`,
          actual: hreflang,
        });
      }
    }
  }

  const normalizedTitles =
    auditedSnapshots
      .map(snapshot =>
        normalizeTitle(
          snapshot.title
        )
      )
      .filter(Boolean);

  if (
    auditedSnapshots.length ===
      expectation.markets.length &&
    normalizedTitles.length > 1 &&
    new Set(
      normalizedTitles
    ).size === 1
  ) {
    findings.push({
      code: 'identical-titles',
      severity: 'warning',
      message:
        'Todos los mercados publican el mismo title; puede existir contenido sin traducir',
      actual:
        auditedSnapshots.map(
          snapshot => ({
            market:
              snapshot.market,
            title:
              snapshot.title,
          })
        ),
    });
  }

  const errors = findings.filter(
    finding =>
      finding.severity === 'error'
  );

  const warnings = findings.filter(
    finding =>
      finding.severity ===
      'warning'
  );

  return {
    findings,
    errors,
    warnings,
    blocksGate:
      errors.length > 0,
  };
}