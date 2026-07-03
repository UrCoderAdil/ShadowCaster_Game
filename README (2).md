# ShadowCaster 🌑

**Cast shadow puppets at your webcam. Control a tiny virtual garden with your hands.**

A browser-based computer vision toy that turns hand shadows into game input — no
keyboard, no mouse, no gloves, no markers. Point a light at a wall, get your hand
between the light and the wall, and the shapes you make drive a small living
ecosystem on screen.

[Live demo](#) · [Demo GIF](#)

---

## What it does

| Shadow shape | In-game effect |
|---|---|
| Open hand (5 fingers spread) | Calls down rain — a plant on screen grows |
| Closed fist | Scatters particles, knocks over growth |
| Scissors / V-shape | "Cuts" a leaf, triggers a harvest animation |

The whole thing runs **client-side, in the browser, with no backend** — your
webcam feed never leaves your machine.

---

## Why I built it this way

Most "AI hand tracking" demos reach straight for a pretrained landmark model
(MediaPipe Hands) and call it done. I wanted to actually understand and
implement the classical computer vision pipeline underneath, so this project
deliberately uses **shadow silhouettes + geometric shape analysis** instead of
a hand-landmark model:

- It's a harder, noisier signal than a clean RGB hand (lighting-dependent,
  binary mask only, no depth) — which made it a more honest test of CV
  fundamentals: thresholding, contour extraction, convexity analysis.
- It's a more original demo. Hand-tracking-controls-a-game has been built
  hundreds of times with MediaPipe; shadow-puppet input has not.

---

## How it works (pipeline)

```
Webcam feed
   │
   ▼
Luminance threshold  →  binary mask isolating dark (shadow) regions
   │
   ▼
OpenCV.js: findContours  →  largest contour = the "hand" blob
   │
   ▼
Convex hull + convexity defects  →  count of finger-like protrusions
   │            +
   │   aspect ratio / solidity of the blob
   ▼
Shape classifier (rule-based, no ML model)
   │
   ▼
Game event dispatched  →  Canvas 2D particle/growth system reacts
```

**Why rule-based classification instead of a trained model:**
With only 3 target classes and strong geometric distinguishing features
(finger count via convexity defects, blob solidity), a classifier is
overkill and adds a training/data-collection burden with no real accuracy
benefit. Knowing when *not* to reach for ML is part of the point of this
project.

**Two detection loops, intentionally decoupled:**
- CV detection loop runs at ~10fps (deliberately throttled; shadows don't
  move that fast and it leaves headroom on the main thread)
- Render loop runs at 60fps via `requestAnimationFrame`, reading the last
  known shape classification rather than blocking on a new one

This was the main performance lesson of the project — running full contour
detection at 60fps caused visible frame drops; decoupling fixed it.

---

## Tech stack

