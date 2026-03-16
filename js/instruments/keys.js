let chordsData = null;

async function loadChords() {
  if (chordsData) return chordsData;
  const res = await fetch('data/chords.json');
  chordsData = await res.json();
  return chordsData;
}

// Chromatic scale for piano layout
const WHITE_KEYS = ['C','D','E','F','G','A','B'];
const BLACK_KEYS = { 'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5 }; // position index among white keys

function getVoicingTag(chord) {
  if (chord.type && chord.type.toLowerCase().includes('7')) return 'Shell Voicing';
  if (chord.notes && chord.notes.length <= 3) return 'Close Voicing';
  return 'Open Voicing';
}

export async function renderKeys(container, state) {
  const data = await loadChords();
  container.innerHTML = '<div class="section-label">Keys — Voicings</div>';

  const grid = document.createElement('div');
  grid.className = 'keys-grid';

  state.chords.forEach(chordName => {
    const chord = data[chordName];
    const card = document.createElement('div');
    card.className = 'chord-card keys-card';

    if (!chord) {
      card.innerHTML = `<div class="chord-card-name">${chordName}</div><div class="chord-card-type">—</div>`;
      grid.appendChild(card);
      return;
    }

    const root = chordName.match(/^([A-G][b#]?)/)?.[1] || chordName[0];

    card.innerHTML = `
      <div class="chord-card-name">${chordName}</div>
      <div class="chord-card-type">${chord.type}</div>
      ${buildPianoSVG(chord.notes, root)}
      <div class="keys-notes">${chord.notes.join(' · ')}</div>
      <div class="keys-voicing-tag">${getVoicingTag(chord)}</div>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);

  // Add left hand / right hand tip
  const tip = document.createElement('div');
  tip.className = 'keys-tip';
  tip.innerHTML = `<span class="keys-tip-label">Funk tip</span> Left hand: root alone. Right hand: shell voicing (3rd + 7th). Add 9th for colour.`;
  container.appendChild(tip);
}

function buildPianoSVG(notes, root) {
  const W = 112;
  const H = 48;
  const KEY_W = 14;
  const KEY_H = 40;
  const BLACK_W = 9;
  const BLACK_H = 26;

  let whiteKeys = '';
  WHITE_KEYS.forEach((note, i) => {
    const x = i * KEY_W;
    const isChordNote = notes.includes(note);
    const isRootNote = note === root;
    const fill = isRootNote ? '#8b2020' : isChordNote ? '#c0392b' : '#e8dcc8';
    const stroke = '#555';
    whiteKeys += `<rect x="${x}" y="0" width="${KEY_W - 1}" height="${KEY_H}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
  });

  let blackKeysSVG = '';
  Object.entries(BLACK_KEYS).forEach(([note, pos]) => {
    const x = pos * KEY_W + KEY_W - BLACK_W / 2;
    const isChordNote = notes.includes(note);
    const isRootNote = note === root || note === root.replace('b', '#');
    const fill = isRootNote ? '#8b2020' : isChordNote ? '#7a1515' : '#1a1a1a';
    blackKeysSVG += `<rect x="${x}" y="0" width="${BLACK_W}" height="${BLACK_H}" fill="${fill}" stroke="#000" stroke-width="1"/>`;
  });

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="piano-svg">${whiteKeys}${blackKeysSVG}</svg>`;
}
