// js/chords.js
import { state, setState } from './app.js';
import { renderActiveTab } from './tabs.js';

export function initChords() {
  renderPills();
  document.getElementById('btn-add-chord').onclick = promptAddChord;
  document.getElementById('style-select').onchange = (e) => {
    setState({ style: e.target.value });
  };
  document.getElementById('bpm-input').onchange = (e) => {
    const bpm = Math.max(40, Math.min(240, parseInt(e.target.value) || 92));
    setState({ bpm });
  };
}

function renderPills() {
  const container = document.getElementById('chord-pills');
  container.innerHTML = '';
  state.chords.forEach((chord, i) => {
    const pill = document.createElement('span');
    pill.className = 'chord-pill' + (i === (state.activeChordIndex ?? 0) ? ' active' : '');
    pill.textContent = chord;
    pill.onclick = () => { setState({ activeChordIndex: i }); renderActiveTab(); };

    const removeBtn = document.createElement('span');
    removeBtn.className = 'pill-remove';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => { e.stopPropagation(); removeChord(i); };
    pill.appendChild(removeBtn);

    container.appendChild(pill);
  });
}

function promptAddChord() {
  const input = prompt('Enter chord (e.g. Am, F, Cmaj7, G7):');
  if (!input) return;
  const chord = input.trim();
  if (!chord) return;
  setState({ chords: [...state.chords, chord] });
  renderActiveTab();
}

function removeChord(index) {
  const chords = state.chords.filter((_, i) => i !== index);
  const activeChordIndex = Math.max(0, Math.min(state.activeChordIndex ?? 0, chords.length - 1));
  setState({ chords, activeChordIndex });
  renderActiveTab();
}
