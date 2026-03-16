// js/instruments/bass.js
let groovesData = null;

async function loadGrooves() {
  if (groovesData) return groovesData;
  const res = await fetch('data/grooves.json');
  groovesData = await res.json();
  return groovesData;
}

export async function renderBass(container, state) {
  const data = await loadGrooves();
  container.innerHTML = '<div class="section-label">Bass — Groove Patterns</div>';

  const style = state.style || 'funk';
  const grooves = data[style] || data['funk'];

  // Active chord context
  const activeChord = state.chords[state.activeChordIndex ?? 0] || state.chords[0];
  const info = document.createElement('div');
  info.className = 'bass-context';
  info.innerHTML = `<span class="bass-chord-label">Root: <strong>${getRootNote(activeChord)}</strong></span><span class="bass-style-label">${style.toUpperCase()}</span>`;
  container.appendChild(info);

  grooves.forEach(groove => {
    const card = document.createElement('div');
    card.className = 'groove-card';
    card.innerHTML = `
      <div class="groove-name">${groove.name}</div>
      <div class="groove-desc">${groove.description}</div>
      <div class="groove-tab">${groove.tab.map(line => `<div>${line}</div>`).join('')}</div>
      <div class="groove-feel">Feel: ${groove.feel}</div>
    `;
    container.appendChild(card);
  });
}

function getRootNote(chordName) {
  if (!chordName) return '?';
  // Extract root: handle sharps/flats (e.g. "Bb", "F#", "Am7" → "A")
  const match = chordName.match(/^([A-G][b#]?)/);
  return match ? match[1] : chordName[0];
}
