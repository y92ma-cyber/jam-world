# Transpose Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a KEY row between the chord bar and meta-bar with `−` / `+` buttons that shift all chord names ±1 semitone in place, showing a cumulative offset counter.

**Architecture:** New `js/transpose.js` owns all transposition logic and DOM wiring. It exports `initTranspose()` (called once from `DOMContentLoaded`) and `updateDisplay()` (called from `render()` so the counter stays in sync after session loads). State adds `transposeOffset: 0` to `DEFAULT_SESSION`. The chromatic transposition algorithm always outputs flat spellings for black keys.

**Tech Stack:** Vanilla JS ES modules, no build step. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-16-transpose-design.md`

---

## Task 1: HTML + CSS for the transpose bar

**Files:**
- Modify: `index.html` (between `.chord-bar` and `.meta-bar`, line 24)
- Modify: `css/style.css` (append transpose block at end; update print rule at line 341)

Read both files before making changes.

- [ ] **Step 1: Add the transpose bar HTML to `index.html`**

In `index.html`, find:
```html
  <div class="meta-bar">
```
Insert the following **before** that line:
```html
  <div class="transpose-bar">
    <span class="transpose-label">Key</span>
    <button class="transpose-btn" id="btn-transpose-down" aria-label="Transpose down">−</button>
    <span class="transpose-display" id="transpose-display">0</span>
    <button class="transpose-btn" id="btn-transpose-up" aria-label="Transpose up">+</button>
  </div>
```
**Important:** The `−` in the down button is Unicode minus sign U+2212, not a hyphen. Copy it from this spec exactly.

- [ ] **Step 2: Add transpose CSS to `css/style.css`**

Append the following block at the very end of `css/style.css`:

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

- [ ] **Step 3: Update the print rule in `css/style.css`**

Find line 341 in `css/style.css`:
```css
  .bottom-bar, .modal-overlay, .chord-add { display: none !important; }
```
Change it to:
```css
  .bottom-bar, .modal-overlay, .chord-add, .transpose-bar { display: none !important; }
```

- [ ] **Step 4: Verify in browser**

Open the app (e.g. `python3 -m http.server 8080` in project root, then `http://localhost:8080`).

Expected:
- A new row appears between the chord pills and the style/BPM controls
- Left side shows "KEY" label; center shows "0" (dimmed); two buttons `−` and `+` flank it
- Buttons are square (no rounded corners)
- Clicking the buttons does nothing yet (JS not wired)

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: transpose bar HTML and CSS"
```

---

## Task 2: Create `js/transpose.js`

**Files:**
- Create: `js/transpose.js`

No existing file to read. Create from scratch per the spec.

- [ ] **Step 1: Create `js/transpose.js` with full implementation**

```js
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
  // Note: setState calls render() which calls updateDisplay() — no double-call needed
}

export function initTranspose() {
  document.getElementById('btn-transpose-down').onclick = () => handleTranspose(-1);
  document.getElementById('btn-transpose-up').onclick   = () => handleTranspose(+1);
  updateDisplay(state.transposeOffset ?? 0);
}
```

**Key details:**
- `updateDisplay` is exported because `app.js`'s `render()` will call it to keep the display in sync after session loads and direct `render()` calls (e.g. `handleLoad` calls `render()` directly, not via `setState`)
- `transposeOffset` uses `?? 0` everywhere to handle old saved sessions that don't have this field
- The null guard `if (!el) return` is intentional and not in the spec — keep it; it prevents crashes if `updateDisplay` is ever called before the DOM is ready
- `handleTranspose` does NOT call `updateDisplay` directly — `setState` → `render()` → `updateDisplay` handles it. The spec's `handleTranspose` code block contains a redundant explicit `updateDisplay` call that this plan has removed — the plan's version supersedes the spec's version here.
- On initial page load, `updateDisplay` is called twice in sequence: once from `initTranspose()` and once from the subsequent `render()` call. This is intentional and idempotent.

- [ ] **Step 2: Verify file exists and has no syntax errors**

```bash
node --input-type=module < /Users/yuanpeima/Code/jam_world/js/transpose.js 2>&1 | head -5
```
Expected: An error like `Cannot find module './app.js'` (module resolution fails in Node without a server) but **NOT** a syntax error. If you see `SyntaxError`, fix it before proceeding.

- [ ] **Step 3: Commit**

```bash
git add js/transpose.js
git commit -m "feat: transpose.js with chromatic chord transposition"
```

---

## Task 3: Wire `js/transpose.js` into `js/app.js`

**Files:**
- Modify: `js/app.js`

Read `js/app.js` first. Key locations:
- Line 6–12: `DEFAULT_SESSION` object — add `transposeOffset: 0` here
- Line 21–27: `render()` function — add `updateDisplay` call here
- Line 108–112: `DOMContentLoaded` handler — add `initTranspose()` call here
- Lines 1–4: import block — add the new import here

- [ ] **Step 1: Add `transposeOffset: 0` to `DEFAULT_SESSION`**

Find:
```js
const DEFAULT_SESSION = {
  name: 'New Session',
  chords: ['Am', 'F', 'C', 'G'],
  style: 'funk',
  bpm: 92,
  timeSignature: '4/4',
};
```
Change to:
```js
const DEFAULT_SESSION = {
  name: 'New Session',
  chords: ['Am', 'F', 'C', 'G'],
  style: 'funk',
  bpm: 92,
  timeSignature: '4/4',
  transposeOffset: 0,
};
```

- [ ] **Step 2: Add import at the top of `app.js`**

Find:
```js
import { handlePrint } from './print.js';
```
Change to:
```js
import { handlePrint } from './print.js';
import { initTranspose, updateDisplay } from './transpose.js';
```

- [ ] **Step 3: Add `updateDisplay` call inside `render()`**

Find:
```js
function render() {
  document.getElementById('session-name').textContent = state.name;
  document.getElementById('style-select').value = state.style;
  document.getElementById('bpm-input').value = state.bpm;
  initChords();
  initTabs();
}
```
Change to:
```js
function render() {
  document.getElementById('session-name').textContent = state.name;
  document.getElementById('style-select').value = state.style;
  document.getElementById('bpm-input').value = state.bpm;
  initChords();
  initTabs();
  updateDisplay(state.transposeOffset ?? 0);
}
```

**Why:** `render()` is called both from `setState()` and directly (e.g. `handleLoad` calls `Object.assign(state, session); render()` directly). Adding `updateDisplay` here ensures the counter is correct in all cases — button presses, session loads, and new sessions.

- [ ] **Step 4: Add `initTranspose()` call in `DOMContentLoaded`**

Find:
```js
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  document.getElementById('btn-print').onclick = () => handlePrint(state);
  render();
});
```
Change to:
```js
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initTranspose();
  document.getElementById('btn-print').onclick = () => handlePrint(state);
  render();
});
```

- [ ] **Step 5: Verify in browser — button behavior**

Open `http://localhost:8080`.

