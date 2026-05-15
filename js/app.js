/* ============================================================
   Budget Visualizer — app.js
   Vanilla JS only. No frameworks. LocalStorage for persistence.
   Features: transactions, donut chart, monthly summary,
             sort/filter, dark/light mode, USD/IDR currency,
             custom categories, spend limit.
   ============================================================ */

'use strict';

/* ── Storage keys ─────────────────────────────────────────── */
const KEYS = {
  transactions: 'bv_transactions',
  categories:   'bv_categories',
  theme:        'bv_theme',
  spendLimit:   'bv_spend_limit',
  currency:     'bv_currency',
};

/* ── Currency config ──────────────────────────────────────── */
const CURRENCIES = {
  USD: { code: 'USD', locale: 'en-US', symbol: '$',  decimals: 2 },
  IDR: { code: 'IDR', locale: 'id-ID', symbol: 'Rp', decimals: 0 },
};

/* Live exchange rate: USD → IDR, fetched from open.er-api.com
   Cached in localStorage for 1 hour to avoid hammering the API.
   Falls back to a hardcoded rate if the fetch fails.            */
const RATE_FALLBACK   = 16300;   // approximate USD→IDR fallback
const RATE_CACHE_KEY  = 'bv_usd_idr_rate';
const RATE_CACHE_TIME = 'bv_usd_idr_time';
const RATE_TTL_MS     = 60 * 60 * 1000; // 1 hour

let usdToIdr = parseFloat(localStorage.getItem(RATE_CACHE_KEY)) || RATE_FALLBACK;

async function fetchExchangeRate() {
  const lastFetch = parseInt(localStorage.getItem(RATE_CACHE_TIME) || '0', 10);
  if (Date.now() - lastFetch < RATE_TTL_MS && usdToIdr !== RATE_FALLBACK) return; // still fresh

  try {
    const res  = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data?.rates?.IDR) {
      usdToIdr = data.rates.IDR;
      localStorage.setItem(RATE_CACHE_KEY,  usdToIdr);
      localStorage.setItem(RATE_CACHE_TIME, Date.now());
      render(); // re-render with fresh rate
    }
  } catch {
    // Network unavailable — keep using cached or fallback rate silently
  }
}

/* ── Default categories ───────────────────────────────────── */
const DEFAULT_CATEGORIES = [
  { name: 'Food',          emoji: '🍔', color: '#ff6584' },
  { name: 'Transport',     emoji: '🚗', color: '#6c63ff' },
  { name: 'Shopping',      emoji: '🛍️', color: '#ffd166' },
  { name: 'Health',        emoji: '💊', color: '#43e97b' },
  { name: 'Entertainment', emoji: '🎮', color: '#48c6ef' },
  { name: 'Bills',         emoji: '💡', color: '#f77f00' },
  { name: 'Salary',        emoji: '💼', color: '#06d6a0' },
  { name: 'Other',         emoji: '📦', color: '#8b8fa8' },
];

/* Extra colors for user-created categories */
const EXTRA_COLORS = [
  '#e040fb', '#00bcd4', '#ff7043', '#66bb6a',
  '#ab47bc', '#26c6da', '#d4e157', '#ef5350',
];

/* ── App state ────────────────────────────────────────────── */
let transactions = JSON.parse(localStorage.getItem(KEYS.transactions) || '[]');
let categories   = JSON.parse(localStorage.getItem(KEYS.categories)   || 'null') || DEFAULT_CATEGORIES.map(c => ({ ...c }));
let spendLimit   = parseFloat(localStorage.getItem(KEYS.spendLimit))  || 0;
let currency     = CURRENCIES[localStorage.getItem(KEYS.currency)]    || CURRENCIES.USD;

let currentType   = 'expense';
let currentFilter = 'all';
let currentSort   = 'date-desc';
let activeTab     = 'history';
let summaryMonth  = new Date();

/* ── Persistence ──────────────────────────────────────────── */
function save() {
  localStorage.setItem(KEYS.transactions, JSON.stringify(transactions));
  localStorage.setItem(KEYS.categories,   JSON.stringify(categories));
  localStorage.setItem(KEYS.spendLimit,   spendLimit);
  localStorage.setItem(KEYS.currency,     currency.code);
}

/* ── Utility helpers ──────────────────────────────────────── */

/** Format a number as currency string.
 *  Transactions are stored in the currency they were entered in.
 *  When switching currency, amounts are converted using the live rate. */
function fmt(n, storedCode) {
  let value = Math.abs(n);

  // Convert if stored currency differs from display currency
  if (storedCode && storedCode !== currency.code) {
    if (storedCode === 'USD' && currency.code === 'IDR') value = value * usdToIdr;
    if (storedCode === 'IDR' && currency.code === 'USD') value = value / usdToIdr;
  }

  return currency.symbol + value.toLocaleString(currency.locale, {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  });
}

