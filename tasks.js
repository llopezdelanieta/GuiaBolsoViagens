(() => {
  const storageKey = 'guia-de-bolso-tasks';
  const form = document.getElementById('taskForm');
  const input = document.getElementById('taskInput');
  const list = document.getElementById('taskList');
  const progress = document.getElementById('taskProgress');
  const empty = document.getElementById('taskEmpty');
  const storageStatus = document.getElementById('taskStorageStatus');
  let tasks = [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) tasks = stored.filter((task) => task && typeof task.text === 'string' && typeof task.done === 'boolean');
  } catch {
    storageStatus.textContent = 'Não foi possível recuperar a lista salva neste navegador.';
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
      storageStatus.textContent = 'Lista salva neste navegador.';
    } catch {
      storageStatus.textContent = 'Não foi possível salvar. A lista ficará disponível apenas enquanto esta página estiver aberta.';
    }
  }

  function render() {
    list.replaceChildren();
    tasks.forEach((task, index) => {
      const row = document.createElement('li');
      row.className = 'task-item';
      row.classList.toggle('is-done', task.done);
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      const text = document.createElement('span');
      text.textContent = task.text;
      checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        row.classList.toggle('is-done', task.done);
        updateProgress();
        save();
      });
      label.append(checkbox, text);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'task-remove';
      remove.setAttribute('aria-label', `Excluir tarefa: ${task.text}`);
      remove.title = 'Excluir tarefa';
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        tasks.splice(index, 1);
        save();
        render();
        const next = list.children[Math.min(index, tasks.length - 1)];
        (next?.querySelector('.task-remove') || input).focus();
      });
      row.append(label, remove);
      list.append(row);
    });
    updateProgress();
  }

  function updateProgress() {
    progress.textContent = `${tasks.filter((task) => task.done).length} de ${tasks.length} concluídas`;
    empty.hidden = tasks.length > 0;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    tasks.push({ text, done: false });
    save();
    render();
    input.value = '';
    input.focus();
  });
  render();
})();
