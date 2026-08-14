import type { GeelabGuardErrorCode, GeelabGuardReceipt } from './types';

const ERROR_CODES: Readonly<Record<number, GeelabGuardErrorCode>> = {
  [-200]: 'NOT_INITIALIZED',
  [-300]: 'NETWORK_ERROR',
  [-500]: 'INVALID_RESPONSE',
  [-501]: 'SERVICE_FAILURE',
};

const ERROR_MESSAGES: Readonly<Record<GeelabGuardErrorCode, string>> = {
  INVALID_ARGUMENT: 'A GeelabGuard argument is invalid.',
  NOT_INITIALIZED: 'GeelabGuard is not initialized.',
  NETWORK_ERROR: 'The GeelabGuard request failed due to a network error.',
  INVALID_RESPONSE: 'GeelabGuard received an invalid service response.',
  SERVICE_FAILURE: 'The GeelabGuard service reported a failure.',
  UNKNOWN_NATIVE_ERROR: 'GeelabGuard encountered an unknown native error.',
};

const PUBLIC_CODES = new Set<GeelabGuardErrorCode>(
  Object.keys(ERROR_MESSAGES) as GeelabGuardErrorCode[]
);

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | undefined =>
  typeof value === 'object' && value !== null
    ? (value as UnknownRecord)
    : undefined;

const asNativeCode = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asReceipt = (value: unknown): GeelabGuardReceipt | undefined => {
  const receipt = asRecord(value);
  return receipt ? (receipt as GeelabGuardReceipt) : undefined;
};

export class GeelabGuardError extends Error {
  readonly code: GeelabGuardErrorCode;
  readonly nativeCode: number | null;
  readonly receipt?: GeelabGuardReceipt;

  constructor(
    code: GeelabGuardErrorCode,
    message = ERROR_MESSAGES[code],
    nativeCode: number | null = null,
    receipt?: GeelabGuardReceipt
  ) {
    super(message);
    this.name = 'GeelabGuardError';
    this.code = code;
    this.nativeCode = nativeCode;
    this.receipt = receipt;
  }
}

export const invalidArgument = (
  name: string,
  requirement = 'a non-empty string'
): GeelabGuardError =>
  new GeelabGuardError('INVALID_ARGUMENT', `${name} must be ${requirement}.`);

export const normalizeNativeError = (error: unknown): GeelabGuardError => {
  if (error instanceof GeelabGuardError) return error;

  const nativeError = asRecord(error);
  const userInfo = asRecord(nativeError?.userInfo);
  const nativeCode = asNativeCode(
    userInfo?.nativeCode ?? nativeError?.nativeCode ?? nativeError?.code
  );
  const rawPublicCode = nativeError?.code;
  const publicCode =
    typeof rawPublicCode === 'string' &&
    PUBLIC_CODES.has(rawPublicCode as GeelabGuardErrorCode)
      ? (rawPublicCode as GeelabGuardErrorCode)
      : nativeCode !== null
        ? (ERROR_CODES[nativeCode] ?? 'UNKNOWN_NATIVE_ERROR')
        : 'UNKNOWN_NATIVE_ERROR';
  const receipt = asReceipt(userInfo?.receipt ?? nativeError?.receipt);

  return new GeelabGuardError(
    publicCode,
    ERROR_MESSAGES[publicCode],
    nativeCode,
    receipt
  );
};
