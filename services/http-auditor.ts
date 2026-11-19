export type HttpStatusCategory =
  | 'success'
  | 'redirect'
  | 'not-found'
  | 'gone'
  | 'client-error'
  | 'server-error'
  | 'informational';

export type AuditSeverity =
  | 'pass'
  | 'warning'
  | 'error';

export interface HttpStatusAssessment {
  status: number;
  category: HttpStatusCategory;
  severity: AuditSeverity;
  blocksGate: boolean;
  reason: string;
}

function validateHttpStatus(status: number): void {
  if (
    !Number.isInteger(status) ||
    status < 100 ||
    status > 599
  ) {
    throw new Error(
      `Estado HTTP inválido: ${status}`
    );
  }
}

export function assessHttpStatus(
  status: number
): HttpStatusAssessment {
  validateHttpStatus(status);

  if (status >= 200 && status <= 299) {
    return {
      status,
      category: 'success',
      severity: 'pass',
      blocksGate: false,
      reason: 'La URL respondió correctamente',
    };
  }

  if (status >= 300 && status <= 399) {
    return {
      status,
      category: 'redirect',
      severity: 'warning',
      blocksGate: false,
      reason: 'La URL redirige a otro destino',
    };
  }

  if (status === 404) {
    return {
      status,
      category: 'not-found',
      severity: 'error',
      blocksGate: true,
      reason: 'La URL no fue encontrada',
    };
  }

  if (status === 410) {
    return {
      status,
      category: 'gone',
      severity: 'error',
      blocksGate: true,
      reason: 'La URL fue eliminada permanentemente',
    };
  }

  if (status >= 500 && status <= 599) {
    return {
      status,
      category: 'server-error',
      severity: 'error',
      blocksGate: true,
      reason: 'El servidor no pudo procesar la solicitud',
    };
  }

  if (status >= 400 && status <= 499) {
    return {
      status,
      category: 'client-error',
      severity: 'warning',
      blocksGate: false,
      reason:
        'La solicitud fue rechazada; requiere revisión',
    };
  }

  return {
    status,
    category: 'informational',
    severity: 'warning',
    blocksGate: false,
    reason:
      'Respuesta informativa inesperada para una página',
  };
}