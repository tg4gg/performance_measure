# DESIGN.md - Especificación Completa para Recrear la App Desde Cero

Este documento define todo lo necesario para que cualquier IA pueda reconstruir la app sin acceder al código original.

## 1) Objetivo

Construir una web app que permita:

1. Resolver texto libre a activos financieros.
2. Crear grupos ponderados de activos.
3. Comparar tickers y/o grupos en un gráfico interactivo.
4. Analizar resumen de performance y YoY por serie.
5. Minimizar llamadas externas con cachés locales.

## 2) Funcionalidades obligatorias

### 2.1 Entrada multilinea y pesos

- Campo textarea para pegar líneas.
- Cada línea soporta:
  - `valor`
  - `valor, peso`
  - `valor; peso`
  - `valor | peso`
  - `valor 25%`
- `valor` puede ser ticker o nombre de activo.

Reglas de pesos del draft:
- Sin pesos explícitos: reparto equitativo al 100%.
- Con pesos mixtos: pesos explícitos + reparto del remanente entre implícitos.

### 2.2 Resolución de símbolos

Orden de resolución:
1. Alias local.
2. Ticker directo (solo si no es frase multi-palabra para evitar falsos positivos).
3. Backend `/api/resolve?query=...`.

Cachés:
- Cliente: `resolveCache`, `symbolNames` en localStorage.
- Servidor: `resolve-cache.json` con TTL (30 días recomendado).

### 2.3 Gestión de grupos

- Crear grupo.
- Editar grupo.
  - Debe rellenar textarea como `TICKER, PESO` por línea.
- Eliminar grupo.
- Ver componentes del grupo (sin límite de activos).

### 2.4 Interacciones rápidas desde grupos

- Click en nombre de grupo => autocompleta el siguiente campo vacío en comparación.
- Click en ticker componente => autocompleta el siguiente campo vacío en comparación.
- Si no hay campos vacíos, sobrescribir el primer campo.

### 2.5 Comparación unificada

- 4 campos (`campo1..campo4`), mínimo 2 no vacíos.
- Cada campo acepta:
  - ticker
  - nombre exacto de grupo
- Botones:
  - `Comparar selección`
  - `Limpiar selección`

### 2.6 Rango temporal

- Botones: `YTD`, `1Y`, `3Y`, `5Y`, `10Y`.
- Al cambiar rango se debe recalcular la vista activa:
  - comparación unificada o
  - vista de componentes de grupo.

### 2.7 Gráfico y leyenda

- Chart.js line chart base 100.
- Zoom habilitado (wheel/drag/pinch).
- Pan deshabilitado para evitar desplazamiento lateral involuntario.
- Leyenda custom HTML (no la nativa):
  - click en nombre de serie => toggle visible/oculta (comportamiento estándar)
  - click en `(YoY)` => mostrar YoY de esa serie

### 2.8 Tabla de resumen y tabla YoY

Tabla resumen (siempre tras comparar):
- columnas: `Selección`, `YTD`, `1Y`, `3Y`

Tabla YoY:
- se llena al click en `(YoY)` de la leyenda
- solo aplica a rangos `3Y`, `5Y`, `10Y`
- en `YTD` o `1Y`: mostrar mensaje de no disponibilidad

### 2.9 Hover con nombre largo

Cuando se hace hover sobre ticker en:
- lista draft,
- sección de grupos,
- tabla de resumen,
- tooltip del gráfico,

mostrar nombre largo del activo.

Si no está cacheado:
- mostrar estado de resolución y
- resolver en background al hover.

### 2.10 Feedback de procesamiento

Todo botón con acción debe mostrar temporalmente `Procesando...`:
- detectar,
- guardar/actualizar,
- comparar,
- limpiar,
- botones de rango,
- acciones de grupos.

## 3) Backend requerido (Node + Express)

Endpoints:
1. `GET /api/performance?symbol=...`
2. `GET /api/performance/batch?symbols=a,b,c`
3. `GET /api/resolve?query=...`

Datos:
- Yahoo chart endpoint para histórico.
- Yahoo search endpoint para resolución de texto.

Caché mercado:
- archivo por símbolo en `.cache/market-data`.
- actualización incremental (pedir solo faltantes).

Caché resolución:
- `.cache/resolve-cache.json`.

## 4) Frontend requerido (Vanilla)

Estado mínimo:
- `groups`
- `assetsDraft`
- `marketCache` (solo memoria)
- `resolveCache` (localStorage)
- `symbolNames` (localStorage)
- `activeRange`
- `lastCompare`
- `editingGroupIndex`

Persistencia:
- guardar `groups`, `resolveCache`, `symbolNames`
- nunca persistir series históricas grandes en localStorage

## 5) Algoritmos clave

### 5.1 Serie compuesta

Para un portafolio ponderado:
1. filtrar por rango
2. normalizar cada activo a base 100
3. unir fechas
4. forward-fill por activo desde su inicio
5. promedio ponderado por peso activo
6. rebase final a 100 en primer punto

### 5.2 Alineación multi-serie

- unir fechas de todas las series
- para cada serie:
  - `null` antes de su inicio
  - forward-fill después

### 5.3 YoY

- tomar valores de cierre de cada año (o último punto disponible del año en la serie)
- calcular `(año_actual / año_previo - 1) * 100`
- renderizar por fila `Año`, `Retorno`

## 6) UX / Mensajes

Mensajes explícitos para:
- símbolo no resoluble
- ticker reconocido sin datos
- menos de 2 elementos en comparación
- YoY no disponible en rango actual

## 7) Testing mínimo

Pruebas automatizadas (Vitest + JSDOM) deben cubrir:
1. comparación mixta grupo+ticker
2. 5Y no truncado por activo con historia corta
3. ver componentes sin límite
4. resolución de texto libre (`EXXON -> XOM`)
5. parsing de segunda columna de pesos
6. tabla resumen con filas correctas
7. click `(YoY)` en 5Y muestra datos
8. click `(YoY)` en YTD muestra mensaje de no disponible
9. click nombre de serie en leyenda hace toggle visible/oculta
10. click en grupo/componente rellena siguiente campo en comparación
11. botón limpiar selección vacía inputs

## 8) Criterios de aceptación

La app cumple si:
- soporta flujo end-to-end de creación/edición/uso de grupos
- compara hasta 4 selecciones mixtas
- muestra componentes ilimitados
- ofrece tabla resumen + YoY por serie
- mantiene zoom usable sin pan involuntario
- muestra nombres largos al hover
- evita `localStorage quota exceeded`
- tests en verde

Este documento, por sí solo, debe permitir reconstruir la app completa.
