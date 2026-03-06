import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import http from 'http';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function jsonResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
}

function requestJson(server, routePath) {
  const { port } = server.address();

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: routePath,
        method: 'GET'
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: body ? JSON.parse(body) : null
          });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

describe('server resolve fallback', () => {
  let server;
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn(async (url) => {
      const parsed = new URL(String(url));

      if (parsed.hostname === 'query2.finance.yahoo.com') {
        return jsonResponse(200, {
          quotes: []
        });
      }

      if (parsed.hostname === 'api.openfigi.com') {
        return jsonResponse(200, [
          {
            data: [
              {
                ticker: 'BRK/B',
                exchCode: 'US',
                name: 'BERKSHIRE HATHAWAY INC-CL B',
                securityType: 'Common Stock',
                marketSector: 'Equity'
              }
            ]
          }
        ]);
      }

      if (parsed.hostname === 'query1.finance.yahoo.com') {
        if (parsed.pathname.endsWith('/BRK-B')) {
          return jsonResponse(200, {
            chart: {
              result: [
                {
                  timestamp: [1704067200, 1704153600],
                  indicators: {
                    quote: [{ close: [350.12, 351.45] }],
                    adjclose: [{ adjclose: [350.12, 351.45] }]
                  }
                }
              ]
            }
          });
        }

        return jsonResponse(404, {
          chart: {
            error: {
              description: 'No data'
            }
          }
        });
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const { startServer } = require('../server.js');
    server = startServer(0);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
    global.fetch = originalFetch;
  });

  it('falls back to OpenFIGI for WKN when Yahoo search has no direct result', async () => {
    const response = await requestJson(server, '/api/resolve?query=Z9Y8X7');

    expect(response.status).toBe(200);
    expect(response.body.symbol).toBe('BRK-B');
    expect(['openfigi', 'resolve-cache']).toContain(response.body.source);
    expect(response.body.name).toContain('BERKSHIRE');
  });
});
