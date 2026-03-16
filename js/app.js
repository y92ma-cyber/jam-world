// js/app.js
import { initChords } from './chords.js';
import { initTabs } from './tabs.js';

const DEFAULT_SESSION = {
  name: 'New Session',
  chords: ['Am', 'F', 'C', 'G'],
  style: 'funk',
  bpm: 92,
  timeSignature: '4/4',
};

export let state = { ...DEFAULT_SESSION };

export function setState(patch) {
  Object.assign(state, patch);
  render();
}

function render() {
  document.getElementById('session-name').textContent = state.name;
  document.getElementById('style-select').value = state.style;
  document.getElementById('bpm-input').value = state.bpm;
  initChords();
  initTabs();
}

document.addEventListener('DOMContentLoaded', () => {
  render();
});
