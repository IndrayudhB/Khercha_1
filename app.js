/* ── STATE ── */
let state = {
  transactions: [],
  budgets: {},
  currency: '₹',
  currentMonth: new Date().toISOString().slice(0, 7),
  theme: 'dark',
  recurring: [],
};
let txType = 'expense';
let recType = 'expense';
let currentView = 'home';
let calMonth = new Date().toISOString().slice(0, 7);
let selectedDay = null;

/* ── PERSIST ── */
function save() {
  localStorage.setItem('kharcha_v3', JSON.stringify(state));
}
function load() {
  const d =
    localStorage.getItem('kharcha_v3') ||
    localStorage.getItem('kharcha_v2') ||
    localStorage.getItem('kharcha');
  if (d) {
    try { state = { ...state, ...JSON.parse(d) }; } catch (e) { /* ignore corrupt data */ }
  }
}

/* ── HELPERS ── */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return MONTHS[parseInt(m) - 1] + ' ' + y;
}
function fmt(n) {
  return state.currency + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function txMonth(tx) { return tx.date.slice(0, 7); }

function changeMonth(dir) {
  const [y, m] = state.currentMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  state.currentMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  render();
}

/* ── THEME ── */
function setTheme(t) {
  state.theme = t;
  document.body.setAttribute('data-theme', t);
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('theme-' + t);
  if (btn) btn.classList.add('active');
  // Update theme-color meta for Android chrome toolbar
  const themeColors = {
    dark: '#0e0e11', bright: '#f5f7fa',
    cream: '#faf6f0', purple: '#0f0a1e', neon: '#000000',
  };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColors[t] || '#0e0e11');
  save();
}

/* ── SIDEBAR ── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('open');
}
function closeSidebar() {
  ['sidebar', 'sidebarOverlay', 'hamburger'].forEach(id =>
    document.getElementById(id).classList.remove('open')
  );
}

/* ── VIEWS ── */
function showView(v) {
  currentView = v;
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + v).classList.add('active');
  document.getElementById('nav-' + v).classList.add('active');
  closeSidebar();
  if (v === 'history') { calMonth = state.currentMonth; selectedDay = null; }
  render();
}

/* ── ADD MODAL ── */
function openAddModal() {
  txType = 'expense';
  document.getElementById('btnExpense').className = 'type-btn active-expense';
  document.getElementById('btnIncome').className  = 'type-btn';
  document.getElementById('txDesc').value   = '';
  document.getElementById('txAmount').value = '';
  document.getElementById('txDate').value   = new Date().toISOString().slice(0, 10);
  document.getElementById('txCategory').selectedIndex = 0;
  renderQuickChips();
  document.getElementById('addModal').classList.add('open');
}
function closeModal() {
  document.getElementById('addModal').classList.remove('open');
}
function setType(t) {
  txType = t;
  document.getElementById('btnExpense').className = t === 'expense' ? 'type-btn active-expense' : 'type-btn';
  document.getElementById('btnIncome').className  = t === 'income'  ? 'type-btn active-income'  : 'type-btn';
}

/* ── QUICK CHIPS ── */
function renderQuickChips() {
  const wrap  = document.getElementById('quickChipsWrap');
  const chips = document.getElementById('quickChips');
  if (!state.recurring || state.recurring.length === 0) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  chips.innerHTML = state.recurring.map(r =>
    `<div class="quick-chip" onclick="fillFromRecurring(${r.id})">${r.desc}</div>`
  ).join('');
}
function fillFromRecurring(id) {
  const r = state.recurring.find(x => x.id === id);
  if (!r) return;
  setType(r.type);
  document.getElementById('txDesc').value = r.desc;
  if (r.amount) document.getElementById('txAmount').value = r.amount;
  const sel = document.getElementById('txCategory');
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].text === r.cat) { sel.selectedIndex = i; break; }
  }
}

