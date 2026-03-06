const resolverAliases = {
  APPLE: 'AAPL',
  MICROSOFT: 'MSFT',
  GOOGLE: 'GOOGL',
  ALPHABET: 'GOOGL',
  AMAZON: 'AMZN',
  TESLA: 'TSLA',
  NVIDIA: 'NVDA',
  META: 'META',
  EXXON: 'XOM',
  'EXXON MOBIL': 'XOM',
  BRKS: 'AZTA',
  BERKSHIRE: 'BRK-B',
  'BERKSHIRE HATHAWAY': 'BRK-B',
  'BRK.B': 'BRK-B',
  SP500: '^GSPC',
  'S&P 500': '^GSPC',
  NASDAQ: '^IXIC',
  ORO: 'GC=F',
  GOLD: 'GC=F',
  PLATA: 'SI=F',
  SILVER: 'SI=F',
  BTC: 'BTC-USD',
  BITCOIN: 'BTC-USD',
  ETH: 'ETH-USD',
  ETHER: 'ETH-USD',
  ETHEREUM: 'ETH-USD',
  BNB: 'BNB-USD',
  'BINANCE COIN': 'BNB-USD',
  SOL: 'SOL-USD',
  SOLANA: 'SOL-USD',
  XRP: 'XRP-USD',
  RIPPLE: 'XRP-USD',
  ADA: 'ADA-USD',
  CARDANO: 'ADA-USD',
  DOGE: 'DOGE-USD',
  DOGECOIN: 'DOGE-USD',
  TRX: 'TRX-USD',
  TRON: 'TRX-USD',
  AVAX: 'AVAX-USD',
  AVALANCHE: 'AVAX-USD',
  SHIB: 'SHIB-USD',
  'SHIBA INU': 'SHIB-USD',
  LINK: 'LINK-USD',
  CHAINLINK: 'LINK-USD',
  DOT: 'DOT-USD',
  POLKADOT: 'DOT-USD',
  BCH: 'BCH-USD',
  'BITCOIN CASH': 'BCH-USD',
  LTC: 'LTC-USD',
  LITECOIN: 'LTC-USD',
  XLM: 'XLM-USD',
  STELLAR: 'XLM-USD',
  HBAR: 'HBAR-USD',
  HEDERA: 'HBAR-USD',
  UNI: 'UNI-USD',
  UNISWAP: 'UNI-USD',
  ATOM: 'ATOM-USD',
  COSMOS: 'ATOM-USD',
  NEAR: 'NEAR-USD',
  ETC: 'ETC-USD'
};

const basePalette = ['#4db5ff', '#6fffb4', '#ffcb6b', '#ff7a90', '#7cc6ff', '#9cffd3'];
const PROCESSING_MIN_MS =
  typeof window !== 'undefined' && /jsdom/i.test(window.navigator.userAgent) ? 0 : 180;
const METRICS_REFRESH_DEBOUNCE_MS =
  typeof window !== 'undefined' && /jsdom/i.test(window.navigator.userAgent) ? 0 : 180;
const EURUSD_SYMBOL = 'EURUSD=X';
const METRICS_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const modeConfigs = {
  pm: {
    storageKey: 'groups',
    title: 'Performance Measure',
    subtitle: 'Pega texto libre, detecta activos, arma grupos ponderados y compara performance.',
    builderTitle: '1) Texto libre / multilinea',
    builderHint:
      'Una linea por activo. Puedes usar ticker, alias o nombre libre. Si agregas un numero al final, se interpreta como peso porcentual.',
    builderPlaceholder: 'Ejemplo:\nApple\noro\nS&P 500\nNasdaq\nNVDA, 25',
    detectLabel: 'Detectar activos',
    collectionTitle: '2) Crear grupo compuesto',
    collectionHint: 'Los grupos mantienen pesos relativos y se pueden comparar como una sola seleccion.',
    namePlaceholder: 'Nombre del grupo (ej. Materias Primas)',
    saveLabel: 'Guardar grupo',
    updateLabel: 'Actualizar grupo',
    emptyCollectionText: 'No hay grupos guardados todavia.',
    compareTitle: '3) Comparacion',
    compareHint:
      'Cada campo acepta ticker, WKN, ISIN o nombre exacto de grupo creado. Puedes ejecutar con 1 a 4 selecciones.',
    comparePlaceholderBase: 'ticker o grupo',
    compareButtonLabel: 'Analizar seleccion',
    clearButtonLabel: 'Limpiar seleccion',
    itemDetectedLabel: 'activo(s) detectado(s)',
    collectionSingular: 'grupo',
    collectionPlural: 'grupos',
    viewComponentsLabel: 'Ver componentes',
    directEntryKind: 'ticker'
  },
  mpm: {
    storageKey: 'mpmPortfolios',
    title: 'My Performance Measure',
    subtitle:
      'Registra holdings reales con precio de compra, unidades, venta opcional y portfolios con subsets reutilizables.',
    builderTitle: '1) Holdings del portfolio',
    builderHint:
      'Formato flexible por linea: AAPL, 182.4, 12 o AAPL, price=182.4, units=12, buyDate=2025-01-10, sell=2025-12-01. Los subsets se agregan aparte.',
    builderPlaceholder:
      'Ejemplo:\nAAPL, 182.4, 12, buyDate=2025-01-10\nMSFT, price=420, units=6\nNVDA, price=610, units=4, sell=2025-09-20',
    detectLabel: 'Detectar holdings',
    collectionTitle: '2) Crear portfolio',
    collectionHint:
      'Un portfolio puede incluir holdings directos y subsets que referencian otros portfolios ya guardados.',
    namePlaceholder: 'Nombre del portfolio (ej. Largo plazo)',
    saveLabel: 'Guardar portfolio',
    updateLabel: 'Actualizar portfolio',
    emptyCollectionText: 'No hay portfolios guardados todavia.',
    compareTitle: '3) Comparacion PM / MPM',
    compareHint:
      'Cada campo acepta ticker, WKN, ISIN, portfolio o subset. Puedes ejecutar con 1 a 4 selecciones. Los portfolios se comparan usando costo base, unidades y fechas de compra/venta si existen.',
    comparePlaceholderBase: 'ticker, portfolio o subset',
    compareButtonLabel: 'Analizar seleccion',
    clearButtonLabel: 'Limpiar seleccion',
    itemDetectedLabel: 'holding(s) detectado(s)',
    collectionSingular: 'portfolio',
    collectionPlural: 'portfolios',
    viewComponentsLabel: 'Ver holdings',
    directEntryKind: 'ticker'
  }
};

