(() => {
  const get = (id) => document.getElementById(id);
  const key = 'guia-de-bolso-expenses';
  const form = get('expenseForm');
  const openForm = get('openExpenseForm');
  function setFormOpen(open) {
    form.hidden = !open;
    openForm.setAttribute('aria-expanded', String(open));
    if (open) description.focus();
  }
  const day = get('expenseDay');
  const date = get('expenseDate');
  const description = get('expenseDescription');
  const amount = get('expenseAmount');
  const category = get('expenseCategory');
  const status = get('expenseStatus');
  const money = (cents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  const today = new Date();
  day.value = date.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  let entries = [];
  let editing = null;
  const entryCurrency = () => entries.find((item) => item.id === editing)?.currency || (editing ? 'BRL' : selectedCurrency);
  function parsedAmount() {
    const raw = amount.value.trim();
    const normalized = raw.includes(',') ? raw.replaceAll('.', '').replace(',', '.') : raw;
    const valid = raw.includes(',') ? /^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(raw) : /^\d+(?:\.\d{1,2})?$/.test(raw);
    const cents = Math.round(Number(normalized) * 100);
    return valid && Number.isSafeInteger(cents) && cents > 0 && cents <= 999999999 ? cents : null;
  }
  function conversion(localCents, currency) {
    const existing = entries.find((item) => item.id === editing);
    if (existing && localCents === (existing.localCents ?? existing.cents)) return { cents: existing.cents, rate: existing.rate || 1, quoteAt: existing.quoteAt || null };
    if (currency === 'BRL') return { cents: localCents, rate: 1, quoteAt: null };
    const quote = quotes[getQuoteKey(currency)];
    const rate = Number(quote?.bid);
    const timestamp = Number(quote?.timestamp);
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(timestamp) || timestamp <= 0) return null;
    const cents = Math.round(localCents / rate);
    if (!Number.isSafeInteger(cents) || cents < 0) return null;
    return { cents, rate, quoteAt: new Date(timestamp * 1000).toISOString() };
  }
  function preview() {
    const currency = entryCurrency();
    get('expenseAmountLabel').textContent = `Valor (${currency})`;
    const localCents = parsedAmount();
    const converted = localCents === null ? null : conversion(localCents, currency);
    get('expenseBrlPreview').value = converted ? money(converted.cents) : '';
  }
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(saved)) throw new Error('Formato inválido');
    entries = saved.filter((item) => item && typeof item.id === 'string' && typeof item.description === 'string'
      && typeof item.category === 'string' && validDate(item.date) && Number.isSafeInteger(item.cents) && item.cents >= 0
      && (!item.currency || item.currency === 'BRL' || Object.hasOwn(currencyConfig, item.currency))
      && (!item.currency || (Number.isSafeInteger(item.localCents) && item.localCents > 0 && item.localCents <= 999999999)));
  } catch { status.textContent = 'Não foi possível recuperar os gastos salvos.'; }

  function persist(next) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      entries = next;
      status.textContent = 'Gastos salvos neste navegador.';
      return true;
    } catch {
      status.textContent = 'Não foi possível salvar o gasto. Verifique o armazenamento do navegador e tente novamente.';
      return false;
    }
  }

  function reset() {
    editing = null;
    form.reset();
    date.value = day.value;
    amount.setCustomValidity('');
    get('expenseSave').textContent = 'Adicionar gasto';
    get('expenseCancel').textContent = 'Cancelar';
    setFormOpen(false);
    preview();
  }

  function render() {
    const visible = entries.filter((item) => item.date === day.value);
    get('expenseTotal').textContent = money(visible.reduce((sum, item) => sum + item.cents, 0));
    get('expenseCount').textContent = `${visible.length} lançamento${visible.length === 1 ? '' : 's'}`;
    get('expenseEmpty').hidden = visible.length > 0;
    const list = get('expenseList');
    list.replaceChildren();
    visible.forEach((item) => {
      const row = document.createElement('li');
      const text = document.createElement('div');
      text.className = 'expense-copy';
      const title = document.createElement('strong');
      title.textContent = item.description;
      const detail = document.createElement('span');
      detail.textContent = item.category;
      text.append(title, detail);
      const local = document.createElement('span');
      local.className = 'expense-local';
      local.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: item.currency || 'BRL' }).format((item.localCents ?? item.cents) / 100);
      const value = document.createElement('strong');
      value.className = 'expense-value';
      value.textContent = money(item.cents);
      const values = document.createElement('div');
      values.className = 'expense-values';
      values.append(local, value);
      const actions = document.createElement('div');
      actions.className = 'expense-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'task-cancel';
      edit.textContent = 'Editar';
      edit.setAttribute('aria-label', `Editar gasto: ${item.description}`);
      edit.addEventListener('click', () => {
        editing = item.id;
        description.value = item.description;
        amount.value = ((item.localCents ?? item.cents) / 100).toFixed(2).replace('.', ',');
        amount.setCustomValidity('');
        date.value = item.date;
        category.value = item.category;
        get('expenseSave').textContent = 'Salvar gasto';
        get('expenseCancel').textContent = 'Cancelar edição';
        setFormOpen(true);
        preview();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'task-cancel';
      remove.textContent = 'Excluir';
      remove.setAttribute('aria-label', `Excluir gasto: ${item.description}`);
      remove.addEventListener('click', () => {
        if (!persist(entries.filter((entry) => entry.id !== item.id))) return;
        if (editing === item.id) reset();
        render();
      });
      actions.append(edit, remove);
      row.append(text, values, actions);
      list.append(row);
    });
  }

  amount.addEventListener('input', () => { amount.setCustomValidity(''); preview(); });
  document.addEventListener('quotesUpdated', preview);
  get('expensesTab').addEventListener('click', preview);
  document.querySelectorAll('.flag-card').forEach((flag) => flag.addEventListener('click', preview));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const raw = amount.value.trim();
    const normalized = raw.includes(',') ? raw.replaceAll('.', '').replace(',', '.') : raw;
    const valid = raw.includes(',') ? /^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(raw) : /^\d+(?:\.\d{1,2})?$/.test(raw);
    const cents = Math.round(Number(normalized) * 100);
    if (!valid || !Number.isSafeInteger(cents) || cents <= 0 || cents > 999999999) {
      amount.setCustomValidity('Informe um valor entre 0,01 e 9.999.999,99 na moeda indicada. Ex.: 35,50.');
      amount.reportValidity();
      return;
    }
    if (!description.value.trim()) { description.focus(); return; }
    if (!validDate(date.value)) { date.reportValidity(); return; }
    const currency = entryCurrency();
    const converted = conversion(cents, currency);
    if (!converted) { status.textContent = 'Cotação indisponível. Atualize a cotação no Conversor antes de salvar este gasto.'; return; }
    const item = { id: editing || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      description: description.value.trim(), ...converted, localCents: cents, currency, date: date.value, category: category.value };
    const next = editing ? entries.map((entry) => entry.id === editing ? item : entry) : [...entries, item];
    if (!persist(next)) return;
    day.value = item.date;
    reset();
    render();
    openForm.focus();
  });
  day.addEventListener('change', () => {
    if (!validDate(day.value)) return;
    if (!editing) date.value = day.value;
    render();
  });
  openForm.addEventListener('click', () => {
    if (form.hidden) { reset(); setFormOpen(true); }
    else reset();
  });
  get('expenseCancel').addEventListener('click', () => { reset(); openForm.focus(); });
  get('toggleExpenses').addEventListener('click', () => {
    const entries = get('expenseEntries');
    entries.hidden = !entries.hidden;
    get('toggleExpenses').setAttribute('aria-expanded', String(!entries.hidden));
    get('toggleExpensesLabel').textContent = entries.hidden ? 'Expandir lançamentos' : 'Recolher lançamentos';
  });
  render();
  preview();
})();
