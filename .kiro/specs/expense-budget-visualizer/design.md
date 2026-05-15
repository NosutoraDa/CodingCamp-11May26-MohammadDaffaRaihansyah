# Design — Expense & Budget Visualizer

## Overview

Single-page static web app for tracking personal expenses and income. Renders a donut chart, transaction history, monthly summary, and spend limit progress bar. No build step, no dependencies, no server — pure HTML/CSS/vanilla JS with LocalStorage persistence.

## Architecture

Single-page static web app. No build step, no dependencies, no server.

```
index.html        ← structure only, no inline CSS or JS
css/style.css     ← all styles, mobile-first with CSS custom properties
js/app.js         ← all logic, vanilla JS, IIFE init pattern
```

---

## Data Model

All data lives in `localStorage`. Keys:

| Key | Type | Description |
|---|---|---|
| `bv_transactions` | JSON array | All transactions |
| `bv_categories` | JSON array | Default + custom categories |
| `bv_theme` | string | `"dark"` or `"light"` |
| `bv_spend_limit` | number | Monthly spend limit amount |
| `bv_currency` | string | `"USD"` or `"IDR"` |
| `bv_usd_idr_rate` | number | Cached exchange rate |
| `bv_usd_idr_time` | number | Timestamp of last rate fetch |

### Transaction object
```js
{
  id:       number,   // Date.now() — unique, doubles as timestamp
  name:     string,   // user description
  amount:   number,   // always positive
  cat:      string,   // category name
  date:     string,   // "YYYY-MM-DD"
  type:     string,   // "income" | "expense"
  currency: string,   // "USD" | "IDR" — currency at time of entry
}
```

### Category object
```js
{
  name:  string,   // display name
  emoji: string,   // single emoji
  color: string,   // hex color for chart and icons
}
```

---

## Data Models

All data lives in `localStorage`. Keys:

| Key | Type | Description |
|---|---|---|
| `bv_transactions` | JSON array | All transactions |
| `bv_categories` | JSON array | Default + custom categories |
| `bv_theme` | string | `"dark"` or `"light"` |
| `bv_spend_limit` | number | Monthly spend limit amount |
| `bv_currency` | string | `"USD"` or `"IDR"` |
| `bv_usd_idr_rate` | number | Cached exchange rate |
| `bv_usd_idr_time` | number | Timestamp of last rate fetch |

Transaction shape and Category shape are defined in the Component Structure section above.

---

## Components and Interfaces

```
header
  └── theme toggle button

.container
  ├── .balance-card          ← total balance + income/expense stats
  ├── .card (spend limit)    ← limit input + progress bar
  ├── .card (chart)          ← donut chart + legend (Canvas API)
  ├── .card (add form)       ← type toggle, description, amount+currency,
  │                             category, date, custom category input
  └── .card (history/summary)
        ├── .tab-nav         ← History | Monthly Summary
        ├── #panelHistory    ← filter buttons, sort select, tx list
        └── #panelSummary    ← month nav, stats grid, category bars
```

---

## State Variables

```js
let transactions   // array — all stored transactions
let categories     // array — default + custom categories
let spendLimit     // number — monthly limit (0 = disabled)
let currency       // object — active CURRENCIES entry
let usdToIdr       // number — live exchange rate

let currentType    // "expense" | "income"
let currentFilter  // "all" | "expense" | "income"
let currentSort    // "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "category"
let activeTab      // "history" | "summary"
let summaryMonth   // Date — month shown in summary panel
```

---

## Key Functions

| Function | Purpose |
|---|---|
| `render()` | Master render — calls all sub-renders |
| `renderBalance()` | Updates balance card amounts |
| `renderChart()` | Draws donut chart on Canvas |
| `renderList()` | Renders filtered + sorted transaction list |
| `renderLimitBar()` | Updates spend limit progress bar |
| `renderSummary()` | Renders monthly summary panel |
| `addTransaction()` | Validates form, pushes to array, saves, re-renders |
| `deleteTransaction(id)` | Filters out by id, saves, re-renders |
| `setCurrency(code)` | Switches display currency, re-renders |
| `toggleTheme()` | Flips dark/light class, redraws chart |
| `fetchExchangeRate()` | Async fetch from open.er-api.com, 1h cache |
| `fmt(n, storedCode)` | Formats number as currency string with conversion |
| `getSorted(list)` | Returns sorted copy of transaction array |

---

## Currency Conversion

Transactions store the currency they were entered in (`t.currency`). On display, `fmt(amount, storedCode)` converts if `storedCode !== currency.code`:

```
USD → IDR : value * usdToIdr
IDR → USD : value / usdToIdr
```

Rate source: `https://open.er-api.com/v6/latest/USD`
Cache TTL: 1 hour. Fallback: 16300 IDR/USD.

---

## Theming

CSS custom properties on `:root` (dark) and `body.light` (light). JS toggles the `light` class on `<body>`. Canvas chart re-reads `--surface` and `--text` vars after theme change to redraw correctly.

---

## Responsive Layout

- Mobile-first base styles, `max-width: 640px` container
- `@media (min-width: 640px)` adjusts font sizes, padding, and sort select alignment for desktop
- All touch targets ≥ 40px
- No horizontal scroll on any viewport

---

## Correctness Properties

### Property 1: Balance accuracy
Balance = sum(income) − sum(expense), always recalculated from source array (never cached separately).

**Validates: Requirements 2.1**

### Property 2: No double-conversion
`fmt(n, storedCode)` converts only when `storedCode !== currency.code`.

**Validates: Requirements 8.1**

### Property 3: Chart integrity
Donut slices sum to exactly 100% (floating-point rounding absorbed by last slice).

**Validates: Requirements 3.1**

### Property 4: Unique transaction IDs
`deleteTransaction` filters by `id` (Date.now()), guaranteed unique within a session.

**Validates: Requirements 1.1**

### Property 5: Spend limit bar clamping
Bar width clamped at 100% via `Math.min(..., 100)` — never overflows container.

**Validates: Requirements 7.1**

---

## Error Handling

- Exchange rate fetch: silent catch — keeps cached or fallback rate (16300 IDR/USD), never throws to UI
- Invalid form inputs: `shake(id)` highlights the offending field with a red border for 700ms, returns early
- Missing category: `getCat(name)` returns a safe fallback `{ emoji: '📦', color: '#8b8fa8' }` — never crashes render
- LocalStorage parse errors: `JSON.parse(... || 'null') || DEFAULT_CATEGORIES` pattern prevents null crashes on first load

---

## Testing Strategy

Manual smoke tests (no automated test runner — static app):
1. Add income + expense → verify balance, chart slice, and list entry appear correctly
2. Delete transaction → verify balance and chart update
3. Switch USD ↔ IDR → verify all amounts convert (balance, chart total, list, summary)
4. Set spend limit → verify bar color changes at 75% (yellow) and >100% (red)
5. Add custom category → verify it appears in dropdown and chart
6. Toggle dark/light → verify canvas redraws with correct background color
7. Navigate months in summary → verify only that month's transactions appear
8. Reload page → verify all data persists from LocalStorage