/** Escape HTML special characters to prevent XSS */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Find a category object by name, with fallback */
function getCat(name) {
  return categories.find(c => c.name === name) || { name, emoji: '📦', color: '#8b8fa8' };
}

/** Return "YYYY-MM" for a date string */
function toMonthKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "YYYY-MM" for the currently viewed summary month */
function summaryMonthKey() {
  return `${summaryMonth.getFullYear()}-${String(summaryMonth.getMonth() + 1).padStart(2, '0')}`;
}

/** Human-readable label for the summary month */
function summaryMonthLabel() {
  return summaryMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Highlight an input with a red border briefly */
function shake(id) {
  const el = document.getElementById(id);
  el.style.borderColor = '#ff6584';
  setTimeout(() => { el.style.borderColor = ''; }, 700);
}

/* ── Theme ────────────────────────────────────────────────── */
function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  document.getElementById('themeToggle').textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
  localStorage.setItem(KEYS.theme, theme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
  renderChart(); // canvas colors depend on CSS vars
}

/* ── Currency ─────────────────────────────────────────────── */
function setCurrency(code) {
  currency = CURRENCIES[code] || CURRENCIES.USD;
  save();

  document.getElementById('curUSD').classList.toggle('active', code === 'USD');
  document.getElementById('curIDR').classList.toggle('active', code === 'IDR');

  const amtInput = document.getElementById('txAmount');
  amtInput.step        = currency.decimals === 0 ? '1' : '0.01';
  amtInput.placeholder = currency.decimals === 0 ? '0' : '0.00';

  render();
}

/* ── Categories ───────────────────────────────────────────── */
function rebuildCategorySelect() {
  document.getElementById('txCat').innerHTML = categories
    .map(c => `<option value="${escHtml(c.name)}">${c.emoji} ${escHtml(c.name)}</option>`)
    .join('');
}

function addCustomCategory() {
  const input = document.getElementById('newCatName');
  const name  = input.value.trim();

  if (!name) { input.focus(); return; }

  if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
    shake('newCatName');
    return;
  }

  const colorIndex = (categories.length - DEFAULT_CATEGORIES.length) % EXTRA_COLORS.length;
  categories.push({ name, emoji: '🏷️', color: EXTRA_COLORS[colorIndex] });
  save();
  rebuildCategorySelect();
  input.value = '';
}

/* ── Transaction type toggle ──────────────────────────────── */
function setType(t) {
  currentType = t;
  document.getElementById('btnExpense').className = 'type-btn' + (t === 'expense' ? ' active-expense' : '');
  document.getElementById('btnIncome').className  = 'type-btn' + (t === 'income'  ? ' active-income'  : '');
}

/* ── Tab navigation ───────────────────────────────────────── */
function setTab(tab) {
  activeTab = tab;
  document.getElementById('tabHistory').classList.toggle('active', tab === 'history');
  document.getElementById('tabSummary').classList.toggle('active', tab === 'summary');
  document.getElementById('panelHistory').style.display = tab === 'history' ? '' : 'none';
  document.getElementById('panelSummary').style.display = tab === 'summary' ? '' : 'none';
  if (tab === 'summary') renderSummary();
}

/* ── Filter & sort ────────────────────────────────────────── */
function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderList();
}

function setSort(val) {
  currentSort = val;
  renderList();
}

function getSorted(list) {
  const copy = [...list];
  switch (currentSort) {
    case 'date-asc':    return copy.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    case 'amount-desc': return copy.sort((a, b) => b.amount - a.amount);
    case 'amount-asc':  return copy.sort((a, b) => a.amount - b.amount);
    case 'category':    return copy.sort((a, b) => a.cat.localeCompare(b.cat));
    default:            return copy.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id); // date-desc
  }
}

/* ── Add / delete transactions ────────────────────────────── */
function addTransaction() {
  const name   = document.getElementById('txName').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const cat    = document.getElementById('txCat').value;
  const date   = document.getElementById('txDate').value;

  if (!name)           { shake('txName');   return; }
  if (!amount || amount <= 0) { shake('txAmount'); return; }
  if (!date)           { shake('txDate');   return; }

  transactions.unshift({ id: Date.now(), name, amount, cat, date, type: currentType, currency: currency.code });
  save();
  render();

  document.getElementById('txName').value   = '';
  document.getElementById('txAmount').value = '';
  document.getElementById('txDate').valueAsDate = new Date();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  render();
}

