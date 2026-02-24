# Performance Measure

Aplicación web para comparar performance de activos financieros (stocks, ETFs, índices, commodities, crypto) y grupos compuestos por pesos.

## Qué hace

- Pega texto libre/multilínea para detectar activos.
- Soporta asignación de pesos en segunda columna por línea (ej: `AAPL, 60`).
- Crea, edita y elimina grupos de activos ponderados.
- Compara hasta 4 elementos en un selector unificado:
  - ticker directo
  - nombre exacto de grupo creado
- Botones de rango: `YTD`, `1Y`, `3Y`, `5Y`, `10Y`.
- Gráfico interactivo de performance base 100.
- Tabla de resumen por selección con `YTD`, `1Y`, `3Y`.
- Acción `Ver componentes` para graficar todos los activos subyacentes de un grupo.
- Resolución automática de texto a símbolo con caché local.
- Caché de datos de mercado en servidor (disco), incremental.

## Stack

- Backend: Node.js + Express
- Frontend: HTML/CSS/JS (vanilla)
- Charting: Chart.js (CDN)
- Tests: Vitest + JSDOM

## Estructura

- `server.js`: API y caché de mercado/resolución
- `public/index.html`: interfaz
- `public/styles.css`: estilos
- `public/app.js`: lógica cliente
- `tests/chart-render.test.mjs`: tests de flujos clave

## Requisitos

- Node.js 18+
- npm

## Instalar

```bash
npm install
```

## Ejecutar

```bash
npm start
```

Abrir: `http://localhost:3000`

## Desarrollo

```bash
npm run dev
```

## Tests

```bash
npm test
```

## Formato de entrada recomendado (textarea)

- Solo activo:
  - `AAPL`
  - `Exxon`
  - `S&P 500`
- Activo + peso:
  - `AAPL, 50`
  - `NVDA; 30`
  - `GLD | 20`
  - `MSFT 25%`

## Caching

- Servidor:
  - Mercado: `.cache/market-data/*.json`
  - Resolución texto->ticker: `.cache/resolve-cache.json` (TTL 30 días)
- Cliente:
  - `groups` y `resolveCache` en `localStorage`
  - `marketCache` solo en memoria para evitar quota overflow del navegador

## Notas

- La app usa Yahoo Finance Chart/Search endpoints.
- Algunas entradas son alias conocidos (`EXXON -> XOM`, `BRKS -> AZTA`, etc.).
- `Ver componentes` no limita cantidad de activos.
- El selector unificado sí mantiene máximo 4 elementos por comparación.
