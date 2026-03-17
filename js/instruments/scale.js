import { Chord, Scale } from '@tonaljs/tonal';

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

  // Look up: full progression → active chord → derived from chord → default
  const scaleSet = data[progressionKey] || data[activeChord] || deriveScaleFromChord(activeChord) || data['default'];

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

function deriveScaleFromChord(chordName) {
  const parsed = Chord.get(chordName);
  if (parsed.empty || !parsed.tonic) return null;

  const { tonic, quality } = parsed;
  const isAlteredDom = quality === 'Dominant Seventh' && /b9|#9|b5|b13|#11/.test(chordName);

  const scaleMap = {
    'Dominant Seventh':   isAlteredDom ? 'altered' : 'mixolydian',
    'Major Seventh':      'major',
    'Major':              'major',
    'Minor Seventh':      'dorian',
    'Minor':              'dorian',
    'Half Diminished':    'locrian',
    'Diminished Seventh': 'diminished',
    'Diminished':         'diminished',
    'Augmented':          'whole tone',
    'Augmented Seventh':  'whole tone',
  };
  const scaleName = scaleMap[quality] || 'major';

  const scale = Scale.get(`${tonic} ${scaleName}`);
  if (!scale.notes?.length) return null;

  // Normalize unusual Tonal enharmonics (Fb, Cb, B#, E#) not present in ALL_NOTES
  const UNUSUAL = { 'Fb':'E','Cb':'B','B#':'C','E#':'F','Db':'C#','Ab':'G#','Gb':'F#','Eb':'D#','Bb':'A#' };
  const normalizedNotes = scale.notes.map(n => UNUSUAL[n] || n);

  const descriptions = {
    'mixolydian':  'Major scale with b7 — classic dominant sound',
    'altered':     'All alterations (b9 #9 b5 b13) — maximum tension',
    'major':       'Bright and stable — home key feel',
    'dorian':      'Minor with natural 6 — smooth, soulful',
    'locrian':     'Half-diminished color — unstable, tense',
    'diminished':  'Whole-half diminished — symmetric tension',
    'whole tone':  'All whole steps — dreamy, augmented feel',
  };

  return {
    recommended: [{
      name:        `${tonic} ${scaleName.charAt(0).toUpperCase() + scaleName.slice(1)}`,
      description: descriptions[scaleName] || '',
      notes:       normalizedNotes,
      avoid:       [],
    }]
  };
}

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