/* ── Spend limit ──────────────────────────────────────────── */
function updateSpendLimit() {
  spendLimit = parseFloat(document.getElementById('spendLimitInput').value) || 0;
  save();
  renderLimitBar();
  renderList();
}

/* ── Render: balance card ─────────────────────────────────── */
function renderBalance() {
  const toDisplay = (t) => {
    let v = t.amount;
    const stored = t.currency || 'USD';
    if (stored !== currency.code) {
      v = stored === 'USD' ? v * usdToIdr : v / usdToIdr;
    }
    return v;
  };

  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + toDisplay(t), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + toDisplay(t), 0);
  const balance = income - expense;

  const balEl = document.getElementById('balanceAmt');
  balEl.textContent = (balance < 0 ? '-' : '') + fmt(Math.abs(balance));
  balEl.className   = 'amount ' + (balance < 0 ? 'negative' : 'positive');

  document.getElementById('totalIncome').textContent  = fmt(income);
  document.getElementById('totalExpense').textContent = fmt(expense);
}

/* ── Render: spend limit bar ──────────────────────────────── */
function renderLimitBar() {
  const wrap  = document.getElementById('limitBarWrap');
  const bar   = document.getElementById('limitBar');
  const info  = document.getElementById('limitInfo');

  // Keep input in sync with saved value
  if (spendLimit > 0) document.getElementById('spendLimitInput').value = spendLimit;

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => {
      let v = t.amount;
      const stored = t.currency || 'USD';
      if (stored !== currency.code) {
        v = stored === 'USD' ? v * usdToIdr : v / usdToIdr;
      }
      return s + v;
    }, 0);

  if (spendLimit <= 0) {
    wrap.style.display = 'none';
    info.textContent   = '';
    return;
  }

  const pct  = Math.min(totalExpense / spendLimit * 100, 100);
  const over = totalExpense > spendLimit;

  wrap.style.display   = '';
  bar.style.width      = pct + '%';
  bar.style.background = over ? '#ff6584' : pct > 75 ? '#ffd166' : '#43e97b';
  info.textContent     = `${fmt(totalExpense)} of ${fmt(spendLimit)} limit${over ? ' — OVER LIMIT' : ''}`;
  info.style.color     = over ? '#ff6584' : 'var(--muted)';
}

/* ── Render: transaction list ─────────────────────────────── */
function renderList() {
  const list   = document.getElementById('txList');
  const sorted = getSorted(
    transactions.filter(t => currentFilter === 'all' || t.type === currentFilter)
  );

  if (!sorted.length) {
    list.innerHTML = `<div class="empty-state"><span class="emoji">🪙</span>No transactions yet.</div>`;
    return;
  }

  list.innerHTML = sorted.map(t => {
    const cat      = getCat(t.cat);
    const sign     = t.type === 'income' ? '+' : '−';
    const dateStr  = t.date
      ? new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';
    const overLimit = spendLimit > 0 && t.type === 'expense' && t.amount > spendLimit * 0.5;
    const badge     = overLimit ? `<span class="limit-badge">⚠ high</span>` : '';

    return `
      <div class="tx-item${overLimit ? ' over-limit' : ''}">
        <div class="tx-icon" style="background:${cat.color}22;color:${cat.color}">${cat.emoji}</div>
        <div class="tx-info">
          <div class="tx-name">${escHtml(t.name)}${badge}</div>
          <div class="tx-meta">${escHtml(t.cat)} · ${dateStr}</div>
        </div>
        <div class="tx-amount ${t.type}">${sign}${fmt(t.amount, t.currency || 'USD')}</div>
        <button class="tx-del" onclick="deleteTransaction(${t.id})" aria-label="Delete transaction">✕</button>
      </div>`;
  }).join('');
}