/* ── RECURRING MODAL ── */
function openRecurringModal() {
  recType = 'expense';
  document.getElementById('recBtnExpense').className = 'type-btn active-expense';
  document.getElementById('recBtnIncome').className  = 'type-btn';
  document.getElementById('recDesc').value   = '';
  document.getElementById('recAmount').value = '';
  document.getElementById('recCategory').selectedIndex = 0;
  document.getElementById('recurringModal').classList.add('open');
}
function closeRecurringModal() {
  document.getElementById('recurringModal').classList.remove('open');
}
function setRecType(t) {
  recType = t;
  document.getElementById('recBtnExpense').className = t === 'expense' ? 'type-btn active-expense' : 'type-btn';
  document.getElementById('recBtnIncome').className  = t === 'income'  ? 'type-btn active-income'  : 'type-btn';
}
function saveRecurring() {
  const desc = document.getElementById('recDesc').value.trim();
  if (!desc) { alert('Please enter a description.'); return; }
  const amount = parseFloat(document.getElementById('recAmount').value) || 0;
  const cat    = document.getElementById('recCategory').value;
  if (!state.recurring) state.recurring = [];
  state.recurring.push({ id: Date.now(), desc, amount, cat, type: recType });
  save(); closeRecurringModal(); renderRecurring();
}
function deleteRecurring(id) {
  state.recurring = state.recurring.filter(r => r.id !== id);
  save(); renderRecurring();
}
function renderRecurring() {
  const list = document.getElementById('recurringList');
  if (!state.recurring || state.recurring.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:20px 0"><span class="big" style="font-size:1.4rem">🔁</span>No templates yet.</div>`;
    return;
  }
  list.innerHTML = state.recurring.map(r => `
    <div class="recurring-item">
      <div class="tx-icon ${r.type}">${r.cat.split(' ')[0]}</div>
      <div class="recurring-info">
        <div class="recurring-name">${r.desc}</div>
        <div class="recurring-meta">${r.cat.replace(/^\S+\s/, '')} · ${r.type}${r.amount ? ' · ' + fmt(r.amount) : ''}</div>
      </div>
      <div class="recurring-actions">
        <button class="rec-use-btn" onclick="useRecurring(${r.id})">Use</button>
        <button class="rec-del-btn" onclick="deleteRecurring(${r.id})">✕</button>
      </div>
    </div>
  `).join('');
}
function useRecurring(id) {
  openAddModal();
  setTimeout(() => fillFromRecurring(id), 50);
}

/* ── TRANSACTIONS ── */
function saveTransaction() {
  const desc   = document.getElementById('txDesc').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const date   = document.getElementById('txDate').value;
  const cat    = document.getElementById('txCategory').value;
  if (!desc || isNaN(amount) || amount <= 0 || !date) {
    alert('Please fill in all fields.');
    return;
  }
  state.transactions.push({ id: Date.now(), desc, amount, date, cat, type: txType });
  save(); closeModal(); render();
}
function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  save(); render();
}

/* ── BUDGET ── */
function saveBudget() {
  const v = parseFloat(document.getElementById('budgetInput').value);
  if (isNaN(v) || v < 0) { alert('Enter a valid amount.'); return; }
  state.budgets[state.currentMonth] = v;
  save(); render();
}
function clearBudget() {
  delete state.budgets[state.currentMonth];
  document.getElementById('budgetInput').value = '';
  save(); render();
}

/* ── DATA ── */
function clearAllData() {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  state.transactions = [];
  state.budgets = {};
  save(); render();
}

