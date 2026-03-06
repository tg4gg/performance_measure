# Performance Measure

Web app para analizar performance de activos financieros en dos modos paralelos:

- `Performance measure` (PM): detección desde texto libre, grupos ponderados y comparación base 100.
- `My performance measure` (MPM): holdings reales con `purchasePrice`, `units`, `buyDate`, `sellDate` opcional, portfolios y subsets anidados.

## Features principales

- Cambio seamless entre PM y MPM desde la misma UI.
- Comparación con 1 a 4 selecciones.
- Resolución de identificadores por:
  - ticker
  - alias local
  - WKN
  - ISIN
  - texto libre
- Fallback de resolución:
  - Yahoo Finance Search
  - OpenFIGI para WKN/ISIN cuando Yahoo no devuelve match directo
- Caché local de resolución de símbolos.
- Chart.js con zoom y leyenda HTML custom.
- Tabla resumen con `YTD`, `1Y`, `3Y`.
- Tabla YoY por serie en rangos `3Y`, `5Y`, `10Y`.

## Modo PM

- Detección de activos desde texto libre o multilínea.
- Pesos opcionales por línea:
  - `AAPL, 60`
  - `NVDA; 40`
  - `MSFT 25%`
- CRUD de grupos ponderados.
- Comparación entre tickers y/o grupos.
- `Ver componentes` para desplegar series subyacentes del grupo.

## Modo MPM

- Holdings con campos:
  - `symbol`
  - `purchasePrice` opcional
  - `units` opcional
  - `buyDate` opcional
  - `sellDate` opcional
- Portfolios con holdings directos y subsets reutilizables.
- Comparación entre:
  - portfolios
  - subsets
  - stocks directos
- `buyDate` define cuándo entra una posición al cálculo.
- `sellDate` congela la posición desde la fecha de venta.
- Los portfolios ponderan por costo base (`purchasePrice * units`, o fallback al primer precio disponible si falta).

## Ejemplos de entrada MPM

```text
AAPL, 182.4, 12, buyDate=2025-01-10
MSFT, price=420, units=6
NVDA, price=610, units=4, buyDate=2025-02-01, sell=2025-09-20
```

## Stack

- Backend: Node.js + Express
- Frontend: HTML/CSS/JS vanilla
- Charts: Chart.js + chartjs-plugin-zoom + hammerjs
- Tests: Vitest + JSDOM

## Estructura

- `server.js`: API, resolución de símbolos, fallback OpenFIGI, caché de mercado
- `public/index.html`: shell UI con switch PM / MPM
- `public/styles.css`: estilos
- `public/app.js`: lógica cliente
- `tests/chart-render.test.mjs`: tests frontend
- `tests/server-resolve.test.mjs`: tests de fallback WKN/ISIN en backend
- `README.md`: guía de uso
- `DESIGN.md`: especificación funcional

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm start
```

Abrir: `http://localhost:3000`

## Tests

```bash
npm test
```

## Resolución de símbolos

Orden general:
1. Alias local
2. Ticker directo
3. Yahoo Finance Search
4. OpenFIGI para inputs tipo WKN/ISIN cuando Yahoo no resuelve

Notas:
- Los WKN/ISIN no se truncan a pseudo-tickers locales.
- La salida de OpenFIGI se normaliza a un símbolo utilizable por Yahoo Finance antes de aceptarse.

## Caching

Servidor:
- Mercado incremental: `.cache/market-data/*.json`
- Resolución texto->ticker: `.cache/resolve-cache.json` (TTL 30 días)

Cliente:
- `groups`, `mpmPortfolios`, `resolveCache`, `symbolNames`, `activeMode` en `localStorage`
- `marketCache` solo en memoria

## Release

- Rama de desarrollo: `portfolio_tracking`
- Release solicitado: `v0.1`
