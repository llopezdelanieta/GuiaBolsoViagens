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
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length];
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
  pharmacy: '[amenity="pharmacy"]',
  hospital: '[amenity="hospital"]',
  market: '[shop~"^(supermarket|convenience|grocery|greengrocer)$"]'
};
const categoryIcons = {
  tourism: 'M3 21h18M5 21V10h14v11M3 10l9-7 9 7M9 13v5m6-5v5',
  restaurant: 'M5 3v6a3 3 0 0 0 6 0V3M8 3v18m12 0V3c-4 2-5 8 0 9',
  bar: 'M4 3h16l-8 10-8-10Zm8 10v8m-5 0h10M7 7h10',
  cafe: 'M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 0h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2M3 22h15',
  park: 'M12 2 6 10h3l-5 7h16l-5-7h3L12 2Zm0 15v5m-4 0h8',
  pharmacy: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z',
  hospital: 'M4 21V3h16v18M2 21h20M9 7h6m-3-3v6M9 21v-6h6v6',
  market: 'M2 3h3l3 12h11l3-9H6M9 20h.01M18 20h.01'
};
categories.forEach((button) => {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', categoryIcons[button.dataset.category]);
  icon.append(path);
  button.prepend(icon);
});
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
    route.className = 'place-route';
    route.setAttribute('aria-label', `Ver rota para ${place.tags.name}`);
    route.title = 'Ver rota';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20.3 3.7 3.9 9.9a.6.6 0 0 0 .1 1.1l6.8 2.2 2.2 6.8a.6.6 0 0 0 1.1.1l6.2-16.4Z M10.8 13.2l5-5');
    svg.append(path);
    route.append(svg);
    route.href = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    route.target = '_blank';
    route.rel = 'noopener noreferrer';
    const copy = document.createElement('div');
    copy.className = 'place-card__copy';
    copy.append(heading, details);
    card.append(copy, route);
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