/* ── CALENDAR ── */
function calChangeMonth(dir) {
  const [y, m] = calMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  calMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  selectedDay = null;
  renderCalendar();
  closeDayPanel(false);
}
function renderCalendar() {
  const [y, m] = calMonth.split('-').map(Number);
  document.getElementById('calMonthLabel').textContent = monthLabel(calMonth);
  const firstDay    = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayStr    = new Date().toISOString().slice(0, 10);

  const txMap = {};
  state.transactions.forEach(tx => {
    if (tx.date.slice(0, 7) === calMonth) {
      if (!txMap[tx.date]) txMap[tx.date] = [];
      txMap[tx.date].push(tx.type);
    }
  });

  let html = DAYS.map(d => `<div class="cal-day-name">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = calMonth + '-' + String(day).padStart(2, '0');
    const types   = txMap[dateStr] || [];
    const hasTx   = types.length > 0;
    const isToday = dateStr === todayStr;
    const isSel   = dateStr === selectedDay;
    const hasExp  = types.includes('expense');
    const hasInc  = types.includes('income');
    const dots    = (hasExp ? `<div class="day-dot expense"></div>` : '') +
                    (hasInc ? `<div class="day-dot income"></div>` : '');
    html += `
      <div class="cal-cell${hasTx ? ' has-tx' : ''}${isToday ? ' today' : ''}${isSel ? ' selected' : ''}"
           onclick="selectDay('${dateStr}')">
        <div class="day-num">${day}</div>
        ${dots ? `<div class="day-dot-row">${dots}</div>` : ''}
      </div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}
function selectDay(dateStr) {
  if (selectedDay === dateStr) { closeDayPanel(true); return; }
  selectedDay = dateStr;
  renderCalendar();
  renderDayPanel();
}
function closeDayPanel(rerender = true) {
  selectedDay = null;
  if (rerender) renderCalendar();
  document.getElementById('dayPanel').classList.remove('open');
}
function renderDayPanel() {
  const panel = document.getElementById('dayPanel');
  if (!selectedDay) { panel.classList.remove('open'); return; }
  const txs = state.transactions
    .filter(t => t.date === selectedDay)
    .sort((a, b) => a.desc.localeCompare(b.desc));
  const d     = new Date(selectedDay + 'T00:00:00');
  const label = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('dayPanelTitle').textContent = label;
  const list = document.getElementById('dayPanelList');
  list.innerHTML = txs.length === 0
    ? `<div class="empty-state" style="padding:18px 0"><span class="big" style="font-size:1.6rem">🗓️</span>No entries this day.</div>`
    : txs.map(tx => txHTML(tx, false)).join('');
  panel.classList.add('open');
  setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
}

/* ── ACCORDION ── */
function toggleAccordion() {
  document.getElementById('allHistoryAccordion').classList.toggle('open');
}

/* ── TX HTML ── */
function txHTML(tx, showYear = false) {
  const isExp  = tx.type === 'expense';
  const sign   = isExp ? '−' : '+';
  const dateStr = new Date(tx.date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
    ...(showYear ? { year: 'numeric' } : {}),
  });
  return `
    <div class="tx-item">
      <div class="tx-icon ${tx.type}">${tx.cat.split(' ')[0]}</div>
      <div class="tx-info">
        <div class="tx-desc">${tx.desc}</div>
        <div class="tx-date">${tx.cat.replace(/^\S+\s/, '')} · ${dateStr}</div>
      </div>
      <div class="tx-amount ${tx.type}">${sign}${fmt(tx.amount)}</div>
      <button class="tx-delete" onclick="deleteTransaction(${tx.id})">✕</button>
    </div>`;
}

/* ── GRAPH ── */
function renderGraph() {
  const container = document.getElementById('graphBars');
  const [cy, cm]  = state.currentMonth.split('-').map(Number);
  const months    = [];
  for (let i = 5; i >= 0; i--) {
    const d  = new Date(cy, cm - 1 - i, 1);
    const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    months.push(ym);
  }
  const data = months.map(ym => {
    const txs = state.transactions.filter(t => txMonth(t) === ym);
    return {
      ym,
      exp: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      inc: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    };
  });
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.exp, d.inc)));
  container.innerHTML = data.map(d => {
    const isCurrent = d.ym === state.currentMonth;
    const expH = Math.round((d.exp / maxVal) * 90);
    const incH = Math.round((d.inc / maxVal) * 90);
    const [, m] = d.ym.split('-');
    return `
      <div class="graph-bar-group${isCurrent ? ' current' : ''}">
        <div class="graph-bar-wrap">
          <div class="graph-bar expense" style="height:${expH}px" title="${fmt(d.exp)}"></div>
          <div class="graph-bar income"  style="height:${incH}px" title="${fmt(d.inc)}"></div>
        </div>
        <div class="graph-bar-label">${MONTHS_SHORT[parseInt(m) - 1]}</div>
      </div>`;
  }).join('');
}

