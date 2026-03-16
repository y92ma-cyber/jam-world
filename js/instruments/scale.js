let scalesData = null;

async function loadScales() {
  if (scalesData) return scalesData;
  const res = await fetch('data/scales.json');
  scalesData = await res.json();
  return scalesData;
}

const ALL_NOTES = ['A','Bb','B','C','C#','D','Eb','E','F','F#','G','Ab'];

export async function renderScale(container, state) {
  const data = await loadScales();
  container.innerHTML = '<div class="section-label">Scale — Improvisation Guide</div>';

  const activeChord = state.chords[state.activeChordIndex ?? 0] || state.chords[0];
  const progressionKey = state.chords.join(' ');

  // Look up: full progression → active chord → default
  const scaleSet = data[progressionKey] || data[activeChord] || data['default'];

  // Context header
  const header = document.createElement('div');
  header.className = 'scale-context';
  header.innerHTML = `<span>Over: <strong>${activeChord}</strong></span><span>Progression: <em>${state.chords.join(' – ')}</em></span>`;
  container.appendChild(header);

  if (!scaleSet?.recommended?.length) return;

  scaleSet.recommended.forEach(scale => {
    const card = document.createElement('div');
    card.className = 'scale-card';

    const noteGrid = buildNoteGrid(scale.notes, scale.avoid || []);

    card.innerHTML = `
      <div class="scale-name">${scale.name}</div>
      <div class="scale-desc">${scale.description}</div>
      <div class="scale-note-grid">${noteGrid}</div>
      ${scale.avoid?.length ? `<div class="scale-avoid">Avoid: ${scale.avoid.join(', ')}</div>` : ''}
    `;
    container.appendChild(card);
  });
}

const ENHARMONIC = { 'Bb': 'A#', 'Eb': 'D#', 'Ab': 'G#', 'Db': 'C#', 'Gb': 'F#', 'A#': 'Bb', 'D#': 'Eb', 'G#': 'Ab', 'C#': 'Db', 'F#': 'Gb' };

function buildNoteGrid(notes, avoidNotes = []) {
  return ALL_NOTES.map(note => {
    const alt = ENHARMONIC[note] || note;
    const inScale = notes.includes(note) || notes.includes(alt);
    const isAvoid = avoidNotes.includes(note) || avoidNotes.includes(alt);
    let cls = '';
    if (isAvoid) cls = 'avoid-note';
    else if (inScale) cls = 'in-scale';
    return `<div class="note-cell ${cls}">${note}</div>`;
  }).join('');
}
