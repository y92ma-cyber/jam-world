// js/instruments/guitar.js
let chordsData = null;

async function loadChords() {
  if (chordsData) return chordsData;
  const res = await fetch('data/chords.json');
  chordsData = await res.json();
  return chordsData;
}

export async function renderGuitar(container, state) {
  const data = await loadChords();
  container.innerHTML = '<div class="section-label">Guitar — Chord Diagrams</div>';

  const grid = document.createElement('div');
  grid.className = 'chord-grid';

  state.chords.forEach(chordName => {
    const chord = data[chordName];
    const card = document.createElement('div');
    card.className = 'chord-card';

    if (!chord) {
      card.innerHTML = `<div class="chord-card-name">${chordName}</div><div class="chord-card-type">—</div><p style="color:var(--text-dim);font-size:11px;font-family:var(--font-sans)">No data</p>`;
      grid.appendChild(card);
      return;
    }

    const voicing = chord.voicings[0];
    card.innerHTML = `
      <div class="chord-card-name">${chordName}</div>
      <div class="chord-card-type">${chord.type}</div>
      ${buildFretboardSVG(voicing)}
      <div class="chord-card-voicing-label">${voicing.label}</div>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function buildFretboardSVG(voicing) {
  const strings = voicing.strings; // array of 6: "x","0","1"-"9"
  const baseFret = voicing.baseFret || 1;
  const FRETS = 4;
  const STRING_GAP = 14;
  const FRET_GAP = 16;
  const MARGIN_X = 14;
  const MARGIN_Y = 18;
  const W = MARGIN_X * 2 + STRING_GAP * 5;
  const H = MARGIN_Y + FRET_GAP * FRETS + 10;

  // Find min fret to figure out position on neck
  const fretNums = strings.map(s => parseInt(s)).filter(n => !isNaN(n) && n > 0);
  const minFret = fretNums.length ? Math.min(...fretNums) : 1;

  let circles = '';
  strings.forEach((s, i) => {
    const x = MARGIN_X + i * STRING_GAP;
    if (s === 'x') {
      circles += `<text x="${x}" y="${MARGIN_Y - 6}" text-anchor="middle" fill="#c0392b" font-size="10" font-family="sans-serif">✕</text>`;
    } else if (s === '0') {
      circles += `<circle cx="${x}" cy="${MARGIN_Y - 7}" r="4" fill="none" stroke="#888" stroke-width="1.5"/>`;
    } else {
      const fret = parseInt(s);
      const adjustedFret = baseFret > 1 ? fret - baseFret + 1 : fret;
      const cy = MARGIN_Y + (adjustedFret - 0.5) * FRET_GAP;
      const isRoot = (i === strings.findIndex(v => !isNaN(parseInt(v)) && parseInt(v) > 0 && parseInt(v) === minFret));
      circles += `<circle cx="${x}" cy="${cy}" r="5" fill="${isRoot ? '#c0392b' : '#4a2000'}" stroke="${isRoot ? '#c0392b' : '#888'}" stroke-width="1"/>`;
    }
  });

  // Fret position label
  const fretLabel = baseFret > 1 ? `<text x="${W - 4}" y="${MARGIN_Y + 8}" fill="#888" font-size="9" font-family="monospace">${baseFret}fr</text>` : '';

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="fretboard-svg">
    <!-- Nut -->
    <line x1="${MARGIN_X}" y1="${MARGIN_Y}" x2="${MARGIN_X + STRING_GAP * 5}" y2="${MARGIN_Y}" stroke="${baseFret === 1 ? '#f5e6c8' : '#444'}" stroke-width="${baseFret === 1 ? 3 : 1}"/>
    <!-- Fret lines -->
    ${Array.from({length: FRETS}, (_, f) =>
      `<line x1="${MARGIN_X}" y1="${MARGIN_Y + (f+1)*FRET_GAP}" x2="${MARGIN_X + STRING_GAP*5}" y2="${MARGIN_Y + (f+1)*FRET_GAP}" stroke="#333" stroke-width="1"/>`
    ).join('')}
    <!-- String lines -->
    ${Array.from({length: 6}, (_, s) =>
      `<line x1="${MARGIN_X + s*STRING_GAP}" y1="${MARGIN_Y}" x2="${MARGIN_X + s*STRING_GAP}" y2="${MARGIN_Y + FRET_GAP*FRETS}" stroke="#555" stroke-width="1"/>`
    ).join('')}
    ${circles}
    ${fretLabel}
  </svg>`;
}
