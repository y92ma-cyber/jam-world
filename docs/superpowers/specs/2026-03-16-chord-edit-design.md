# Chord Edit — Design Spec

**Date:** 2026-03-16
**Status:** Approved

## Problem

There is no way to rename an existing chord in a progression. Users can add (＋) and remove (×) chords but not change a chord name once it's been added.

## Solution

Long-press a chord pill (hold for 500ms) to trigger a `prompt()` rename dialog.

## Interaction

- **Press and hold** a chord pill for 500ms → `prompt()` appears pre-filled with the current chord name
- **Confirm** → chord is renamed, tab re-renders
- **Cancel** → no change
- **Release before 500ms** → normal select/deselect behavior, no edit triggered
- A `didEdit` flag prevents the `onclick` handler from firing after a long-press completes

## Implementation

**Only file changed: `js/chords.js`**

Inside `renderPills()`, add pointer event handlers to each pill alongside the existing `onclick`:

```js
let pressTimer = null;
let didEdit = false;

pill.onpointerdown = () => {
  didEdit = false;
  pressTimer = setTimeout(() => {
    didEdit = true;
    const newChord = prompt('Edit chord:', chord);
    if (newChord && newChord.trim()) {
      const chords = [...state.chords];
      chords[i] = newChord.trim();
      setState({ chords });
      renderActiveTab();
    }
  }, 500);
};

pill.onpointerup = pill.onpointerleave = pill.onpointercancel = () => {
  clearTimeout(pressTimer);
};

// Guard onclick to not fire after a long-press edit
const originalOnclick = pill.onclick;
pill.onclick = (e) => {
  if (didEdit) { didEdit = false; return; }
  originalOnclick?.(e);
};
```

Note: the `onclick` is set after the pointer handlers so the guard wraps the existing select behavior.

## Constraints

- No new files
- No HTML or CSS changes
- No dependencies
- Mobile-first: `pointer` events work on touch and mouse
