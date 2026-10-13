(() => {
  const dialog = document.getElementById('sosDialog');
  const data = {
    ARS: { country: 'Argentina', source: 'https://www.argentina.gob.ar/tema/emergencias',
      numbers: [['Central de emergências', '911'], ['Emergências médicas (SAME)', '107'], ['Bombeiros', '100']] },
    USD: { country: 'Estados Unidos', source: 'https://www.911.gov/calling-911/',
      numbers: [['Polícia, bombeiros e ambulância', '911']] },
    CAD: { country: 'Canadá', source: 'https://parks.canada.ca/voyage-travel/securite-safety/urgence-emergency',
      numbers: [['Polícia, bombeiros e ambulância', '911']] },
    GBP: { country: 'Reino Unido', source: 'https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers',
      numbers: [['Polícia, bombeiros e ambulância', '999'], ['Emergências (alternativa)', '112']] },
    EUR: { country: 'Espanha', source: 'https://administracion.gob.es/en/tu-espacio-europeo/derechos-obligaciones/ciudadanos/asistencia-sanitaria/numeros-urgencia',
      numbers: [['Polícia, bombeiros e ambulância', '112']] }
  };
  document.getElementById('openSos').addEventListener('click', () => {
    const destination = data[document.querySelector('.flag-card[aria-pressed="true"]')?.dataset.currency];
    const list = document.getElementById('sosNumbers');
    list.replaceChildren();
    if (!destination) return;
    document.getElementById('sosCountry').textContent = `Destino: ${destination.country}`;
    document.getElementById('sosSource').href = destination.source;
    destination.numbers.forEach(([service, number]) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = service;
      const call = document.createElement('a');
      call.href = `tel:${number}`;
      call.textContent = number;
      call.setAttribute('aria-label', `Ligar ${number}: ${service}`);
      item.append(label, call);
      list.append(item);
    });
    dialog.showModal();
  });
})();
