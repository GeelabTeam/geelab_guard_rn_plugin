export type TokenQueryRequest = {
  serverUrl: string;
  appId: string;
  privateKey: string;
  respondedGeeToken: string;
};

export type TokenQueryResult =
  | {
      status: 'success' | 'http-error';
      message: string;
      httpStatus: number;
      responseBody: string;
    }
  | {
      status: 'error';
      message: string;
      errorKind: 'validation' | 'network' | 'timeout';
    };

type FetchResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

type FetchInit = {
  method: 'POST';
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
};

type FetchImplementation = (
  url: string,
  init: FetchInit
) => Promise<FetchResponse>;

type TokenQueryDependencies = {
  fetchImpl?: FetchImplementation;
  now?: () => number;
  timeoutMs?: number;
};

const CLIENT_REPORT_PATH = '/api/v1/client_report';
const TOKEN_QUERY_PATH = '/api/v1/fp_query';
const DEFAULT_TIMEOUT_MS = 15_000;

const normalizeOrigin = (serverUrl: string): string =>
  serverUrl.trim().replace(/\/+$/, '');

export const createClientReportUrl = (serverUrl: string): string =>
  `${normalizeOrigin(serverUrl)}${CLIENT_REPORT_PATH}`;

export const queryRespondedToken = async (
  request: TokenQueryRequest,
  dependencies: TokenQueryDependencies = {}
): Promise<TokenQueryResult> => {
  const validationError = validate(request);
  if (validationError) {
    return {
      status: 'error',
      message: validationError,
      errorKind: 'validation',
    };
  }

  const abortController = new AbortController();
  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  const fetchImpl: FetchImplementation =
    dependencies.fetchImpl ??
    ((url, init) => fetch(url, init) as Promise<FetchResponse>);

  try {
    const response = await fetchImpl(
      `${normalizeOrigin(request.serverUrl)}${TOKEN_QUERY_PATH}/${encodeURIComponent(request.appId.trim())}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gee_token: request.respondedGeeToken,
          private_key: request.privateKey,
          ts: Math.floor((dependencies.now?.() ?? Date.now()) / 1000),
        }),
        signal: abortController.signal,
      }
    );
    const responseBody = formatResponseBody(await response.text());
    return {
      status: response.ok ? 'success' : 'http-error',
      message: response.ok
        ? 'Token query succeeded'
        : `Token query returned HTTP ${response.status}`,
      httpStatus: response.status,
      responseBody,
    };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        status: 'error',
        message: `Token query timed out after ${timeoutMs / 1000} seconds`,
        errorKind: 'timeout',
      };
    }
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Network request failed',
      errorKind: 'network',
    };
  } finally {
    clearTimeout(timeout);
  }
};

const validate = (request: TokenQueryRequest): string | undefined => {
  if (!request.serverUrl.trim()) return 'Server URL is required';
  if (!request.serverUrl.trim().startsWith('https://')) {
    return 'Server URL must use HTTPS';
  }
  if (!request.appId.trim()) return 'App ID is required';
  if (!request.privateKey.trim()) return 'Private Key is required';
  if (!request.respondedGeeToken.trim()) {
    return 'Responded GeeToken is required';
  }
  return undefined;
};

const formatResponseBody = (body: string): string => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
