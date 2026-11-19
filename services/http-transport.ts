import type {
    APIRequestContext,
  } from '@playwright/test';

  import {
    assessHttpStatus,
    type AuditSeverity,
    type HttpStatusAssessment,
  } from './http-auditor';

  const DEFAULT_MAX_REDIRECTS = 5;
  const DEFAULT_TIMEOUT_MS = 30_000;

  export interface HttpResponseSnapshot {
    url: string;
    status: number;
    headers: Record<string, string>;
  }

  export type HttpFetcher = (
    url: string
  ) => Promise<HttpResponseSnapshot>;

  export interface RedirectHop {
    fromUrl: string;
    status: number;
    location: string;
    toUrl: string;
  }

  export interface HttpAuditOptions {
    maxRedirects?: number;
    timeoutMs?: number;
    allowExternalRedirects?: boolean;
  }

  export interface HttpAuditResult {
    requestedUrl: string;
    finalUrl: string;
    finalStatus: number;
    contentType: string;
    redirected: boolean;
    redirects: RedirectHop[];
    assessment: HttpStatusAssessment;
    severity: AuditSeverity;
    blocksGate: boolean;
  }

  function getHeader(
    headers: Record<string, string>,
    expectedName: string
  ): string {
    const matchingName = Object.keys(headers)
      .find(name =>
        name.toLowerCase() ===
        expectedName.toLowerCase()
      );

    return matchingName
      ? headers[matchingName]
      : '';
  }

  function validateOptions(
    options: HttpAuditOptions
  ): void {
    const maxRedirects =
      options.maxRedirects ??
      DEFAULT_MAX_REDIRECTS;

    const timeoutMs =
      options.timeoutMs ??
      DEFAULT_TIMEOUT_MS;

    if (
      !Number.isInteger(maxRedirects) ||
      maxRedirects < 0
    ) {
      throw new Error(
        'maxRedirects debe ser un entero no negativo'
      );
    }

    if (
      !Number.isInteger(timeoutMs) ||
      timeoutMs <= 0
    ) {
      throw new Error(
        'timeoutMs debe ser un entero mayor que cero'
      );
    }
  }

  function determineSeverity(
    assessment: HttpStatusAssessment,
    redirected: boolean
  ): AuditSeverity {
    if (assessment.severity === 'error') {
      return 'error';
    }

    if (redirected) {
      return 'warning';
    }

    return assessment.severity;
  }

  export async function auditHttpChain(
    requestedUrl: string,
    fetcher: HttpFetcher,
    options: HttpAuditOptions = {}
  ): Promise<HttpAuditResult> {
    validateOptions(options);

    const maxRedirects =
      options.maxRedirects ??
      DEFAULT_MAX_REDIRECTS;

    const allowExternalRedirects =
      options.allowExternalRedirects ?? false;

    const requestedOrigin =
      new URL(requestedUrl).origin;

    const visited = new Set<string>();
    const redirects: RedirectHop[] = [];

    let currentUrl = requestedUrl;

    while (true) {
      if (visited.has(currentUrl)) {
        throw new Error(
          `Ciclo de redirección detectado: ${currentUrl}`
        );
      }

      visited.add(currentUrl);

      const response = await fetcher(currentUrl);
      const assessment = assessHttpStatus(
        response.status
      );

      if (assessment.category !== 'redirect') {
        const redirected = redirects.length > 0;

        return {
          requestedUrl,
          finalUrl: response.url,
          finalStatus: response.status,
          contentType: getHeader(
            response.headers,
            'content-type'
          ),
          redirected,
          redirects,
          assessment,
          severity: determineSeverity(
            assessment,
            redirected
          ),
          blocksGate: assessment.blocksGate,
        };
      }

      const location = getHeader(
        response.headers,
        'location'
      );

      if (!location) {
        throw new Error(
          `Redirección sin Location: ${currentUrl}`
        );
      }

      if (redirects.length >= maxRedirects) {
        throw new Error(
          `Límite de ${maxRedirects} redirecciones excedido`
        );
      }

      const nextUrl = new URL(
        location,
        currentUrl
      ).toString();

      const nextOrigin = new URL(nextUrl).origin;

      if (
        !allowExternalRedirects &&
        nextOrigin !== requestedOrigin
      ) {
        throw new Error(
          `Redirección externa no permitida: ${nextUrl}`
        );
      }

      redirects.push({
        fromUrl: currentUrl,
        status: response.status,
        location,
        toUrl: nextUrl,
      });

      currentUrl = nextUrl;
    }
  }

  export function createPlaywrightHttpFetcher(
    request: APIRequestContext,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): HttpFetcher {
    return async url => {
      const response = await request.get(url, {
        failOnStatusCode: false,
        maxRedirects: 0,
        timeout: timeoutMs,
      });

      try {
        return {
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
        };
      } finally {
        await response.dispose();
      }
    };
  }

  export async function auditHttpUrl(
    request: APIRequestContext,
    requestedUrl: string,
    options: HttpAuditOptions = {}
  ): Promise<HttpAuditResult> {
    validateOptions(options);

    const timeoutMs =
      options.timeoutMs ??
      DEFAULT_TIMEOUT_MS;

    return auditHttpChain(
      requestedUrl,
      createPlaywrightHttpFetcher(
        request,
        timeoutMs
      ),
      options
    );
  }
