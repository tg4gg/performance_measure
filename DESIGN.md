# DESIGN.md - Especificación Funcional

Este documento define el comportamiento esperado de la app actual para poder recrearla desde cero sin ver el código original.

## 1) Objetivo

Construir una web app con dos modos paralelos:

1. `Performance measure` (PM)
2. `My performance measure` (MPM)

La app debe permitir:

- resolver identificadores financieros
- crear estructuras compuestas (`grupos` en PM, `portfolios` en MPM)
- comparar una o varias selecciones en gráfico interactivo
- calcular tabla resumen y YoY
- minimizar llamadas externas con cachés locales

## 2) Modos funcionales

### 2.1 PM

PM debe permitir:

- pegar texto libre/multilínea
- detectar activos
- asignar pesos
- guardar grupos compuestos
- comparar tickers y grupos
- ver componentes de un grupo como series individuales

### 2.2 MPM

MPM debe permitir:

- registrar holdings reales
- guardar portfolios
- reutilizar portfolios guardados como `subsets`
- comparar portfolios, subsets y stocks directos
- mostrar métricas cacheadas en la sección `2)` para el draft completo, cada subset y cada compra concreta

Cada holding puede tener:

- `symbol`
- `purchasePrice` opcional
- `units` opcional
- `buyDate` opcional
- `sellDate` opcional

Reglas:

- `buyDate` define el primer punto desde el cual la posición entra al cálculo.
- si `buyDate` es posterior al último dato disponible, la posición debe quedar excluida hasta que exista un dato en o después de esa fecha
- `sellDate` congela el valor de la posición desde esa fecha.
- si `sellDate < buyDate`, debe rechazarse el draft.
- las métricas de sección `2)` deben persistirse localmente y recalcularse como máximo una vez por día, salvo refresh manual

## 3) Resolución de símbolos

### 3.1 Tipos aceptados

La app debe aceptar:

- ticker
- alias local
- WKN
- ISIN
- texto libre

### 3.2 Orden de resolución

1. Alias local
2. Ticker directo
3. Yahoo Finance Search
4. OpenFIGI para inputs con forma de WKN/ISIN si Yahoo no devuelve resultado

### 3.3 Reglas de identificación

- WKN-like: 6 caracteres alfanuméricos
- ISIN-like: 12 caracteres con prefijo país y dígito final de control
- Inputs WKN/ISIN no deben truncarse a un ticker corto falso.

### 3.4 Fallback OpenFIGI

Cuando Yahoo Search no resuelve un WKN/ISIN:

- consultar OpenFIGI `/v3/mapping`
- usar `ID_WERTPAPIER` para WKN
- usar `ID_ISIN` para ISIN
- convertir el ticker resultante a formato Yahoo si es necesario (`/` -> `-`, sufijos por exchange, etc.)
- verificar que el símbolo final tenga datos en Yahoo Chart antes de aceptarlo

## 4) PM - Entrada multilinea y pesos

Cada línea soporta:

- `valor`
- `valor, peso`
- `valor; peso`
- `valor | peso`
- `valor 25%`

Reglas de pesos del draft:

- sin pesos explícitos: reparto equitativo al 100%
- con pesos mixtos: pesos explícitos + reparto del remanente entre implícitos
- al guardar grupo, normalizar al 100%

## 5) MPM - Entrada de holdings

Formato flexible por línea. Debe soportar variantes como:

- `AAPL, 182.4, 12`
- `AAPL, price=182.4, units=12`
- `AAPL, price=182.4, units=12, buyDate=2025-01-10`
- `AAPL, 182.4, 12, 2025-01-10`
- `NVDA, price=610, units=4, buyDate=2025-02-01, sell=2025-09-20`

Interpretación:

- primer token: activo o identificador a resolver
- numéricos: `purchasePrice`, luego `units`
- fechas: primero `buyDate`, luego `sellDate` si no vienen nombradas

## 6) Gestión de estructuras