- **Capture:** `getUserMedia` → hidden `<video>` → offscreen `<canvas>`
- **CV:** [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
  (WASM build) — thresholding, `findContours`, `convexHull`,
  `convexityDefects`
- **Game/render layer:** Canvas 2D, custom lightweight particle system
- **Build:** Vite + vanilla JS (no framework — kept the dependency surface
  small since the interesting work is all in the CV layer)
- **Deploy:** static site (Vercel/Netlify), 100% client-side, no backend, no
  database, no API keys

---

## Known limitations (and why I left them as-is)

- **Lighting-dependent.** Needs a reasonably bright, even light source and a
  plain background to get a clean silhouette. A background-subtraction mode
  (capture an empty-room baseline, diff against it) would make this more
  robust to uneven lighting, and is the natural next iteration — I scoped it
  out to ship a complete, working v1 first rather than a half-finished v2.
- **3 shapes only.** Chosen deliberately — enough to prove the geometric
  classification approach works without turning this into a shape-dataset
  project.
- **Single-player.** Multiplayer (two shadows on one wall, or WebSocket sync
  across two cameras) is a natural extension but adds networking scope that
  isn't the point of this project.

---

## Running it locally

```bash
git clone <repo-url>
cd shadowcaster
npm install
npm run dev
```

Open the printed local URL, allow camera access, point a light at a wall,
and put your hand between the light and the wall.

---

## Build process & decisions log

I built this in six phases rather than diving straight into the game layer,
because the riskiest unknown was whether the CV pipeline would even work
reliably on a normal laptop webcam — so that got tested first.

**Phase 0 — Feasibility spike.**
Before writing any app code, I ran a throwaway script: grab a webcam frame,
threshold it, and visually check the resulting binary mask across five
lighting setups (desk lamp, window light, overhead light, phone flashlight,
dim room). This produced the threshold range used in Phase 1, and a
documented list of conditions where plain thresholding fails — which is
exactly what background-subtraction mode (below) was later built to fix.

**Phase 1 — Capture & mask pipeline.**
Webcam frames are downscaled to ~320×240 before any processing — running
contour detection on full-resolution frames was the first performance
mistake I made and fixed; CV doesn't need HD to find a hand-shaped blob.

**Phase 2 — Contour extraction.**
`cv.findContours` on the mask, filtered by area to discard noise, then the
largest remaining contour is treated as "the hand." Two edge cases are
handled explicitly rather than left to fail silently: zero qualifying
contours (defined as a clean "idle" state, not a frozen UI), and multiple
similarly-sized blobs (v1 just takes the largest; see Roadmap).

**Phase 3 — Shape classification.**
Classification is rule-based, not a trained model:

| Signal | Open hand | Fist | Scissors / V |
|---|---|---|---|
| Finger-like convexity defects | 4–5 | 0–1 | 1–2 |
| Solidity (area / hull area) | ~0.6–0.75 | ~0.9+ | medium |
| Bounding-box aspect ratio | roughly square | roughly square | elongated |

With only 3 target classes and strong geometric signal, a trained classifier
would add a data-collection burden for no real accuracy gain — recognizing
when *not* to reach for ML was a deliberate part of this project, not a
shortcut.

Classification also requires **3 consecutive frames to agree** before a
shape "locks in" and triggers a game event. Without this, single noisy
frames caused visible flicker between shapes — this is temporal smoothing
applied to a per-frame classifier, not a fix bolted on after the fact.

**Phase 4 — Game/render layer.**
Two loops, deliberately decoupled:
- CV detection loop: throttled to ~10fps (shadows don't move fast; this
  also leaves headroom on the main thread)
- Render loop: full 60fps via `requestAnimationFrame`, always reading the
  last *stable* classification rather than blocking on a fresh one

Running full contour detection at 60fps was the second performance mistake
I made (visible frame drops) — decoupling the loops fixed it.

**Phase 5 — Calibration UX.**
Phase 0 showed thresholding is lighting-dependent. Rather than hardcode one
global threshold, the app samples the user's actual shadow brightness on
load and picks a threshold per-session — directly answering the Phase 0
limitation instead of just documenting it.

---

## Testing strategy

A CV pipeline can't be fully unit-tested the way typical app logic can, so
testing here is split across what's deterministic and what isn't:

**Unit tests (deterministic).**
The shape classifier — `classifyShape(features) → 'open_hand' | 'fist' |
'scissors' | 'unknown'` — is pure logic with no camera or DOM dependency, so
it's fully unit-testable. Tests feed it hand-built feature vectors,
including ambiguous middle values that should resolve to `'unknown'` rather
than a confident wrong guess.

**Golden-frame regression tests.**
A small set of real webcam frames (saved as static images, one per shape,
across the lighting conditions from Phase 0) are run through the *actual*
OpenCV.js pipeline in a test harness, asserting the expected classification.
This catches regressions from future threshold tuning without needing a
live camera in CI.

**Manual test matrix.**
Run through deliberately, not just assumed:
- Lighting: bright window / dim lamp / overhead light / phone flashlight
- Distance: hand close to the wall vs far (shadow sharpness changes)
- Background: plain wall vs a wall with existing clutter/shadows
- Skin tone / sleeve coverage — since classification is shape-based, not
  skin-tone-based, this was explicitly verified rather than assumed, which
  also happens to be a quiet accessibility win

**Performance testing.**
Frame-processing time for the CV loop is measured and logged, with an
assertion that it stays under the throttled budget (~100ms for the 10fps
loop). Verified with Chrome DevTools' Performance tab rather than assumed.

**Informal usability testing.**
2–3 people with zero instructions beyond "make a shadow puppet" tried the
app cold. Notably, people instinctively tried a peace-sign / "V" shape more
often than a fist — direct input into the roadmap below.

---

## Roadmap / what I'd build next

**Already identified as valuable, not yet built:**
- Multi-blob tracking — handle two hands / two shadows in frame instead of
  always taking the largest contour
- A 4th shape (peace sign), prompted directly by user testing feedback
- Shareable GIF export of the last ~10 seconds, using `canvas.captureStream`
  + `MediaRecorder` — also solves the "how do I record a demo" problem

**Bigger lifts, considered but out of scope for v1:**
- WebSocket multiplayer: two browsers, two cameras, one shared canvas, where
  one person's rain and another's harvest interact
- Moving the entire OpenCV.js loop into a Web Worker so the main thread
  never touches CV work at all
- Adaptive thresholding with a continuous confidence score instead of a
  binary detected/not-detected signal, so weak detections decay gracefully
  instead of flickering
