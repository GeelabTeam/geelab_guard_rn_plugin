import { describe, expect, it, jest } from '@jest/globals';
import { createClientReportUrl, queryRespondedToken } from '../TokenQuery';

const request = {
  serverUrl: 'https://riskct-global.geelabapi.com/',
  appId: 'test-app-id',
  privateKey: 'test-private-key',
  respondedGeeToken: 'test-responded-token',
};

describe('GeelabGuard example token query', () => {
  it('builds the SDK client report URL from an origin', () => {
    expect(createClientReportUrl(request.serverUrl)).toBe(
      'https://riskct-global.geelabapi.com/api/v1/client_report'
    );
  });

  it('posts the responded token with a live Unix timestamp', async () => {
    const fetchImpl = jest.fn(async () => response(200, '{"risk":"low"}'));

    const result = await queryRespondedToken(request, {
      fetchImpl,
      now: () => 1_712_345_678_999,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://riskct-global.geelabapi.com/api/v1/fp_query/test-app-id',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gee_token: 'test-responded-token',
          private_key: 'test-private-key',
          ts: 1_712_345_678,
        }),
      })
    );
    expect(result).toEqual({
      status: 'success',
      message: 'Token query succeeded',
      httpStatus: 200,
      responseBody: '{\n  "risk": "low"\n}',
    });
  });

  it('preserves plaintext responses', async () => {
    const result = await queryRespondedToken(request, {
      fetchImpl: async () => response(200, 'plain response'),
    });

    expect(result).toEqual({
      status: 'success',
      message: 'Token query succeeded',
      httpStatus: 200,
      responseBody: 'plain response',
    });
  });

  it('returns the status and body for non-2xx responses', async () => {
    const result = await queryRespondedToken(request, {
      fetchImpl: async () => response(401, '{"message":"denied"}'),
    });

    expect(result).toEqual({
      status: 'http-error',
      message: 'Token query returned HTTP 401',
      httpStatus: 401,
      responseBody: '{\n  "message": "denied"\n}',
    });
  });

  it('rejects missing query fields before making a request', async () => {
    const fetchImpl = jest.fn(async () => response(200, '{}'));

    const result = await queryRespondedToken(
      { ...request, privateKey: '' },
      { fetchImpl }
    );

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'error',
      message: 'Private Key is required',
      errorKind: 'validation',
    });
  });

  it('reports network failures without exposing request values', async () => {
    const result = await queryRespondedToken(request, {
      fetchImpl: async () => {
        throw new Error('Network request failed');
      },
    });

    expect(result).toEqual({
      status: 'error',
      message: 'Network request failed',
      errorKind: 'network',
    });
    expect(JSON.stringify(result)).not.toContain('test-private-key');
    expect(JSON.stringify(result)).not.toContain('test-responded-token');
  });

  it('aborts and reports requests that exceed the timeout', async () => {
    jest.useFakeTimers();
    const query = queryRespondedToken(request, {
      timeoutMs: 15_000,
      fetchImpl: async (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    });

    await jest.advanceTimersByTimeAsync(15_000);

    await expect(query).resolves.toEqual({
      status: 'error',
      message: 'Token query timed out after 15 seconds',
      errorKind: 'timeout',
    });
    jest.useRealTimers();
  });
});

function response(status: number, body: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}