function colorForSeries(index) {
  if (index < basePalette.length) return basePalette[index];
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 78% 62%)`;
}

function loadLocal(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createModeState(mode) {
  const stored = loadLocal(modeConfigs[mode].storageKey, []);
  return {
    draftItems: [],
    collections: Array.isArray(stored) ? stored : [],
    activeRange: 'ytd',
    lastCompare: null,
    editingIndex: null,
    rawInput: '',
    draftName: '',
    compareDraft: ['', '', '', ''],
    sectionMetrics: {
      full: null,
      items: {},
      status: '',
      refreshedAt: 0
    }
  };
}

const state = {
  activeMode: loadLocal('activeMode', 'pm'),
  modes: {
    pm: createModeState('pm'),
    mpm: createModeState('mpm')
  },
  marketCache: {},
  resolveCache: loadLocal('resolveCache', {}),
  symbolNames: loadLocal('symbolNames', {}),
  mpmMetricsCache: loadLocal('mpmMetricsCache', {}),
  chart: null
};

const modeSwitch = document.getElementById('modeSwitch');
const modeTitle = document.getElementById('modeTitle');
const modeSubtitle = document.getElementById('modeSubtitle');
const builderTitle = document.getElementById('builderTitle');
const builderHint = document.getElementById('builderHint');
const input = document.getElementById('rawInput');
const detectBtn = document.getElementById('detectBtn');
const detectInfo = document.getElementById('detectInfo');
const assetsContainer = document.getElementById('assetsContainer');
const collectionTitle = document.getElementById('collectionTitle');
const collectionHint = document.getElementById('collectionHint');
const groupName = document.getElementById('groupName');
const saveGroupBtn = document.getElementById('saveGroupBtn');
const groupsContainer = document.getElementById('groupsContainer');
const subsetBuilder = document.getElementById('subsetBuilder');
const subsetPortfolioInput = document.getElementById('subsetPortfolioInput');
const addSubsetBtn = document.getElementById('addSubsetBtn');
const portfolioSuggestions = document.getElementById('portfolioSuggestions');
const draftMetricsSection = document.getElementById('draftMetricsSection');
const refreshDraftMetricsBtn = document.getElementById('refreshDraftMetricsBtn');
const draftMetricsStatus = document.getElementById('draftMetricsStatus');
const draftMetricsCard = document.getElementById('draftMetricsCard');
const compareTitle = document.getElementById('compareTitle');
const compareHint = document.getElementById('compareHint');
const runCompareBtn = document.getElementById('runCompareBtn');
const clearCompareBtn = document.getElementById('clearCompareBtn');
const compareFields = [
  document.getElementById('compareField1'),
  document.getElementById('compareField2'),
  document.getElementById('compareField3'),
  document.getElementById('compareField4')
];
const compareSuggestions = document.getElementById('compareSuggestions');
const perfHeadLabel = document.getElementById('perfHeadLabel');
const perfHeadYtd = document.getElementById('perfHeadYtd');
const perfHead1y = document.getElementById('perfHead1y');
const perfHead3y = document.getElementById('perfHead3y');
const perfHeadAllTime = document.getElementById('perfHeadAllTime');
const perfHeadGainUsd = document.getElementById('perfHeadGainUsd');
const perfHeadGainPerUnit = document.getElementById('perfHeadGainPerUnit');
const perfHeadValueUsd = document.getElementById('perfHeadValueUsd');
const perfHeadValueEur = document.getElementById('perfHeadValueEur');
const perfTableBody = document.getElementById('perfTableBody');
const yoyTitle = document.getElementById('yoyTitle');
const yoyTableBody = document.getElementById('yoyTableBody');
const chartLegend = document.getElementById('chartLegend');
const compareWarning = document.getElementById('compareWarning');
const rangeButtons = document.getElementById('rangeButtons');
const pendingSymbolNameRequests = new Map();
let pendingMpmMetricsRefresh = null;

function getActiveModeState() {
  return state.modes[state.activeMode];
}

function getModeState(mode) {
  return state.modes[mode];
}

function getModeConfig(mode = state.activeMode) {
  return modeConfigs[mode];
}

function persistModeCollections(mode) {
  saveLocal(modeConfigs[mode].storageKey, getModeState(mode).collections);
}

function saveMpmMetricsCache() {
  saveLocal('mpmMetricsCache', state.mpmMetricsCache);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withButtonProcessing(button, action) {
  if (!button) return action();
  const original = button.textContent;
  const startedAt = Date.now();
  button.disabled = true;
  button.textContent = 'Procesando...';

  try {
    return await action();
  } finally {
    const elapsed = Date.now() - startedAt;
    if (elapsed < PROCESSING_MIN_MS) {
      await sleep(PROCESSING_MIN_MS - elapsed);
    }
    button.disabled = false;
    button.textContent = original;
  }
}

try {
  localStorage.removeItem('marketCache');
} catch {
  // Ignore storage access issues.
}

function normalizeLine(line) {
  const upper = line.trim().toUpperCase();
  if (!upper) return '';
  if (resolverAliases[upper]) return resolverAliases[upper];

  const cleaned = upper.replace(/[^A-Z0-9=^.-]/g, ' ').trim();
  if (resolverAliases[cleaned]) return resolverAliases[cleaned];
  if (cleaned.includes(' ')) return '';
  if (/^[A-Z0-9]{6}$/.test(cleaned)) return '';
  if (/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(cleaned)) return '';

  if (/^\^?[A-Z]{1,6}\.[A-Z]{1,5}$/.test(cleaned)) return cleaned;
  if (/^\^?[A-Z]{1,6}(?:-[A-Z]{1,5}|=[A-Z])$/.test(cleaned)) return cleaned;

  const maybeTicker = cleaned.match(/\^?[A-Z]{1,5}(?:\.[A-Z]{1,4}|-[A-Z]{1,4}|=[A-Z])?/);
  return maybeTicker ? maybeTicker[0] : '';
}

async function resolveInputToSymbol(raw) {
  const direct = normalizeLine(raw);
  if (direct) {
    return { symbol: direct, source: 'local' };
  }

  const key = String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!key) {
    throw new Error('Entrada vacia');
  }

  const cached = state.resolveCache[key];
  if (cached && cached.symbol) {
    if (cached.name) {
      state.symbolNames[cached.symbol] = cached.name;
    }
    return { symbol: cached.symbol, source: 'local-cache' };
  }

  const res = await fetch(`/api/resolve?query=${encodeURIComponent(raw)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `No se pudo resolver "${raw}"`);
  }

  const payload = await res.json();
  if (!payload.symbol) {
    throw new Error(`No se pudo resolver "${raw}"`);
  }

  state.resolveCache[key] = {
    symbol: payload.symbol,
    name: payload.name || '',
    source: payload.source || 'remote',
    ts: Date.now()
  };
  saveLocal('resolveCache', state.resolveCache);
  if (payload.name) {
    state.symbolNames[payload.symbol] = payload.name;
    saveLocal('symbolNames', state.symbolNames);
  }

  return { symbol: payload.symbol, source: payload.source || 'remote' };
}

async function ensureSymbolName(symbol) {
  if (!symbol) return null;
  if (state.symbolNames[symbol]) return state.symbolNames[symbol];
  if (pendingSymbolNameRequests.has(symbol)) {
    return pendingSymbolNameRequests.get(symbol);
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/resolve?query=${encodeURIComponent(symbol)}`);
      if (!res.ok) return null;
      const payload = await res.json();
      if (!payload?.symbol || !payload?.name) return null;
      state.symbolNames[payload.symbol] = payload.name;
      state.symbolNames[symbol] = payload.name;
      saveLocal('symbolNames', state.symbolNames);
      return payload.name;
    } catch {
      return null;
    } finally {
      pendingSymbolNameRequests.delete(symbol);
    }
  })();

  pendingSymbolNameRequests.set(symbol, promise);
  return promise;
}

function setTickerTitle(node, symbol) {
  if (!node || !symbol) return;
  const name = state.symbolNames[symbol];
  node.title = name ? `${symbol} - ${name}` : `Resolviendo nombre para ${symbol}...`;
}

function bindTickerHoverResolvers(rootNode) {
  if (!rootNode) return;
  const nodes = [...rootNode.querySelectorAll('[data-symbol]')];
  nodes.forEach((node) => {
    if (node.dataset.hoverBound === '1') return;
    node.dataset.hoverBound = '1';
    node.addEventListener('mouseenter', async () => {
      const symbol = node.dataset.symbol;
      if (!symbol) return;
      await ensureSymbolName(symbol);
      setTickerTitle(node, symbol);
    });
  });
}

async function enrichTickerHover(rootNode) {
  if (!rootNode) return;
  const nodes = [...rootNode.querySelectorAll('[data-symbol]')];
  const symbols = [...new Set(nodes.map((n) => n.dataset.symbol).filter(Boolean))];
  nodes.forEach((node) => setTickerTitle(node, node.dataset.symbol));
  bindTickerHoverResolvers(rootNode);
  await Promise.all(symbols.map((s) => ensureSymbolName(s)));
  nodes.forEach((node) => setTickerTitle(node, node.dataset.symbol));
}

function parsePmLineEntry(line) {
  const text = String(line || '').trim();
  if (!text) return null;

  const delimMatch = text.match(/^(.+?)[\t,;|]\s*([+-]?\d+(?:[.,]\d+)?)\s*%?\s*$/);
  if (delimMatch) {
    return {
      raw: delimMatch[1].trim(),
      weight: Number(delimMatch[2].replace(',', '.'))
    };
  }

  const pctMatch = text.match(/^(.+?)\s+([+-]?\d+(?:[.,]\d+)?)\s*%$/);
  if (pctMatch) {
    return {
      raw: pctMatch[1].trim(),
      weight: Number(pctMatch[2].replace(',', '.'))
    };
  }

  return { raw: text, weight: null };
}

function assignDraftWeights(entries) {
  const explicit = entries.filter((a) => a.weight != null && !Number.isNaN(a.weight));
  const implicit = entries.filter((a) => a.weight == null || Number.isNaN(a.weight));

  if (explicit.length === 0) {
    const equalWeight = entries.length > 0 ? Number((100 / entries.length).toFixed(2)) : 0;
    entries.forEach((a) => {
      a.weight = equalWeight;
    });
    return entries;
  }

  const sumExplicit = explicit.reduce((sum, a) => sum + Number(a.weight || 0), 0);
  if (implicit.length === 0) {
    return entries.map((a) => ({ ...a, weight: Number(a.weight || 0) }));
  }

  const remaining = Math.max(0, 100 - sumExplicit);
  const split = Number((remaining / implicit.length).toFixed(4));
  return entries.map((a) => ({
    ...a,
    weight: a.weight == null || Number.isNaN(a.weight) ? split : Number(a.weight)
  }));
}

function parseMaybeNumber(value) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMpmLineEntry(line) {
  const text = String(line || '').trim();
  if (!text) return null;

  const segments = text
    .split(/[\t,;|]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length === 0) return null;

  const [raw, ...rest] = segments;
  const parsed = {
    raw,
    purchasePrice: null,
    units: null,
    buyDate: '',
    sellDate: ''
  };

  rest.forEach((token) => {
    const named = token.match(
      /^(price|purchase|buy|cost|units|qty|quantity|shares|buydate|buy_date|start|opened|sell|selldate|sell_date|sold|date)\s*=\s*(.+)$/i
    );
    if (named) {
      const key = named[1].toLowerCase();
      const value = named[2].trim();
      if (['price', 'purchase', 'buy', 'cost'].includes(key)) {
        parsed.purchasePrice = parseMaybeNumber(value);
        return;
      }
      if (['units', 'qty', 'quantity', 'shares'].includes(key)) {
        parsed.units = parseMaybeNumber(value);
        return;
      }
      if (['buydate', 'buy_date', 'start', 'opened'].includes(key)) {
        parsed.buyDate = value;
        return;
      }
      parsed.sellDate = value;
      return;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
      if (!parsed.buyDate) {
        parsed.buyDate = token;
      } else {
        parsed.sellDate = token;
      }
      return;
    }

    const numeric = parseMaybeNumber(token);
    if (numeric != null) {
      if (parsed.purchasePrice == null) {
        parsed.purchasePrice = numeric;
      } else if (parsed.units == null) {
        parsed.units = numeric;
      }
    }
  });

  return parsed;
}

function sanitizeDate(value) {
  if (!value) return '';
  const raw = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

async function detectAssetsFromText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const unique = new Map();
  const unresolved = [];

  for (const line of lines) {
    const parsed = parsePmLineEntry(line);
    if (!parsed) continue;

    try {
      const resolved = await resolveInputToSymbol(parsed.raw);
      if (!unique.has(resolved.symbol)) {
        unique.set(resolved.symbol, {
          raw: parsed.raw,
          symbol: resolved.symbol,
          weight: parsed.weight
        });
      } else if (parsed.weight != null && !Number.isNaN(parsed.weight)) {
        const prev = unique.get(resolved.symbol);
        prev.weight = Number(prev.weight || 0) + Number(parsed.weight);
      }
    } catch {
      unresolved.push(parsed.raw);
    }
  }

  return { items: assignDraftWeights([...unique.values()]), unresolved };
}

async function detectHoldingsFromText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const items = [];
  const unresolved = [];

  for (const line of lines) {
    const parsed = parseMpmLineEntry(line);
    if (!parsed) continue;

    try {
      const resolved = await resolveInputToSymbol(parsed.raw);
      items.push({
        type: 'holding',
        raw: parsed.raw,
        symbol: resolved.symbol,
        purchasePrice: parsed.purchasePrice,
        units: parsed.units,
        buyDate: sanitizeDate(parsed.buyDate),
        sellDate: sanitizeDate(parsed.sellDate),
        sourcePath: []
      });
    } catch {
      unresolved.push(parsed.raw);
    }
  }

  return { items, unresolved };
}

function formatInputNumber(value) {
  return value == null || Number.isNaN(value) ? '' : String(value);
}

function formatShortNumber(value) {
  if (value == null || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(2).replace(/\.00$/, '');
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function summarizeMpmItem(item) {
  if (item.type === 'portfolio') {
    return `<span class="badge">Subset</span> <span class="group-pick" data-pick-value="${escapeHtml(
      item.refName
    )}">${escapeHtml(item.refName)}</span>`;
  }
  const details = [];
  if (item.purchasePrice != null) details.push(`cost ${formatShortNumber(item.purchasePrice)}`);
  if (item.units != null) details.push(`units ${formatShortNumber(item.units)}`);
  if (item.buyDate) details.push(`buy ${item.buyDate}`);
  if (item.sellDate) details.push(`sell ${item.sellDate}`);
  const meta = details.length ? ` · ${details.join(' · ')}` : '';
  return `<span class="group-pick" data-pick-value="${escapeHtml(item.symbol)}" data-symbol="${escapeHtml(
    item.symbol
  )}">${escapeHtml(item.symbol)}</span>${meta}`;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cloneMetricPayload(payload) {
  return payload ? JSON.parse(JSON.stringify(payload)) : null;
}

