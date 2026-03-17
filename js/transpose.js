import { state, setState } from './app.js';

const CHROMATIC     = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_TO_SHARP = { 'Bb':'A#','Eb':'D#','Ab':'G#','Db':'C#','Gb':'F#' };
const SHARP_TO_FLAT = { 'A#':'Bb','D#':'Eb','G#':'Ab','C#':'Db','F#':'Gb' };

function transposeChord(chordName, semitones) {
  const match = chordName.match(/^([A-G][b#]?)/);
  if (!match) return chordName; // unrecognized root — return unchanged
  const root   = match[1];
  const suffix = chordName.slice(root.length);
  const sharp  = FLAT_TO_SHARP[root] || root;
  const idx    = CHROMATIC.indexOf(sharp);
  if (idx === -1) return chordName;
  const newIdx  = ((idx + semitones) % 12 + 12) % 12;
  const newNote = CHROMATIC[newIdx];
  return (SHARP_TO_FLAT[newNote] || newNote) + suffix;
}

export function updateDisplay(offset) {
  const el = document.getElementById('transpose-display');
  if (!el) return;
  el.textContent = offset > 0 ? `+${offset}` : `${offset}`;
  el.className   = 'transpose-display' + (offset === 0 ? ' zero' : '');
}

function handleTranspose(semitones) {
  const chords = state.chords.map(c => transposeChord(c, semitones));
  const transposeOffset = (state.transposeOffset ?? 0) + semitones;
  setState({ chords, transposeOffset });
}

export function initTranspose() {
  document.getElementById('btn-transpose-down').onclick = () => handleTranspose(-1);
  document.getElementById('btn-transpose-up').onclick   = () => handleTranspose(+1);
  updateDisplay(state.transposeOffset ?? 0);
}
