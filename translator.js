(() => {
  const get = (id) => document.getElementById(id);
  const source = get('sourceLanguage');
  const target = get('targetLanguage');
  const input = get('translationSource');
  const result = get('translationResult');
  const status = get('translationStatus');
  const button = get('translateButton');
  const copy = get('copyTranslation');
  const languages = { pt: 'Português', es: 'Espanhol', en: 'Inglês', fr: 'Francês', it: 'Italiano', de: 'Alemão' };
  [source, target].forEach((select) => {
    Object.entries(languages).forEach(([code, name]) => select.add(new Option(name, code)));
  });
  source.value = 'pt';
  target.value = 'es';
  let controller;
  let requestId = 0;
  const bytes = () => new TextEncoder().encode(input.value.trim()).length;
  function reset() {
    requestId++;
    controller?.abort();
    result.value = '';
    copy.disabled = true;
    button.disabled = false;
    button.textContent = 'Traduzir';
    button.removeAttribute('aria-busy');
    status.classList.remove('is-loading');
    status.textContent = '';
    get('translationCount').textContent = `${bytes()} / 500 bytes`;
    input.setCustomValidity(bytes() > 500 ? 'Reduza o texto para até 500 bytes.' : '');
  }
  input.addEventListener('input', reset);
  source.addEventListener('change', reset);
  target.addEventListener('change', reset);
  get('swapLanguages').addEventListener('click', () => {
    [source.value, target.value] = [target.value, source.value];
    if (result.value) input.value = result.value;
    reset();
  });
  get('translatorForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    reset();
    const text = input.value.trim();
    if (!text || bytes() > 500) { input.reportValidity(); return; }
    if (source.value === target.value) {
      result.value = text;
      copy.disabled = false;
      status.textContent = 'Os idiomas selecionados são iguais.';
      return;
    }
    const id = requestId;
    controller = new AbortController();
    const activeController = controller;
    const timeout = setTimeout(() => activeController.abort(), 20000);
    button.disabled = true;
    button.textContent = 'Traduzindo…';
    button.setAttribute('aria-busy', 'true');
    status.classList.add('is-loading');
    status.textContent = 'Traduzindo seu texto…';
    try {
      const params = new URLSearchParams({ q: text, langpair: `${source.value}|${target.value}` });
      const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: activeController.signal });
      if (!response.ok) throw new Error('Serviço indisponível');
      const data = await response.json();
      if (Number(data.responseStatus) !== 200 || data.quotaFinished || typeof data.responseData?.translatedText !== 'string') throw new Error('Tradução indisponível');
      if (id !== requestId) return;
      result.value = data.responseData.translatedText;
      result.lang = target.value;
      copy.disabled = false;
      status.textContent = 'Tradução concluída.';
    } catch {
      if (id === requestId) status.textContent = 'Não foi possível traduzir. Verifique a conexão e tente novamente; o limite do serviço pode ter sido atingido.';
    } finally {
      clearTimeout(timeout);
      if (id === requestId) {
        button.disabled = false;
        button.textContent = 'Traduzir';
        button.removeAttribute('aria-busy');
        status.classList.remove('is-loading');
      }
    }
  });
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(result.value);
      status.textContent = 'Tradução copiada!';
    } catch {
      result.focus();
      result.select();
      status.textContent = 'Selecionei o texto. Use a opção Copiar do seu dispositivo.';
    }
  });
})();