/* ── CATEGORY BREAKDOWN ── */
function renderCategoryBreakdown() {
  const el       = document.getElementById('categoryBreakdown');
  const cur      = state.currentMonth;
  const expenses = state.transactions.filter(t => txMonth(t) === cur && t.type === 'expense');
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
  if (expenses.length === 0) {
    el.innerHTML = `<div class="empty-state"><span class="big">📊</span>No expenses this month.</div>`;
    return;
  }
  const cats = {};
  expenses.forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.amount; });
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  el.innerHTML = sorted.map(([cat, amt]) => {
    const pct   = totalExp > 0 ? Math.round((amt / totalExp) * 100) : 0;
    const emoji = cat.split(' ')[0];
    const name  = cat.replace(/^\S+\s/, '');
    return `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:9px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div class="tx-icon expense" style="width:34px;height:34px;font-size:.95rem">${emoji}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:.85rem;font-weight:600">${name}</div>
            <div style="font-family:'DM Mono',monospace;font-size:.7rem;color:var(--muted)">${pct}% of spending</div>
          </div>
          <div style="font-family:'DM Mono',monospace;font-size:.9rem;font-weight:500;color:var(--accent2)">−${fmt(amt)}</div>
        </div>
        <div style="height:5px;background:var(--bar-bg);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--accent2);border-radius:3px;transition:width .5s"></div>
        </div>
      </div>`;
  }).join('');
}

/* ── CSV EXPORT ── */
function exportCSV() {
  if (state.transactions.length === 0) { alert('No transactions to export.'); return; }
  const rows = [['Date', 'Description', 'Category', 'Type', 'Amount']];
  [...state.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach(t => {
      rows.push([
        t.date,
        `"${t.desc.replace(/"/g, '""')}"`,
        `"${t.cat.replace(/^\S+\s/, '').replace(/"/g, '""')}"`,
        t.type,
        t.amount,
      ]);
    });
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'kharcha_export_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ── MAIN RENDER ── */
function render() {
  document.getElementById('topbarMonth').textContent = monthLabel(state.currentMonth);

  const cur      = state.currentMonth;
  const monthTxs = state.transactions
    .filter(t => txMonth(t) === cur)
    .sort((a, b) => b.date.localeCompare(a.date));
  const totalExp  = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalInc  = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const budget    = state.budgets[cur] || 0;
  const remaining = budget > 0
    ? budget - totalExp + totalInc
    : totalInc - totalExp;

  document.getElementById('totalSpent').textContent  = fmt(totalExp);
  document.getElementById('totalIncome').textContent = fmt(totalInc);
  document.getElementById('txCount').textContent     = monthTxs.length + ' transaction' + (monthTxs.length !== 1 ? 's' : '');
  document.getElementById('remaining').textContent   = fmt(remaining);
  document.getElementById('budgetDisplay').textContent = budget > 0 ? fmt(budget) : '—';
  document.getElementById('budgetSub').textContent   = budget > 0 ? 'monthly budget' : 'not set';
  document.getElementById('entryBadge').textContent  = monthTxs.length + ' entries';

  const txList = document.getElementById('txList');
  txList.innerHTML = monthTxs.length === 0
    ? `<div class="empty-state"><span class="big">💸</span>No transactions yet.<br>Tap + to add one.</div>`
    : monthTxs.map(tx => txHTML(tx)).join('');

  document.getElementById('budgetCardAmount').textContent = budget > 0 ? fmt(budget) : '—';
  document.getElementById('budgetCardRemain').textContent = budget > 0 ? fmt(remaining) : '—';
  if (budget > 0) document.getElementById('budgetInput').value = budget;

  if (currentView === 'history') {
    renderCalendar();
    renderDayPanel();
    const all = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('allHistoryCount').textContent = all.length + ' total entries';
    const allList = document.getElementById('allHistoryList');
    allList.innerHTML = all.length === 0
      ? `<div class="empty-state"><span class="big">📋</span>No history yet.</div>`
      : all.map(tx => txHTML(tx, true)).join('');
  }

  if (currentView === 'analytics') { renderGraph(); renderCategoryBreakdown(); }
  if (currentView === 'settings')  { renderRecurring(); }

  // Apply saved theme and keep buttons in sync
  const theme = state.theme || 'dark';
  document.body.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  const tBtn = document.getElementById('theme-' + theme);
  if (tBtn) tBtn.classList.add('active');
}

/* ── INIT ── */
load();
render();

document.getElementById('addModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
document.getElementById('recurringModal').addEventListener('click', function (e) {
  if (e.target === this) closeRecurringModal();
});