function createMetricCacheKey(entry) {
  const holdings = (entry?.holdings || []).map((holding) => ({
    symbol: holding.symbol,
    purchasePrice: holding.purchasePrice ?? null,
    units: holding.units ?? null,
    buyDate: holding.buyDate || '',
    sellDate: holding.sellDate || ''
  }));
  return JSON.stringify(holdings);
}

function getCachedMetricPayload(cacheKey) {
  const cached = state.mpmMetricsCache[cacheKey];
  if (!cached) return null;
  if (Date.now() - Number(cached.ts || 0) > METRICS_CACHE_TTL_MS) return null;
  return cloneMetricPayload(cached.payload);
}

function storeCachedMetricPayload(cacheKey, payload) {
  state.mpmMetricsCache[cacheKey] = {
    ts: Date.now(),
    payload
  };
  saveMpmMetricsCache();
}

function renderMetricGrid(metrics) {
  if (!metrics) {
    return '<div class="metrics-note">Sin datos calculados.</div>';
  }
  if (metrics.loading) {
    return '<div class="metrics-note">Calculando metricas...</div>';
  }
  if (metrics.error) {
    return `<div class="metrics-note">${escapeHtml(metrics.error)}</div>`;
  }

  return `
    <div class="metrics-grid">
      <div class="metric-chip"><strong>All time %</strong><span>${formatPct(metrics.allTimePct)}</span></div>
      <div class="metric-chip"><strong>Gain USD</strong><span>${formatUsd(metrics.totalGainUsd)}</span></div>
      <div class="metric-chip"><strong>Gain/unit</strong><span>${formatUsd(metrics.gainPerUnit)}</span></div>
      <div class="metric-chip"><strong>Value USD</strong><span>${formatUsd(metrics.currentValueUsd)}</span></div>
      <div class="metric-chip"><strong>Value EUR</strong><span>${formatEur(metrics.currentValueEur)}</span></div>
    </div>
  `;
}

function getItemMetricTarget(item, collections) {
  if (!item) return null;

  if (item.type === 'portfolio') {
    const collection = findCollectionByName('mpm', item.refName, collections);
    if (!collection) {
      return {
        entry: null,
        error: `Subset "${item.refName}" no encontrado.`
      };
    }

    return {
      entry: {
        label: item.refName,
        holdings: expandMpmCollection(collection, collections, new Set([collection.name.toLowerCase()]), [])
      },
      error: null
    };
  }

  return {
    entry: {
      label: item.symbol,
      holdings: [{ ...item, sourcePath: [] }]
    },
    error: null
  };
}

function getDraftMetricTarget(draftItems, collections) {
  try {
    const normalizedItems = normalizeMpmDraftItems(draftItems);
    return {
      entry: {
        label: 'Draft MPM',
        holdings: expandMpmCollection({ name: '__draft__', items: normalizedItems }, collections, new Set(), [])
      },
      error: null
    };
  } catch (err) {
    return {
      entry: null,
      error: err?.message || 'No se pudo calcular el draft.'
    };
  }
}

function renderAssetsDraft() {
  const mode = state.activeMode;
  const modeState = getActiveModeState();
  assetsContainer.innerHTML = '';

  modeState.draftItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = mode === 'mpm' ? 'asset-card' : '';
    const row = document.createElement('div');
    const metricKey = `item-${index}`;
    const metricState = mode === 'mpm' ? modeState.sectionMetrics.items[metricKey] || null : null;

    if (mode === 'pm') {
      row.className = 'asset-row pm-row';
      row.innerHTML = `
        <span class="pill">${escapeHtml(item.raw)} -> <span data-symbol="${escapeHtml(item.symbol)}">${escapeHtml(
          item.symbol
        )}</span></span>
        <input type="number" min="0" step="0.01" value="${formatInputNumber(item.weight)}" data-index="${index}" data-field="weight" />
        <span class="muted">peso %</span>
      `;

      row.querySelector('input').addEventListener('input', (e) => {
        modeState.draftItems[index].weight = Number(e.target.value || 0);
      });
    } else if (item.type === 'portfolio') {
      row.className = 'asset-row subset-row';
      row.innerHTML = `
        <span class="pill subset-pill">Subset -> ${escapeHtml(item.refName)}</span>
        <span class="muted">Reusa el portfolio guardado dentro de este portfolio.</span>
        <div class="group-actions">
          <button type="button" class="warn" data-action="remove-subset" data-index="${index}">Quitar</button>
        </div>
      `;
      row.querySelector('button').addEventListener('click', () => {
        modeState.draftItems.splice(index, 1);
        renderAssetsDraft();
        scheduleMpmSectionMetricsRefresh();
      });
    } else {
      row.className = 'asset-row mpm-row';
      row.innerHTML = `
        <span class="pill">${escapeHtml(item.raw)} -> <span data-symbol="${escapeHtml(item.symbol)}">${escapeHtml(
          item.symbol
        )}</span></span>
        <input type="number" min="0" step="0.0001" value="${formatInputNumber(item.purchasePrice)}" data-index="${index}" data-field="purchasePrice" placeholder="Compra" />
        <input type="number" min="0" step="0.0001" value="${formatInputNumber(item.units)}" data-index="${index}" data-field="units" placeholder="Unidades" />
        <input type="date" value="${escapeHtml(item.buyDate || '')}" data-index="${index}" data-field="buyDate" />
        <input type="date" value="${escapeHtml(item.sellDate || '')}" data-index="${index}" data-field="sellDate" />
        <div class="group-actions">
          <button type="button" class="warn" data-action="remove-holding" data-index="${index}">Quitar</button>
        </div>
      `;

      row.querySelectorAll('input').forEach((field) => {
        field.addEventListener('input', (e) => {
          const target = modeState.draftItems[index];
          const key = e.target.dataset.field;
          if (!target || !key) return;
          if (key === 'sellDate' || key === 'buyDate') {
            target[key] = sanitizeDate(e.target.value);
            scheduleMpmSectionMetricsRefresh();
            return;
          }
          target[key] = parseMaybeNumber(e.target.value);
          scheduleMpmSectionMetricsRefresh();
        });
      });

      row.querySelector('button').addEventListener('click', () => {
        modeState.draftItems.splice(index, 1);
        renderAssetsDraft();
        scheduleMpmSectionMetricsRefresh();
      });
    }

    if (mode === 'mpm') {
      card.appendChild(row);
      const metricBlock = document.createElement('div');
      metricBlock.innerHTML = renderMetricGrid(metricState);
      card.appendChild(metricBlock);
      assetsContainer.appendChild(card);
    } else {
      assetsContainer.appendChild(row);
    }
  });

  renderDraftMetricsPanel();
  void enrichTickerHover(assetsContainer);
}

