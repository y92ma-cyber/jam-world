// js/print.js
import { renderGuitar } from './instruments/guitar.js';
import { renderBass } from './instruments/bass.js';
import { renderDrums } from './instruments/drums.js';
import { renderKeys } from './instruments/keys.js';
import { renderScale } from './instruments/scale.js';

export async function handlePrint(state) {
  // Render all tabs into a hidden print container, then trigger print
  let printEl = document.getElementById('print-container');
  if (!printEl) {
    printEl = document.createElement('div');
    printEl.id = 'print-container';
    document.body.appendChild(printEl);
  }
  printEl.innerHTML = '';

  const sections = [
    { fn: renderGuitar },
    { fn: renderBass },
    { fn: renderDrums },
    { fn: renderKeys },
    { fn: renderScale },
  ];

  try {
    for (const { fn } of sections) {
      const section = document.createElement('div');
      section.className = 'print-section';
      await fn(section, state);
      printEl.appendChild(section);
    }
  } catch (err) {
    console.error('Print render failed:', err);
    alert('Could not prepare print view. Try again.');
    return;
  }

  window.print();
}
