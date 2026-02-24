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
  BITCOIN: 'BTC-USD',
  ETHEREUM: 'ETH-USD'
};

const palette = ['#4db5ff', '#6fffb4', '#ffcb6b', '#ff7a90'];

const state = {
  assetsDraft: [],
  groups: loadLocal('groups', []),
  marketCache: {},
  resolveCache: loadLocal('resolveCache', {}),
  symbolNames: loadLocal('symbolNames', {}),
  activeRange: 'ytd',
  chart: null,
  lastCompare: null,
  editingGroupIndex: null
};

const input = document.getElementById('rawInput');
const detectBtn = document.getElementById('detectBtn');
const detectInfo = document.getElementById('detectInfo');
const assetsContainer = document.getElementById('assetsContainer');
const groupName = document.getElementById('groupName');
const saveGroupBtn = document.getElementById('saveGroupBtn');
const groupsContainer = document.getElementById('groupsContainer');
const runCompareBtn = document.getElementById('runCompareBtn');
const clearCompareBtn = document.getElementById('clearCompareBtn');
const compareFields = [
  document.getElementById('compareField1'),
  document.getElementById('compareField2'),
  document.getElementById('compareField3'),
  document.getElementById('compareField4')
];
const compareSuggestions = document.getElementById('compareSuggestions');
const perfTableBody = document.getElementById('perfTableBody');
const yoyTitle = document.getElementById('yoyTitle');
const yoyTableBody = document.getElementById('yoyTableBody');
const chartLegend = document.getElementById('chartLegend');
const rangeButtons = document.getElementById('rangeButtons');
const pendingSymbolNameRequests = new Map();
const PROCESSING_MIN_MS =
  typeof window !== 'undefined' && /jsdom/i.test(window.navigator.userAgent) ? 0 : 180;

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

// Prevent quota issues from old large historical cache stored in localStorage.
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

  const maybeTicker = cleaned.match(/\^?[A-Z]{1,5}(?:-[A-Z]{1,4}|=[A-Z])?/);
  return maybeTicker ? maybeTicker[0] : '';
}

