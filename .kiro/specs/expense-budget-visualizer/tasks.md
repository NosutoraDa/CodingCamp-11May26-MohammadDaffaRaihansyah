# Implementation Plan: Expense & Budget Visualizer

## Overview

12-phase build from core structure through polish. All phases complete. App is fully functional locally.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2, 3, 4] },
    { "wave": 2, "tasks": [5, 6, 7, 8] },
    { "wave": 3, "tasks": [9, 10, 11, 12] },
    { "wave": 4, "tasks": [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26] },
    { "wave": 5, "tasks": [27, 28, 29] },
    { "wave": 6, "tasks": [30, 31, 32, 33, 34] },
    { "wave": 7, "tasks": [35, 36, 37, 38] },
    { "wave": 8, "tasks": [39, 40, 41, 42, 43] }
  ]
}
```

Tasks 1-4 (structure) must complete before tasks 5-8 (data layer).
Tasks 5-8 must complete before tasks 9-12 (CRUD).
Tasks 9-12 unlock tasks 13-26 (balance, chart, filter, summary) in parallel.
Tasks 23-26 must complete before tasks 27-29 (optional challenges).
Tasks 27-29 must complete before tasks 30-34 (currency).
Tasks 30-34 must complete before tasks 35-38 (categories and limit).
Tasks 35-38 must complete before tasks 39-43 (polish).

## Tasks

- [x] 1. Create `index.html` with semantic HTML structure
- [x] 2. Create `css/style.css` with CSS custom property theming
- [x] 3. Create `js/app.js` with IIFE init pattern
- [x] 4. Wire `index.html` to external CSS and JS files only (no inline styles/scripts)
- [x] 5. Define transaction data model (id, name, amount, cat, date, type, currency)
- [x] 6. Define category data model with emoji and color
- [x] 7. Implement `save()` — persist all state to LocalStorage
- [x] 8. Load state from LocalStorage on init with safe fallbacks
- [x] 9. Build add transaction form (type toggle, description, amount, category, date)
- [x] 10. Implement `addTransaction()` with input validation and shake feedback
- [x] 11. Implement `deleteTransaction(id)`
- [x] 12. Render transaction list with `renderList()`
- [x] 13. Implement `renderBalance()` — total, income, expense
- [x] 14. Style balance card with positive/negative color states
- [x] 15. Implement `renderChart()` using Canvas API (no external chart library)
- [x] 16. Draw donut slices per category with correct proportions
- [x] 17. Punch center hole and render total label
- [x] 18. Render legend with category name and percentage
- [x] 19. Redraw chart on theme change (re-read CSS vars)
- [x] 20. Implement filter buttons (All / Expenses / Income)
- [x] 21. Implement sort select (date desc/asc, amount desc/asc, category)
- [x] 22. Implement `getSorted()` with stable tie-breaking by id
- [x] 23. Add tab navigation (History / Monthly Summary)
- [x] 24. Implement `renderSummary()` — income, expense, balance for selected month
- [x] 25. Render category bar chart for monthly expenses
- [x] 26. Implement `prevMonth()` / `nextMonth()` navigation
- [x] 27. Dark/light mode toggle with LocalStorage persistence
- [x] 28. Sort transactions by amount or category
- [x] 29. Monthly summary view
- [x] 30. Add USD / IDR currency toggle (segmented pill control)
- [x] 31. Store currency code on each transaction at time of entry
- [x] 32. Implement `fmt(n, storedCode)` with live conversion
- [x] 33. Implement `fetchExchangeRate()` — fetch from open.er-api.com, 1h cache, silent fallback
- [x] 34. Apply conversion in balance, chart, summary, limit bar, and list renders
- [x] 35. Implement `addCustomCategory()` with duplicate check
- [x] 36. Auto-assign color from extra palette for custom categories
- [x] 37. Implement spend limit input and `renderLimitBar()`
- [x] 38. Highlight over-limit transactions with warning badge
- [x] 39. Mobile-first layout, max-width 640px container
- [x] 40. Desktop breakpoint at 640px — adjust sizing and sort select alignment
- [x] 41. Slide-in animation for new transaction items
- [x] 42. Empty state for transaction list
- [x] 43. Cross-browser `appearance: none` on selects (Safari fix)
## Notes

All phases 1-11 are complete.
Currency conversion is applied at render time — stored amounts are always in the entry currency.
Chart uses Canvas API directly; no external chart library.
Exchange rate is cached in LocalStorage for 1 hour to avoid API rate limits.
