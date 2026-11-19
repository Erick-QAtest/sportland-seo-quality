import { test, expect } from '@playwright/test';

import {
  assessHttpStatus,
} from '../../services/http-auditor';

test.describe(
  'SEO-007: política de estados HTTP',
  () => {
    test('clasifica estados por categoría y severidad', () => {
      const scenarios = [
        {
          status: 200,
          category: 'success',
          severity: 'pass',
          blocksGate: false,
        },
        {
          status: 204,
          category: 'success',
          severity: 'pass',
          blocksGate: false,
        },
        {
          status: 301,
          category: 'redirect',
          severity: 'warning',
          blocksGate: false,
        },
        {
          status: 302,
          category: 'redirect',
          severity: 'warning',
          blocksGate: false,
        },
        {
          status: 403,
          category: 'client-error',
          severity: 'warning',
          blocksGate: false,
        },
        {
          status: 404,
          category: 'not-found',
          severity: 'error',
          blocksGate: true,
        },
        {
          status: 410,
          category: 'gone',
          severity: 'error',
          blocksGate: true,
        },
        {
          status: 500,
          category: 'server-error',
          severity: 'error',
          blocksGate: true,
        },
        {
          status: 503,
          category: 'server-error',
          severity: 'error',
          blocksGate: true,
        },
      ] as const;

      for (const scenario of scenarios) {
        const assessment = assessHttpStatus(
          scenario.status
        );

        expect(assessment).toMatchObject({
          status: scenario.status,
          category: scenario.category,
          severity: scenario.severity,
          blocksGate: scenario.blocksGate,
        });

        expect(assessment.reason.length)
          .toBeGreaterThan(0);
      }
    });

    test('bloquea solamente fallos críticos definidos', () => {
      const statuses = [
        200,
        301,
        403,
        404,
        410,
        429,
        500,
      ];

      const blockingStatuses = statuses.filter(
        status => assessHttpStatus(status).blocksGate
      );

      expect(blockingStatuses).toEqual([
        404,
        410,
        500,
      ]);
    });

    test('rechaza estados fuera del rango HTTP', () => {
      const invalidStatuses = [
        0,
        99,
        600,
        200.5,
      ];

      for (const status of invalidStatuses) {
        expect(
          () => assessHttpStatus(status)
        ).toThrow(
          `Estado HTTP inválido: ${status}`
        );
      }
    });
  }
);