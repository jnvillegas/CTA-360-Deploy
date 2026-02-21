export type CaseStatus = 'en_evaluacion' | 'intervenido' | 'completado' | 'sin_optimizacion';

export interface StatusTransition {
  from: CaseStatus;
  to: CaseStatus;
  label: string;
  requiresFields?: string[];
}

export const STATUS_LABELS: Record<CaseStatus, string> = {
  en_evaluacion: 'En Evaluación',
  intervenido: 'Intervenido',
  completado: 'Completado',
  sin_optimizacion: 'Sin Optimización',
};

export const STATUS_COLORS: Record<CaseStatus, string> = {
  en_evaluacion: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  intervenido: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  completado: 'bg-green-500/10 text-green-600 border-green-500/20',
  sin_optimizacion: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export const VALID_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  en_evaluacion: ['intervenido', 'sin_optimizacion'],
  intervenido: ['completado', 'en_evaluacion'],
  completado: [],
  sin_optimizacion: ['en_evaluacion'],
};

export const TRANSITION_LABELS: Record<string, string> = {
  'en_evaluacion->intervenido': 'Registrar Intervención',
  'en_evaluacion->sin_optimizacion': 'Marcar Sin Optimización',
  'intervenido->completado': 'Completar Caso',
  'intervenido->en_evaluacion': 'Volver a Evaluación',
  'sin_optimizacion->en_evaluacion': 'Reabrir Caso',
};

export function canTransition(currentStatus: CaseStatus, newStatus: CaseStatus): boolean {
  const allowedStatuses = VALID_TRANSITIONS[currentStatus];
  return allowedStatuses.includes(newStatus);
}

export function getAvailableTransitions(currentStatus: CaseStatus): CaseStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

export function requiresJustification(newStatus: CaseStatus): boolean {
  return newStatus === 'sin_optimizacion';
}

export function validateTransition(
  currentStatus: CaseStatus,
  newStatus: CaseStatus,
  caseData?: {
    current_monthly_cost: number | null;
    initial_monthly_cost: number;
  }
): { valid: boolean; error?: string; warning?: string } {
  if (currentStatus === newStatus) {
    return { valid: false, error: 'El estado es el mismo' };
  }

  if (!canTransition(currentStatus, newStatus)) {
    return { 
      valid: false, 
      error: `No puede cambiar de "${STATUS_LABELS[currentStatus]}" a "${STATUS_LABELS[newStatus]}"` 
    };
  }

  if (newStatus === 'completado' && caseData) {
    if (!caseData.current_monthly_cost || caseData.current_monthly_cost <= 0) {
      return { 
        valid: false, 
        error: 'Debe cargar el costo mensual actual antes de completar el caso' 
      };
    }

    if (caseData.current_monthly_cost >= caseData.initial_monthly_cost) {
      return { 
        valid: true, 
        warning: 'El costo actual es mayor o igual al inicial. Se requerirá justificación.' 
      };
    }
  }

  if (newStatus === 'sin_optimizacion' && caseData) {
    if (caseData.current_monthly_cost && caseData.current_monthly_cost < caseData.initial_monthly_cost) {
      return { 
        valid: true, 
        warning: 'El caso tiene potencial de ahorro. ¿Está seguro de marcar como sin optimización?' 
      };
    }
  }

  return { valid: true };
}
