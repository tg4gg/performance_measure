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
const compareFields = [
  document.getElementById('compareField1'),
  document.getElementById('compareField2'),
  document.getElementById('compareField3'),
  document.getElementById('compareField4')
];
const compareSuggestions = document.getElementById('compareSuggestions');
const perfTableBody = document.getElementById('perfTableBody');
const rangeButtons = document.getElementById('rangeButtons');

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

  return { symbol: payload.symbol, source: payload.source || 'remote' };
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
      <span class="pill">${asset.raw} -> ${asset.symbol}</span>
      <input type="number" min="0" step="0.01" value="${asset.weight}" data-index="${index}" />
      <span class="muted">peso %</span>
    `;

    row.querySelector('input').addEventListener('input', (e) => {
      state.assetsDraft[index].weight = Number(e.target.value || 0);
    });

    assetsContainer.appendChild(row);
  });
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

    const composition = group.assets.map((a) => `${a.symbol} (${a.weight}%)`).join(' + ');

    row.innerHTML = `
      <div>
        <strong>${group.name}</strong>
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
    btn.addEventListener('click', () => editGroup(Number(btn.dataset.index)));
  });

  groupsContainer.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteGroup(Number(btn.dataset.index)));
  });
  groupsContainer.querySelectorAll('button[data-action="components"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await compareGroupComponents(Number(btn.dataset.index));
      } catch (err) {
        alert(err.message || 'Error mostrando componentes del grupo');
      }
    });
  });

  renderSuggestions();
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

function upsertChart(labels, datasets) {
  const ctx = document.getElementById('chart');

  if (state.chart) {
    state.chart.data.labels = labels;
    state.chart.data.datasets = datasets;
    state.chart.update();
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
          labels: { color: '#ebf2ff' }
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
    }
  });
}

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
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
    ytd: computePortfolioReturn(portfolio, symbolsData, 'ytd'),
    oneYear: computePortfolioReturn(portfolio, symbolsData, '1y'),
    threeYears: computePortfolioReturn(portfolio, symbolsData, '3y')
  }));

  perfTableBody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>${row.label}</td>
        <td>${formatPct(row.ytd)}</td>
        <td>${formatPct(row.oneYear)}</td>
        <td>${formatPct(row.threeYears)}</td>
      </tr>
    `
    )
    .join('');
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
  const { assets, unresolved } = await detectAssetsFromText(input.value);
  state.assetsDraft = assets;
  renderAssetsDraft();
  detectInfo.textContent = `${assets.length} activo(s) detectado(s).`;
  if (unresolved.length > 0) {
    detectInfo.textContent += ` No resueltos: ${unresolved.slice(0, 3).join(', ')}${unresolved.length > 3 ? '...' : ''}.`;
  }
});

saveGroupBtn.addEventListener('click', () => {
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

runCompareBtn.addEventListener('click', async () => {
  try {
    await compareMixed();
  } catch (err) {
    alert(err.message || 'Error comparando selección');
  }
});

rangeButtons.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-range]');
  if (!btn) return;

  state.activeRange = btn.dataset.range;
  document
    .querySelectorAll('#rangeButtons button')
    .forEach((el) => el.classList.toggle('active', el === btn));

  if (!state.lastCompare) return;

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

renderGroups();
resetGroupEditor();