async function resolveInputToSymbol(raw) {
  const direct = normalizeLine(raw);
  if (direct) {
    return { symbol: direct, source: 'local' };
  }

  const key = String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!key) {
    throw new Error('Entrada vacía');
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

function parseLineEntry(line) {
  const text = String(line || '').trim();
  if (!text) return null;

  // Preferred format: "symbol_or_name, weight" (also supports ; | tab).
  const delimMatch = text.match(/^(.+?)[\t,;|]\s*([+-]?\d+(?:[.,]\d+)?)\s*%?\s*$/);
  if (delimMatch) {
    return {
      raw: delimMatch[1].trim(),
      weight: Number(delimMatch[2].replace(',', '.'))
    };
  }

  // Fallback: "symbol_or_name 25%" (requires % to avoid conflicts like "S&P 500").
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

async function detectAssetsFromText(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const unique = new Map();
  const unresolved = [];

  for (const line of lines) {
    const parsed = parseLineEntry(line);
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

  const assets = assignDraftWeights([...unique.values()]);

  return { assets, unresolved };
}

function renderAssetsDraft() {
  assetsContainer.innerHTML = '';
  state.assetsDraft.forEach((asset, index) => {
    const row = document.createElement('div');
    row.className = 'asset-row';
    row.innerHTML = `
      <span class="pill">${asset.raw} -> <span data-symbol="${asset.symbol}">${asset.symbol}</span></span>
      <input type="number" min="0" step="0.01" value="${asset.weight}" data-index="${index}" />
      <span class="muted">peso %</span>
    `;

    row.querySelector('input').addEventListener('input', (e) => {
      state.assetsDraft[index].weight = Number(e.target.value || 0);
    });

    assetsContainer.appendChild(row);
  });
  void enrichTickerHover(assetsContainer);
}

function setDraftFromGroup(group) {
  state.assetsDraft = group.assets.map((a) => ({
    raw: a.symbol,
    symbol: a.symbol,
    weight: Number(a.weight)
  }));
  renderAssetsDraft();
  detectInfo.textContent = `${state.assetsDraft.length} activo(s) cargado(s) para edición.`;
}

function resetGroupEditor() {
  state.editingGroupIndex = null;
  saveGroupBtn.textContent = 'Guardar grupo';
}

function deleteGroup(index) {
  state.groups.splice(index, 1);
  saveLocal('groups', state.groups);

  if (state.editingGroupIndex === index) {
    groupName.value = '';
    state.assetsDraft = [];
    renderAssetsDraft();
    resetGroupEditor();
  }

  if (state.editingGroupIndex != null && state.editingGroupIndex > index) {
    state.editingGroupIndex -= 1;
  }

  renderGroups();
}

function editGroup(index) {
  const group = state.groups[index];
  if (!group) return;

  groupName.value = group.name;
  input.value = group.assets.map((a) => `${a.symbol}, ${a.weight}`).join('\n');
  state.editingGroupIndex = index;
  saveGroupBtn.textContent = 'Actualizar grupo';
  setDraftFromGroup(group);
}

function renderSuggestions() {
  compareSuggestions.innerHTML = state.groups.map((group) => `<option value="${group.name}"></option>`).join('');
}

function renderGroups() {
  groupsContainer.innerHTML = '';

  if (state.groups.length === 0) {
    groupsContainer.innerHTML = '<span class="muted">No hay grupos guardados todavía.</span>';
  }

  state.groups.forEach((group, index) => {
    const row = document.createElement('div');
    row.className = 'group-row';

    const composition = group.assets
      .map(
        (a) =>
          `<span class="group-pick" data-pick-value="${a.symbol}" data-symbol="${a.symbol}">${a.symbol}</span> (${a.weight}%)`
      )
      .join(' + ');

    row.innerHTML = `
      <div>
        <strong class="group-pick" data-pick-value="${group.name}">${group.name}</strong>
        <div class="muted">${composition}</div>
      </div>
      <div class="group-actions">
        <button type="button" data-action="components" data-index="${index}">Ver componentes</button>
        <button type="button" data-action="edit" data-index="${index}">Editar</button>
        <button type="button" data-action="delete" data-index="${index}">Eliminar</button>
      </div>
    `;

    groupsContainer.appendChild(row);
  });

  groupsContainer.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', async () =>
      withButtonProcessing(btn, async () => {
        editGroup(Number(btn.dataset.index));
      })
    );
  });

  groupsContainer.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () =>
      withButtonProcessing(btn, async () => {
        deleteGroup(Number(btn.dataset.index));
      })
    );
  });
  groupsContainer.querySelectorAll('button[data-action="components"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await withButtonProcessing(btn, async () => {
        try {
          await compareGroupComponents(Number(btn.dataset.index));
        } catch (err) {
          alert(err.message || 'Error mostrando componentes del grupo');
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

  const empty = compareFields.find((field) => field && !field.value.trim());
  if (empty) {
    empty.value = raw;
    empty.focus();
    return;
  }

  // If all filled, overwrite the first one as fallback.
  if (compareFields[0]) {
    compareFields[0].value = raw;
    compareFields[0].focus();
  }
}

function trimToRange(points, range) {
  if (points.length === 0) return [];

  const lastDate = new Date(points[points.length - 1].date + 'T00:00:00Z');
  const start = new Date(lastDate);

  if (range === 'ytd') start.setUTCMonth(0, 1);
  if (range === '1y') start.setUTCFullYear(start.getUTCFullYear() - 1);
  if (range === '3y') start.setUTCFullYear(start.getUTCFullYear() - 3);
  if (range === '5y') start.setUTCFullYear(start.getUTCFullYear() - 5);
  if (range === '10y') start.setUTCFullYear(start.getUTCFullYear() - 10);

  return points.filter((p) => new Date(p.date + 'T00:00:00Z') >= start);
}

function normalizeTo100(points) {
  if (!points.length) return [];
  const base = points[0].close;
  if (!base) return [];
  return points.map((p) => ({ date: p.date, value: (p.close / base) * 100 }));
}

function buildCompositeSeries(assets, symbolsData, range) {
  const prepared = assets
    .map((asset) => {
      const series = trimToRange(symbolsData[asset.symbol] || [], range);
      return {
        symbol: asset.symbol,
        weight: Number(asset.weight) / 100,
        series,
        byDate: new Map(series.map((p) => [p.date, p.close])),
        baseClose: series[0]?.close ?? null
      };
    })
    .filter((p) => p.series.length > 0 && p.weight > 0 && p.baseClose);

  if (prepared.length === 0) return [];

  const allDates = [...new Set(prepared.flatMap((p) => p.series.map((v) => v.date)))].sort();
  const lastNorm = {};
  const result = [];

  for (const date of allDates) {
    let weighted = 0;
    let activeWeight = 0;

    for (const asset of prepared) {
      const close = asset.byDate.get(date);
      if (close != null) {
        lastNorm[asset.symbol] = (close / asset.baseClose) * 100;
      }

      if (lastNorm[asset.symbol] != null) {
        weighted += lastNorm[asset.symbol] * asset.weight;
        activeWeight += asset.weight;
      }
    }

    if (activeWeight > 0) {
      result.push({ date, value: weighted / activeWeight });
    }
  }

  if (result.length === 0) return [];
  const base = result[0].value;
  if (!base) return [];
  return result.map((p) => ({ date: p.date, value: (p.value / base) * 100 }));
}

async function getSymbolSeries(symbol) {
  const cached = state.marketCache[symbol];
  if (cached && Array.isArray(cached.points) && cached.points.length > 0) {
    return cached.points;
  }

  const res = await fetch(`/api/performance?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    const err = await res.json();
    const providerError = err.error || 'error desconocido del proveedor';
    throw new Error(
      `Ticker "${symbol}" reconocido, pero no se pudieron descargar datos de mercado (${providerError}). ` +
        'Verifica que el ticker exista en Yahoo Finance o prueba el símbolo oficial.'
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

  const labels = [...new Set(nonEmpty.flatMap((entry) => entry.series.map((p) => p.date)))].sort();
  const datasets = nonEmpty.map((entry, idx) => {
    const map = new Map(entry.series.map((p) => [p.date, p.value]));
    const data = [];
    let seenStart = false;
    let last = null;

    for (const date of labels) {
      if (map.has(date)) {
        last = map.get(date);
        seenStart = true;
      }
      data.push(seenStart ? last : null);
    }

    return {
      label: entry.label,
      data,
      borderColor: entry.color || palette[idx % palette.length],
      backgroundColor: entry.color || palette[idx % palette.length],
      borderWidth: 2,
      pointRadius: 0,
      spanGaps: true
    };
  });

  return { labels, datasets };
}

function isTickerLabel(label) {
  return /^\^?[A-Z]{1,5}(?:-[A-Z]{1,4}|=[A-Z])?$/.test(String(label || '').trim());
}

const htmlLegendPlugin = {
  id: 'htmlLegend',
  afterUpdate(chart, _args, options) {
    const container = document.getElementById(options?.containerID || '');
    if (!container) return;
    container.innerHTML = '';

    const allowYoy = new Set(['3y', '5y', '10y']).has(state.activeRange);
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
              const name = state.symbolNames[rawLabel];
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

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function renderYoYMessage(title, message) {
  if (!yoyTableBody || !yoyTitle) return;
  yoyTitle.textContent = title || 'YoY';
  yoyTableBody.innerHTML = `<tr><td colspan="2">${message}</td></tr>`;
}

function buildYoYRows(labels, data) {
  const byYear = new Map();
  for (let i = 0; i < labels.length; i += 1) {
    const date = labels[i];
    const value = data[i];
    if (!date || value == null || Number.isNaN(value)) continue;
    const year = String(date).slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    byYear.set(year, Number(value));
  }

  const years = [...byYear.keys()].sort();
  const rows = [];
  for (let i = 1; i < years.length; i += 1) {
    const prev = byYear.get(years[i - 1]);
    const curr = byYear.get(years[i]);
    if (!prev || !curr) continue;
    rows.push({ year: years[i], value: ((curr / prev) - 1) * 100 });
  }
  return rows;
}

function showYoYForDataset(datasetIndex, chartRef) {
  const chart = chartRef || state.chart;
  if (!chart || !yoyTableBody || !yoyTitle) return;

  const allowed = new Set(['3y', '5y', '10y']);
  if (!allowed.has(state.activeRange)) {
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
    .map((row) => `<tr><td>${row.year}</td><td>${formatPct(row.value)}</td></tr>`)
    .join('');
}

function computePortfolioReturn(portfolio, symbolsData, range) {
  const series = buildCompositeSeries(portfolio.assets, symbolsData, range);
  if (!series.length) return null;
  const last = series[series.length - 1]?.value;
  if (last == null) return null;
  return last - 100;
}

function renderPerformanceTable(portfolios, symbolsData) {
  if (!perfTableBody) return;
  const rows = portfolios.map((portfolio) => ({
    label: portfolio.label,
    symbol:
      portfolio.assets.length === 1 &&
      Number(portfolio.assets[0].weight) === 100 &&
      portfolio.label === portfolio.assets[0].symbol
        ? portfolio.assets[0].symbol
        : null,
    ytd: computePortfolioReturn(portfolio, symbolsData, 'ytd'),
    oneYear: computePortfolioReturn(portfolio, symbolsData, '1y'),
    threeYears: computePortfolioReturn(portfolio, symbolsData, '3y')
  }));

  perfTableBody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>${row.symbol ? `<span data-symbol="${row.symbol}">${row.label}</span>` : row.label}</td>
        <td>${formatPct(row.ytd)}</td>
        <td>${formatPct(row.oneYear)}</td>
        <td>${formatPct(row.threeYears)}</td>
      </tr>
    `
    )
    .join('');
  void enrichTickerHover(perfTableBody);
}

async function resolveComparisonEntry(value) {
  const raw = (value || '').trim();
  if (!raw) return null;

  const group = state.groups.find((g) => g.name.toLowerCase() === raw.toLowerCase());
  if (group) {
    return {
      label: group.name,
      assets: group.assets
    };
  }

  const symbol = (await resolveInputToSymbol(raw)).symbol;

  return {
    label: symbol,
    assets: [{ symbol, weight: 100 }]
  };
}

async function compareMixed() {
  const rawValues = compareFields.map((field) => field.value.trim());
  const resolvedEntries = await Promise.all(rawValues.map((value) => resolveComparisonEntry(value)));
  const portfolios = resolvedEntries.filter(Boolean);

  if (portfolios.length < 2) {
    alert('Ingresa al menos 2 elementos para comparar.');
    return;
  }

  if (portfolios.length > 4) {
    alert('Máximo 4 elementos en la comparación.');
    return;
  }

  const symbols = [...new Set(portfolios.flatMap((p) => p.assets.map((a) => a.symbol)))];
  const symbolsData = {};

  for (const symbol of symbols) {
    symbolsData[symbol] = await getSymbolSeries(symbol);
  }

  const directSymbols = portfolios
    .filter(
      (p) =>
        p.assets.length === 1 && Number(p.assets[0].weight) === 100 && isTickerLabel(p.assets[0].symbol)
    )
    .map((p) => p.assets[0].symbol);
  await Promise.all(directSymbols.map((s) => ensureSymbolName(s)));

  const seriesEntries = portfolios.map((portfolio, idx) => ({
    label: portfolio.label,
    color: palette[idx % palette.length],
    series: buildCompositeSeries(portfolio.assets, symbolsData, state.activeRange)
  }));

  const { labels, datasets } = alignSeriesCollection(seriesEntries);
  if (!labels.length) {
    throw new Error('No hay datos disponibles para comparar en el rango seleccionado.');
  }

  upsertChart(labels, datasets);
  renderPerformanceTable(portfolios, symbolsData);
  state.lastCompare = {
    type: 'mixed',
    values: rawValues
  };
}

async function compareGroupComponents(groupIndex) {
  const group = state.groups[groupIndex];
  if (!group) {
    throw new Error('Grupo no encontrado.');
  }

  const symbols = [...new Set(group.assets.map((a) => a.symbol))];

  const portfolios = symbols.map((symbol) => ({
    label: symbol,
    assets: [{ symbol, weight: 100 }]
  }));

  const symbolsData = {};
  for (const symbol of symbols) {
    symbolsData[symbol] = await getSymbolSeries(symbol);
  }
  await Promise.all(symbols.map((s) => ensureSymbolName(s)));

  const seriesEntries = portfolios.map((portfolio, idx) => ({
    label: portfolio.label,
    color: palette[idx % palette.length],
    series: buildCompositeSeries(portfolio.assets, symbolsData, state.activeRange)
  }));

  const { labels, datasets } = alignSeriesCollection(seriesEntries);
  if (!labels.length) {
    throw new Error('No hay datos disponibles para los componentes del grupo en el rango seleccionado.');
  }

  upsertChart(labels, datasets);
  renderPerformanceTable(portfolios, symbolsData);
  state.lastCompare = {
    type: 'group-components',
    groupIndex
  };
}

detectBtn.addEventListener('click', async () => {
  await withButtonProcessing(detectBtn, async () => {
    const { assets, unresolved } = await detectAssetsFromText(input.value);
    state.assetsDraft = assets;
    renderAssetsDraft();
    detectInfo.textContent = `${assets.length} activo(s) detectado(s).`;
    if (unresolved.length > 0) {
      detectInfo.textContent += ` No resueltos: ${unresolved.slice(0, 3).join(', ')}${unresolved.length > 3 ? '...' : ''}.`;
    }
  });
});

saveGroupBtn.addEventListener('click', async () => {
  await withButtonProcessing(saveGroupBtn, async () => {
    const name = groupName.value.trim();
    if (!name) {
      alert('Indica un nombre para el grupo.');
      return;
    }

    if (state.assetsDraft.length === 0) {
      alert('Primero detecta activos en el texto.');
      return;
    }

    const validAssets = state.assetsDraft.filter((a) => a.weight > 0);
    if (validAssets.length === 0) {
      alert('Asigna al menos un peso mayor a 0.');
      return;
    }

    const totalWeight = validAssets.reduce((sum, a) => sum + Number(a.weight), 0);
    if (totalWeight <= 0) {
      alert('Los pesos deben sumar más de 0%.');
      return;
    }

    const normalizedAssets = validAssets.map((a) => ({
      symbol: a.symbol,
      weight: Number(((Number(a.weight) / totalWeight) * 100).toFixed(4))
    }));

    if (state.editingGroupIndex != null && state.groups[state.editingGroupIndex]) {
      state.groups[state.editingGroupIndex] = { name, assets: normalizedAssets };
    } else {
      const existing = state.groups.findIndex((g) => g.name.toLowerCase() === name.toLowerCase());
      if (existing >= 0) {
        state.groups[existing] = { name, assets: normalizedAssets };
      } else {
        state.groups.push({ name, assets: normalizedAssets });
      }
    }

    saveLocal('groups', state.groups);
    renderGroups();
    resetGroupEditor();
  });
});

runCompareBtn.addEventListener('click', async () => {
  await withButtonProcessing(runCompareBtn, async () => {
    try {
      await compareMixed();
    } catch (err) {
      alert(err.message || 'Error comparando selección');
    }
  });
});

clearCompareBtn?.addEventListener('click', async () => {
  await withButtonProcessing(clearCompareBtn, async () => {
    compareFields.forEach((field) => {
      if (field) field.value = '';
    });
    state.lastCompare = null;
    renderYoYMessage('YoY', 'Haz click en una serie de la leyenda para ver Year-over-Year.');
  });
});

rangeButtons.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-range]');
  if (!btn) return;

  state.activeRange = btn.dataset.range;
  document
    .querySelectorAll('#rangeButtons button')
    .forEach((el) => el.classList.toggle('active', el === btn));

  if (!state.lastCompare) return;

  await withButtonProcessing(btn, async () => {
    try {
      if (state.lastCompare.type === 'mixed') {
        compareFields.forEach((field, idx) => {
          field.value = state.lastCompare.values[idx] || '';
        });
        await compareMixed();
      } else if (state.lastCompare.type === 'group-components') {
        await compareGroupComponents(state.lastCompare.groupIndex);
      }
    } catch (err) {
      alert(err.message || 'No se pudo refrescar el rango');
    }
  });
});

renderGroups();
resetGroupEditor();