1. Click `+` once → all chord names shift up 1 semitone (e.g. Am→Bm, F→F#, C→C#, G→G#... wait, actually Am→Bbm, F→F#, C→Db, G→Ab — check the exact output)
   - Correct expected: Am→Bbm, F→Gb, C→Db, G→Ab (all black keys output as flats)
   - Counter shows `+1` in red accent color
2. Click `−` once → chords shift back, counter shows `0` (dimmed)
3. Click `−` twice → counter shows `−2`
4. Start a new session (btn-new) → counter resets to `0` (dimmed)

- [ ] **Step 6: Verify in browser — session save/load**

1. Click `+` three times → chords show `+3` offset
2. Save the session
3. Click `−` three times to return to original chords
4. Load the saved session → chords should restore to the transposed state AND the counter should show `+3`

- [ ] **Step 7: Commit**

```bash
git add js/app.js
git commit -m "feat: wire transpose into app state and render cycle"
```

---

## Task 4: End-to-end verification

**Files:** None (read-only verification)

This task has no code changes. Its purpose is to systematically verify the feature works across all edge cases before declaring done.

- [ ] **Step 1: Verify flat root transposition**

In the app, clear all chords and add: `Bb`, `Eb`, `Ab`, `Db`, `Gb`

Click `+` once. Expected output:
- `Bb` → `B`
- `Eb` → `E`
- `Ab` → `A`
- `Db` → `D`
- `Gb` → `G`

Click `−` once. All should return to flats.

- [ ] **Step 2: Verify complex chord suffixes are preserved**

Start fresh (New Jam) to reset offset to 0 first.

Add chord `C7b9`. Click `+` twice (offset is now `+2`). Expected: `D7b9` (root shifts, suffix unchanged).

Start fresh again (New Jam). Add chord `Bbmaj7`. Click `+` once (offset `+1`). Expected: `Bmaj7`.

Start fresh again (New Jam). Add chord `Dm7b5`. Click `−` once (offset `−1`). Expected: `Dbm7b5`.

- [ ] **Step 3: Verify instrument tabs update**

With `Am F C G` and offset `+1`, click each instrument tab:
- Guitar → voicings shown for `Bbm`, `Gb`, `Db`, `Ab` (or closest fallbacks)
- Keys → piano highlights for `Bbm`, `Gb`, `Db`, `Ab`
- Scale → scale suggestions for current active chord

- [ ] **Step 4: Verify unrecognized roots are left unchanged**

Add chord `N.C.` (no chord). Click `+`. Expected: `N.C.` unchanged (no root match).

- [ ] **Step 5: Commit**

No code changes — this step is verification only. If any issues were found and fixed in earlier steps, commit those fixes now:

```bash
git add -p   # review any outstanding changes
git commit -m "fix: transpose edge cases from end-to-end verification"
```

If no issues were found, skip the commit.

---

## Final Commit

```bash
git add index.html css/style.css js/transpose.js js/app.js
git log --oneline -5
```

Verify the last 3–4 commits cover all four tasks. Then push:

```bash
git push origin main
```
