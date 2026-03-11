import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const appJs = fs.readFileSync(path.join(process.cwd(), 'public', 'app.js'), 'utf8');

function makeYearlyPoints(startYear, closes) {
  return closes.map((close, idx) => {
    const year = startYear + idx;
    return { date: `${year}-01-02`, close };
  });
}

const mockSeries = {
  AAPL: makeYearlyPoints(2021, [100, 112, 126, 138, 152, 168]),
  NVDA: makeYearlyPoints(2021, [100, 118, 146, 162, 190, 228]),
  GLD: makeYearlyPoints(2021, [100, 103, 105, 108, 112, 115]),
  XOM: makeYearlyPoints(2021, [100, 109, 117, 126, 133, 141]),
  'BTC-USD': makeYearlyPoints(2021, [100, 145, 132, 188, 210, 240]),
  'ETH-USD': makeYearlyPoints(2021, [100, 138, 122, 170, 196, 225]),
  URA: makeYearlyPoints(2021, [100, 107, 111, 116, 121, 127]),
  AMZN: makeYearlyPoints(2021, [100, 106, 114, 121, 129, 137]),
  SLVR: makeYearlyPoints(2025, [100, 104]),
  MSFT: makeYearlyPoints(2021, [100, 109, 121, 132, 145, 156]),
  EQQQ: makeYearlyPoints(2021, [100, 104, 112, 125, 136, 148]),
  'EQQQ.L': makeYearlyPoints(2021, [100, 104, 112, 125, 136, 148]),
  TSLA: makeYearlyPoints(2021, [100, 128, 119, 137, 142, 160]),
  'EURUSD=X': makeYearlyPoints(2021, [1.08, 1.09, 1.07, 1.1, 1.11, 1.2])
};

