(() => {
  const storageKey = 'guia-de-bolso-tasks';
  const get = (id) => document.getElementById(id);
  const form = get('taskForm');
  const openFormButton = get('openTaskForm');
  function showForm(visible) {
    form.hidden = !visible;
    openFormButton.setAttribute('aria-expanded', String(visible));
  }
  openFormButton.addEventListener('click', () => {
    if (form.hidden) {
      resetForm();
      showForm(true);
      input.focus();
    } else {
      resetForm();
      showForm(false);
    }
  });
  const input = get('taskInput');
  const day = get('itineraryDay');
  const date = get('taskDate');
  const time = get('taskTime');
  const category = get('taskCategory');
  const priority = get('taskPriority');
  const address = get('taskAddress');
  const list = get('taskList');
  const storageStatus = get('taskStorageStatus');
  const activitiesToggle = get('toggleActivities');
  activitiesToggle.addEventListener('click', () => {
    const expanded = activitiesToggle.getAttribute('aria-expanded') !== 'true';
    activitiesToggle.setAttribute('aria-expanded', String(expanded));
    get('activitiesContent').hidden = !expanded;
    get('toggleActivitiesLabel').textContent = expanded ? 'Recolher atividades' : 'Expandir atividades';
  });
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  day.value = date.value = todayKey;
  let tasks = [];
  let editing = null;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) tasks = stored.filter((task) => task && typeof task.text === 'string' && typeof task.done === 'boolean')
      .map((task) => ({ ...task, date: task.date || todayKey, time: task.time || '', category: task.category || 'Outros', priority: task.priority || 'normal', address: task.address || '' }));
  } catch {
    storageStatus.textContent = 'N\u00e3o foi poss\u00edvel recuperar o roteiro salvo.';
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
      storageStatus.textContent = 'Roteiro salvo neste navegador.';
    } catch {
      storageStatus.textContent = 'N\u00e3o foi poss\u00edvel salvar. Mantenha esta p\u00e1gina aberta para preservar as atividades.';
    }
  }
  function resetForm() {
    editing = null;
    form.reset();
    date.value = day.value || todayKey;
    get('taskSave').textContent = 'Adicionar ao roteiro';
    get('taskCancel').hidden = true;
  }
  function render() {
    list.replaceChildren();
    const visible = tasks.filter((task) => task.date === day.value)
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    visible.forEach((task) => {
      const row = document.createElement('li');
      row.className = 'task-item itinerary-item';
      row.classList.toggle('is-done', task.done);
      const content = document.createElement('div');
      content.className = 'itinerary-copy';
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      const title = document.createElement('span');
      title.textContent = task.text;
      checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        row.classList.toggle('is-done', task.done);
        updateProgress(visible);
        save();
      });
      label.append(checkbox, title);
      const meta = document.createElement('p');
      meta.className = 'itinerary-meta';
      meta.textContent = `${task.time || 'Sem hor\u00e1rio'} \u00b7 ${task.category}`;
      const badge = document.createElement('small');
      badge.className = 'priority-badge';
      badge.dataset.priority = task.priority;
      badge.textContent = { high: 'Alta', normal: 'Normal', low: 'Baixa' }[task.priority] || 'Normal';
      meta.append(' \u00b7 ', badge);
      content.append(label, meta);
      if (task.address) {
        const link = document.createElement('a');
        link.className = 'itinerary-route';
        link.textContent = `\u2197 ${task.address}`;
        link.setAttribute('aria-label', `Abrir rota para ${task.address}`);
        link.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.address)}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        content.append(link);
      }
      const actions = document.createElement('div');
      actions.className = 'itinerary-row-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'task-remove';
      edit.textContent = '\u270e';
      edit.setAttribute('aria-label', `Editar ${task.text}`);
      edit.title = 'Editar atividade';
      edit.addEventListener('click', () => {
        editing = task;
        input.value = task.text;
        date.value = task.date;
        time.value = task.time;
        category.value = task.category;
        priority.value = task.priority;
        address.value = task.address;
        get('taskSave').textContent = 'Salvar atividade';
        get('taskCancel').hidden = false;
        showForm(true);
        input.focus();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'task-remove';
      remove.textContent = '\u00d7';
      remove.setAttribute('aria-label', `Excluir ${task.text}`);
      remove.title = 'Excluir atividade';
      remove.addEventListener('click', () => {
        tasks.splice(tasks.indexOf(task), 1);
        if (editing === task) resetForm();
        save();
        render();
        input.focus();
      });
      actions.append(edit, remove);
      row.append(content, actions);
      list.append(row);
    });
    updateProgress(visible);
  }
  function updateProgress(visible) {
    get('taskProgress').textContent = `${visible.filter((task) => task.done).length} de ${visible.length} conclu\u00eddas neste dia`;
    get('taskEmpty').hidden = visible.length > 0;
  }
  day.addEventListener('change', () => {
    if (!day.value) day.value = todayKey;
    resetForm();
    render();
  });
  get('taskCancel').addEventListener('click', () => {
    resetForm();
    showForm(false);
    openFormButton.focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    const values = { text, date: date.value, time: time.value, category: category.value, priority: priority.value, address: address.value.trim() };
    if (editing) Object.assign(editing, values);
    else tasks.push({ ...values, done: false });
    day.value = date.value;
    save();
    resetForm();
    render();
    showForm(false);
    openFormButton.focus();
  });
  render();
})();