function renderDraftMetricsPanel() {
  if (!draftMetricsSection || !draftMetricsCard || !draftMetricsStatus) return;

  const isMpm = state.activeMode === 'mpm';
  draftMetricsSection.classList.toggle('hidden', !isMpm);
  if (!isMpm) return;

  const modeState = getModeState('mpm');
  draftMetricsCard.innerHTML = renderMetricGrid(modeState.sectionMetrics.full);
  draftMetricsStatus.textContent = modeState.sectionMetrics.status || '';
}

async function refreshMpmSectionMetrics(force = false) {
  if (state.activeMode !== 'mpm') return;

  const modeState = getModeState('mpm');
  const collections = modeState.collections;
  const nextSectionMetrics = {
    full: null,
    items: {},
    status: modeState.sectionMetrics.status,
    refreshedAt: modeState.sectionMetrics.refreshedAt
  };

  const targets = [];
  modeState.draftItems.forEach((item, index) => {
    const target = getItemMetricTarget(item, collections);
    const id = `item-${index}`;
    if (!target?.entry) {
      nextSectionMetrics.items[id] = target?.error ? { error: target.error } : null;
      return;
    }

    const cacheKey = createMetricCacheKey(target.entry);
    const cached = !force ? getCachedMetricPayload(cacheKey) : null;
    if (cached) {
      nextSectionMetrics.items[id] = cached;
      return;
    }

    nextSectionMetrics.items[id] = { loading: true };
    targets.push({ id, kind: 'item', cacheKey, entry: target.entry });
  });

  const fullTarget = getDraftMetricTarget(modeState.draftItems, collections);
  if (fullTarget?.entry) {
    const fullCacheKey = createMetricCacheKey(fullTarget.entry);
    const cached = !force ? getCachedMetricPayload(fullCacheKey) : null;
    if (cached) {
      nextSectionMetrics.full = cached;
    } else {
      nextSectionMetrics.full = { loading: true };
      targets.push({ id: 'full', kind: 'full', cacheKey: fullCacheKey, entry: fullTarget.entry });
    }
  } else {
    nextSectionMetrics.full = fullTarget?.error ? { error: fullTarget.error } : null;
  }

  modeState.sectionMetrics = nextSectionMetrics;
  renderDraftMetricsPanel();
  renderAssetsDraft();

  if (targets.length === 0) {
    modeState.sectionMetrics.status = modeState.draftItems.length > 0 ? 'Metricas al dia.' : '';
    renderDraftMetricsPanel();
    return;
  }

  const symbols = [
    ...new Set(targets.flatMap((target) => (target.entry.holdings || []).map((holding) => holding.symbol)))
  ];
  symbols.push(EURUSD_SYMBOL);
  const { symbolsData } = await loadSymbolsDataSafe([...new Set(symbols)]);

  targets.forEach((target) => {
    const metrics = computeEntrySnapshot(target.entry, symbolsData, 'mpm');
    storeCachedMetricPayload(target.cacheKey, metrics);
    if (target.kind === 'full') {
      modeState.sectionMetrics.full = metrics;
    } else {
      modeState.sectionMetrics.items[target.id] = metrics;
    }
  });

  modeState.sectionMetrics.status = `Actualizado ${new Date().toLocaleString()}`;
  modeState.sectionMetrics.refreshedAt = Date.now();
  renderDraftMetricsPanel();
  renderAssetsDraft();
}

function scheduleMpmSectionMetricsRefresh(force = false) {
  if (state.activeMode !== 'mpm') return;
  if (pendingMpmMetricsRefresh) {
    clearTimeout(pendingMpmMetricsRefresh);
  }
  pendingMpmMetricsRefresh = setTimeout(() => {
    pendingMpmMetricsRefresh = null;
    void refreshMpmSectionMetrics(force);
  }, force ? 0 : METRICS_REFRESH_DEBOUNCE_MS);
}

function stringifyPmCollectionLines(collection) {
  return (collection.assets || []).map((asset) => `${asset.symbol}, ${formatShortNumber(asset.weight)}`).join('\n');
}

function stringifyMpmHoldingLine(item) {
  const tokens = [item.symbol];
  if (item.purchasePrice != null) tokens.push(`price=${formatShortNumber(item.purchasePrice)}`);
  if (item.units != null) tokens.push(`units=${formatShortNumber(item.units)}`);
  if (item.buyDate) tokens.push(`buyDate=${item.buyDate}`);
  if (item.sellDate) tokens.push(`sell=${item.sellDate}`);
  return tokens.join(', ');
}

function setDraftFromCollection(collection) {
  const modeState = getActiveModeState();
  if (state.activeMode === 'pm') {
    modeState.draftItems = (collection.assets || []).map((asset) => ({
      raw: asset.symbol,
      symbol: asset.symbol,
      weight: Number(asset.weight)
    }));
    modeState.rawInput = stringifyPmCollectionLines(collection);
  } else {
    modeState.draftItems = (collection.items || []).map((item) =>
      item.type === 'portfolio'
        ? { type: 'portfolio', refName: item.refName }
        : {
            type: 'holding',
            raw: item.raw || item.symbol,
            symbol: item.symbol,
            purchasePrice: item.purchasePrice ?? null,
            units: item.units ?? null,
            buyDate: item.buyDate || '',
            sellDate: item.sellDate || '',
            sourcePath: []
          }
    );
    modeState.rawInput = modeState.draftItems
      .filter((item) => item.type === 'holding')
      .map((item) => stringifyMpmHoldingLine(item))
      .join('\n');
  }
  modeState.draftName = collection.name;
  input.value = modeState.rawInput;
  groupName.value = modeState.draftName;
  renderAssetsDraft();
  detectInfo.textContent = `${modeState.draftItems.length} item(s) cargado(s) para edicion.`;
  scheduleMpmSectionMetricsRefresh();
}

function resetCollectionEditor() {
  getActiveModeState().editingIndex = null;
  saveGroupBtn.textContent = getModeConfig().saveLabel;
}

function deleteCollection(index) {
  const modeState = getActiveModeState();
  modeState.collections.splice(index, 1);
  persistModeCollections(state.activeMode);

  if (modeState.editingIndex === index) {
    modeState.draftName = '';
    modeState.rawInput = '';
    groupName.value = '';
    input.value = '';
    modeState.draftItems = [];
    renderAssetsDraft();
    resetCollectionEditor();
  }

  if (modeState.editingIndex != null && modeState.editingIndex > index) {
    modeState.editingIndex -= 1;
  }

  renderCollections();
  scheduleMpmSectionMetricsRefresh();
}

function editCollection(index) {
  const collection = getActiveModeState().collections[index];
  if (!collection) return;

  getActiveModeState().editingIndex = index;
  saveGroupBtn.textContent = getModeConfig().updateLabel;
  setDraftFromCollection(collection);
}

function renderSuggestions() {
  const modeState = getActiveModeState();
  compareSuggestions.innerHTML = modeState.collections
    .map((collection) => `<option value="${escapeHtml(collection.name)}"></option>`)
    .join('');

  portfolioSuggestions.innerHTML = getModeState('mpm').collections
    .map((collection) => `<option value="${escapeHtml(collection.name)}"></option>`)
    .join('');
}

function renderCollections() {
  const mode = state.activeMode;
  const modeState = getActiveModeState();
  const config = getModeConfig();
  groupsContainer.innerHTML = '';

  if (modeState.collections.length === 0) {
    groupsContainer.innerHTML = `<span class="muted">${config.emptyCollectionText}</span>`;
  }

  modeState.collections.forEach((collection, index) => {
    const row = document.createElement('div');
    row.className = 'group-row';

    const content =
      mode === 'pm'
        ? (collection.assets || [])
            .map(
              (asset) =>
                `<span class="group-pick" data-pick-value="${escapeHtml(asset.symbol)}" data-symbol="${escapeHtml(
                  asset.symbol
                )}">${escapeHtml(asset.symbol)}</span> (${formatShortNumber(asset.weight)}%)`
            )
            .join(' + ')
        : (collection.items || []).map((item) => summarizeMpmItem(item)).join(' + ');

    const badge = mode === 'mpm' ? `<span class="badge">MPM</span>` : '';
    row.innerHTML = `
      <div>
        <div class="group-card-title">
          <strong class="group-pick" data-pick-value="${escapeHtml(collection.name)}">${escapeHtml(collection.name)}</strong>
          ${badge}
        </div>
        <div class="muted">${content || 'Sin contenido'}</div>
      </div>
      <div class="group-actions">
        <button type="button" data-action="components" data-index="${index}">${config.viewComponentsLabel}</button>
        <button type="button" data-action="edit" data-index="${index}">Editar</button>
        <button type="button" class="danger" data-action="delete" data-index="${index}">Eliminar</button>
      </div>
    `;

    groupsContainer.appendChild(row);
  });

  groupsContainer.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', async () =>
      withButtonProcessing(btn, async () => {
        editCollection(Number(btn.dataset.index));
      })
    );
  });

  groupsContainer.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () =>
      withButtonProcessing(btn, async () => {
        deleteCollection(Number(btn.dataset.index));
      })
    );
  });

  groupsContainer.querySelectorAll('button[data-action="components"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await withButtonProcessing(btn, async () => {
        try {
          await compareCollectionComponents(Number(btn.dataset.index));
        } catch (err) {
          alert(err.message || 'Error mostrando componentes');
        }
      });
    });
  });

  groupsContainer.querySelectorAll('[data-pick-value]').forEach((el) => {
    el.addEventListener('click', () => {
      fillNextComparisonField(el.dataset.pickValue || '');
    });
  });

  renderSuggestions();
  void enrichTickerHover(groupsContainer);
}

