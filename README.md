# Performance Measure

Aplicación web para comparar performance de activos financieros (acciones, ETFs, índices, commodities y cripto), crear grupos ponderados y analizar retornos en gráfico interactivo.

## Features principales

- Detección de activos desde texto libre/multilínea.
- Segunda columna opcional en textarea para pesos por línea:
  - `AAPL, 60`
  - `NVDA; 40`
  - `MSFT 25%`
- Resolución automática de texto a ticker (alias + búsqueda remota con caché).
- CRUD de grupos (crear, editar, eliminar).
- Click sobre nombre de grupo o componente para autocompletar el siguiente campo vacío de comparación.
- Comparación unificada de hasta 4 selecciones (cada una ticker o grupo).
- Botón `Limpiar selección` en comparación.
- Rangos: `YTD`, `1Y`, `3Y`, `5Y`, `10Y`.
- Gráfico Chart.js con zoom (wheel/drag/pinch) y sin pan lateral.
- Leyenda HTML custom:
  - click en ticker => mostrar/ocultar serie
  - click en `(YoY)` => tabla Year-over-Year (solo en 3Y/5Y/10Y)
- Tabla de resumen por selección con `YTD`, `1Y`, `3Y`.
- Tabla YoY por serie seleccionada desde la leyenda.
- `Ver componentes` de grupo sin límite de activos.
- Tooltips de nombre largo al hover en tickers (grupos, draft, tabla y tooltip del gráfico).
- Feedback visual de `Procesando...` en botones durante acciones.

## Stack

- Backend: Node.js + Express
- Frontend: HTML/CSS/JS vanilla
- Charts: Chart.js + chartjs-plugin-zoom + hammerjs
- Tests: Vitest + JSDOM

## Estructura

- `server.js` API + caché de mercado + resolución
- `public/index.html` UI
- `public/styles.css` estilos
- `public/app.js` lógica cliente
- `tests/chart-render.test.mjs` pruebas
- `README.md` guía de uso
- `DESIGN.md` especificación completa de recreación

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

## Caching

Servidor:
- Mercado incremental: `.cache/market-data/*.json`
- Resolución texto->ticker: `.cache/resolve-cache.json` (TTL 30 días)

Cliente:
- `groups`, `resolveCache`, `symbolNames` en `localStorage`
- `marketCache` solo en memoria (evita error de cuota del navegador)

## Notas

- Fuente de datos: Yahoo Finance Chart/Search endpoints.
- Alias incluidos para casos frecuentes (`EXXON -> XOM`, `BRKS -> AZTA`, etc.).