function buildHtml() {
  return `<!doctype html><html><body>
    <div id="modeSwitch">
      <button data-mode="pm" class="active"></button>
      <button data-mode="mpm"></button>
    </div>
    <h1 id="modeTitle"></h1>
    <p id="modeSubtitle"></p>
    <h2 id="builderTitle"></h2>
    <p id="builderHint"></p>
    <textarea id="rawInput"></textarea>
    <button id="detectBtn"></button>
    <span id="detectInfo"></span>
    <div id="assetsContainer"></div>
    <h2 id="collectionTitle"></h2>
    <p id="collectionHint"></p>
    <input id="groupName" />
    <button id="saveGroupBtn"></button>
    <div id="subsetBuilder" class="hidden"></div>
    <input id="subsetPortfolioInput" />
    <button id="addSubsetBtn"></button>
    <datalist id="portfolioSuggestions"></datalist>
    <div id="draftMetricsSection" class="hidden"></div>
    <button id="refreshDraftMetricsBtn"></button>
    <span id="draftMetricsStatus"></span>
    <div id="draftMetricsCard"></div>
    <div id="groupsContainer"></div>
    <h2 id="compareTitle"></h2>
    <p id="compareHint"></p>
    <button id="runCompareBtn"></button>
    <button id="clearCompareBtn"></button>
    <div id="compareWarning"></div>
    <input id="compareField1" />
    <input id="compareField2" />
    <input id="compareField3" />
    <input id="compareField4" />
    <datalist id="compareSuggestions"></datalist>
    <input id="customRangeDate" />
    <button id="applyCustomRangeBtn"></button>
    <div id="activeRangeNote"></div>
    <table>
      <thead><tr><th id="perfHeadLabel"></th><th id="perfHeadYtd"></th><th id="perfHead1y"></th><th id="perfHead3y"></th><th id="perfHeadCustom"></th><th id="perfHeadAllTime"></th><th id="perfHeadGainUsd"></th><th id="perfHeadGainPerUnit"></th><th id="perfHeadValueUsd"></th><th id="perfHeadValueEur"></th></tr></thead>
      <tbody id="perfTableBody"></tbody>
    </table>
    <table>
      <thead><tr><th id="yoyTitle">YoY</th></tr></thead>
      <tbody id="yoyTableBody"></tbody>
    </table>
    <div id="chartLegend"></div>
    <div id="rangeButtons">
      <button data-range="ytd" class="active"></button>
      <button data-range="1y"></button>
      <button data-range="3y"></button>
      <button data-range="5y"></button>
      <button data-range="10y"></button>
    </div>
    <canvas id="chart"></canvas>
  </body></html>`;
}

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('chart rendering flows', () => {
  beforeEach(() => {
    const dom = new JSDOM(buildHtml(), {
      url: 'http://localhost:3000',
      runScripts: 'outside-only'
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.__chartInstance = null;

    const alerts = [];
    const alertStub = (msg) => alerts.push(String(msg || ''));
    global.alert = alertStub;
    dom.window.alert = alertStub;
    global.__alerts = alerts;

    const MockChart = class MockChart {
      constructor(_ctx, config) {
        this.data = config.data;
        this.options = config.options;
        this.plugins = config.plugins || [];
        this._hidden = {};
        this.updated = 0;
        global.__chartInstance = this;
        this._runPlugins();
      }

      update() {
        this.updated += 1;
        this._runPlugins();
      }

      isDatasetVisible(index) {
        return this._hidden[index] !== true;
      }

      setDatasetVisibility(index, visible) {
        this._hidden[index] = !visible;
      }

      _runPlugins() {
        this.plugins.forEach((plugin) => {
          if (typeof plugin?.afterUpdate === 'function') {
            plugin.afterUpdate(this, {}, this.options?.plugins?.[plugin.id] || {});
          }
        });
      }
    };

    global.Chart = MockChart;
    dom.window.Chart = MockChart;

    const fetchStub = async (url) => {
      const parsed = new URL(url, 'http://localhost:3000');
      if (parsed.pathname === '/api/resolve') {
        const query = parsed.searchParams.get('query');
        const normalized = String(query || '').toUpperCase();
        if (normalized === 'EXXON') {
          return {
            ok: true,
            json: async () => ({ query, symbol: 'XOM', source: 'yahoo-search' })
          };
        }
        if (normalized === 'US0378331005') {
          return {
            ok: true,
            json: async () => ({ query, symbol: 'AAPL', source: 'yahoo-search' })
          };
        }
        if (normalized === 'A1JX52') {
          return {
            ok: true,
            json: async () => ({ query, symbol: 'EQQQ', source: 'yahoo-search' })
          };
        }
        return {
          ok: false,
          json: async () => ({ error: `No symbol for ${query}` })
        };
      }

      const symbol = parsed.searchParams.get('symbol');
      const points = mockSeries[symbol];

      if (!points) {
        return {
          ok: false,
          json: async () => ({ error: `No data for ${symbol}` })
        };
      }

      return {
        ok: true,
        json: async () => ({ symbol, points })
      };
    };

    global.fetch = fetchStub;
    dom.window.fetch = fetchStub;

    dom.window.eval(appJs);
  });

  it('plots mixed selection and keeps 5Y history when one component starts later', async () => {
    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    rawInput.value = 'AAPL\nNVDA';
    detectBtn.click();
    await tick();
    groupName.value = 'Tech stocks';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();

    rawInput.value = 'GLD\nSLVR\nURA';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Materias primas';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();

    document.querySelector('button[data-range="5y"]').click();

    document.getElementById('compareField1').value = 'Tech stocks';
    document.getElementById('compareField2').value = 'Materias primas';
    document.getElementById('compareField3').value = 'AAPL';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.length).toBe(3);
    expect(global.__chartInstance.data.labels.length).toBeGreaterThan(0);
    expect(global.__chartInstance.data.labels[0]).toBe('2021-01-02');
    expect(global.__chartInstance.data.datasets[1].label).toBe('Materias primas');
    expect(document.querySelectorAll('#perfTableBody tr').length).toBe(3);
  });

  it('supports up to 4 mixed entries in single selector', async () => {
    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    rawInput.value = 'AAPL\nNVDA';
    detectBtn.click();
    await tick();
    groupName.value = 'Tech stocks';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();

    document.getElementById('compareField1').value = 'Tech stocks';
    document.getElementById('compareField2').value = 'GLD';
    document.getElementById('compareField3').value = 'MSFT';
    document.getElementById('compareField4').value = 'URA';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.length).toBe(4);
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual([
      'Tech stocks',
      'GLD',
      'MSFT',
      'URA'
    ]);
  });

  it('plots group underlying components side by side when clicking group action', async () => {
    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    rawInput.value = 'AAPL\nNVDA\nGLD';
    detectBtn.click();
    await tick();
    groupName.value = 'Mix demo';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();

    const componentsBtn = document.querySelector('button[data-action="components"][data-index="0"]');
    expect(componentsBtn).toBeTruthy();

    componentsBtn.click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual(['AAPL', 'NVDA', 'GLD']);
    expect(document.querySelectorAll('#perfTableBody tr').length).toBe(3);
  });

  it('shows all underlying components (no cap) when viewing group components', async () => {
    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    rawInput.value = 'AAPL\nNVDA\nGLD\nMSFT\nURA\nAMZN';
    detectBtn.click();
    await tick();
    groupName.value = 'Large group';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();

    const componentsBtn = document.querySelector('button[data-action="components"][data-index="0"]');
    componentsBtn.click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.length).toBe(6);
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual([
      'AAPL',
      'NVDA',
      'GLD',
      'MSFT',
      'URA',
      'AMZN'
    ]);
  });

  it('resolves free-text names through resolver endpoint', async () => {
    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'EXXON';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual(['AAPL', 'XOM']);
  });

  it('maps major crypto symbols directly to spot pairs', async () => {
    document.getElementById('compareField1').value = 'BTC';
    document.getElementById('compareField2').value = 'ETH';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual(['BTC-USD', 'ETH-USD']);
  });

  it('still plots valid series when one ticker is invalid and shows warning', async () => {
    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'NOTAREALTICKER';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual(['AAPL']);
    expect(document.getElementById('compareWarning').textContent).toContain('Advertencia:');
  });

  it('handles EQQQ as a valid series and plots with others', async () => {
    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'EQQQ';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual(['AAPL', 'EQQQ']);
    expect(document.getElementById('compareWarning').textContent).toBe('');
  });

  it('keeps exchange suffix tickers like EQQQ.L without truncating to EQQQ', async () => {
    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'EQQQ.L';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual(['AAPL', 'EQQQ.L']);
  });

  it('resolves ISIN and WKN identifiers through the resolver instead of truncating them', async () => {
    document.getElementById('compareField1').value = 'US0378331005';
    document.getElementById('compareField2').value = 'A1JX52';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual(['AAPL', 'EQQQ']);
    expect(document.getElementById('compareWarning').textContent).toBe('');
  });

  it('supports second column allocation in multiline text input', async () => {
    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    rawInput.value = 'AAPL, 70\nNVDA, 30';
    detectBtn.click();
    await tick();

    groupName.value = 'Weighted tech';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();

    const groupText = document.getElementById('groupsContainer').textContent;
    expect(groupText).toContain('AAPL (70');
    expect(groupText).toContain('NVDA (30');
  });

  it('shows YoY table when clicking legend on 5Y range', async () => {
    document.querySelector('button[data-range="5y"]').click();
    await tick();

    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'MSFT';
    document.getElementById('runCompareBtn').click();
    await tick();

    const yoyBtn = document.querySelector('#chartLegend button[data-role="yoy"][data-dataset-index="0"]');
    expect(yoyBtn).toBeTruthy();
    yoyBtn.click();
    await tick();

    expect(document.getElementById('yoyTitle').textContent).toContain('AAPL');
    expect(document.querySelectorAll('#yoyTableBody tr').length).toBeGreaterThan(0);
  });

  it('rebases comparison series from a selected purchase date and shows the return to today', async () => {
    document.getElementById('customRangeDate').value = '2024-01-02';
    document.getElementById('customRangeDate').dispatchEvent(new window.Event('input'));
    document.getElementById('applyCustomRangeBtn').click();
    await tick();

    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'MSFT';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.labels).toEqual(['2024-01-02', '2025-01-02', '2026-01-02']);
    expect(global.__chartInstance.data.datasets[0].data[0]).toBe(100);
    expect(document.getElementById('activeRangeNote').textContent).toContain('2024-01-02');
    expect(document.getElementById('perfHeadCustom').textContent).toContain('2024-01-02');

    const cells = [...document.querySelectorAll('#perfTableBody tr:first-child td')].map((cell) => cell.textContent.trim());
    expect(cells[4]).toBe('+21.74%');
  });

  it('shows YoY unavailable message for non-supported ranges', async () => {
    document.querySelector('button[data-range="ytd"]').click();
    await tick();

    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'MSFT';
    document.getElementById('runCompareBtn').click();
    await tick();

    const yoyBtn = document.querySelector('#chartLegend button[data-role="yoy"][data-dataset-index="0"]');
    yoyBtn.click();
    await tick();

    expect(document.getElementById('yoyTableBody').textContent).toContain(
      'Disponible solo para rangos 3Y, 5Y y 10Y.'
    );
  });

  it('keeps standard toggle behavior when clicking ticker name in legend', async () => {
    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'MSFT';
    document.getElementById('runCompareBtn').click();
    await tick();

    const toggleBtn = document.querySelector('#chartLegend button[data-role="toggle"][data-dataset-index="0"]');
    expect(toggleBtn).toBeTruthy();
    expect(global.__chartInstance.isDatasetVisible(0)).toBe(true);

    toggleBtn.click();
    await tick();
    expect(global.__chartInstance.isDatasetVisible(0)).toBe(false);

    toggleBtn.click();
    await tick();
    expect(global.__chartInstance.isDatasetVisible(0)).toBe(true);
  });

  it('fills next comparison field when clicking group name or component', async () => {
    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    rawInput.value = 'AAPL\nNVDA';
    detectBtn.click();
    await tick();
    groupName.value = 'Tech stocks';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();

    const groupNamePick = document.querySelector('[data-pick-value="Tech stocks"]');
    expect(groupNamePick).toBeTruthy();
    groupNamePick.click();
    expect(document.getElementById('compareField1').value).toBe('Tech stocks');

    const symbolPick = document.querySelector('[data-pick-value="AAPL"]');
    expect(symbolPick).toBeTruthy();
    symbolPick.click();
    expect(document.getElementById('compareField2').value).toBe('AAPL');
  });

  it('clears unified comparison inputs with clear button', async () => {
    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'MSFT';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.length).toBe(2);
    expect(document.querySelectorAll('#perfTableBody tr').length).toBe(2);

    document.getElementById('compareField1').value = 'AAPL';
    document.getElementById('compareField2').value = 'MSFT';
    document.getElementById('clearCompareBtn').click();
    await tick();

    expect(document.getElementById('compareField1').value).toBe('');
    expect(document.getElementById('compareField2').value).toBe('');
    expect(global.__chartInstance.data.datasets).toHaveLength(0);
    expect(global.__chartInstance.data.labels).toHaveLength(0);
    expect(document.querySelectorAll('#perfTableBody tr')).toHaveLength(0);
  });

  it('supports MPM portfolios with subsets and compares them against subsets and direct stocks', async () => {
    document.querySelector('[data-mode="mpm"]').click();
    await tick();

    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');
    const addSubsetBtn = document.getElementById('addSubsetBtn');
    const subsetInput = document.getElementById('subsetPortfolioInput');

    rawInput.value = 'AAPL, price=95, units=2, buyDate=2023-01-02\nMSFT, price=102, units=1';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Core';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    rawInput.value = 'NVDA, price=88, units=3, sell=2024-01-02';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Trading';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    rawInput.value = 'GLD, price=101, units=2';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    subsetInput.value = 'Core';
    addSubsetBtn.click();
    await tick();
    subsetInput.value = 'Trading';
    addSubsetBtn.click();
    await tick();
    groupName.value = 'Total';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    document.getElementById('compareField1').value = 'Total';
    document.getElementById('compareField2').value = 'Core';
    document.getElementById('compareField3').value = 'TSLA';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.map((dataset) => dataset.label)).toEqual(['Total', 'Core', 'TSLA']);
    expect(document.getElementById('groupsContainer').textContent).toContain('Subset');
  });

  it('shows cached section-2 metrics for the full draft, subsets, and direct purchases in MPM', async () => {
    document.querySelector('[data-mode="mpm"]').click();
    await tick();

    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');
    const addSubsetBtn = document.getElementById('addSubsetBtn');
    const subsetInput = document.getElementById('subsetPortfolioInput');

    rawInput.value = 'AAPL, price=95, units=2';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Core';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    rawInput.value = 'GLD, price=101, units=2';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    subsetInput.value = 'Core';
    addSubsetBtn.click();
    await tick();

    expect(document.getElementById('draftMetricsSection').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('draftMetricsCard').textContent).toContain('Value USD');
    expect(document.getElementById('assetsContainer').textContent).toContain('Gain USD');
    expect(document.getElementById('assetsContainer').textContent).toContain('Value EUR');

    const metricsCache = JSON.parse(localStorage.getItem('mpmMetricsCache'));
    expect(metricsCache).toBeTruthy();
    expect(Object.keys(metricsCache).length).toBeGreaterThan(0);
  });

  it('shows an explicit metrics error and skips full-draft caching when a holding has no market data', async () => {
    document.querySelector('[data-mode="mpm"]').click();
    await tick();

    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');

    rawInput.value = 'AAPL, price=95, units=2\nNFLX, price=101, units=1';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();

    expect(document.getElementById('draftMetricsCard').textContent).toContain('Sin datos para: NFLX.');
    expect(document.getElementById('draftMetricsStatus').textContent).toContain('Metricas incompletas');

    const metricsCache = JSON.parse(localStorage.getItem('mpmMetricsCache'));
    expect(metricsCache).toBeTruthy();
    expect(Object.keys(metricsCache)).toHaveLength(1);
  });

  it('expands nested MPM holdings when viewing portfolio holdings', async () => {
    document.querySelector('[data-mode="mpm"]').click();
    await tick();

    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');
    const addSubsetBtn = document.getElementById('addSubsetBtn');
    const subsetInput = document.getElementById('subsetPortfolioInput');

    rawInput.value = 'AAPL, 95, 2, 2023-01-02\nMSFT, 101, 1';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Core';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    rawInput.value = 'NVDA, 88, 3';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    subsetInput.value = 'Core';
    addSubsetBtn.click();
    await tick();
    groupName.value = 'Master';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    const holdingsBtn = document.querySelector('button[data-action="components"][data-index="1"]');
    expect(holdingsBtn).toBeTruthy();
    holdingsBtn.click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.length).toBe(3);
    expect(global.__chartInstance.data.datasets[1].label).toContain('Core');
  });

  it('tracks buyDate in MPM and starts the holding series from the buy date', async () => {
    document.querySelector('[data-mode="mpm"]').click();
    await tick();

    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    rawInput.value = 'AAPL, price=95, units=2, buyDate=2024-01-02';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Bought later';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    document.querySelector('button[data-range="5y"]').click();
    await tick();

    expect(document.getElementById('groupsContainer').textContent).toContain('buy 2024-01-02');

    const holdingsBtn = document.querySelector('button[data-action="components"][data-index="0"]');
    holdingsBtn.click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.labels[0]).toBe('2024-01-02');
    expect(global.__chartInstance.data.datasets[0].label).toContain('buy 2024-01-02');

    const cells = [...document.querySelectorAll('#perfTableBody tr:first-child td')].map((cell) => cell.textContent.trim());
    expect(cells[5]).toBe('+76.84%');
    expect(cells[6]).toBe('$146.00');
    expect(cells[7]).toBe('$73.00');
    expect(cells[8]).toBe('$336.00');
    expect(cells[9]).toBe('€280.00');
  });

  it('excludes holdings whose buyDate is later than the latest available quote', async () => {
    document.querySelector('[data-mode="mpm"]').click();
    await tick();

    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    rawInput.value = 'AAPL, price=95, units=2';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Only AAPL';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    rawInput.value = 'AAPL, price=95, units=2\nMSFT, price=101, units=1, buyDate=2027-01-02';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Future mix';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    document.getElementById('compareField1').value = 'Only AAPL';
    document.getElementById('compareField2').value = 'Future mix';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets).toHaveLength(2);
    expect(global.__chartInstance.data.datasets[0].data).toEqual(global.__chartInstance.data.datasets[1].data);
  });

  it('overrides MPM chart rebasing from a selected purchase date without changing all-time cost basis', async () => {
    document.querySelector('[data-mode="mpm"]').click();
    await tick();

    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');

    rawInput.value = 'AAPL, price=95, units=2, buyDate=2023-01-02';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Bought AAPL';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    document.getElementById('customRangeDate').value = '2024-01-02';
    document.getElementById('customRangeDate').dispatchEvent(new window.Event('input'));
    document.getElementById('applyCustomRangeBtn').click();
    await tick();

    document.getElementById('compareField1').value = 'Bought AAPL';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.labels[0]).toBe('2024-01-02');

    const cells = [...document.querySelectorAll('#perfTableBody tr:first-child td')].map((cell) => cell.textContent.trim());
    expect(cells[4]).toBe('+21.74%');
    expect(cells[5]).toBe('+76.84%');
  });

  it('blocks deleting an MPM portfolio that is still referenced as a subset', async () => {
    document.querySelector('[data-mode="mpm"]').click();
    await tick();

    const rawInput = document.getElementById('rawInput');
    const detectBtn = document.getElementById('detectBtn');
    const groupName = document.getElementById('groupName');
    const saveGroupBtn = document.getElementById('saveGroupBtn');
    const addSubsetBtn = document.getElementById('addSubsetBtn');
    const subsetInput = document.getElementById('subsetPortfolioInput');

    rawInput.value = 'AAPL, price=95, units=2';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    groupName.value = 'Core';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    rawInput.value = 'GLD, price=101, units=2';
    rawInput.dispatchEvent(new window.Event('input'));
    detectBtn.click();
    await tick();
    subsetInput.value = 'Core';
    addSubsetBtn.click();
    await tick();
    groupName.value = 'Master';
    groupName.dispatchEvent(new window.Event('input'));
    saveGroupBtn.click();
    await tick();

    const deleteBtn = document.querySelector('button[data-action="delete"][data-index="0"]');
    deleteBtn.click();
    await tick();

    expect(global.__alerts.at(-1)).toContain('No se puede eliminar "Core"');
    expect(document.getElementById('groupsContainer').textContent).toContain('Core');
    expect(document.getElementById('groupsContainer').textContent).toContain('Master');
  });
});
