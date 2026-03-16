// js/tabs.js
import { state } from './app.js';
import { renderGuitar } from './instruments/guitar.js';
import { renderBass } from './instruments/bass.js';
import { renderDrums } from './instruments/drums.js';
import { renderKeys } from './instruments/keys.js';
import { renderScale } from './instruments/scale.js';

const RENDERERS = { guitar: renderGuitar, bass: renderBass, drums: renderDrums, keys: renderKeys, scale: renderScale };

export function initTabs() {
  document.querySelectorAll('.inst-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.inst-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeTab = tab.dataset.tab;
      renderActiveTab();
    };
  });
  renderActiveTab();
}

export function renderActiveTab() {
  const tab = state.activeTab || 'guitar';
  const content = document.getElementById('content-area');
  content.innerHTML = '';
  const renderer = RENDERERS[tab];
  if (renderer) renderer(content, state);
}