function fillNextComparisonField(value) {
  const raw = String(value || '').trim();
  if (!raw) return;

  const modeState = getActiveModeState();
  const empty = compareFields.find((field) => field && !field.value.trim());
  if (empty) {
    empty.value = raw;
    empty.focus();
    syncCompareDraftFromInputs();
    return;
  }

  if (compareFields[0]) {
    compareFields[0].value = raw;
    compareFields[0].focus();
  }
  modeState.compareDraft = compareFields.map((field) => field.value || '');
}

function trimToRange(points, range) {
  if (points.length === 0) return [];
  if (range === 'all') return points;

  const lastDate = new Date(points[points.length - 1].date + 'T00:00:00Z');
  const start = new Date(lastDate);

  if (range === 'ytd') start.setUTCMonth(0, 1);
  if (range === '1y') start.setUTCFullYear(start.getUTCFullYear() - 1);
  if (range === '3y') start.setUTCFullYear(start.getUTCFullYear() - 3);
  if (range === '5y') start.setUTCFullYear(start.getUTCFullYear() - 5);
  if (range === '10y') start.setUTCFullYear(start.getUTCFullYear() - 10);

  return points.filter((point) => new Date(point.date + 'T00:00:00Z') >= start);
}

function normalizeTo100(points) {
  if (!points.length) return [];
  const base = points[0].close;
  if (!base) return [];
  return points.map((point) => ({ date: point.date, value: (point.close / base) * 100 }));
}

function combineWeightedSeries(entries) {
  const prepared = entries
    .map((entry) => ({
      ...entry,
      byDate: new Map((entry.series || []).map((point) => [point.date, point.value]))
    }))
    .filter((entry) => (entry.series || []).length > 0 && entry.weight > 0);

  if (prepared.length === 0) return [];

  const allDates = [...new Set(prepared.flatMap((entry) => entry.series.map((point) => point.date)))].sort();
  const lastValues = new Map();
  const result = [];

  for (const date of allDates) {
    let weighted = 0;
    let activeWeight = 0;

    prepared.forEach((entry, index) => {
      if (entry.byDate.has(date)) {
        lastValues.set(index, entry.byDate.get(date));
      }
      const current = lastValues.get(index);
      if (current != null) {
        weighted += current * entry.weight;
        activeWeight += entry.weight;
      }
    });

    if (activeWeight > 0) {
      result.push({ date, value: weighted / activeWeight });
    }
  }

  return result;
}

function buildPmCompositeSeries(assets, symbolsData, range) {
  const prepared = assets
    .map((asset) => {
      const trimmed = trimToRange(symbolsData[asset.symbol] || [], range);
      const normalizedSeries = normalizeTo100(trimmed);
      return {
        symbol: asset.symbol,
        weight: Number(asset.weight) / 100,
        series: normalizedSeries
      };
    })
    .filter((entry) => entry.series.length > 0 && entry.weight > 0);

  return combineWeightedSeries(prepared);
}

function getHoldingEntryPoint(points, holding) {
  const buyDate = sanitizeDate(holding.buyDate);
  if (!buyDate) return points[0] || null;
  return points.find((point) => point.date >= buyDate) || null;
}

function buildMpmHoldingSeries(points, holding, range) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const entryPoint = getHoldingEntryPoint(points, holding);
  const fallbackBase = entryPoint?.close ?? points[0]?.close;
  const purchasePrice = holding.purchasePrice != null && holding.purchasePrice > 0 ? holding.purchasePrice : fallbackBase;
  if (!purchasePrice) return [];

  const startDate = entryPoint?.date || points[0]?.date;
  const sellDate = sanitizeDate(holding.sellDate);
  const soldPoint = sellDate ? [...points].reverse().find((point) => point.date <= sellDate) : null;
  const soldClose = soldPoint?.close ?? null;

  const normalized = points
    .filter((point) => !startDate || point.date >= startDate)
    .map((point) => {
      const effectiveClose = sellDate && soldClose != null && point.date > sellDate ? soldClose : point.close;
      return {
        date: point.date,
        value: (effectiveClose / purchasePrice) * 100
      };
    });

  return trimToRange(normalized, range);
}

function buildMpmCompositeSeries(holdings, symbolsData, range) {
  const prepared = holdings
    .map((holding) => {
      const points = symbolsData[holding.symbol] || [];
      if (!points.length) return null;
      const entryPoint = getHoldingEntryPoint(points, holding);
      const fallbackBase = entryPoint?.close ?? points[0]?.close;
      const basePerUnit =
        holding.purchasePrice != null && holding.purchasePrice > 0 ? holding.purchasePrice : fallbackBase;
      const units = holding.units != null && holding.units > 0 ? holding.units : 1;
      const baseCost = basePerUnit && units ? basePerUnit * units : 0;
      return {
        symbol: holding.symbol,
        weight: baseCost,
        series: buildMpmHoldingSeries(points, holding, range)
      };
    })
    .filter(Boolean)
    .filter((entry) => entry.series.length > 0 && entry.weight > 0);

  const totalWeight = prepared.reduce((sum, entry) => sum + entry.weight, 0);
  if (!totalWeight) return [];

  return combineWeightedSeries(
    prepared.map((entry) => ({
      ...entry,
      weight: entry.weight / totalWeight
    }))
  );
}

