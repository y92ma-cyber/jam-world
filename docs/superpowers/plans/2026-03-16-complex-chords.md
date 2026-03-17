# Complex Chord Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Tonal.js so any chord (Dm7b5, C7#9b13, etc.) renders correctly across all instrument tabs instead of silently failing.

**Architecture:** Add Tonal.js via importmap (no build step). Each instrument tab uses a Tonal fallback when a chord isn't in `chords.json`. Guitar shows closest DB voicing with "(approx.)" label; Keys renders algorithmically derived notes on the piano; Scale suggests a mode based on chord quality.

**Tech Stack:** Vanilla JS ES modules, Tonal.js v6 (CDN importmap), no build step.

**Spec:** `docs/superpowers/specs/2026-03-16-complex-chords-design.md`

**Tasks must be done in order** — Task 1 makes Tonal available; subsequent tasks depend on it.

---

## Task 1: Setup — importmap + export showToast

**Files:**
- Modify: `index.html` — add importmap
- Modify: `js/app.js` — export showToast

Read both files before making changes.

- [ ] **Step 1: Add importmap to `index.html`**

Add as the very first child of `<head>` (before `<meta charset>`):
```html
<script type="importmap">
  { "imports": { "@tonaljs/tonal": "https://cdn.jsdelivr.net/npm/@tonaljs/tonal@6/+esm" } }
</script>
```

- [ ] **Step 2: Export `showToast` from `js/app.js`**

Find the line:
```js
function showToast(msg) {
```
Change to:
```js
export function showToast(msg) {
```

- [ ] **Step 3: Verify in browser**

