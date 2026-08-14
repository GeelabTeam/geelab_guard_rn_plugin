export type GeelabGuardErrorCode =
  | 'INVALID_ARGUMENT'
  | 'NOT_INITIALIZED'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'SERVICE_FAILURE'
  | 'UNKNOWN_NATIVE_ERROR';

export type GeelabGuardReceipt = {
  appId: string | null;
  geeToken: string | null;
  geeId: string | null;
  geeIdTimestamp: string | null;
  respondedGeeToken: string | null;
  originalResponseBase64: string | null;
};