### 6.1 PM

CRUD de grupos:

- crear
- editar
- eliminar
- ver componentes

### 6.2 MPM

CRUD de portfolios:

- crear
- editar
- eliminar
- ver holdings

Portfolios MPM pueden contener:

- holdings directos
- referencias a otros portfolios (`subsets`)

Debe detectarse referencia circular entre portfolios.
No debe permitirse eliminar un portfolio si otro portfolio guardado lo referencia como subset.

### 6.3 Métricas en sección 2)

La sección `2)` del modo MPM debe mostrar 5 métricas para:

- cada holding directo agregado al draft
- cada subset agregado al draft
- el draft completo del portfolio

Métricas:

- `All time %`
- `Gain USD`
- `Gain/unit`
- `Value USD`
- `Value EUR`

Reglas:

- `Gain/unit` solo tiene sentido cuando la selección representa un único activo subyacente
- `Value EUR` se calcula desde `Value USD` usando el último valor disponible de `EURUSD=X`
- debe existir un botón manual `Recalcular metricas`
- si falla la descarga de mercado para un holding requerido, la UI debe mostrar un error explícito
- resultados incompletos no deben cachearse como métricas válidas finales

## 7) Comparación

### 7.1 Reglas generales

- 4 campos máximo
- mínimo 1 selección válida
- el botón de acción debe permitir ejecutar también con una sola selección
- copy actual del botón: `Analizar seleccion`

### 7.2 Entradas permitidas por modo

PM:

- ticker
- WKN
- ISIN
- nombre exacto de grupo

MPM:

- ticker
- WKN
- ISIN
- nombre exacto de portfolio
- nombre exacto de subset

### 7.3 Interacciones rápidas

Click en nombre de grupo/portfolio o en componente/holding:

- rellena el siguiente campo vacío
- si todos están ocupados, sobrescribe el primer campo

### 7.4 Comparación desde fecha manual

Debe existir un selector de fecha manual con acción explícita para ejecutar una comparación "como si se hubiera comprado ese día".

Reglas:

- el usuario selecciona una fecha y activa el modo `Since purchase date`
- el gráfico debe empezar en el primer dato disponible en o después de esa fecha
- la serie debe rebalancearse a base 100 en ese punto
- la tabla resumen debe mostrar una columna adicional con el retorno desde esa fecha hasta hoy
- el encabezado de esa columna debe reflejar la fecha seleccionada
- debe mostrarse una nota visible indicando que la comparación actual está rebalanceada desde la fecha elegida
- cambiar entre `YTD`, `1Y`, `3Y`, `5Y`, `10Y` y el rango manual debe recalcular la vista activa

Reglas específicas por modo:

- PM: el retorno desde fecha manual usa el mismo mecanismo de series compuestas base 100
- MPM: el chart también debe rebalancearse desde la fecha manual como compra hipotética
- MPM: las métricas de snapshot (`All time %`, `Gain USD`, `Gain/unit`, `Value USD`, `Value EUR`) deben seguir usando el costo base real guardado, no la fecha manual

## 8) Serie compuesta

### 8.1 PM

Para un grupo ponderado:

1. filtrar por rango
2. normalizar cada activo a base 100
3. unir fechas
4. forward-fill por activo desde su inicio
5. promedio ponderado por peso activo
6. rebase final a 100 en el primer punto

### 8.2 MPM

Para un portfolio:

1. expandir subsets a holdings finales
2. determinar fecha de entrada por holding (`buyDate` o primer dato disponible)
3. determinar costo base por holding:
   - `purchasePrice * units`, o
   - fallback a primer precio disponible * `units` si falta `purchasePrice`
4. construir serie individual del holding:
   - empieza en `buyDate`/primer dato
   - si hay `sellDate`, mantener valor fijo después de esa fecha
   - si el rango activo es fecha manual, el inicio efectivo del chart pasa a ser esa fecha manual y la base del chart se toma del precio disponible en ese punto