Open app with a local server (`python3 -m http.server 8080`, open http://localhost:8080). Open browser console. Expected: no errors. The importmap loads silently.

- [ ] **Step 4: Commit**

```bash
git add index.html js/app.js
git commit -m "feat: add Tonal.js importmap and export showToast"
```

---

## Task 2: Chord input validation (`js/chords.js`)

**Files:**
- Modify: `js/chords.js`

Read the file first. It imports `{ state, setState }` from `./app.js` and `{ renderActiveTab }` from `./tabs.js`. It has two places where chord names are accepted: `promptAddChord()` and the long-press `setTimeout` callback in `renderPills()`.

- [ ] **Step 1: Add Tonal import and update app.js import**

At the top of `js/chords.js`, add:
```js
import { Chord } from '@tonaljs/tonal';
```

Change the existing app.js import line from:
```js
import { state, setState } from './app.js';
```
to:
```js
import { state, setState, showToast } from './app.js';
```

- [ ] **Step 2: Add validation in `promptAddChord`**

Replace the existing `promptAddChord` function:
```js
function promptAddChord() {
  const input = prompt('Enter chord (e.g. Am, F, Cmaj7, C7b9):');
  if (!input) return;
  const chord = input.trim();
  if (!chord) return;
  if (Chord.get(chord).empty) showToast(`"${chord}" — unrecognized, added anyway`);
  setState({ chords: [...state.chords, chord] });
  renderActiveTab();
}
```

- [ ] **Step 3: Add validation in the long-press edit handler**

In `renderPills()`, find the `setTimeout` callback. It currently does:
```js
const newChord = prompt('Edit chord:', chord);
if (newChord && newChord.trim()) {
  const chords = [...state.chords];
  chords[i] = newChord.trim();
  setState({ chords });
  renderActiveTab();
}
```

Replace with:
```js
const newChord = prompt('Edit chord:', chord);
if (newChord && newChord.trim()) {
  const trimmed = newChord.trim();
  if (Chord.get(trimmed).empty) showToast(`"${trimmed}" — unrecognized, updated anyway`);
  const chords = [...state.chords];
  chords[i] = trimmed;
  setState({ chords });
  renderActiveTab();
}
```

- [ ] **Step 4: Verify in browser**

1. Click ＋, type `C7b9` → no toast (Tonal recognizes it), chord added
2. Click ＋, type `Xyzzy` → toast: `"Xyzzy" — unrecognized, added anyway`
3. Long-press an existing chord, edit to `Dm7b5` → no toast, chord updated

- [ ] **Step 5: Commit**

```bash
git add js/chords.js
git commit -m "feat: validate chord input with Tonal.js"
```

---

## Task 3: Guitar — closest voicing fallback (`js/instruments/guitar.js`)

**Files:**
- Modify: `js/instruments/guitar.js`

Read the file first. The existing fallback (when `!chord`) shows "No data". Replace this with the Tonal-powered closest voicing lookup.

- [ ] **Step 1: Add Tonal import**

Add at the top of the file:
```js
import { Chord } from '@tonaljs/tonal';
```

- [ ] **Step 2: Add `findClosestDbChord` function**

Add after the `ENHARMONIC` constant (around line 53):
```js
// Maps Tonal sharp outputs to flat roots used in chords.json
const SHARP_TO_FLAT = { 'A#':'Bb','D#':'Eb','G#':'Ab','C#':'Db','F#':'Gb' };

function findClosestDbChord(chordName, data) {
  const parsed = Chord.get(chordName);
  if (parsed.empty || !parsed.tonic) return null;

  const { quality } = parsed;
  const root = SHARP_TO_FLAT[parsed.tonic] || parsed.tonic;

  const priorities = {
    'Dominant Seventh':   [root+'7',    root,      root+'maj7', root+'m'  ],
    'Major Seventh':      [root+'maj7', root,      root+'7',    root+'m'  ],
    'Major':              [root,        root+'maj7',root+'7',   root+'m'  ],
    'Minor Seventh':      [root+'m7',   root+'m',  root,        root+'7'  ],
    'Minor':              [root+'m',    root+'m7', root,        root+'7'  ],
    'Half Diminished':    [root+'m7',   root+'m',  root                   ],
    'Diminished Seventh': [root+'m',    root+'m7', root                   ],
    'Diminished':         [root+'m',    root+'m7', root                   ],
    'Augmented':          [root,        root+'m',  root+'maj7'            ],
    'Augmented Seventh':  [root+'7',    root,      root+'m'               ],
  };

  const candidates = priorities[quality] || [root, root+'m', root+'7', root+'maj7'];
  for (const key of candidates) {
    if (data[key]) return { chord: data[key], fallbackKey: key };
  }
  return null;
}
```

- [ ] **Step 3: Update the `!chord` branch in `renderGuitar`**

Find and replace the existing `!chord` early-return block:
```js
if (!chord) {
  card.innerHTML = `<div class="chord-card-name">${chordName}</div><div class="chord-card-type">—</div><p style="color:var(--text-dim);font-size:11px;font-family:var(--font-sans)">No data</p>`;
  grid.appendChild(card);
  return;
}
```

Replace with:
```js
if (!chord) {
  const fallback = findClosestDbChord(chordName, data);
  if (!fallback) {
    card.innerHTML = `<div class="chord-card-name">${chordName}</div><div class="chord-card-type" style="color:var(--text-dim)">No voicing available</div>`;
    grid.appendChild(card);
    return;
  }
  const fVoicing = fallback.chord.voicings[0];
  const fRoot = fallback.chord.notes[0];
  card.innerHTML = `
    <div class="chord-card-name">${chordName}</div>
    <div class="chord-card-type">${chordName}</div>
    ${buildFretboardSVG(fVoicing, fRoot)}
    <div class="chord-card-voicing-label">${fVoicing.label} (approx.)</div>
  `;
  grid.appendChild(card);
  return;
}
```

- [ ] **Step 4: Verify in browser — Guitar tab**

1. Add chord `Dm7b5` → guitar shows a voicing labeled e.g. "Open (approx.)"
2. Add chord `C7#9` → guitar shows C7 voicing with "(approx.)"
3. Add chord `Am` → guitar shows normal voicing with no "(approx.)"
4. Add chord `Xyzzy` → guitar shows "No voicing available"

- [ ] **Step 5: Commit**

```bash
git add js/instruments/guitar.js
git commit -m "feat: guitar tab shows closest voicing for unknown chords"
```

---

## Task 4: Keys — algorithmic note derivation (`js/instruments/keys.js`)

**Files:**
- Modify: `js/instruments/keys.js`

Read the file first. The existing `!chord` fallback shows just `"—"`. Replace with Tonal note derivation fed into the existing `buildPianoSVG`.

- [ ] **Step 1: Add Tonal import**

Add at the top:
```js
import { Chord } from '@tonaljs/tonal';
```

- [ ] **Step 2: Add `getVoicingTagFromQuality` helper**

Add after the existing `getVoicingTag` function:
```js
function getVoicingTagFromQuality(quality) {
  if (quality && quality.toLowerCase().includes('seventh')) return 'Shell Voicing';
  return 'Close Voicing';
}
```

- [ ] **Step 3: Update the `!chord` branch in `renderKeys`**

Find and replace:
```js
if (!chord) {
  card.innerHTML = `<div class="chord-card-name">${chordName}</div><div class="chord-card-type">—</div>`;
  grid.appendChild(card);
  return;
}
```

Replace with:
```js
if (!chord) {
  const parsed = Chord.get(chordName);
  if (parsed.empty || !parsed.tonic || !parsed.notes?.length) {
    card.innerHTML = `<div class="chord-card-name">${chordName}</div><div class="chord-card-type">Unknown chord</div>`;
    grid.appendChild(card);
    return;
  }
  // Normalize: Tonal returns flat spellings (Bb, Eb) but buildPianoSVG BLACK_KEYS uses sharps (A#, D#)
  // ENHARMONIC is already defined at module scope in this file: { 'Bb':'A#', 'Eb':'D#', ... }
  const normalizedNotes = parsed.notes.map(n => ENHARMONIC[n] || n);
  const root = ENHARMONIC[parsed.tonic] || parsed.tonic;
  const typeLabel = parsed.aliases[0] || parsed.quality || '?';

  card.innerHTML = `
    <div class="chord-card-name">${chordName}</div>
    <div class="chord-card-type">${typeLabel} (tonal)</div>
    ${buildPianoSVG(normalizedNotes, root)}
    <div class="keys-notes">${parsed.notes.join(' · ')}</div>
    <div class="keys-voicing-tag">${getVoicingTagFromQuality(parsed.quality)}</div>
  `;
  grid.appendChild(card);
  return;
}
```

- [ ] **Step 4: Verify in browser — Keys tab**

1. Add chord `Dm7b5` → piano highlights D, F, Ab, C (4 notes)
2. Add chord `C7#9` → piano highlights C, E, G, Bb, D# (5 notes, D# is a black key)
3. Add chord `Cmaj7` → piano renders from DB as before (no regression)
4. Add chord `Bbm7` → piano highlights Bb, Db, F, Ab

- [ ] **Step 5: Commit**

```bash
git add js/instruments/keys.js
git commit -m "feat: keys tab derives notes for unknown chords via Tonal.js"
```

---

## Task 5: Scale — algorithmic scale suggestion (`js/instruments/scale.js`)

**Files:**
- Modify: `js/instruments/scale.js`

Read the file first. The lookup chain is `data[progressionKey] || data[activeChord] || data['default']`. Add a Tonal fallback before `data['default']`.

- [ ] **Step 1: Add Tonal import**

Add at the top:
```js
import { Chord, Scale } from '@tonaljs/tonal';
```

- [ ] **Step 2: Add `deriveScaleFromChord` function**

Add after the `ENHARMONIC` constant (around line 46):
```js
function deriveScaleFromChord(chordName) {
  const parsed = Chord.get(chordName);
  if (parsed.empty || !parsed.tonic) return null;

  const { tonic, quality } = parsed;
  const isAlteredDom = quality === 'Dominant Seventh' && /b9|#9|b13|#11/.test(chordName);

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
```

- [ ] **Step 3: Update the scale lookup chain**

Find:
```js
const scaleSet = data[progressionKey] || data[activeChord] || data['default'];
```

Replace with:
```js
const scaleSet = data[progressionKey] || data[activeChord] || deriveScaleFromChord(activeChord) || data['default'];
```

- [ ] **Step 4: Verify in browser — Scale tab**

1. Add chord `C7b9`, select it → scale tab shows "C Altered" with description "All alterations..."
2. Add chord `Dm7b5`, select it → scale tab shows "D Locrian"
3. Add chord `G7`, select it → scale tab shows "G Mixolydian" (from Tonal fallback if not in scales.json)
4. Add chord `Am`, select it → scale tab shows its usual scale from scales.json (no regression)

- [ ] **Step 5: Push all to main**

```bash
git add js/instruments/scale.js
git commit -m "feat: scale tab suggests mode for unknown chords via Tonal.js"
git push origin main
```