async function getSymbolSeries(symbol) {
  const cached = state.marketCache[symbol];
  if (cached && Array.isArray(cached.points) && cached.points.length > 0) {
    return cached.points;
  }

  const res = await fetch(`/api/performance?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const providerError = err.error || 'error desconocido del proveedor';
    throw new Error(
      `Ticker "${symbol}" reconocido, pero no se pudieron descargar datos de mercado (${providerError}). ` +
        'Verifica que el ticker exista en Yahoo Finance o prueba el simbolo oficial.'
    );
  }

  const payload = await res.json();
  if (!Array.isArray(payload.points) || payload.points.length === 0) {
    throw new Error(`No hay datos para ${symbol}`);
  }

  state.marketCache[symbol] = { points: payload.points, ts: Date.now() };
  return payload.points;
}

function alignSeriesCollection(seriesEntries) {
  const nonEmpty = seriesEntries.filter((entry) => entry.series.length > 0);
  if (nonEmpty.length === 0) {
    return { labels: [], datasets: [] };
  }

  const labels = [...new Set(nonEmpty.flatMap((entry) => entry.series.map((point) => point.date)))].sort();
  const datasets = nonEmpty.map((entry, index) => {
    const byDate = new Map(entry.series.map((point) => [point.date, point.value]));
    const data = [];
    let seenStart = false;
    let last = null;

    labels.forEach((date) => {
      if (byDate.has(date)) {
        last = byDate.get(date);
        seenStart = true;
      }
      data.push(seenStart ? last : null);
    });

    return {
      label: entry.label,
      data,
      borderColor: entry.color || colorForSeries(index),
      backgroundColor: entry.color || colorForSeries(index),
      borderWidth: 2,
      pointRadius: 0,
      spanGaps: true
    };
  });

  return { labels, datasets };
}

function isTickerLabel(label) {
  return /^\^?[A-Z]{1,5}(?:\.[A-Z]{1,4}|-[A-Z]{1,4}|=[A-Z])?$/.test(String(label || '').trim());
}

const htmlLegendPlugin = {
  id: 'htmlLegend',
  afterUpdate(chart, _args, options) {
    const container = document.getElementById(options?.containerID || '');
    if (!container) return;
    container.innerHTML = '';

    const allowYoy = new Set(['3y', '5y', '10y']).has(getActiveModeState().activeRange);
    chart.data.datasets.forEach((dataset, index) => {
      const item = document.createElement('div');
      item.className = 'legend-item';

      const colorDot = document.createElement('span');
      colorDot.className = 'legend-color';
      colorDot.style.background = dataset.borderColor || '#97abc8';

      const mainBtn = document.createElement('button');
      mainBtn.type = 'button';
      mainBtn.className = 'legend-main';
      if (!chart.isDatasetVisible(index)) {
        mainBtn.classList.add('off');
      }
      mainBtn.dataset.role = 'toggle';
      mainBtn.dataset.datasetIndex = String(index);
      mainBtn.textContent = dataset.label || `Serie ${index + 1}`;
      mainBtn.addEventListener('click', () => {
        chart.setDatasetVisibility(index, !chart.isDatasetVisible(index));
        chart.update();
      });

      const yoyBtn = document.createElement('button');
      yoyBtn.type = 'button';
      yoyBtn.className = 'legend-yoy';
      yoyBtn.dataset.role = 'yoy';
      yoyBtn.dataset.datasetIndex = String(index);
      yoyBtn.textContent = '(YoY)';
      if (!allowYoy) {
        yoyBtn.classList.add('off');
      }
      yoyBtn.addEventListener('click', () => {
        if (!allowYoy) {
          renderYoYMessage('YoY', 'Disponible solo para rangos 3Y, 5Y y 10Y.');
          return;
        }
        showYoYForDataset(index, chart);
      });

      item.appendChild(colorDot);
      item.appendChild(mainBtn);
      item.appendChild(yoyBtn);
      container.appendChild(item);
    });
  }
};

function upsertChart(labels, datasets) {
  const ctx = document.getElementById('chart');

  if (state.chart) {
    if (typeof state.chart.resetZoom === 'function') {
      state.chart.resetZoom();
    }
    state.chart.data.labels = labels;
    state.chart.data.datasets = datasets;
    state.chart.update();
    renderYoYMessage('YoY', 'Haz click en una serie de la leyenda para ver Year-over-Year.');
    return;
  }

  state.chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        htmlLegend: {
          containerID: 'chartLegend'
        },
        tooltip: {
          callbacks: {
            label(context) {
              const rawLabel = context?.dataset?.label || '';
              const symbol = isTickerLabel(rawLabel) ? rawLabel : '';
              const name = symbol ? state.symbolNames[symbol] : null;
              const value = context?.parsed?.y;
              const valueText = value == null ? '' : `: ${value.toFixed(2)}`;
              if (name) return `${rawLabel} - ${name}${valueText}`;
              return `${rawLabel}${valueText}`;
            }
          }
        },
        zoom: {
          limits: {
            x: { min: 'original', max: 'original' }
          },
          pan: {
            enabled: false,
            mode: 'x'
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            drag: {
              enabled: true
            },
            mode: 'x'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#97abc8' },
          grid: { color: '#22385f' }
        },
        y: {
          ticks: { color: '#97abc8' },
          grid: { color: '#22385f' },
          title: {
            display: true,
            text: 'Base 100',
            color: '#97abc8'
          }
        }
      }
    },
    plugins: [htmlLegendPlugin]
  });
  renderYoYMessage('YoY', 'Haz click en una serie de la leyenda para ver Year-over-Year.');
}

function clearVisualization() {
  if (state.chart) {
    state.chart.data.labels = [];
    state.chart.data.datasets = [];
    state.chart.update();
  }
  perfTableBody.innerHTML = '';
  chartLegend.innerHTML = '';
  setCompareWarning('');
  renderYoYMessage('YoY', 'Haz click en una serie de la leyenda para ver Year-over-Year.');
}

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatCurrency(value, currency) {
  if (value == null || Number.isNaN(value)) return '-';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(value));
  return value < 0 ? `-${formatted}` : formatted;
}

function formatUsd(value) {
  return formatCurrency(value, 'USD');
}

function formatEur(value) {
  return formatCurrency(value, 'EUR');
}

function renderYoYMessage(title, message) {
  if (!yoyTableBody || !yoyTitle) return;
  yoyTitle.textContent = title || 'YoY';
  yoyTableBody.innerHTML = `<tr><td colspan="2">${escapeHtml(message)}</td></tr>`;
}

function setCompareWarning(message) {
  if (!compareWarning) return;
  compareWarning.textContent = message || '';
}

function buildYoYRows(labels, data) {
  const byYear = new Map();
  for (let index = 0; index < labels.length; index += 1) {
    const date = labels[index];
    const value = data[index];
    if (!date || value == null || Number.isNaN(value)) continue;
    const year = String(date).slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    byYear.set(year, Number(value));
  }

  const years = [...byYear.keys()].sort();
  const rows = [];
  for (let index = 1; index < years.length; index += 1) {
    const previous = byYear.get(years[index - 1]);
    const current = byYear.get(years[index]);
    if (!previous || !current) continue;
    rows.push({ year: years[index], value: ((current / previous) - 1) * 100 });
  }
  return rows;
}

function showYoYForDataset(datasetIndex, chartRef) {
  const chart = chartRef || state.chart;
  if (!chart || !yoyTableBody || !yoyTitle) return;

  const allowed = new Set(['3y', '5y', '10y']);
  if (!allowed.has(getActiveModeState().activeRange)) {
    renderYoYMessage('YoY', 'Disponible solo para rangos 3Y, 5Y y 10Y.');
    return;
  }

  const dataset = chart.data?.datasets?.[datasetIndex];
  const labels = chart.data?.labels || [];
  if (!dataset || !Array.isArray(dataset.data)) {
    renderYoYMessage('YoY', 'No hay datos para calcular YoY.');
    return;
  }

  const rows = buildYoYRows(labels, dataset.data);
  const titleName = dataset.label || 'Serie';
  yoyTitle.textContent = `YoY: ${titleName}`;

  if (rows.length === 0) {
    yoyTableBody.innerHTML = '<tr><td colspan="2">No hay suficientes datos anuales para calcular YoY.</td></tr>';
    return;
  }

  yoyTableBody.innerHTML = rows
    .map((row) => `<tr><td>${escapeHtml(row.year)}</td><td>${formatPct(row.value)}</td></tr>`)
    .join('');
}

function findCollectionByName(mode, name, collections = getModeState(mode).collections) {
  const raw = String(name || '').trim().toLowerCase();
  return collections.find((collection) => collection.name.toLowerCase() === raw) || null;
}

function expandMpmCollection(collection, collections, seen = new Set(), path = []) {
  const flattened = [];
  for (const item of collection.items || []) {
    if (item.type === 'portfolio') {
      const ref = findCollectionByName('mpm', item.refName, collections);
      if (!ref) {
        throw new Error(`No existe el subset "${item.refName}".`);
      }
      const key = ref.name.toLowerCase();
      if (seen.has(key)) {
        throw new Error(`Referencia circular detectada: ${[...path, ref.name].join(' -> ')}`);
      }
      const nextSeen = new Set(seen);
      nextSeen.add(key);
      flattened.push(...expandMpmCollection(ref, collections, nextSeen, [...path, ref.name]));
      continue;
    }

    flattened.push({
      type: 'holding',
      raw: item.raw || item.symbol,
      symbol: item.symbol,
      purchasePrice: item.purchasePrice ?? null,
      units: item.units ?? null,
      buyDate: item.buyDate || '',
      sellDate: sanitizeDate(item.sellDate),
      sourcePath: [...path]
    });
  }
  return flattened;
}

function formatHoldingLabel(holding, index) {
  const pathPrefix = Array.isArray(holding.sourcePath) && holding.sourcePath.length
    ? `${holding.sourcePath.join(' / ')} · `
    : '';
  const details = [];
  if (holding.purchasePrice != null) details.push(`@ ${formatShortNumber(holding.purchasePrice)}`);
  if (holding.units != null) details.push(`x${formatShortNumber(holding.units)}`);
  if (holding.buyDate) details.push(`buy ${holding.buyDate}`);
  if (holding.sellDate) details.push(`sell ${holding.sellDate}`);
  const suffix = details.length ? ` (${details.join(', ')})` : '';
  return `${pathPrefix}${holding.symbol}${suffix}${details.length === 0 ? ` #${index + 1}` : ''}`;
}

async function resolveComparisonEntry(value, mode = state.activeMode) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const collection = findCollectionByName(mode, raw);
  if (collection) {
    if (mode === 'pm') {
      return {
        label: collection.name,
        type: 'collection',
        assets: collection.assets || []
      };
    }

    return {
      label: collection.name,
      type: 'collection',
      holdings: expandMpmCollection(
        collection,
        getModeState('mpm').collections,
        new Set([collection.name.toLowerCase()]),
        []
      )
    };
  }

  const symbol = (await resolveInputToSymbol(raw)).symbol;
  if (mode === 'pm') {
    return {
      label: symbol,
      type: 'symbol',
      assets: [{ symbol, weight: 100 }]
    };
  }

  return {
    label: symbol,
    type: 'symbol',
    holdings: [
      {
        type: 'holding',
        raw: symbol,
        symbol,
        purchasePrice: null,
        units: 1,
        buyDate: '',
        sellDate: '',
        sourcePath: []
      }
    ]
  };
}

async function resolveComparisonEntrySafe(value, mode) {
  try {
    const entry = await resolveComparisonEntry(value, mode);
    return { entry, error: null };
  } catch (err) {
    return { entry: null, error: err?.message || 'No se pudo resolver la seleccion' };
  }
}

async function loadSymbolsDataSafe(symbols) {
  const symbolsData = {};
  const failed = [];
  for (const symbol of symbols) {
    try {
      symbolsData[symbol] = await getSymbolSeries(symbol);
    } catch (err) {
      failed.push({ symbol, error: err?.message || 'Sin datos' });
    }
  }
  return { symbolsData, failed };
}

function buildEntrySeries(entry, symbolsData, range, mode = state.activeMode) {
  if (mode === 'pm') {
    return buildPmCompositeSeries(entry.assets || [], symbolsData, range);
  }
  return buildMpmCompositeSeries(entry.holdings || [], symbolsData, range);
}

function computeEntryReturn(entry, symbolsData, range, mode = state.activeMode) {
  const series = buildEntrySeries(entry, symbolsData, range, mode);
  if (!series.length) return null;
  const first = series[0]?.value;
  const last = series[series.length - 1]?.value;
  if (first == null || last == null || first === 0) return null;
  return mode === 'pm' ? last - 100 : ((last / first) - 1) * 100;
}

function computeHoldingSnapshot(holding, symbolsData) {
  const points = symbolsData[holding.symbol] || [];
  if (!points.length) return null;

  const entryPoint = getHoldingEntryPoint(points, holding);
  if (!entryPoint?.close) return null;

  const basePerUnit =
    holding.purchasePrice != null && holding.purchasePrice > 0 ? holding.purchasePrice : entryPoint.close;
  const units = holding.units != null && holding.units > 0 ? holding.units : 1;
  const sellDate = sanitizeDate(holding.sellDate);
  const soldPoint = sellDate ? [...points].reverse().find((point) => point.date <= sellDate) : null;
  const currentPoint = soldPoint || points[points.length - 1];
  if (!currentPoint?.close) return null;

  const currentPerUnit = Number(currentPoint.close);
  return {
    symbol: holding.symbol,
    units,
    baseCost: basePerUnit * units,
    currentValue: currentPerUnit * units,
    gainUsd: (currentPerUnit - basePerUnit) * units,
    gainPerUnit: currentPerUnit - basePerUnit
  };
}

function computeEntrySnapshot(entry, symbolsData, mode = state.activeMode) {
  if (mode === 'pm') {
    return {
      allTimePct: computeEntryReturn(entry, symbolsData, 'all', mode),
      totalGainUsd: null,
      gainPerUnit: null,
      currentValueUsd: null,
      currentValueEur: null
    };
  }

  const snapshots = (entry.holdings || [])
    .map((holding) => computeHoldingSnapshot(holding, symbolsData))
    .filter(Boolean);

  if (!snapshots.length) {
    return {
      allTimePct: null,
      totalGainUsd: null,
      gainPerUnit: null,
      currentValueUsd: null,
      currentValueEur: null
    };
  }

  const totalBaseCost = snapshots.reduce((sum, snapshot) => sum + snapshot.baseCost, 0);
  const totalGainUsd = snapshots.reduce((sum, snapshot) => sum + snapshot.gainUsd, 0);
  const currentValueUsd = snapshots.reduce((sum, snapshot) => sum + snapshot.currentValue, 0);
  const totalUnits = snapshots.reduce((sum, snapshot) => sum + snapshot.units, 0);
  const uniqueSymbols = [...new Set(snapshots.map((snapshot) => snapshot.symbol))];
  const eurUsdRate = symbolsData[EURUSD_SYMBOL]?.at(-1)?.close ?? null;
  let gainPerUnit = null;

  if (uniqueSymbols.length === 1 && totalUnits > 0) {
    gainPerUnit = totalGainUsd / totalUnits;
  }

  return {
    allTimePct: totalBaseCost > 0 ? (totalGainUsd / totalBaseCost) * 100 : null,
    totalGainUsd,
    gainPerUnit,
    currentValueUsd,
    currentValueEur: eurUsdRate ? currentValueUsd / eurUsdRate : null
  };
}

function renderPerformanceTable(entries, symbolsData, mode = state.activeMode) {
  if (!perfTableBody) return;
  const rows = entries.map((entry) => ({
    label: entry.label,
    symbol:
      entry.type === 'symbol' &&
      ((mode === 'pm' && entry.assets?.length === 1) || (mode === 'mpm' && entry.holdings?.length === 1))
        ? entry.label
        : null,
    ytd: computeEntryReturn(entry, symbolsData, 'ytd', mode),
    oneYear: computeEntryReturn(entry, symbolsData, '1y', mode),
    threeYears: computeEntryReturn(entry, symbolsData, '3y', mode),
    ...computeEntrySnapshot(entry, symbolsData, mode)
  }));

  perfTableBody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>${row.symbol ? `<span data-symbol="${escapeHtml(row.symbol)}">${escapeHtml(row.label)}</span>` : escapeHtml(
          row.label
        )}</td>
        <td>${formatPct(row.ytd)}</td>
        <td>${formatPct(row.oneYear)}</td>
        <td>${formatPct(row.threeYears)}</td>
        <td>${formatPct(row.allTimePct)}</td>
        <td>${formatUsd(row.totalGainUsd)}</td>
        <td>${formatUsd(row.gainPerUnit)}</td>
        <td>${formatUsd(row.currentValueUsd)}</td>
        <td>${formatEur(row.currentValueEur)}</td>
      </tr>
    `
    )
    .join('');
  void enrichTickerHover(perfTableBody);
}

