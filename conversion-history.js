(() => {
  const key = 'guia-de-bolso-conversions';
  const dialog = document.getElementById('conversionHistory');
  const list = document.getElementById('historyList');
  const dayFilter = document.getElementById('historyDay');
  const converter = document.getElementById('converterContent');
  function dayKey(value) {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  let entries = [];
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) entries = saved.filter((item) => item && currencyConfig[item.currency]
      && Number.isFinite(item.brl) && Number.isFinite(item.local) && Number.isFinite(item.rate)
      && Number.isFinite(Date.parse(item.savedAt)) && Number.isFinite(Date.parse(item.quoteAt)));
  } catch { conversionNotice.textContent = 'Não foi possível recuperar o histórico.'; }
  function persist(next) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      entries = next;
      return true;
    } catch {
      conversionNotice.textContent = 'Não foi possível salvar o histórico neste navegador.';
      return false;
    }
  }
  function render() {
    list.replaceChildren();
    const visible = entries.filter((item) => !dayFilter.value || dayKey(item.savedAt) === dayFilter.value)
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    document.getElementById('historyEmpty').hidden = visible.length > 0;
    document.getElementById('historyCount').textContent = `${visible.length} conversões salvas neste navegador`;
    const groups = new Map();
    visible.forEach((item) => {
      const key = dayKey(item.savedAt);
      if (!groups.has(key)) {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.className = 'history-day-title';
        heading.textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(item.savedAt));
        const groupList = document.createElement('ul');
        groupList.className = 'task-list';
        section.append(heading, groupList);
        list.append(section);
        groups.set(key, groupList);
      }
      const row = document.createElement('li');
      row.className = 'task-item';
      const content = document.createElement('div');
      content.className = 'itinerary-copy';
      const title = document.createElement('strong');
      title.textContent = `${formatCurrency(item.brl, 'BRL')} = ${formatCurrency(item.local, item.currency)}`;
      const details = document.createElement('p');
      details.className = 'explore-note';
      details.textContent = `${currencyConfig[item.currency].country} · ${formatTimestamp(new Date(item.savedAt))}`;
      const rate = document.createElement('p');
      rate.className = 'explore-note';
      rate.textContent = `1 BRL = ${formatRate(item.rate, item.currency)} · cotação de ${formatTimestamp(new Date(item.quoteAt))}${item.cached ? ' · cotação salva' : ''}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'task-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Excluir conversão salva');
      remove.addEventListener('click', () => {
        if (persist(entries.filter((entry) => entry !== item))) {
          render();
          (list.querySelector('button') || document.getElementById('closeHistory')).focus();
        }
      });
      content.append(title, details, rate);
      row.append(content, remove);
      groups.get(key).append(row);
    });
  }
  document.getElementById('saveConversion').addEventListener('click', () => {
    if (!currentConversion) return;
    if (persist([{ ...currentConversion, savedAt: new Date().toISOString() }, ...entries])) {
      conversionNotice.textContent = 'Conversão salva no histórico.';
    }
  });
  document.getElementById('openHistory').addEventListener('click', () => {
    render();
    converter.hidden = true;
    dialog.hidden = false;
    document.getElementById('historyTitle').focus();
  });
  document.getElementById('closeHistory').addEventListener('click', () => {
    dialog.hidden = true;
    converter.hidden = false;
    document.getElementById('openHistory').focus();
  });
  dayFilter.addEventListener('change', render);
  document.getElementById('historyAllDays').addEventListener('click', () => {
    dayFilter.value = '';
    render();
  });
})();
