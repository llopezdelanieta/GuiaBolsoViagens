const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(index + 1) % tabs.length];
    selectTab(next);
    next.focus();
  });
});

const locateButton = document.getElementById('locateButton');
const locationButtonLabel = document.getElementById('locationButtonLabel');
const locationState = document.getElementById('locationState');
const placesStatus = document.getElementById('placesStatus');
const placesList = document.getElementById('placesList');
const categories = [...document.querySelectorAll('[data-category]')];
const filters = {
  tourism: '[tourism~"^(attraction|museum|viewpoint|gallery|artwork)$"]',
  restaurant: '[amenity="restaurant"]',
  bar: '[amenity~"^(bar|pub|biergarten)$"]',
  cafe: '[amenity="cafe"]',
  park: '[leisure="park"]',
  pharmacy: '[amenity="pharmacy"]'
};
let locationCoords;
let category = 'tourism';
let searchController;
const placesCache = new Map();

function distanceKm(lat, lon) {
  const radians = (value) => value * Math.PI / 180;
  const a = Math.sin(radians(lat - locationCoords.latitude) / 2) ** 2
    + Math.cos(radians(lat)) * Math.cos(radians(locationCoords.latitude))
    * Math.sin(radians(lon - locationCoords.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

function renderPlaces(elements) {
  const seen = new Set();
  const places = elements.map((item) => {
    const point = item.center || item;
    return { ...item, lat: point.lat, lon: point.lon, distance: distanceKm(point.lat, point.lon) };
  }).filter((item) => item.tags?.name && Number.isFinite(item.distance))
    .sort((a, b) => a.distance - b.distance)
    .filter((item) => {
      const key = `${item.tags.name.toLowerCase()}:${item.lat.toFixed(3)}:${item.lon.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 20);
  placesList.replaceChildren();
  places.forEach((place) => {
    const card = document.createElement('article');
    card.className = 'place-card';
    const heading = document.createElement('h3');
    heading.textContent = place.tags.name;
    const details = document.createElement('p');
    const distance = place.distance < 1 ? `${Math.round(place.distance * 1000)} m` : `${place.distance.toFixed(1).replace('.', ',')} km`;
    const address = [place.tags['addr:street'], place.tags['addr:housenumber']].filter(Boolean).join(', ');
    details.textContent = `${distance} de você${address ? ' · ' + address : ''}`;
    const route = document.createElement('a');
    route.textContent = 'Ver rota ↗';
    route.href = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    route.target = '_blank';
    route.rel = 'noopener noreferrer';
    card.append(heading, details, route);
    placesList.append(card);
  });
  placesStatus.textContent = places.length ? `${places.length} lugares próximos · distância em linha reta` : 'Nenhum lugar encontrado nesta categoria em até 3 km. Experimente outra categoria.';
}

async function searchPlaces() {
  if (!locationCoords) return;
  searchController?.abort();
  const controller = new AbortController();
  searchController = controller;
  const key = `${locationCoords.latitude},${locationCoords.longitude}:${category}`;
  placesList.replaceChildren();
  placesList.setAttribute('aria-busy', 'true');
  placesStatus.classList.add('is-loading');
  placesStatus.textContent = 'Buscando lugares próximos…';
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    let elements = placesCache.get(key);
    if (!elements) {
      const { latitude, longitude } = locationCoords;
      const query = `[out:json][timeout:25];nwr${filters[category]}[name](around:3000,${latitude},${longitude});out center tags;`;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST', body: new URLSearchParams({ data: query }), signal: controller.signal
      });
      if (!response.ok) throw new Error('Busca indisponível');
      const data = await response.json();
      if (data.remark || !Array.isArray(data.elements)) throw new Error('Busca incompleta');
      elements = data.elements;
      placesCache.set(key, elements);
    }
    if (searchController === controller) renderPlaces(elements);
  } catch {
    if (searchController === controller) placesStatus.textContent = 'Não foi possível buscar os lugares agora. Tente novamente ou escolha outra categoria.';
  } finally {
    clearTimeout(timeout);
    if (searchController === controller) {
      placesList.setAttribute('aria-busy', 'false');
      placesStatus.classList.remove('is-loading');
    }
  }
}

locateButton.addEventListener('click', () => {
  if (!navigator.geolocation || !window.isSecureContext) {
    placesStatus.textContent = 'A localização precisa de HTTPS ou localhost e de um navegador compatível.';
    return;
  }
  locateButton.disabled = true;
  locateButton.setAttribute('aria-busy', 'true');
  locationButtonLabel.textContent = 'Localizando…';
  locationState.dataset.state = 'pending';
  locationState.textContent = 'Obtendo uma posição atualizada…';
  placesStatus.classList.add('is-loading');
  placesStatus.textContent = 'Obtendo sua localização…';
  navigator.geolocation.getCurrentPosition((position) => {
    locationCoords = position.coords;
    locateButton.disabled = false;
    locateButton.setAttribute('aria-busy', 'false');
    locationButtonLabel.textContent = 'Atualizar minha localização';
    locateButton.dataset.ready = 'true';
    locationState.dataset.state = 'ready';
    const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(position.timestamp));
    locationState.textContent = `✓ Localização ativa · atualizada às ${time}`;
    searchPlaces();
  }, (error) => {
    locateButton.disabled = false;
    locateButton.setAttribute('aria-busy', 'false');
    locationButtonLabel.textContent = 'Tentar localização novamente';
    locationState.dataset.state = 'error';
    locationState.textContent = locationCoords
      ? 'Não foi possível atualizar · usando a posição anterior'
      : 'Localização indisponível · tente novamente';
    placesStatus.classList.remove('is-loading');
    placesStatus.textContent = error.code === 1
      ? 'Permita o acesso à localização nas configurações do navegador e tente novamente.'
      : 'Não foi possível obter sua localização. Verifique o GPS e tente novamente.';
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
});

categories.forEach((button) => button.addEventListener('click', () => {
  category = button.dataset.category;
  categories.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  searchPlaces();
}));
