/** Stable, allowlisted diagnostics. Provider error messages and metadata are never retained. */
export type SmtpFailureCode =
  | 'SMTP_CONFIGURATION'
  | 'SMTP_AUTH'
  | 'SMTP_TIMEOUT'
  | 'SMTP_TLS'
  | 'SMTP_CONNECTION'
  | 'SMTP_RECIPIENT_REJECTED'
  | 'SMTP_UNKNOWN';

const tlsCodes = new Set([
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ETLS',
]);

const connectionCodes = new Set([
  'ECONNECTION',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ESOCKET',
]);

export class SmtpDeliveryError extends Error {
  constructor(readonly failureCode: SmtpFailureCode) {
    super(failureCode);
    this.name = 'SmtpDeliveryError';
  }
}

export function classifySmtpFailure(error: unknown): SmtpFailureCode {
  if (error instanceof SmtpDeliveryError) return error.failureCode;
  if (!error || typeof error !== 'object') return 'SMTP_UNKNOWN';

  const details = error as {
    code?: unknown;
    responseCode?: unknown;
    command?: unknown;
  };
  const code = typeof details.code === 'string' ? details.code : '';
  const responseCode =
    typeof details.responseCode === 'number' ? details.responseCode : 0;

  if (code === 'EAUTH' || [530, 534, 535, 538].includes(responseCode))
    return 'SMTP_AUTH';
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return 'SMTP_TIMEOUT';
  if (tlsCodes.has(code) || details.command === 'STARTTLS') return 'SMTP_TLS';
  if (connectionCodes.has(code)) return 'SMTP_CONNECTION';
  if (code === 'EENVELOPE' || [550, 551, 553, 554].includes(responseCode)) {
    return 'SMTP_RECIPIENT_REJECTED';
  }
  return 'SMTP_UNKNOWN';
}
