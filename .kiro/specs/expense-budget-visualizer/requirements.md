# Requirements Document

## Introduction
A mobile-friendly web app that helps users track daily spending. Shows total balance, transaction history, and a visual chart of spending by category. Built as a standalone static web page — no backend required.

---

## Requirements

### Functional Requirements

### FR-1: Transaction Management
- Users can add a transaction with: description, amount, category, date, and type (income or expense)
- Users can delete any transaction
- Transactions persist across page refreshes via browser LocalStorage

### FR-2: Balance Display
- App shows total balance (income minus expenses)
- App shows total income and total expenses separately
- Balance updates immediately when a transaction is added or deleted

### FR-3: Spending Chart
- A donut chart visualises expenses broken down by category
- Chart updates in real time when transactions change
- A legend shows each category name and its percentage of total spending

### FR-4: Transaction History
- All transactions are listed with name, category, date, and amount
- Users can filter the list by: All / Expenses / Income
- Users can sort the list by: Newest first, Oldest first, Highest amount, Lowest amount, By category

### FR-5: Monthly Summary View
- Users can switch to a monthly summary tab
- Summary shows income, expenses, and balance for the selected month
- A horizontal bar chart shows spending per category for that month
- Users can navigate between months with previous/next buttons

### FR-6: Custom Categories
- Users can add their own categories beyond the 8 defaults
- Custom categories are saved to LocalStorage and appear in the category dropdown

### FR-7: Spend Limit
- Users can set a monthly spend limit
- A progress bar shows total expenses vs the limit
- Transactions exceeding 50% of the limit are highlighted with a warning badge
- Bar turns yellow at 75%, red when over limit

### FR-8: Currency Support (USD / IDR)
- Users can switch between USD and IDR display
- Exchange rate is fetched live from open.er-api.com and cached for 1 hour
- Falls back to a hardcoded rate if the API is unavailable
- All amounts (balance, chart, summary, list) convert using the live rate
- Each transaction stores the currency it was entered in for accurate conversion

### FR-9: Dark / Light Mode
- Users can toggle between dark and light themes
- Theme preference persists via LocalStorage

---

## Technical Constraints

### TC-1: Technology Stack
- HTML for structure
- CSS for styling
- Vanilla JavaScript only — no frameworks (React, Vue, etc.)
- No backend server required

### TC-2: Data Storage
- Browser LocalStorage API only
- All data stored client-side

### TC-3: Browser Compatibility
- Must work in: Chrome, Firefox, Edge, Safari (modern versions)
- Can be used as a standalone web app or browser extension

### TC-4: File Structure
- Exactly 1 CSS file inside `css/`
- Exactly 1 JavaScript file inside `js/`
- Single `index.html` at root

---

## Non-Functional Requirements

### NFR-1: Simplicity
- Clean, minimal interface
- No complex setup required

### NFR-2: Performance
- Fast load time (no external JS libraries)
- Responsive UI — no noticeable lag when adding/deleting transactions

### NFR-3: Visual Design
- Mobile-first, responsive up to desktop (max-width 640px container)
- Clear visual hierarchy
- Readable typography
- Dark and light theme support

---

## Optional Challenges Implemented
1. **Monthly summary view** — tab with month navigation and category bar chart
2. **Sort transactions** — by date, amount, or category
3. **Dark/light mode toggle** — persisted via LocalStorage

---

## Glossary

| Term | Definition |
|---|---|
| Transaction | A single income or expense entry with description, amount, category, and date |
| Balance | Total income minus total expenses across all transactions |
| Spend Limit | A user-defined monthly cap on total expenses |
| Category | A named group (with emoji and color) used to classify transactions |
| Exchange Rate | Live USD→IDR conversion rate fetched from open.er-api.com, cached 1 hour |
| LocalStorage | Browser-native key-value store used for all client-side persistence |
