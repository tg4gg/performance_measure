# DESIGN.md - Blueprint Completo para Recrear la App Desde Cero

Este documento define, sin depender de código previo, cómo construir la aplicación completa de comparación de performance de activos y grupos.

## 1. Objetivo del producto

Construir una app web que permita:

1. Ingresar texto libre/multilínea y resolver cada línea a un símbolo financiero.
2. Asignar pesos para formar grupos compuestos.
3. Crear/editar/eliminar grupos.
4. Comparar en una sola vista hasta 4 selecciones (cada una puede ser ticker o grupo).
5. Visualizar componentes de un grupo sin límite de cantidad.
6. Cambiar rango temporal (`YTD`, `1Y`, `3Y`, `5Y`, `10Y`).
7. Ver un gráfico base 100 y una tabla resumen (`YTD`, `1Y`, `3Y`).
8. Minimizar llamadas externas mediante caché local (cliente y servidor).

## 2. Requisitos funcionales

### 2.1 Entrada de texto y parsing

- Campo multilinea para pegar texto.
- Cada línea puede ser:
  - `valor`
  - `valor, peso`
  - `valor; peso`
  - `valor | peso`
  - `valor 25%`
- `valor` puede ser:
  - ticker (`AAPL`, `BRK-B`, `GC=F`)
  - nombre aproximado (`microsoft corporation`, `exxon`)

### 2.2 Detección y resolución de símbolos

Proceso recomendado por línea:

1. Resolver con alias local conocidos.
2. Intentar parse ticker directo solo si no es frase (evitar falsos positivos tipo `MICRO` en `microsoft corporation`).
3. Si falla, llamar endpoint backend `/api/resolve?query=...`.
4. Guardar resolución en caché local (cliente + servidor).

### 2.3 Grupos

- Crear grupo con nombre + lista de activos ponderados.
- Normalizar pesos al guardar (sumar 100%).
- Editar grupo:
  - cargar nombre
  - cargar componentes en draft
  - poblar textarea como `TICKER, PESO` por línea
- Eliminar grupo.

### 2.4 Comparación unificada

- 4 campos de entrada (`campo1..campo4`), mínimo 2 no vacíos.
- Cada campo acepta:
  - ticker/nombre resoluble
  - nombre exacto de grupo
- Límite máximo: 4 elementos en esta vista.

### 2.5 Visualización de componentes

- Cada grupo tiene botón `Ver componentes`.
- Debe graficar todos los activos del grupo (sin límite).

### 2.6 Rango temporal

Botones: `YTD`, `1Y`, `3Y`, `5Y`, `10Y`.

- Deben recalcular la vista activa actual:
  - comparación unificada
  - o vista de componentes del grupo

### 2.7 Gráfico y tabla

- Gráfico lineal interactivo.
- Serie normalizada base 100.
- Tabla por selección con columnas:
  - `YTD`
  - `1Y`
  - `3Y`

## 3. Requisitos no funcionales

- Evitar sobrecarga de APIs externas:
  - usar caché persistente servidor
  - usar caché de resolución cliente/servidor
- Evitar error de cuota de navegador:
  - no persistir series históricas grandes en `localStorage`
- UI responsive (desktop/móvil).
- Mensajes de error explícitos y accionables.

## 4. Arquitectura

## 4.1 Backend (Node + Express)

Endpoints obligatorios:

1. `GET /api/performance?symbol=...`
2. `GET /api/performance/batch?symbols=a,b,c`
3. `GET /api/resolve?query=...`

### 4.1.1 Fuente de datos

- Yahoo Chart endpoint:
  - `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- Yahoo Search endpoint:
  - `https://query2.finance.yahoo.com/v1/finance/search?q={query}`

### 4.1.2 Caché de mercado

- Archivo por símbolo en `.cache/market-data/{symbol}.json`
- Primera carga: histórico completo.
- Cargas siguientes: pedir solo fechas faltantes desde último día cacheado.

### 4.1.3 Caché de resolución

- Archivo `.cache/resolve-cache.json`
- Clave: query normalizada (uppercase + espacios normalizados)
- Valor: símbolo, nombre, timestamp
- TTL sugerido: 30 días

### 4.1.4 Alias locales mínimos

Definir diccionario para casos comunes:

- `EXXON` -> `XOM`
- `EXXON MOBIL` -> `XOM`
- `BRKS` -> `AZTA`
- `BERKSHIRE` -> `BRK-B`
- `BERKSHIRE HATHAWAY` -> `BRK-B`
- `SP500`/`S&P 500` -> `^GSPC`
- `NASDAQ` -> `^IXIC`
- `ORO`/`GOLD` -> `GC=F`
- `PLATA`/`SILVER` -> `SI=F`

