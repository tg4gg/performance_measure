const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_DIR = path.join(__dirname, '.cache', 'market-data');
const RESOLVE_CACHE_FILE = path.join(__dirname, '.cache', 'resolve-cache.json');
const ONE_DAY = 24 * 60 * 60;
const RESOLVE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const EXCHANGE_SUFFIX_FALLBACKS = ['.L', '.MI', '.AS', '.PA', '.DE', '.SW', '.MC', '.BR', '.TO'];

const SYMBOL_OVERRIDES = {
  'EXXON': 'XOM',
  'EXXON MOBIL': 'XOM',
  'BRKS': 'AZTA',
  'BERKSHIRE': 'BRK-B',
  'BERKSHIRE HATHAWAY': 'BRK-B',
  'BRK.B': 'BRK-B',
  'SP500': '^GSPC',
  'S&P500': '^GSPC',
  'S&P 500': '^GSPC',
  'NASDAQ': '^IXIC',
  'DOW JONES': '^DJI',
  'RUSSELL 2000': '^RUT',
  'ORO': 'GC=F',
  'GOLD': 'GC=F',
  'PLATA': 'SI=F',
  'SILVER': 'SI=F',
  'BTC': 'BTC-USD',
  'BITCOIN': 'BTC-USD',
  'ETH': 'ETH-USD',
  'ETHER': 'ETH-USD',
  'ETHEREUM': 'ETH-USD',
  'BNB': 'BNB-USD',
  'BINANCE COIN': 'BNB-USD',
  'SOL': 'SOL-USD',
  'SOLANA': 'SOL-USD',
  'XRP': 'XRP-USD',
  'RIPPLE': 'XRP-USD',
  'ADA': 'ADA-USD',
  'CARDANO': 'ADA-USD',
  'DOGE': 'DOGE-USD',
  'DOGECOIN': 'DOGE-USD',
  'TRX': 'TRX-USD',
  'TRON': 'TRX-USD',
  'AVAX': 'AVAX-USD',
  'AVALANCHE': 'AVAX-USD',
  'SHIB': 'SHIB-USD',
  'SHIBA INU': 'SHIB-USD',
  'LINK': 'LINK-USD',
  'CHAINLINK': 'LINK-USD',
  'DOT': 'DOT-USD',
  'POLKADOT': 'DOT-USD',
  'BCH': 'BCH-USD',
  'BITCOIN CASH': 'BCH-USD',
  'LTC': 'LTC-USD',
  'LITECOIN': 'LTC-USD',
  'XLM': 'XLM-USD',
  'STELLAR': 'XLM-USD',
  'HBAR': 'HBAR-USD',
  'HEDERA': 'HBAR-USD',
  'UNI': 'UNI-USD',
  'UNISWAP': 'UNI-USD',
  'ATOM': 'ATOM-USD',
  'COSMOS': 'ATOM-USD',
  'NEAR': 'NEAR-USD',
  'ETC': 'ETC-USD'
};

app.use(express.static(path.join(__dirname, 'public')));

function normalizeSymbol(input) {
  const raw = (input || '').trim();
  if (!raw) return '';

  const upper = raw.toUpperCase();
  if (SYMBOL_OVERRIDES[upper]) return SYMBOL_OVERRIDES[upper];

  const cleaned = upper.replace(/[^A-Z0-9=^.-]/g, ' ').trim();
  if (SYMBOL_OVERRIDES[cleaned]) return SYMBOL_OVERRIDES[cleaned];

  if (cleaned.includes(' ')) return '';

  // Preserve explicit exchange-qualified symbols provided by user.
  if (/^\^?[A-Z]{1,6}\.[A-Z]{1,5}$/.test(cleaned)) return cleaned;
  if (/^\^?[A-Z]{1,6}(?:-[A-Z]{1,5}|=[A-Z])$/.test(cleaned)) return cleaned;

  const direct = cleaned.match(/\^?[A-Z]{1,5}(?:\.[A-Z]{1,4}|-[A-Z]{1,4}|=[A-Z])?/);
  if (direct) return direct[0];

  return '';
}

