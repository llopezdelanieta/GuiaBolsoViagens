(() => {
  const get = (id) => document.getElementById(id);
  const source = get('sourceLanguage');
  const target = get('targetLanguage');
  const input = get('translationSource');
  const result = get('translationResult');
  const status = get('translationStatus');
  const button = get('translateButton');
  const speakSource = get('speakSource');
  const speakTranslation = get('speakTranslation');
  const stopAudio = get('stopTranslationAudio');
  const dictate = get('dictateText');
  const audioStatus = get('translationAudioStatus');
  const synthesis = window.speechSynthesis;
  const canSpeak = Boolean(synthesis && window.SpeechSynthesisUtterance);
  let voices = [];
  function refreshVoices() { voices = synthesis?.getVoices() || []; }
  refreshVoices();
  synthesis?.addEventListener('voiceschanged', refreshVoices);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechLanguages = { pt: 'pt-BR', es: 'es-ES', en: 'en-US', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };
  let recognition;
  let utterance;
  let speechTimer;
  let recognitionTimer;
  function syncAudio() {
    speakSource.disabled = !canSpeak || !input.value.trim();
    speakTranslation.disabled = !canSpeak || !result.value.trim();
  }
  function stopSpeaking() {
    utterance = null;
    clearTimeout(speechTimer);
    if (synthesis?.speaking || synthesis?.pending) synthesis.cancel();
    stopAudio.disabled = true;
  }
  function stopDictation() {
    if (!recognition) return;
    const active = recognition;
    recognition = null;
    clearTimeout(recognitionTimer);
    active.abort();
    dictate.setAttribute('aria-pressed', 'false');
    dictate.querySelector('span').textContent = 'Ditar por voz';
  }
  function speak(text, language) {
    stopDictation();
    stopSpeaking();
    if (!text.trim() || !canSpeak) return;
    const speech = new window.SpeechSynthesisUtterance(text.trim());
    utterance = speech;
    speech.lang = speechLanguages[language];
    refreshVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === speech.lang.toLowerCase())
      || voices.find((item) => item.lang.split('-')[0] === language);
    if (voice) speech.voice = voice;
    speech.onstart = () => {
      if (utterance !== speech) return;
      clearTimeout(speechTimer);
      audioStatus.textContent = 'Reproduzindo áudio…';
    };
    speech.onend = () => {
      if (utterance !== speech) return;
      clearTimeout(speechTimer);
      stopAudio.disabled = true;
      audioStatus.textContent = 'Leitura concluída.';
    };
    speech.onerror = (event) => {
      if (utterance !== speech) return;
      clearTimeout(speechTimer);
      stopAudio.disabled = true;
      audioStatus.textContent = event.error === 'not-allowed'
        ? 'O Safari bloqueou o áudio. Abra a página diretamente no navegador e toque em Ouvir novamente.'
        : 'Não foi possível reproduzir o áudio. Confira o volume e a disponibilidade de uma voz para este idioma no dispositivo.';
    };
    stopAudio.disabled = false;
    audioStatus.textContent = 'Iniciando áudio…';
    speechTimer = setTimeout(() => {
      if (utterance !== speech) return;
      stopSpeaking();
      audioStatus.textContent = 'O áudio não iniciou. Confira o volume, abra no Safari e toque em Ouvir novamente.';
    }, 10000);
    try {
      synthesis.speak(speech);
      if (synthesis.paused) synthesis.resume();
    } catch {
      stopSpeaking();
      audioStatus.textContent = 'Não foi possível iniciar o áudio neste navegador.';
    }
  }
  speakSource.addEventListener('click', () => speak(input.value, source.value));
  speakTranslation.addEventListener('click', () => speak(result.value, target.value));
  stopAudio.addEventListener('click', () => { stopSpeaking(); audioStatus.textContent = 'Áudio interrompido.'; });
  dictate.disabled = !Recognition;
  audioStatus.textContent = !Recognition ? 'A entrada por voz não está disponível neste navegador.'
    : '';
  if (!canSpeak) audioStatus.textContent += ' A leitura em voz alta não está disponível neste navegador.';
  dictate.addEventListener('click', () => {
    if (!window.isSecureContext) {
      audioStatus.textContent = 'O microfone precisa de HTTPS. No celular, endereços locais como http://192.168… bloqueiam o recurso. Use o microfone do teclado para ditar no campo.';
      input.focus();
      return;
    }
    if (!Recognition) return;
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
    audioStatus.textContent = 'Ativando microfone… Permita o acesso quando solicitado.';
    active.onstart = () => {
      if (recognition === active) audioStatus.textContent = 'Ouvindo… Fale no idioma de origem selecionado.';
    };
    recognitionTimer = setTimeout(() => {
      if (recognition !== active) return;
      stopDictation();
      audioStatus.textContent = 'O ditado não respondeu. Abra no Safari, confira a Siri e a permissão do microfone ou use o microfone do teclado.';
    }, 30000);
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
      const messages = {
        'not-allowed': 'Permita o microfone para este site nas configurações do Safari e tente novamente.',
        'service-not-allowed': 'O serviço de ditado está indisponível. No iPhone, confira se a Siri está ativada e abra diretamente no Safari.',
        'audio-capture': 'Microfone indisponível. Confira as permissões e feche outros aplicativos que estejam usando o microfone.',
        network: 'O serviço de voz não respondeu. Confira sua conexão e se a Siri está ativada.',
        'no-speech': 'Nenhuma fala detectada. Toque em Ditar por voz e tente novamente.'
      };
      audioStatus.textContent = messages[event.error] || 'Não foi possível reconhecer a fala. Use o microfone do teclado para ditar no campo.';
      stopDictation();
    };
    active.onend = () => {
      if (recognition !== active) return;
      recognition = null;
      clearTimeout(recognitionTimer);
      dictate.setAttribute('aria-pressed', 'false');
      dictate.querySelector('span').textContent = 'Ditar por voz';
      if (/^(Ouvindo|Ativando)/.test(audioStatus.textContent)) audioStatus.textContent = 'Ditado encerrado. Toque no microfone para tentar novamente.';
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
  input.addEventListener('change', reset);
  window.addEventListener('pageshow', syncAudio);
  get('translatorTab').addEventListener('click', () => { refreshVoices(); syncAudio(); });
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
})();
