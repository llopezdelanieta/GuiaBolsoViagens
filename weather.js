(() => {
  const get = (id) => document.getElementById(id);
  const status = get('weatherStatus');
  const result = get('weatherResult');
  let selectedPlace;
  let controller;
  let requestId = 0;

  function condition(code) {
    if (code === 0) return '☀️ Céu limpo';
    if ([1, 2].includes(code)) return '🌤️ Parcialmente nublado';
    if (code === 3) return '☁️ Nublado';
    if ([45, 48].includes(code)) return '🌫️ Nevoeiro';
    if ([51, 53, 55, 56, 57].includes(code)) return '🌦️ Garoa';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️ Chuva';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️ Neve';
    if ([95, 96, 99].includes(code)) return '⛈️ Trovoadas';
    return 'Condição indisponível';
  }

  const number = (value, unit) => Number.isFinite(value)
    ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)}${unit}` : '—';

  function begin(message) {
    controller?.abort();
    controller = new AbortController();
    const id = ++requestId;
    status.textContent = message;
    get('weatherPanel').setAttribute('aria-busy', 'true');
    result.hidden = true;
    get('weatherCities').replaceChildren();
    return { id, signal: controller.signal };
  }

  async function json(url, signal) {
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
    if (!response.ok) throw new Error('Serviço indisponível');
    return response.json();
  }

  function finish(id) {
    if (id === requestId) get('weatherPanel').setAttribute('aria-busy', 'false');
  }

  function fail(id, signal) {
    if (id !== requestId || signal.aborted) return;
    status.textContent = 'Não foi possível consultar o clima. Confira sua conexão e tente novamente.';
  }

  async function load(place) {
    selectedPlace = place;
    const { id, signal } = begin('Consultando o clima…');
    try {
      const params = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude,
        current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'auto', forecast_days: '5' });
      const data = await json(`https://api.open-meteo.com/v1/forecast?${params}`, signal);
      if (id !== requestId) return;
      if (!data.current || !Array.isArray(data.daily?.time)) throw new Error('Dados incompletos');
      const current = data.current;
      get('weatherPlace').textContent = place.name;
      get('weatherTemperature').textContent = number(current.temperature_2m, ' °C');
      get('weatherCondition').textContent = condition(current.weather_code);
      const details = get('weatherDetails');
      details.replaceChildren();
      for (const text of [
        `Sensação: ${number(current.apparent_temperature, ' °C')}`,
        `Umidade: ${number(current.relative_humidity_2m, '%')}`,
        `Vento: ${number(current.wind_speed_10m, ' km/h')}`
      ]) {
        const item = document.createElement('p');
        item.textContent = text;
        details.append(item);
      }
      get('weatherUpdated').textContent = `Referência: ${current.time.replace('T', ' às ')} · ${data.timezone}`;
      const forecast = get('weatherForecast');
      forecast.replaceChildren();
      data.daily.time.forEach((day, i) => {
        const row = document.createElement('li');
        const code = data.daily.weather_code?.[i];
        const minimum = data.daily.temperature_2m_min?.[i];
        const wet = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
        const snow = [71, 73, 75, 77, 85, 86].includes(code);
        row.dataset.weather = wet ? 'rain' : snow || (Number.isFinite(minimum) && minimum <= 10)
          ? 'cold' : [1, 2, 3, 45, 48].includes(code) ? 'cloudy' : code === 0 ? 'sunny' : 'unknown';
        const title = document.createElement('strong');
        title.textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));
        const description = document.createElement('span');
        description.textContent = condition(code);
        const temperatures = document.createElement('span');
        temperatures.textContent = `${number(data.daily.temperature_2m_min?.[i], '°')} / ${number(data.daily.temperature_2m_max?.[i], '°')} · Chuva: ${number(data.daily.precipitation_probability_max?.[i], '%')}`;
        row.append(title, description, temperatures);
        forecast.append(row);
      });
      result.hidden = false;
      status.textContent = `Clima atualizado para ${place.name}.`;
    } catch { fail(id, signal); }
    finally { finish(id); }
  }

  get('weatherSearch').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = get('weatherCity').value.trim();
    if (name.length < 2) { status.textContent = 'Digite pelo menos duas letras para buscar.'; return; }
    const { id, signal } = begin('Buscando cidades…');
    try {
      const params = new URLSearchParams({ name, count: '5', language: 'pt', format: 'json' });
      const data = await json(`https://geocoding-api.open-meteo.com/v1/search?${params}`, signal);
      if (id !== requestId) return;
      if (!data.results?.length) { status.textContent = 'Cidade não encontrada. Tente outro nome.'; return; }
      status.textContent = 'Selecione a cidade para consultar o clima.';
      data.results.forEach((city) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'location-button';
        const name = [city.name, city.admin1, city.country].filter(Boolean).join(', ');
        button.textContent = name;
        button.addEventListener('click', () => load({ name, latitude: city.latitude, longitude: city.longitude }));
        get('weatherCities').append(button);
      });
    } catch { fail(id, signal); }
    finally { finish(id); }
  });

  get('weatherLocate').addEventListener('click', () => {
    const button = get('weatherLocate');
    const label = get('weatherLocationLabel');
    const state = get('weatherLocationState');
    if (!navigator.geolocation || !window.isSecureContext) {
      status.textContent = 'A localização precisa de HTTPS ou localhost. Busque uma cidade abaixo.';
      state.dataset.state = 'error';
      state.textContent = 'Localização indisponível · tente novamente';
      return;
    }
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    label.textContent = 'Localizando…';
    state.dataset.state = 'pending';
    state.textContent = 'Obtendo uma posição atualizada…';
    const { id } = begin('Obtendo sua localização…');
    navigator.geolocation.getCurrentPosition(({ coords, timestamp }) => {
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
      label.textContent = 'Atualizar minha localização';
      button.dataset.ready = 'true';
      state.dataset.state = 'ready';
      const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
      state.textContent = `✓ Localização ativa · atualizada às ${time}`;
      if (id === requestId) load({ name: 'Sua localização', latitude: coords.latitude, longitude: coords.longitude });
    }, () => {
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
      label.textContent = 'Tentar localização novamente';
      button.dataset.ready = 'false';
      state.dataset.state = 'error';
      state.textContent = 'Localização indisponível · tente novamente';
      if (id !== requestId) return;
      status.textContent = 'Não foi possível obter sua localização. Permita o acesso ou busque uma cidade abaixo.';
      finish(id);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });
  get('weatherRefresh').addEventListener('click', () => { if (selectedPlace) load(selectedPlace); });
})();