function cachePath(symbol) {
  const safe = symbol.replace(/[^A-Z0-9=^.-]/gi, '_');
  return path.join(CACHE_DIR, `${safe}.json`);
}

async function readCache(symbol) {
  try {
    const p = cachePath(symbol);
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(symbol, payload) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const p = cachePath(symbol);
  await fs.writeFile(p, JSON.stringify(payload), 'utf8');
}

async function readResolveCache() {
  try {
    const raw = await fs.readFile(RESOLVE_CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeResolveCache(cache) {
  await fs.mkdir(path.dirname(RESOLVE_CACHE_FILE), { recursive: true });
  await fs.writeFile(RESOLVE_CACHE_FILE, JSON.stringify(cache), 'utf8');
}

async function resolveBySearch(query) {
  const q = (query || '').trim();
  if (!q) return null;

  const upper = q.toUpperCase();
  const cleaned = upper.replace(/[^A-Z0-9=^.-]/g, ' ').trim();
  const local = SYMBOL_OVERRIDES[upper] || SYMBOL_OVERRIDES[cleaned];
  if (local) {
    return { symbol: local, source: 'local-alias' };
  }

  const normalizedKey = q.toUpperCase().replace(/\s+/g, ' ').trim();
  const cache = await readResolveCache();
  const cached = cache[normalizedKey];
  if (cached && Date.now() - cached.ts < RESOLVE_TTL_MS) {
    return { symbol: cached.symbol, source: 'resolve-cache', name: cached.name || null };
  }

  const url = new URL('https://query2.finance.yahoo.com/v1/finance/search');
  url.searchParams.set('q', q);
  url.searchParams.set('quotesCount', '8');
  url.searchParams.set('newsCount', '0');

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'performance-measure-preview/1.0'
    }
  });

  if (!res.ok) {
    throw new Error(`Error resolviendo símbolo: proveedor devolvió ${res.status}`);
  }

  const payload = await res.json();
  const quotes = Array.isArray(payload?.quotes) ? payload.quotes : [];
  const allowedTypes = new Set(['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX', 'CRYPTOCURRENCY', 'FUTURE']);

  const candidate = quotes.find(
    (item) => item?.symbol && allowedTypes.has(String(item.quoteType || '').toUpperCase())
  );

  if (!candidate) {
    return null;
  }

  cache[normalizedKey] = {
    symbol: candidate.symbol,
    name: candidate.shortname || candidate.longname || '',
    ts: Date.now()
  };
  await writeResolveCache(cache);

  return {
    symbol: candidate.symbol,
    source: 'yahoo-search',
    name: candidate.shortname || candidate.longname || null
  };
}

async function fetchYahooRange(symbol, period1, period2) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set('period1', String(period1));
  url.searchParams.set('period2', String(period2));
  url.searchParams.set('interval', '1d');
  url.searchParams.set('events', 'history');
  url.searchParams.set('includeAdjustedClose', 'true');

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'performance-measure-preview/1.0'
    }
  });

  if (!res.ok) {
    throw new Error(`Proveedor externo devolvió ${res.status}`);
  }

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    const err = data?.chart?.error?.description || 'Respuesta sin datos';
    throw new Error(err);
  }

  const timestamps = result.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const adj = result?.indicators?.adjclose?.[0]?.adjclose || [];

  const points = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = adj[i] ?? quote.close?.[i];
    if (close == null) continue;

    const ts = timestamps[i];
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    points.push({
      date,
      close: Number(close)
    });
  }

  points.sort((a, b) => (a.date < b.date ? -1 : 1));
  return points;
}

