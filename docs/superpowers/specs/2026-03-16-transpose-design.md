# Transpose — Design Spec

**Date:** 2026-03-16
**Status:** Approved

## Problem

The band needs to change key on the fly — e.g. singer asks to drop a step, or they're jamming with a different horn player. Currently all chords must be re-entered manually.

## Solution

A dedicated **KEY row** between the chord bar and the meta-bar. Two buttons (`−` / `+`) shift all chord names ±1 semitone in place. A counter shows cumulative offset from session start.

## UI

### HTML — add inside `index.html` between `.chord-bar` and `.meta-bar`

```html
<div class="transpose-bar">
  <span class="transpose-label">Key</span>
  <button class="transpose-btn" id="btn-transpose-down" aria-label="Transpose down">−</button>
  <span class="transpose-display" id="transpose-display">0</span>
  <button class="transpose-btn" id="btn-transpose-up" aria-label="Transpose up">+</button>
</div>
```

### CSS — add to `css/style.css`

```css
/* ===== TRANSPOSE BAR ===== */
.transpose-bar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.transpose-label {
  flex: 1;
  font-family: var(--font-sans);
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(245,230,200,0.35);
}
.transpose-btn {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 0;
  color: var(--text);
  width: 26px;
  height: 22px;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.transpose-btn:hover,
.transpose-btn:active { border-color: var(--accent); color: var(--accent); }
.transpose-display {
  width: 32px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: bold;
  color: var(--accent);
}
.transpose-display.zero { color: rgba(245,230,200,0.25); }
```

### Display logic

| `state.transposeOffset` | Displayed text | CSS class |
|---|---|---|
| `0` | `0` | `zero` (dimmed) |
| `> 0` | `+2` | (none, red accent) |
| `< 0` | `−2` | (none, red accent) |

## State

Add `transposeOffset: 0` to `DEFAULT_SESSION` in `js/app.js`. It is saved and restored with sessions. Old sessions that predate this field will load with `state.transposeOffset === undefined`; all code uses `?? 0` as a fallback guard. `handleNew` resets to `DEFAULT_SESSION` via `Object.assign`, which covers `transposeOffset` automatically — no additional change needed there.

## Transposition Algorithm

Chord names are transposed in-place in `state.chords`. Root note is shifted chromatically; suffix (quality + extensions) is preserved unchanged. Black keys always output flat spellings (`Bb` not `A#`, `Eb` not `D#`, etc.) — standard musician convention.

```js
const CHROMATIC   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
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
```

Example: `transposeChord("Am7", +2)` → `"Bm7"`, `transposeChord("Bb", +1)` → `"B"`, `transposeChord("C7b9", -1)` → `"B7b9"`.

## New File: `js/transpose.js`

```js
import { state, setState } from './app.js';

const CHROMATIC     = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_TO_SHARP = { 'Bb':'A#','Eb':'D#','Ab':'G#','Db':'C#','Gb':'F#' };
const SHARP_TO_FLAT = { 'A#':'Bb','D#':'Eb','G#':'Ab','C#':'Db','F#':'Gb' };

function transposeChord(chordName, semitones) {
  const match = chordName.match(/^([A-G][b#]?)/);
  if (!match) return chordName;
  const root   = match[1];
  const suffix = chordName.slice(root.length);
  const sharp  = FLAT_TO_SHARP[root] || root;
  const idx    = CHROMATIC.indexOf(sharp);
  if (idx === -1) return chordName;
  const newIdx  = ((idx + semitones) % 12 + 12) % 12;
  const newNote = CHROMATIC[newIdx];
  return (SHARP_TO_FLAT[newNote] || newNote) + suffix;
}

function updateDisplay(offset) {
  const el = document.getElementById('transpose-display');
  el.textContent = offset > 0 ? `+${offset}` : `${offset}`;
  el.className   = 'transpose-display' + (offset === 0 ? ' zero' : '');
}

function handleTranspose(semitones) {
  const chords = state.chords.map(c => transposeChord(c, semitones));
  const transposeOffset = (state.transposeOffset ?? 0) + semitones;
  setState({ chords, transposeOffset });
  updateDisplay(transposeOffset);
}

export function initTranspose() {
  document.getElementById('btn-transpose-down').onclick = () => handleTranspose(-1);
  document.getElementById('btn-transpose-up').onclick   = () => handleTranspose(+1);
  updateDisplay(state.transposeOffset ?? 0);
}

export { updateDisplay };
```

## Changes to `js/app.js`

1. Add `transposeOffset: 0` to `DEFAULT_SESSION`
2. Import `initTranspose` and `updateDisplay`, call `initTranspose()` once in `DOMContentLoaded`, and call `updateDisplay(state.transposeOffset ?? 0)` inside `render()` so the counter is refreshed whenever a session loads:
   ```js
   import { initTranspose, updateDisplay } from './transpose.js';

   // inside render():
   updateDisplay(state.transposeOffset ?? 0);

   // in DOMContentLoaded:
   initTranspose();
   ```

   **Why `updateDisplay` in `render()`:** `render()` is called after every `setState` — including session loads. Without this call, loading a saved session with `transposeOffset: 3` would restore the state correctly but leave the `#transpose-display` element showing `0`.

## What Does NOT Change

- `data/chords.json`, `data/scales.json` — no edits
- Instrument renderers — no edits (they use `state.chords` which is already transposed)
- `js/chords.js` — no edits
- `css/style.css` gets the new transpose bar block appended, **plus** `.transpose-bar` added to the existing print `display: none` rule. The first print `@media` block contains:
  ```css
  .bottom-bar, .modal-overlay, .chord-add { display: none !important; }
  ```
  Change it to:
  ```css
  .bottom-bar, .modal-overlay, .chord-add, .transpose-bar { display: none !important; }
  ```

## Notes

- The `−` button label is the Unicode minus sign U+2212, not a hyphen-minus. Copy from this spec carefully.
- `transposeOffset` is an unbounded accumulator (no clamping). Pressing `+` twelve times correctly shows `+12` and the chords are back where they started.
- The `−` in the display (for negative values) comes from `${offset}` which produces the standard minus sign `-`.

## Commit

```bash
git add index.html css/style.css js/transpose.js js/app.js
git commit -m "feat: transpose all chords ±1 semitone with offset display"
```
