(() => {
  const key = 'guia-de-bolso-conversions';
  const dialog = document.getElementById('conversionHistory');
  const list = document.getElementById('historyList');
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
    document.getElementById('historyEmpty').hidden = entries.length > 0;
    entries.forEach((item, index) => {
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
        if (persist(entries.filter((_, position) => position !== index))) {
          render();
          (list.querySelector('button') || document.getElementById('closeHistory')).focus();
        }
      });
      content.append(title, details, rate);
      row.append(content, remove);
      list.append(row);
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
    dialog.showModal();
  });
  document.getElementById('closeHistory').addEventListener('click', () => dialog.close());
})();