function mergeByDate(existing = [], incoming = []) {
  const byDate = new Map();
  for (const p of existing) byDate.set(p.date, p);
  for (const p of incoming) byDate.set(p.date, p);
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

async function getSymbolDataForResolvedSymbol(resolved) {
  const nowSec = Math.floor(Date.now() / 1000);
  const today = new Date().toISOString().slice(0, 10);

  const cached = await readCache(resolved);

  if (!cached || !Array.isArray(cached.points) || cached.points.length === 0) {
    const freshPoints = await fetchYahooRange(resolved, 0, nowSec + ONE_DAY);
    const payload = {
      symbol: resolved,
      provider: 'yahoo-chart',
      lastUpdated: new Date().toISOString(),
      points: freshPoints
    };
    await writeCache(resolved, payload);
    return payload;
  }

  const lastDate = cached.points[cached.points.length - 1]?.date;
  if (!lastDate || lastDate >= today) {
    return cached;
  }

  const fromSec = Math.floor(new Date(`${lastDate}T00:00:00Z`).getTime() / 1000) + ONE_DAY;
  const missing = await fetchYahooRange(resolved, fromSec, nowSec + ONE_DAY);
  const merged = mergeByDate(cached.points, missing);

  const payload = {
    ...cached,
    lastUpdated: new Date().toISOString(),
    points: merged
  };

  await writeCache(resolved, payload);
  return payload;
}

function buildSymbolCandidates(baseSymbol) {
  const symbol = String(baseSymbol || '').toUpperCase().trim();
  if (!symbol) return [];
  const candidates = [symbol];

  // Try exchange-qualified variants only for plain symbols.
  if (/^[A-Z0-9]{1,6}$/.test(symbol)) {
    for (const suffix of EXCHANGE_SUFFIX_FALLBACKS) {
      candidates.push(`${symbol}${suffix}`);
    }
  }

  return [...new Set(candidates)];
}

async function getPreferredResolvedSymbol(baseSymbol) {
  const key = String(baseSymbol || '').toUpperCase().trim();
  if (!key) return '';
  if (/\.[A-Z]{1,5}$/.test(key)) return key;
  const cache = await readResolveCache();
  const cached = cache[key];
  if (cached && cached.symbol && Date.now() - cached.ts < RESOLVE_TTL_MS) {
    return cached.symbol;
  }
  return key;
}

async function savePreferredResolvedSymbol(baseSymbol, resolvedSymbol) {
  const key = String(baseSymbol || '').toUpperCase().trim();
  const resolved = String(resolvedSymbol || '').toUpperCase().trim();
  if (!key || !resolved || key === resolved) return;

  const cache = await readResolveCache();
  cache[key] = {
    symbol: resolved,
    name: cache[key]?.name || '',
    source: 'suffix-fallback',
    ts: Date.now()
  };
  await writeResolveCache(cache);
}

async function getSymbolData(symbol) {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    throw new Error(`No se pudo resolver símbolo para: ${symbol}`);
  }

  const preferred = await getPreferredResolvedSymbol(normalized);
  const candidates = [preferred, ...buildSymbolCandidates(normalized).filter((c) => c !== preferred)];
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const payload = await getSymbolDataForResolvedSymbol(candidate);
      if (candidate !== normalized) {
        await savePreferredResolvedSymbol(normalized, candidate);
      }
      return payload;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`No se pudo obtener mercado para: ${normalized}`);
}

app.get('/api/performance', async (req, res) => {
  try {
    const symbolRaw = String(req.query.symbol || '');
    const payload = await getSymbolData(symbolRaw);
    res.json(payload);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error obteniendo datos de mercado' });
  }
});

app.get('/api/resolve', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    if (!query) {
      res.status(400).json({ error: 'Debe enviar query' });
      return;
    }

    const resolved = await resolveBySearch(query);
    if (!resolved) {
      res.status(404).json({ error: `No se encontró símbolo para "${query}"` });
      return;
    }

    res.json({
      query,
      symbol: resolved.symbol,
      name: resolved.name || null,
      source: resolved.source
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error resolviendo símbolo' });
  }
});

app.get('/api/performance/batch', async (req, res) => {
  try {
    const symbolsRaw = String(req.query.symbols || '');
    const symbols = symbolsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (symbols.length === 0) {
      res.status(400).json({ error: 'Debe enviar al menos un símbolo' });
      return;
    }

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const data = await getSymbolData(symbol);
        return {
          symbol: data.symbol,
          points: data.points
        };
      })
    );

    res.json({ results });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error en batch' });
  }
});

app.listen(PORT, () => {
  console.log(`Preview lista en http://localhost:${PORT}`);
});