function syncCompareDraftFromInputs() {
  getActiveModeState().compareDraft = compareFields.map((field) => field.value || '');
}

async function compareMixed(mode = state.activeMode) {
  const modeState = getModeState(mode);
  const rawValues = compareFields.map((field) => field.value.trim());
  modeState.compareDraft = [...rawValues];

  const resolvedEntries = await Promise.all(rawValues.map((value) => resolveComparisonEntrySafe(value, mode)));
  const resolveErrors = resolvedEntries.filter((entry) => entry.error).map((entry) => entry.error);
  const entries = resolvedEntries.map((entry) => entry.entry).filter(Boolean);

  if (entries.length < 1) {
    alert('No se pudo resolver ninguna seleccion valida.');
    return;
  }

  if (entries.length > 4) {
    alert('Maximo 4 elementos en la comparacion.');
    return;
  }

  const symbols = [
    ...new Set(
      entries.flatMap((entry) =>
        mode === 'pm'
          ? (entry.assets || []).map((asset) => asset.symbol)
          : (entry.holdings || []).map((holding) => holding.symbol)
      )
    )
  ];
  if (mode === 'mpm') {
    symbols.push(EURUSD_SYMBOL);
  }
  const { symbolsData, failed } = await loadSymbolsDataSafe(symbols);

  const directSymbols = entries.filter((entry) => entry.type === 'symbol').map((entry) => entry.label);
  await Promise.all(directSymbols.map((symbol) => ensureSymbolName(symbol)));

  const seriesEntries = entries.map((entry, index) => ({
    label: entry.label,
    color: colorForSeries(index),
    series: buildEntrySeries(entry, symbolsData, modeState.activeRange, mode)
  }));

  const plottable = seriesEntries.filter((entry) => entry.series.length > 0);
  if (plottable.length < 1) {
    throw new Error('No hay datos disponibles para graficar las selecciones validas.');
  }

  const { labels, datasets } = alignSeriesCollection(seriesEntries);
  if (!labels.length) {
    throw new Error('No hay datos disponibles para comparar en el rango seleccionado.');
  }

  upsertChart(labels, datasets);
  renderPerformanceTable(entries, symbolsData, mode);

  const failedSymbols = failed.map((item) => item.symbol);
  if (resolveErrors.length > 0 || failedSymbols.length > 0) {
    const parts = [];
    if (resolveErrors.length > 0) parts.push(`${resolveErrors.length} entrada(s) no resueltas`);
    if (failedSymbols.length > 0) parts.push(`sin datos: ${failedSymbols.join(', ')}`);
    setCompareWarning(`Advertencia: ${parts.join(' | ')}. Se graficaron las selecciones disponibles.`);
  } else {
    setCompareWarning('');
  }

  modeState.lastCompare = {
    type: 'mixed',
    values: rawValues
  };
}

async function compareCollectionComponents(index, mode = state.activeMode) {
  const collection = getModeState(mode).collections[index];
  if (!collection) {
    throw new Error('Elemento no encontrado.');
  }

  let entries;
  if (mode === 'pm') {
    entries = (collection.assets || []).map((asset) => ({
      label: asset.symbol,
      type: 'symbol',
      assets: [{ symbol: asset.symbol, weight: 100 }]
    }));
  } else {
    const holdings = expandMpmCollection(
      collection,
      getModeState('mpm').collections,
      new Set([collection.name.toLowerCase()]),
      []
    );
    entries = holdings.map((holding, indexInPortfolio) => ({
      label: formatHoldingLabel(holding, indexInPortfolio),
      type: 'holding',
      holdings: [{ ...holding }]
    }));
  }

  const symbols = [
    ...new Set(
      entries.flatMap((entry) =>
        mode === 'pm'
          ? (entry.assets || []).map((asset) => asset.symbol)
          : (entry.holdings || []).map((holding) => holding.symbol)
      )
    )
  ];
  if (mode === 'mpm') {
    symbols.push(EURUSD_SYMBOL);
  }

  const { symbolsData, failed } = await loadSymbolsDataSafe(symbols);
  await Promise.all(symbols.map((symbol) => ensureSymbolName(symbol)));

  const seriesEntries = entries.map((entry, indexInList) => ({
    label: entry.label,
    color: colorForSeries(indexInList),
    series: buildEntrySeries(entry, symbolsData, getModeState(mode).activeRange, mode)
  }));

  const { labels, datasets } = alignSeriesCollection(seriesEntries);
  if (!labels.length) {
    throw new Error('No hay datos disponibles para los componentes en el rango seleccionado.');
  }

  upsertChart(labels, datasets);
  renderPerformanceTable(entries, symbolsData, mode);
  if (failed.length > 0) {
    setCompareWarning(`Advertencia: algunos componentes no tienen datos (${failed.map((item) => item.symbol).join(', ')}).`);
  } else {
    setCompareWarning('');
  }

  getModeState(mode).lastCompare = {
    type: 'collection-components',
    index
  };
}

function validatePmDraft(items) {
  const validAssets = items.filter((asset) => Number(asset.weight) > 0);
  if (validAssets.length === 0) {
    throw new Error('Asigna al menos un peso mayor a 0.');
  }

  const totalWeight = validAssets.reduce((sum, asset) => sum + Number(asset.weight), 0);
  if (totalWeight <= 0) {
    throw new Error('Los pesos deben sumar mas de 0%.');
  }

  return validAssets.map((asset) => ({
    symbol: asset.symbol,
    weight: Number(((Number(asset.weight) / totalWeight) * 100).toFixed(4))
  }));
}

function normalizeMpmDraftItems(items) {
  const normalized = items
    .map((item) => {
      if (item.type === 'portfolio') {
        const refName = String(item.refName || '').trim();
        return refName ? { type: 'portfolio', refName } : null;
      }

      const purchasePrice = item.purchasePrice != null && item.purchasePrice > 0 ? Number(item.purchasePrice) : null;
      const units = item.units != null && item.units > 0 ? Number(item.units) : null;
      const buyDate = item.buyDate ? sanitizeDate(item.buyDate) : '';
      const sellDate = item.sellDate ? sanitizeDate(item.sellDate) : '';
      if (buyDate && sellDate && sellDate < buyDate) {
        throw new Error(`La fecha de venta no puede ser anterior a la fecha de compra para ${item.symbol}.`);
      }
      return {
        type: 'holding',
        raw: item.raw || item.symbol,
        symbol: item.symbol,
        purchasePrice,
        units,
        buyDate,
        sellDate
      };
    })
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new Error('Agrega al menos un holding o subset al portfolio.');
  }

  return normalized;
}

