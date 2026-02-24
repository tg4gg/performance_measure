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
  URA: makeYearlyPoints(2021, [100, 107, 111, 116, 121, 127]),
  AMZN: makeYearlyPoints(2021, [100, 106, 114, 121, 129, 137]),
  SLVR: makeYearlyPoints(2025, [100, 104]),
  MSFT: makeYearlyPoints(2021, [100, 109, 121, 132, 145, 156])
};

function buildHtml() {
  return `<!doctype html><html><body>
    <textarea id="rawInput"></textarea>
    <button id="detectBtn"></button>
    <span id="detectInfo"></span>
    <div id="assetsContainer"></div>
    <input id="groupName" />
    <button id="saveGroupBtn"></button>
    <div id="groupsContainer"></div>
    <button id="runCompareBtn"></button>
    <button id="clearCompareBtn"></button>
    <input id="compareField1" />
    <input id="compareField2" />
    <input id="compareField3" />
    <input id="compareField4" />
    <datalist id="compareSuggestions"></datalist>
    <table><tbody id="perfTableBody"></tbody></table>
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
        if (String(query || '').toUpperCase() === 'EXXON') {
          return {
            ok: true,
            json: async () => ({ query, symbol: 'XOM', source: 'yahoo-search' })
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
    saveGroupBtn.click();

    rawInput.value = 'GLD\nSLVR\nURA';
    detectBtn.click();
    await tick();
    groupName.value = 'Materias primas';
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
    saveGroupBtn.click();

    document.getElementById('compareField1').value = 'Tech stocks';
    document.getElementById('compareField2').value = 'GLD';
    document.getElementById('compareField3').value = 'MSFT';
    document.getElementById('compareField4').value = 'URA';
    document.getElementById('runCompareBtn').click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.length).toBe(4);
    expect(global.__chartInstance.data.datasets.map((d) => d.label)).toEqual([
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
    saveGroupBtn.click();

    const componentsBtn = document.querySelector('button[data-action="components"][data-index="0"]');
    expect(componentsBtn).toBeTruthy();

    componentsBtn.click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.map((d) => d.label)).toEqual(['AAPL', 'NVDA', 'GLD']);
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
    saveGroupBtn.click();

    const componentsBtn = document.querySelector('button[data-action="components"][data-index="0"]');
    componentsBtn.click();
    await tick();

    expect(global.__chartInstance).toBeTruthy();
    expect(global.__chartInstance.data.datasets.length).toBe(6);
    expect(global.__chartInstance.data.datasets.map((d) => d.label)).toEqual([
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
    expect(global.__chartInstance.data.datasets.map((d) => d.label)).toEqual(['AAPL', 'XOM']);
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
    saveGroupBtn.click();

    const groupText = document.getElementById('groupsContainer').textContent;
    expect(groupText).toContain('AAPL (70%');
    expect(groupText).toContain('NVDA (30%');
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
    document.getElementById('clearCompareBtn').click();
    await tick();

    expect(document.getElementById('compareField1').value).toBe('');
    expect(document.getElementById('compareField2').value).toBe('');
  });
});
