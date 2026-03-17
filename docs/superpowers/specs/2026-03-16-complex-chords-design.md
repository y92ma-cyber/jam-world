# Complex Chord Support — Design Spec

**Date:** 2026-03-16
**Status:** Approved

## Problem

The app only knows 22 hardcoded chords from `data/chords.json`. Any chord not in that list silently fails — guitar shows "No data", keys shows "—", scale shows nothing. Users cannot work with common jazz chords like `Dm7b5`, `Cmaj7#11`, `C7b9`, or `C7#9b13`.

## Solution

Integrate **Tonal.js** (loaded via CDN importmap) as a music theory engine. When a chord isn't in `chords.json`, Tonal derives the correct notes algorithmically. Each instrument tab handles the fallback appropriately.

## Tonal.js Setup

Add to `index.html` `<head>`, before all other tags:

```html
<script type="importmap">
  { "imports": { "@tonaljs/tonal": "https://cdn.jsdelivr.net/npm/@tonaljs/tonal@6/+esm" } }
</script>
```

Any ES module can then `import { Chord, Note, Scale } from '@tonaljs/tonal'`.

**Note:** The importmap `<script>` must appear before any `<script type="module">` in the document.

## Chord Input (`js/chords.js`)

Import `Chord` from Tonal. Also export `showToast` from `js/app.js` and import it in `js/chords.js` (it is already defined there but not exported — add `export` keyword to it).

In **both** `promptAddChord()` **and** the long-press edit handler, after trimming the input, add the same validation block:

```js
import { Chord } from '@tonaljs/tonal';
import { showToast } from './app.js'; // add export keyword to showToast in app.js

// After trimming input (in BOTH promptAddChord and long-press handler):
const parsed = Chord.get(chord);
if (parsed.empty) showToast(`"${chord}" — unrecognized, added anyway`);
```

Do NOT reject the input. Accept it regardless. The toast is just informational.

## Guitar Tab (`js/instruments/guitar.js`)

Import `{ Chord, Note }` from Tonal.

When a chord name is not a key in `chordsData`, call `findClosestDbChord(chordName, chordsData)` which:

1. Calls `Chord.get(chordName)`. If `.empty` is true or `.tonic` is null, show "No voicing available".
2. Gets `tonic` and `quality` from the result.
3. Normalizes tonic: Tonal may return sharps (`A#`) but DB uses flats (`Bb`). Apply:
   ```js
   const SHARP_TO_FLAT = { 'A#':'Bb','D#':'Eb','G#':'Ab','C#':'Db','F#':'Gb' };
   const root = SHARP_TO_FLAT[tonic] || tonic;
   ```
4. Builds a priority candidate list based on quality. **Use the exact Tonal v6 quality strings** as listed below (e.g. `Chord.get('C7').quality === 'Dominant Seventh'`, not `'Dominant'`):

   | Tonal v6 `.quality` | Candidate order |
   |---|---|
   | `'Dominant Seventh'` | `root+'7'`, `root`, `root+'maj7'`, `root+'m'` |
   | `'Major Seventh'` | `root+'maj7'`, `root`, `root+'7'`, `root+'m'` |
   | `'Major'` | `root`, `root+'maj7'`, `root+'7'`, `root+'m'` |
   | `'Minor Seventh'` | `root+'m7'`, `root+'m'`, `root`, `root+'7'` |
   | `'Minor'` | `root+'m'`, `root+'m7'`, `root`, `root+'7'` |
   | `'Half Diminished'` | `root+'m7'`, `root+'m'`, `root` |
   | `'Diminished Seventh'` | `root+'m'`, `root+'m7'`, `root` |
   | `'Diminished'` | `root+'m'`, `root+'m7'`, `root` |
   | `'Augmented'` | `root`, `root+'m'`, `root+'maj7'` |
   | `'Augmented Seventh'` | `root+'7'`, `root`, `root+'m'` |
   | anything else | `root`, `root+'m'`, `root+'7'`, `root+'maj7'` |