/* ── Render: donut chart (pure Canvas) ───────────────────── */
function renderChart() {
  const area     = document.getElementById('chartArea');
  const expenses = transactions.filter(t => t.type === 'expense');

  if (!expenses.length) {
    area.innerHTML = '<div class="no-data">No expense data yet.</div>';
    return;
  }

  // Aggregate by category (convert to display currency)
  const totals = {};
  expenses.forEach(t => {
    let v = t.amount;
    const stored = t.currency || 'USD';
    if (stored !== currency.code) {
      v = stored === 'USD' ? v * usdToIdr : v / usdToIdr;
    }
    totals[t.cat] = (totals[t.cat] || 0) + v;
  });
  const total   = Object.values(totals).reduce((a, b) => a + b, 0);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  area.innerHTML = `
    <div class="chart-wrap">
      <canvas id="donutCanvas" width="140" height="140"></canvas>
      <div class="legend" id="chartLegend"></div>
    </div>`;

  // Legend
  document.getElementById('chartLegend').innerHTML = entries.map(([name, val]) => {
    const cat = getCat(name);
    return `
      <div class="legend-item">
        <div class="legend-dot" style="background:${cat.color}"></div>
        <span class="legend-name">${escHtml(name)}</span>
        <span class="legend-pct">${Math.round(val / total * 100)}%</span>
      </div>`;
  }).join('');

  // Draw donut on canvas
  const canvas = document.getElementById('donutCanvas');
  const ctx    = canvas.getContext('2d');
  const cx = 70, cy = 70, outerR = 62, innerR = 38;
  let angle = -Math.PI / 2;

  ctx.clearRect(0, 0, 140, 140);

  entries.forEach(([name, val]) => {
    const slice = (val / total) * Math.PI * 2;
    const cat   = getCat(name);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = cat.color;
    ctx.fill();
    angle += slice;
  });

  // Punch the center hole (reads CSS var for correct theme color)
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#1a1d27';
  ctx.fill();

  // Center total label
  ctx.fillStyle    = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e8eaf6';
  ctx.font         = 'bold 12px Segoe UI, system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmt(total), cx, cy);
}

/* ── Render: monthly summary ──────────────────────────────── */
function renderSummary() {
  const key     = summaryMonthKey();
  const toDisplay = (t) => {
    let v = t.amount;
    const stored = t.currency || 'USD';
    if (stored !== currency.code) {
      v = stored === 'USD' ? v * usdToIdr : v / usdToIdr;
    }
    return v;
  };

  const monthTx = transactions.filter(t => t.date && toMonthKey(t.date) === key);
  const income  = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + toDisplay(t), 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + toDisplay(t), 0);
  const balance = income - expense;

  document.getElementById('summaryMonthLabel').textContent = summaryMonthLabel();
  document.getElementById('msIncome').textContent          = fmt(income);
  document.getElementById('msExpense').textContent         = fmt(expense);

  const balEl = document.getElementById('msBalance');
  balEl.textContent = (balance < 0 ? '-' : '') + fmt(balance);
  balEl.style.color = balance < 0 ? 'var(--red)' : 'var(--green)';

  // Category bar chart (expenses only, converted to display currency)
  const catTotals = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    catTotals[t.cat] = (catTotals[t.cat] || 0) + toDisplay(t);
  });
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const maxVal     = catEntries[0]?.[1] || 1;
  const catList    = document.getElementById('monthlyCatList');

  if (!catEntries.length) {
    catList.innerHTML = '<div class="no-data">No expenses this month.</div>';
    return;
  }

  catList.innerHTML = catEntries.map(([name, val]) => {
    const cat = getCat(name);
    const pct = (val / maxVal * 100).toFixed(1);
    return `
      <div class="month-cat-item">
        <span class="month-cat-name">${cat.emoji} ${escHtml(name)}</span>
        <div class="month-cat-bar-wrap">
          <div class="month-cat-bar" style="width:${pct}%;background:${cat.color}"></div>
        </div>
        <span class="month-cat-amt">${fmt(val)}</span>
      </div>`;
  }).join('');
}

function prevMonth() {
  summaryMonth = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth() - 1, 1);
  renderSummary();
}

function nextMonth() {
  summaryMonth = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth() + 1, 1);
  renderSummary();
}

/* ── Master render ────────────────────────────────────────── */
function render() {
  renderBalance();
  renderChart();
  renderList();
  renderLimitBar();
  if (activeTab === 'summary') renderSummary();
}

/* ── Initialise ───────────────────────────────────────────── */
(function init() {
  // Restore theme
  applyTheme(localStorage.getItem(KEYS.theme) || 'dark');

  // Default date to today
  document.getElementById('txDate').valueAsDate = new Date();

  // Build category dropdown
  rebuildCategorySelect();

  // Sync currency pill buttons
  document.getElementById('curUSD').classList.toggle('active', currency.code === 'USD');
  document.getElementById('curIDR').classList.toggle('active', currency.code === 'IDR');

  // Set amount input step/placeholder for saved currency
  const amtInput       = document.getElementById('txAmount');
  amtInput.step        = currency.decimals === 0 ? '1' : '0.01';
  amtInput.placeholder = currency.decimals === 0 ? '0' : '0.00';

  // Wire sort dropdown
  document.getElementById('sortSelect').addEventListener('change', function () {
    setSort(this.value);
  });

  // Wire spend limit input
  document.getElementById('spendLimitInput').addEventListener('change', updateSpendLimit);

  render();

  // Fetch live USD→IDR rate (cached 1 hour, falls back silently)
  fetchExchangeRate();
})();
