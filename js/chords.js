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

    const removeBtn = document.createElement('span');
    removeBtn.className = 'pill-remove';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => { e.stopPropagation(); removeChord(i); };
    pill.appendChild(removeBtn);

    // Long-press to edit — per-pill locals (must stay inside forEach)
    let pressTimer = null;
    let pointerDownAt = 0;

    pill.onpointerdown = () => {
      pointerDownAt = Date.now();
      pressTimer = setTimeout(() => {
        const newChord = prompt('Edit chord:', chord);
        if (newChord && newChord.trim()) {
          const chords = [...state.chords];
          chords[i] = newChord.trim();
          setState({ chords });
          renderActiveTab();
        }
      }, 500);
    };

    // Cancel pending long-press on release/leave/cancel (no-op if timer already fired)
    pill.onpointerup = pill.onpointerleave = pill.onpointercancel = () => {
      clearTimeout(pressTimer);
    };

    pill.onclick = () => {
      if (Date.now() - pointerDownAt >= 500) return; // was a long-press, skip activation
      setState({ activeChordIndex: i });
      renderActiveTab();
    };

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
  if (state.chords.length <= 1) return; // keep at least one chord
  const chords = state.chords.filter((_, i) => i !== index);
  const activeChordIndex = Math.max(0, Math.min(state.activeChordIndex ?? 0, chords.length - 1));
  setState({ chords, activeChordIndex });
  renderActiveTab();
}