5. Returns `{ chord: chordsData[key], fallbackKey: key }` for the first candidate key found in `chordsData`. If no candidate matches, returns `null`.

**Rendering when fallback found:**
- Show fretboard SVG as normal, using the fallback chord's voicing and root note
- Change voicing label from `"Open"` / `"Barre"` to `"${voicing.label} (approx.)"`
- Change chord-card-type text to the original `chordName` (not the fallback key)

**Rendering when fallback not found:**
```html
<div class="chord-card-name">${chordName}</div>
<div class="chord-card-type" style="color:var(--text-dim)">No voicing available</div>
```

## Keys Tab (`js/instruments/keys.js`)

Import `{ Chord }` from Tonal.

When a chord name is not in `chordsData`:

```js
const parsed = Chord.get(chordName);
if (parsed.empty || !parsed.tonic) {
  // show chord name + "Unknown chord"
  return;
}
const notes = parsed.notes;   // e.g. ["C","E","G","Bb","D#","Ab"]
const root  = parsed.tonic;   // e.g. "C"
```

Tonal may return flat spellings (`Bb`, `Eb`, `Ab`, `Db`, `Gb`) while `buildPianoSVG` matches black keys using sharp names (`A#`, `D#`, `G#`, `C#`, `F#`). Normalize before calling:

```js
const ENHARMONIC = { 'Bb':'A#','Eb':'D#','Ab':'G#','Db':'C#','Gb':'F#' };
const normalizedNotes = parsed.notes.map(n => ENHARMONIC[n] || n);
const root = ENHARMONIC[parsed.tonic] || parsed.tonic;
```

Then: `buildPianoSVG(normalizedNotes, root)`.

For the voicing tag on algorithmically-derived chords, use:
```js
function getVoicingTagFromQuality(quality) {
  if (quality && quality.toLowerCase().includes('seventh')) return 'Shell Voicing';
  return 'Close Voicing';
}
```

Show notes joined by `·` as usual. Add a small `(tonal)` indicator in the chord-card-type line to signal it's algorithmically derived, e.g. `"${parsed.aliases[0] || parsed.quality} (tonal)"`.

**Enharmonic note normalization for piano display:**
Tonal may return sharps (`D#`, `A#`) where the piano SVG expects flats. Apply the inverse of `ENHARMONIC` map already in keys.js when matching notes to piano keys:
- The existing `ENHARMONIC` map in keys.js (`{ 'Bb':'A#', ... }`) already normalizes flats → sharps for `BLACK_KEYS` matching, so Tonal's sharp output will match correctly without extra work.

## Scale Tab (`js/instruments/scale.js`)

Import `{ Chord, Scale }` from Tonal.

Change the lookup strategy:

```js
// Current:
const scaleSet = data[progressionKey] || data[activeChord] || data['default'];

// New:
const scaleSet = data[progressionKey] || data[activeChord] || deriveScaleFromChord(activeChord) || data['default'];
```

`deriveScaleFromChord(chordName)` function:

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

  // Tonal altered/exotic scales may return unusual enharmonics (Fb, Cb, B#, E#)
  // not present in ALL_NOTES. Normalize them to their common equivalents.
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
      name: `${tonic} ${scaleName.charAt(0).toUpperCase() + scaleName.slice(1)}`,
      description: descriptions[scaleName] || '',
      notes: normalizedNotes,
      avoid: [],
    }]
  };
}
```

## What Does NOT Change

- `data/chords.json` — no edits needed
- `data/scales.json` — no edits needed
- `js/instruments/bass.js` — root regex already works for any chord name
- `js/instruments/drums.js` — not chord-dependent
- `css/style.css` — no new styles needed
- State shape — no changes

## Commit

```bash
git add index.html js/chords.js js/instruments/guitar.js js/instruments/keys.js js/instruments/scale.js
git commit -m "feat: complex chord support via Tonal.js"
```