## 4.2 Frontend (Vanilla JS)

Estado mínimo:

- `groups`
- `assetsDraft`
- `marketCache` (en memoria, no localStorage)
- `resolveCache` (localStorage)
- `activeRange`
- `lastCompare`
- `editingGroupIndex`

Persistencia cliente:

- Guardar `groups`, `resolveCache`.
- Eliminar/ignorar `marketCache` persistente para evitar quota overflow.

## 5. Algoritmos

### 5.1 Asignación de pesos del draft

Al detectar líneas:

- Si ninguna línea trae peso: repartir 100% equitativo.
- Si algunas traen peso:
  - sumar explícitos
  - repartir remanente entre implícitos
  - si no hay implícitos, usar explícitos tal cual

### 5.2 Serie compuesta de portafolio

Entrada: `assets[{symbol,weight}]`, `symbolsData`, `range`.

Pasos:

1. Recortar cada símbolo al rango.
2. Para cada símbolo, calcular valor normalizado diario `close/baseClose * 100`.
3. Unir por todas las fechas disponibles.
4. Usar último valor conocido por símbolo (forward-fill desde inicio de ese símbolo).
5. Calcular promedio ponderado con peso activo disponible del día.
6. Rebasar resultado final a 100 en su primer punto.

### 5.3 Alineación para gráfico multi-serie

- Unir todas las fechas de todas las series.
- Por serie:
  - `null` antes del primer dato
  - luego forward-fill entre fechas faltantes

## 6. UX y mensajes

Mensajes claros para errores:

- No resoluble: `No se pudo resolver "X". Usa ticker válido o nombre exacto de grupo.`
- Resuelto pero sin data: `Ticker "X" reconocido, pero sin datos de mercado (...)`.
- Menos de 2 selecciones en comparador: `Ingresa al menos 2 elementos para comparar.`

## 7. Interfaz requerida

Secciones:

1. **Texto libre / multilínea**
  - textarea
  - botón detectar
  - listado draft ticker/peso editable

2. **Grupos**
  - input nombre
  - botón guardar/actualizar
  - listado de grupos con botones:
    - `Ver componentes`
    - `Editar`
    - `Eliminar`

3. **Comparación**
  - 4 inputs unificados con datalist de grupos
  - botón comparar
  - botones de rango
  - gráfico
  - tabla resumen YTD/1Y/3Y

## 8. Contratos API sugeridos

### `GET /api/resolve?query=exxon`

```json
{
  "query": "exxon",
  "symbol": "XOM",
  "name": "Exxon Mobil Corporation",
  "source": "local-alias|resolve-cache|yahoo-search"
}
```

### `GET /api/performance?symbol=AAPL`

```json
{
  "symbol": "AAPL",
  "provider": "yahoo-chart",
  "lastUpdated": "2026-...",
  "points": [
    { "date": "2026-01-02", "close": 243.1 }
  ]
}
```

## 9. Testing mínimo obligatorio

Implementar tests automatizados de frontend (Vitest + JSDOM) para validar:

1. Comparación unificada con mezcla grupo+ticker.
2. Rango 5Y no truncado por activo con histórico corto.
3. `Ver componentes` muestra todos los activos (sin cap).
4. Resolución de texto libre (`EXXON` -> `XOM`).
5. Parsing de segunda columna de peso (`AAPL, 70`).
6. Tabla resumen renderiza filas según selecciones.

## 10. Scripts de proyecto

`package.json` debe incluir:

- `start`: levantar servidor
- `dev`: levantar servidor
- `test`: ejecutar vitest

## 11. Criterios de aceptación

La app se considera correcta si:

1. Usuario puede construir/editar grupos desde texto multilinea con o sin pesos.
2. Comparador unificado acepta ticker o grupo en cada uno de 4 campos.
3. `Ver componentes` grafica todos los subyacentes del grupo.
4. Cambiar rango actualiza la vista activa.
5. Tabla muestra YTD/1Y/3Y por selección.
6. No aparece error de `localStorage quota exceeded` al cargar muchos símbolos.
7. Tests pasan en verde.

## 12. Recomendaciones de implementación para IA

Si una IA recrea esto desde cero:

1. Construir primero backend y contratos de API.
2. Implementar caché de mercado incremental.
3. Implementar resolver con caché y alias.
4. Luego construir UI de grupos y comparación.
5. Añadir tabla resumen.
6. Añadir tests de integración UI.
7. Optimizar errores y edge cases al final.

Este documento es suficiente para reconstruir la app funcional completa sin acceder al repositorio original.
