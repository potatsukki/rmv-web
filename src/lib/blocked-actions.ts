type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: {
    helpPath?: string;
    diagnosticsType?: string;
    refreshRequired?: boolean;
    currentStatus?: string;
    attemptedStatus?: string;
    allowedNextStatuses?: string[];
    from?: string;
    to?: string;
    allowed?: string[];
    [key: string]: unknown;
  };
};

type AxiosLikeError = {
  response?: {
    data?: {
      error?: ApiErrorPayload;
      message?: string;
    };
  };
};

export type BlockedActionInfo = {
  title: string;
  reason: string;
  actionLabel: string;
  actionPath: string;
};

const BLOCKED_CODE_MAP: Record<string, Omit<BlockedActionInfo, 'reason' | 'actionPath'>> = {
  PAYMENT_STAGE_NOT_ACCEPTING: {
    title: 'Payment stage unavailable',
    actionLabel: 'View payment guidance',
  },
  PAYMENT_PLAN_NOT_ALLOWED: {
    title: 'Payment plan is not available yet',
    actionLabel: 'View payment guidance',
  },
  PAYMENT_PLAN_ALREADY_EXISTS: {
    title: 'Payment plan already configured',
    actionLabel: 'View payment guidance',
  },
  PAYMENT_ALREADY_AWAITING_VERIFICATION: {
    title: 'Awaiting cashier verification',
    actionLabel: 'View payment guidance',
  },
  FABRICATION_NOT_IN_PHASE: {
    title: 'Fabrication action unavailable',
    actionLabel: 'View fabrication guidance',
  },
  FABRICATION_PAYMENT_GATE: {
    title: 'Payment gate is blocking this step',
    actionLabel: 'View fabrication guidance',
  },
  FABRICATION_INSTALLATION_NOT_CONFIRMED: {
    title: 'Installation confirmation required',
    actionLabel: 'View fabrication guidance',
  },
  FABRICATION_CREW_REQUIRED: {
    title: 'Delivery / installation crew required',
    actionLabel: 'View fabrication guidance',
  },
  INVALID_TRANSITION: {
    title: 'Action is not allowed in the current status',
    actionLabel: 'View workflow guidance',
  },
};

function buildBlockedReason(payload?: ApiErrorPayload): string {
  if (!payload) return 'This action is currently unavailable for the selected record.';

  if (payload.code === 'INVALID_TRANSITION') {
    const currentStatus = payload.details?.currentStatus || payload.details?.from;
    const attemptedStatus = payload.details?.attemptedStatus || payload.details?.to;
    const allowedRaw = payload.details?.allowedNextStatuses || payload.details?.allowed;
    const allowedNextStatuses = Array.isArray(allowedRaw)
      ? allowedRaw.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];

    if (currentStatus && attemptedStatus) {
      const allowedMessage = allowedNextStatuses.length > 0
        ? ` Allowed next statuses: ${allowedNextStatuses.join(', ')}.`
        : '';
      const refreshMessage = payload.details?.refreshRequired
        ? ' Your data may be outdated. Refresh and try again.'
        : '';
      return `Current status is ${currentStatus}. This action attempted ${attemptedStatus}.${allowedMessage}${refreshMessage}`;
    }
  }

  return payload.message || 'This action is currently unavailable for the selected record.';
}

export function resolveBlockedAction(
  error: unknown,
  fallbackHelpPath = '/help/payments/payment-stage-status-reference#overview',
): BlockedActionInfo | null {
  const payload = (error as AxiosLikeError)?.response?.data?.error;
  const code = payload?.code;
  if (!code || !BLOCKED_CODE_MAP[code]) return null;

  return {
    title: BLOCKED_CODE_MAP[code].title,
    reason: buildBlockedReason(payload),
    actionLabel:
      code === 'INVALID_TRANSITION' && payload?.details?.refreshRequired
        ? 'Refresh and view workflow guidance'
        : BLOCKED_CODE_MAP[code].actionLabel,
    actionPath: payload?.details?.helpPath || fallbackHelpPath,
  };
}