5. combinar holdings con promedio ponderado por costo base

## 9) Rango temporal

Botones:

- `YTD`
- `1Y`
- `3Y`
- `5Y`
- `10Y`
- fecha manual `Since purchase date`

Al cambiar rango se recalcula la vista activa:

- comparación unificada, o
- vista de componentes/holdings

Para fecha manual:

- debe guardarse la fecha seleccionada por modo
- el rango activo pasa a `custom`
- si no hay fecha válida, no debe activarse

## 10) Gráfico y leyenda

- Chart.js line chart
- base visual 100
- zoom habilitado (`wheel`, `drag`, `pinch`)
- pan deshabilitado
- leyenda HTML custom

Interacciones de leyenda:

- click en nombre de serie => toggle visible/oculta
- click en `(YoY)` => render de YoY para esa serie

## 11) Tablas

### 11.1 Resumen

Columnas:

- `Seleccion`
- `YTD`
- `1Y`
- `3Y`

### 11.2 YoY

- disponible solo para `3Y`, `5Y`, `10Y`
- en `YTD` o `1Y`, mostrar mensaje de no disponibilidad
- cálculo anual: `(valor_año_actual / valor_año_previo - 1) * 100`

## 12) Hover con nombre largo

Hover sobre ticker/símbolo en:

- draft
- grupos/portfolios
- tabla resumen
- tooltip del gráfico

Debe mostrar nombre largo del activo.

Si no está cacheado:

- resolver en background
- actualizar tooltip/título cuando esté disponible

## 13) Estado mínimo

Cliente:

- `activeMode`
- `modes.pm.collections`
- `modes.pm.draftItems`
- `modes.pm.lastCompare`
- `modes.mpm.collections`
- `modes.mpm.draftItems`
- `modes.mpm.lastCompare`
- `resolveCache`
- `symbolNames`
- `marketCache` (solo memoria)

Servidor:

- caché de series históricas por símbolo
- caché de resolución de símbolos

## 14) Persistencia

Guardar en `localStorage`:

- `groups`
- `mpmPortfolios`
- `resolveCache`
- `symbolNames`
- `activeMode`
- `mpmMetricsCache`

Nunca persistir series históricas grandes en `localStorage`.

## 15) Backend requerido

Stack: Node.js + Express

Endpoints:

1. `GET /api/performance?symbol=...`
2. `GET /api/performance/batch?symbols=a,b,c`
3. `GET /api/resolve?query=...`

Fuentes externas:

- Yahoo Finance Chart
- Yahoo Finance Search
- OpenFIGI Mapping fallback para WKN/ISIN

## 16) Testing mínimo

Las pruebas automatizadas deben cubrir al menos:

1. comparación mixta PM grupo+ticker
2. comparación de 1 a 4 selecciones
3. grupos PM con pesos explícitos
4. ver componentes PM sin límite artificial
5. resolución texto libre (`EXXON -> XOM`)
6. soporte de ticker con sufijo (`EQQQ.L`)
7. resolución WKN/ISIN
8. tabla YoY disponible y no disponible según rango
9. toggle de leyenda
10. click en grupo/componente rellena comparación
11. limpiar comparación
12. portfolios MPM con subsets
13. expansión de holdings anidados
14. `buyDate` como inicio efectivo de serie
15. fallback backend OpenFIGI cuando Yahoo no resuelve un WKN
16. métricas MPM visibles en sección `2)` para holdings, subsets y draft completo
17. cache local `mpmMetricsCache` y recálculo manual

## 17) Criterios de aceptación

La app cumple si:

- PM sigue funcionando sin regresiones visibles
- MPM permite portfolios y subsets anidados
- `buyDate` y `sellDate` afectan correctamente la serie
- WKN/ISIN pueden resolverse aunque Yahoo Search falle, usando fallback OpenFIGI
- se pueden analizar de 1 a 4 selecciones
- la UI cambia entre PM y MPM sin mezclar estado
- tests en verde
