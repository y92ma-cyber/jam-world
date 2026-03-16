// js/instruments/drums.js
let drumsData = null;

async function loadDrums() {
  if (drumsData) return drumsData;
  const res = await fetch('data/drums.json');
  drumsData = await res.json();
  return drumsData;
}

const ROW_LABELS = { crash: 'CC', ride: 'RD', hihat: 'HH', snare: 'SN', kick: 'KI' };
const ROW_ORDER = ['crash', 'ride', 'hihat', 'snare', 'kick'];

export async function renderDrums(container, state) {
  const data = await loadDrums();
  container.innerHTML = '<div class="section-label">Drums — Patterns</div>';

  const style = state.style || 'funk';
  const patterns = data[style] || data['funk'];

  patterns.forEach(pattern => {
    const card = document.createElement('div');
    card.className = 'drum-card';

    const header = `<div class="drum-card-name">${pattern.name}</div><div class="drum-card-desc">${pattern.description}</div>`;

    const rows = ROW_ORDER
      .filter(row => pattern.grid[row])
      .map(row => {
        const cells = pattern.grid[row].map((hit, i) => {
          const isDownbeat = i % 4 === 0;
          return `<div class="drum-cell ${hit ? 'hit' : ''} ${isDownbeat ? 'downbeat' : ''}"></div>`;
        }).join('');
        return `<div class="drum-row"><span class="drum-row-label">${ROW_LABELS[row]}</span><div class="drum-cells">${cells}</div></div>`;
      }).join('');

    const beats = pattern.beats.map(b =>
      `<div class="drum-beat-label ${b.match(/^\d+$/) ? 'strong' : ''}">${b}</div>`
    ).join('');

    card.innerHTML = `${header}<div class="drum-grid"><div class="drum-row beat-row"><span class="drum-row-label"></span><div class="drum-cells">${beats}</div></div>${rows}</div>`;
    container.appendChild(card);
  });
}
