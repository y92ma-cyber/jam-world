import { initChords } from './chords.js';
import { initTabs } from './tabs.js';
import { storage, generateId } from './storage.js';
import { handlePrint } from './print.js';
import { initTranspose, updateDisplay } from './transpose.js';

const DEFAULT_SESSION = {
  name: 'New Session',
  chords: ['Am', 'F', 'C', 'G'],
  style: 'funk',
  bpm: 92,
  timeSignature: '4/4',
  transposeOffset: 0,
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
  updateDisplay(state.transposeOffset ?? 0);
}

export function initStorage() {
  document.getElementById('btn-save').onclick = handleSave;
  document.getElementById('btn-load').onclick = handleLoad;
  document.getElementById('btn-new').onclick = handleNew;
}

function handleSave() {
  const name = prompt('Name this jam session:', state.name || 'New Session');
  if (name === null) return; // cancelled
  if (!state.id) state.id = generateId();
  state.name = name || 'Unnamed Session';
  storage.save({ ...state });
  document.getElementById('session-name').textContent = state.name;
  showToast('Session saved!');
}

function handleLoad() {
  const sessions = storage.list();
  if (!sessions.length) { showToast('No saved sessions yet'); return; }
  showLoadModal(sessions);
}

function handleNew() {
  if (!confirm('Start a new jam? Unsaved changes will be lost.')) return;
  Object.assign(state, { ...DEFAULT_SESSION, id: null, activeChordIndex: 0, activeTab: 'guitar' });
  render();
}

export function showToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function showLoadModal(sessions) {
  const overlay = document.getElementById('modal-overlay');
  const list = document.getElementById('session-list');
  list.innerHTML = '';
  sessions.forEach(s => {
    const li = document.createElement('li');
    li.className = 'session-item';
    li.dataset.id = s.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'session-item-name';
    nameSpan.textContent = s.name;

    const metaSpan = document.createElement('span');
    metaSpan.className = 'session-item-meta';
    metaSpan.textContent = s.chords?.join(' ') || '';

    const delBtn = document.createElement('button');
    delBtn.className = 'session-delete';
    delBtn.title = 'Delete';
    delBtn.textContent = '×';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm('Delete this session?')) {
        storage.delete(s.id);
        li.remove();
        if (!storage.list().length) overlay.classList.remove('open');
      }
    };

    li.append(nameSpan, metaSpan, delBtn);
    li.onclick = (e) => {
      if (e.target === delBtn) return;
      const session = storage.load(s.id);
      if (session) { Object.assign(state, session); render(); }
      overlay.classList.remove('open');
    };
    list.appendChild(li);
  });
  overlay.classList.add('open');
  document.getElementById('modal-close').onclick = () => overlay.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initTranspose();
  document.getElementById('btn-print').onclick = () => handlePrint(state);
  render();
});