function buildUpdatedCollectionList(mode, candidate) {
  const modeState = getModeState(mode);
  const nextCollections = [...modeState.collections];
  if (modeState.editingIndex != null && nextCollections[modeState.editingIndex]) {
    nextCollections[modeState.editingIndex] = candidate;
    return nextCollections;
  }

  const existingIndex = nextCollections.findIndex(
    (collection) => collection.name.toLowerCase() === candidate.name.toLowerCase()
  );
  if (existingIndex >= 0) {
    nextCollections[existingIndex] = candidate;
  } else {
    nextCollections.push(candidate);
  }
  return nextCollections;
}

async function restoreLastComparison(mode = state.activeMode) {
  const modeState = getModeState(mode);
  if (!modeState.lastCompare) {
    clearVisualization();
    return;
  }

  try {
    if (modeState.lastCompare.type === 'mixed') {
      compareFields.forEach((field, index) => {
        field.value = modeState.lastCompare.values[index] || '';
      });
      await compareMixed(mode);
    } else if (modeState.lastCompare.type === 'collection-components') {
      await compareCollectionComponents(modeState.lastCompare.index, mode);
    }
  } catch (err) {
    setCompareWarning(err.message || 'No se pudo restaurar la comparacion.');
  }
}

function renderModeUi() {
  const mode = state.activeMode;
  const modeState = getActiveModeState();
  const config = getModeConfig();

  saveLocal('activeMode', mode);

  modeSwitch.querySelectorAll('[data-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });

  modeTitle.textContent = config.title;
  modeSubtitle.textContent = config.subtitle;
  builderTitle.textContent = config.builderTitle;
  builderHint.textContent = config.builderHint;
  input.placeholder = config.builderPlaceholder;
  collectionTitle.textContent = config.collectionTitle;
  collectionHint.textContent = config.collectionHint;
  groupName.placeholder = config.namePlaceholder;
  compareTitle.textContent = config.compareTitle;
  compareHint.textContent = config.compareHint;
  detectBtn.textContent = config.detectLabel;
  saveGroupBtn.textContent = modeState.editingIndex == null ? config.saveLabel : config.updateLabel;
  runCompareBtn.textContent = config.compareButtonLabel;
  clearCompareBtn.textContent = config.clearButtonLabel;
  subsetBuilder.classList.toggle('hidden', mode !== 'mpm');
  draftMetricsSection?.classList.toggle('hidden', mode !== 'mpm');
  perfHeadLabel.textContent = 'Seleccion';
  perfHeadYtd.textContent = 'YTD';
  perfHead1y.textContent = '1Y';
  perfHead3y.textContent = '3Y';
  if (perfHeadAllTime) perfHeadAllTime.textContent = 'All time %';
  if (perfHeadGainUsd) perfHeadGainUsd.textContent = 'Gain USD';
  if (perfHeadGainPerUnit) perfHeadGainPerUnit.textContent = 'Gain/unit';
  if (perfHeadValueUsd) perfHeadValueUsd.textContent = 'Value USD';
  if (perfHeadValueEur) perfHeadValueEur.textContent = 'Value EUR';

  compareFields.forEach((field, index) => {
    const suffix = index === 0 ? '1' : String(index + 1);
    field.placeholder = `Campo ${suffix}: ${config.comparePlaceholderBase}${index > 1 ? ' (opcional)' : ''}`;
    field.value = modeState.compareDraft[index] || '';
  });

  input.value = modeState.rawInput || '';
  groupName.value = modeState.draftName || '';
  document
    .querySelectorAll('#rangeButtons button')
    .forEach((button) => button.classList.toggle('active', button.dataset.range === modeState.activeRange));

  detectInfo.textContent = '';
  renderAssetsDraft();
  renderCollections();
  if (mode === 'mpm') {
    scheduleMpmSectionMetricsRefresh();
  }
}

detectBtn.addEventListener('click', async () => {
  await withButtonProcessing(detectBtn, async () => {
    const modeState = getActiveModeState();
    modeState.rawInput = input.value;
    const detector = state.activeMode === 'pm' ? detectAssetsFromText : detectHoldingsFromText;
    const { items, unresolved } = await detector(input.value);

    if (state.activeMode === 'pm') {
      modeState.draftItems = items;
    } else {
      const subsets = modeState.draftItems.filter((item) => item.type === 'portfolio');
      modeState.draftItems = [...items, ...subsets];
    }

    renderAssetsDraft();
    detectInfo.textContent = `${items.length} ${getModeConfig().itemDetectedLabel}.`;
    if (unresolved.length > 0) {
      detectInfo.textContent += ` No resueltos: ${unresolved.slice(0, 3).join(', ')}${
        unresolved.length > 3 ? '...' : ''
      }.`;
    }
    scheduleMpmSectionMetricsRefresh();
  });
});

saveGroupBtn.addEventListener('click', async () => {
  await withButtonProcessing(saveGroupBtn, async () => {
    const mode = state.activeMode;
    const modeState = getActiveModeState();
    const name = groupName.value.trim();
    modeState.draftName = name;
    modeState.rawInput = input.value;

    if (!name) {
      alert(`Indica un nombre para el ${getModeConfig().collectionSingular}.`);
      return;
    }

    if (modeState.draftItems.length === 0) {
      alert(
        mode === 'pm'
          ? 'Primero detecta activos en el texto.'
          : 'Primero detecta holdings o agrega subsets al borrador.'
      );
      return;
    }

    try {
      let candidate;
      if (mode === 'pm') {
        candidate = { name, assets: validatePmDraft(modeState.draftItems) };
      } else {
        candidate = { name, items: normalizeMpmDraftItems(modeState.draftItems) };
        const nextCollections = buildUpdatedCollectionList('mpm', candidate);
        expandMpmCollection(candidate, nextCollections, new Set([name.toLowerCase()]), []);
      }

      modeState.collections = buildUpdatedCollectionList(mode, candidate);
      persistModeCollections(mode);
      renderCollections();
      resetCollectionEditor();
      scheduleMpmSectionMetricsRefresh();
    } catch (err) {
      alert(err.message || 'No se pudo guardar.');
    }
  });
});

addSubsetBtn?.addEventListener('click', async () => {
  await withButtonProcessing(addSubsetBtn, async () => {
    if (state.activeMode !== 'mpm') return;
    const refName = String(subsetPortfolioInput.value || '').trim();
    if (!refName) {
      alert('Indica un portfolio existente para agregarlo como subset.');
      return;
    }

    const ref = findCollectionByName('mpm', refName);
    if (!ref) {
      alert(`No existe un portfolio llamado "${refName}".`);
      return;
    }

    getActiveModeState().draftItems.push({ type: 'portfolio', refName: ref.name });
    subsetPortfolioInput.value = '';
    renderAssetsDraft();
    scheduleMpmSectionMetricsRefresh();
  });
});

refreshDraftMetricsBtn?.addEventListener('click', async () => {
  await withButtonProcessing(refreshDraftMetricsBtn, async () => {
    if (state.activeMode !== 'mpm') return;
    await refreshMpmSectionMetrics(true);
  });
});

runCompareBtn.addEventListener('click', async () => {
  await withButtonProcessing(runCompareBtn, async () => {
    try {
      await compareMixed(state.activeMode);
    } catch (err) {
      alert(err.message || 'Error comparando seleccion');
    }
  });
});

clearCompareBtn?.addEventListener('click', async () => {
  await withButtonProcessing(clearCompareBtn, async () => {
    compareFields.forEach((field) => {
      field.value = '';
    });
    getActiveModeState().compareDraft = ['', '', '', ''];
    getActiveModeState().lastCompare = null;
    setCompareWarning('');
    renderYoYMessage('YoY', 'Haz click en una serie de la leyenda para ver Year-over-Year.');
  });
});

rangeButtons.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-range]');
  if (!button) return;

  getActiveModeState().activeRange = button.dataset.range;
  document
    .querySelectorAll('#rangeButtons button')
    .forEach((element) => element.classList.toggle('active', element === button));

  if (!getActiveModeState().lastCompare) return;

  await withButtonProcessing(button, async () => {
    try {
      if (getActiveModeState().lastCompare.type === 'mixed') {
        compareFields.forEach((field, index) => {
          field.value = getActiveModeState().lastCompare.values[index] || '';
        });
        await compareMixed(state.activeMode);
      } else if (getActiveModeState().lastCompare.type === 'collection-components') {
        await compareCollectionComponents(getActiveModeState().lastCompare.index, state.activeMode);
      }
    } catch (err) {
      alert(err.message || 'No se pudo refrescar el rango');
    }
  });
});

modeSwitch.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-mode]');
  if (!button || button.dataset.mode === state.activeMode) return;

  state.activeMode = button.dataset.mode;
  renderModeUi();
  await restoreLastComparison(state.activeMode);
});

input.addEventListener('input', () => {
  getActiveModeState().rawInput = input.value;
});

groupName.addEventListener('input', () => {
  getActiveModeState().draftName = groupName.value;
});

compareFields.forEach((field) => {
  field.addEventListener('input', syncCompareDraftFromInputs);
});

renderModeUi();
restoreLastComparison(state.activeMode);
