# Cleanup Plan

This document captures the current cleanup and hardening plan for the repository so it can be loaded later and executed step by step.

## Progress

Phase 1 completed on 2026-03-11.
- Fixed future-`buyDate` exclusion for MPM holdings when no market data exists yet.
- Blocked deletion of saved MPM portfolios that are still referenced as subsets.
- Added explicit section-2 metric errors for missing holding market data and stopped caching incomplete totals.
- Current validation status after Phase 1: `26/26` tests passing.

Phase 2 completed on 2026-03-11.
- Wired `Limpiar seleccion` to clear the active rendered comparison state.
- Added regression coverage for chart/table reset on clear.
- Version bumped to `0.4.0`.
- Current validation status: `26/26` tests passing.

## Goal

Improve correctness first, then UX consistency, then performance. Do not start with refactors that change structure before the behavioral issues below are fixed and verified.

## Current Priority Findings

### 1. Future `buyDate` handling is incorrect in MPM

Severity: High
Status: Completed on 2026-03-11

Problem:
- If a holding has a `buyDate` later than the latest available market quote, the code currently falls back to the first historical point.
- That makes the holding appear in the chart and portfolio weighting before it should exist.

Primary code paths:
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L1205)
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L1211)
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L1236)
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L1715)

Expected behavior:
- If no quote exists on or after `buyDate`, the holding should contribute no series yet.
- Snapshot metrics should not pretend the position already exists.

Required work:
- Update entry-point logic so "no data at or after buy date" produces no active holding series.
- Ensure composite portfolio weighting excludes that holding until market data exists.
- Ensure snapshot/metric calculations follow the same rule.

Required tests:
- Add a frontend test for a holding with `buyDate` after the latest mocked quote.
- Verify chart series is empty or excluded for that holding.
- Verify portfolio metrics do not count that holding prematurely.

### 2. Deleting an MPM portfolio can leave dangling subset references

Severity: Medium
Status: Completed on 2026-03-11

Problem:
- A saved MPM portfolio can reference another saved portfolio as a subset.
- Deleting the referenced portfolio leaves broken persisted data behind.
- The failure only surfaces later when expanding, comparing, or editing.

Primary code paths:
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L983)
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L1579)
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L2140)

Expected behavior:
- Users should not be able to persist broken subset relationships.

Required work:
- Before deletion, detect whether other MPM portfolios reference the target portfolio.
- Pick one clear behavior and implement it consistently:
  1. Block deletion with an explicit message listing dependents.
  2. Or cascade-remove references intentionally.
- Blocking deletion is the safer default unless the product explicitly wants cascading.

Required tests:
- Add a test that creates portfolio `Core`, creates portfolio `Master` referencing `Core`, then attempts to delete `Core`.
- Verify the chosen behavior.
- Verify no broken saved state remains afterward.

### 3. MPM section-2 metrics can silently undercount on market-data failures

Severity: Medium
Status: Completed on 2026-03-11

Problem:
- Metric refresh fetches market data through `loadSymbolsDataSafe()`.
- That helper records failures, but section-2 metric refresh ignores them.
- Result: totals may be computed from only the successfully loaded holdings while showing a normal refresh status.

Primary code paths:
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L839)
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L1686)
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L1741)

Expected behavior:
- If any required holding data fails to load, the metrics UI should say so clearly.
- It should not present incomplete totals as if they were complete.

Required work:
- Thread the `failed` list from symbol loading into section-2 metrics refresh.
- If one or more required symbols fail, show a visible error or partial-data status in the metric block.
- Do not cache incomplete metrics as if they were valid final results.

Required tests:
- Add a test with one valid holding and one symbol whose market fetch fails.
- Verify section-2 metrics report the problem instead of silently computing partial totals.

### 4. `Limpiar seleccion` does not clear the chart/table output

Severity: Low
Status: Completed on 2026-03-11

Problem:
- The clear button clears inputs and warnings.
- It does not clear the current chart, performance table, or rendered comparison state.

Primary code paths:
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L1473)
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L2222)

Expected behavior:
- Clicking `Limpiar seleccion` should return the comparison area to an empty state.

Required work:
- Call `clearVisualization()` from the clear-button flow.
- Keep `lastCompare` reset so range switching does not resurrect stale results.

Required tests:
- Extend the existing clear-button test to assert that chart datasets and table rows are cleared too.

### 5. Client-side symbol loading is serialized despite a batch endpoint

Severity: Low

Problem:
- The client loads symbol series sequentially.
- The server already exposes `/api/performance/batch`.
- Current behavior is correct but slower than necessary.

Primary code paths:
- [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js#L1686)
- [`server.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/server.js#L549)

Expected behavior:
- Multi-symbol compare and MPM metric refresh should load market data with lower latency.

Required work:
- Replace sequential per-symbol loading with either:
  - a client call to the batch endpoint, or
  - parallel per-symbol requests if batch semantics are not suitable.
- Preserve partial-failure reporting.

Required tests:
- If batch loading is introduced, add backend and frontend coverage for partial failures and normal success cases.

## Execution Order

Follow this order unless new information forces reprioritization:

1. Fix future `buyDate` handling.
2. Add referential-integrity protection for subset deletion.
3. Fix incomplete MPM metrics reporting and caching.
4. Fix clear-button visualization reset.
5. Improve symbol-loading performance.

## Step-by-Step Execution Checklist

### Phase 1: Correctness

- [x] Re-read the affected MPM series and snapshot functions.
- [x] Implement the future `buyDate` fix.
- [x] Add regression tests for future `buyDate`.
- [x] Run `npm test`.

- [x] Re-read MPM save/delete/expand flows.
- [x] Implement dependent-reference protection for portfolio deletion.
- [x] Add tests for subset dependency handling.
- [x] Run `npm test`.

- [x] Re-read section-2 metrics refresh and cache flows.
- [x] Prevent silent partial metrics on symbol-load failures.
- [x] Ensure invalid partial results are not cached as complete.
- [x] Add tests for failed symbol loads in metrics refresh.
- [x] Run `npm test`.

### Phase 2: UX Consistency

- [x] Wire `Limpiar seleccion` to clear the visualization state.
- [x] Extend the existing clear-button test to cover chart/table reset.
- [x] Run `npm test`.

### Phase 3: Performance

- [ ] Decide whether to use the existing batch endpoint or parallel single-symbol fetches.
- [ ] Implement the chosen loading improvement.
- [ ] Preserve warning behavior for partial failures.
- [ ] Add or update tests as needed.
- [ ] Run `npm test`.

## Re-Check Procedure Before Each Change

Before executing any step later:

1. Re-open the relevant code paths listed in this file.
2. Re-run the current test suite to confirm baseline status.
3. Make the smallest behavior-preserving change that fixes the issue.
4. Add or update tests for the exact regression.
5. Re-run the full test suite.
6. Update this file by marking completed items and noting any scope changes.

## Current Validation Status

Repository status after the latest completed phase:
- Test suite passed: `26/26` tests.
- Key files:
  - [`server.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/server.js)
  - [`public/app.js`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/public/app.js)
  - [`tests/chart-render.test.mjs`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/tests/chart-render.test.mjs)
  - [`tests/server-resolve.test.mjs`](/Users/tim.gaggstatter/MyData/codex/private/portfolio_tracking/tests/server-resolve.test.mjs)

## Notes

- Do not start with a large frontend refactor. Stabilize behavior first.
- If a fix changes intended product behavior, update both tests and this plan.
- If new bugs are found while working through the list, insert them by severity rather than appending them blindly.
