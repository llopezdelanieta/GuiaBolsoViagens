(() => {
  const get = (id) => document.getElementById(id);
  const source = get('sourceLanguage');
  const target = get('targetLanguage');
  const input = get('translationSource');
  const result = get('translationResult');
  const status = get('translationStatus');
  const button = get('translateButton');
  const copy = get('copyTranslation');
  const speakSource = get('speakSource');
  const speakTranslation = get('speakTranslation');
  const stopAudio = get('stopTranslationAudio');
  const dictate = get('dictateText');
  const audioStatus = get('translationAudioStatus');
  const synthesis = window.speechSynthesis;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechLanguages = { pt: 'pt-BR', es: 'es-ES', en: 'en-US', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };
  let recognition;
  let utterance;
  function syncAudio() {
    speakSource.disabled = !synthesis || !input.value.trim();
    speakTranslation.disabled = !synthesis || !result.value.trim();
  }
  function stopSpeaking() {
    utterance = null;
    synthesis?.cancel();
    stopAudio.disabled = true;
  }
  function stopDictation() {
    if (!recognition) return;
    const active = recognition;
    recognition = null;
    active.abort();
    dictate.setAttribute('aria-pressed', 'false');
    dictate.querySelector('span').textContent = 'Ditar por voz';
  }
  function speak(text, language) {
    stopDictation();
    stopSpeaking();
    if (!text.trim() || !synthesis) return;
    const speech = new SpeechSynthesisUtterance(text);
    utterance = speech;
    speech.lang = speechLanguages[language];
    const voices = synthesis.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === speech.lang.toLowerCase())
      || voices.find((item) => item.lang.split('-')[0] === language);
    if (voice) speech.voice = voice;
    speech.onend = () => {
      if (utterance !== speech) return;
      stopAudio.disabled = true;
      audioStatus.textContent = 'Leitura concluída.';
    };
    speech.onerror = () => {
      if (utterance !== speech) return;
      stopAudio.disabled = true;
      audioStatus.textContent = 'Não foi possível reproduzir o áudio neste idioma.';
    };
    stopAudio.disabled = false;
    audioStatus.textContent = 'Reproduzindo áudio…';
    synthesis.speak(speech);
  }
  speakSource.addEventListener('click', () => speak(input.value, source.value));
  speakTranslation.addEventListener('click', () => speak(result.value, target.value));
  stopAudio.addEventListener('click', () => { stopSpeaking(); audioStatus.textContent = 'Áudio interrompido.'; });
  dictate.disabled = !Recognition;
  audioStatus.textContent = !Recognition ? 'A entrada por voz não está disponível neste navegador.'
    : 'Toque em Ditar por voz e permita o microfone para transformar sua fala em texto.';
  if (!synthesis) audioStatus.textContent += ' A leitura em voz alta não está disponível neste navegador.';
  dictate.addEventListener('click', () => {
    if (recognition) { recognition.stop(); return; }
    stopSpeaking();
    const active = new Recognition();
    recognition = active;
    active.lang = speechLanguages[source.value];
    active.continuous = false;
    active.interimResults = false;
    const original = input.value.trim();
    dictate.setAttribute('aria-pressed', 'true');
    dictate.querySelector('span').textContent = 'Parar ditado';
    audioStatus.textContent = 'Ouvindo… Fale no idioma de origem selecionado.';
    active.onresult = (event) => {
      if (recognition !== active) return;
      const transcript = Array.from(event.results).filter((item) => item.isFinal).map((item) => item[0].transcript).join(' ');
      const text = [original, transcript].filter(Boolean).join(' ');
      let limited = '';
      for (const character of text) {
        if (new TextEncoder().encode(limited + character).length > 500) break;
        limited += character;
      }
      input.value = limited;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      audioStatus.textContent = limited.length < text.length ? 'Ditado inserido até o limite de 500 bytes.' : 'Ditado inserido. Toque em Traduzir.';
    };
    active.onerror = (event) => {
      if (recognition !== active) return;
      audioStatus.textContent = ['not-allowed', 'service-not-allowed'].includes(event.error)
        ? 'Permita o microfone nas configurações do navegador e tente novamente.'
        : 'Não foi possível reconhecer a fala. Verifique o microfone e a conexão e tente novamente.';
    };
    active.onend = () => {
      if (recognition !== active) return;
      recognition = null;
      dictate.setAttribute('aria-pressed', 'false');
      dictate.querySelector('span').textContent = 'Ditar por voz';
      if (audioStatus.textContent.startsWith('Ouvindo')) audioStatus.textContent = 'Ditado encerrado. Toque no microfone para tentar novamente.';
    };
    try { active.start(); }
    catch { stopDictation(); audioStatus.textContent = 'Não foi possível iniciar o microfone. Tente novamente.'; }
  });
  [source, target].forEach((select) => select.addEventListener('change', stopDictation));
  get('swapLanguages').addEventListener('click', stopDictation);
  document.querySelectorAll('[role="tab"]').forEach((tab) => tab.addEventListener('click', () => {
    if (tab.id !== 'translatorTab') { stopDictation(); stopSpeaking(); }
  }));
  window.addEventListener('pagehide', () => { stopDictation(); stopSpeaking(); });
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
    stopSpeaking();
    syncAudio();
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
      syncAudio();
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
      syncAudio();
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
