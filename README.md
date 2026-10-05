# ShadowCaster

A living browser garden controlled by your hands. Choose **finger gestures** for ordinary webcam play, or **shadow play** for projected silhouettes. Rain grows plants, harvesting earns essence, and five biomes unlock as your garden develops.

## Run locally

Use Node.js 22.12+ or a current LTS version supported by Vite 8.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Camera access needs **localhost or HTTPS**; opening `index.html` directly or using an insecure LAN address will not work. Allow camera permission when prompted. A keyboard and webcam are enough for direct gesture play. Headphones help with the spatial sound effects.

```sh
npm run build
npm run preview
```

The built site is in `dist/`. Serve it at the origin root so that the local `/vision`, `/fonts`, and `/opencv.js` assets resolve. No backend, API keys, or external inference service are needed. The hand model and both WASM variants are included, making the first finger-mode load roughly 20 MB before browser caching; shadow mode loads the existing 10 MB OpenCV bundle only when selected.

## Two ways to play

### Finger gestures (default)

Face your webcam in even light, with your palm facing the camera. Keep **one complete hand** in frame, including fingertips and wrist. The preview mirrors your camera, draws all 21 tracked landmarks, and shows when a pose has settled. A plain background helps; a wall projection or special light source is unnecessary.

### Shadow play

Point your camera at a plain, light wall. Put a lamp behind your hand so the wall receives a sharp silhouette. Capture the wall **without your hand**, then introduce the shadow and detect its threshold. Spread your fingers to check recognition. Keep the shadow away from the left, right, and top frame edges. An entering forearm at the bottom is trimmed when the silhouette has a detectable wrist narrowing. Recalibrate if the camera or light moves.

Shadow recognition is a silhouette heuristic: it cannot identify finger anatomy as precisely as the landmark mode. Blurred shadows, overlapping fingers, and uneven light can produce ambiguous poses. Use the live mask overlay and shadow sensitivity setting to diagnose this.

| Spell | Direct fingers | Shadow silhouette | Effect |
| --- | --- | --- | --- |
| Rain | Open palm, fingers extended | Five fingers spread | Rain waters plants and replenishes seeds |
| Impact | Closed fist | Compact fist | A shockwave damages nearby plants |
| Harvest | Index and middle extended | Narrow two-finger V | Harvest the nearest ready bloom for essence |
| Summon | Index and pinky extended; middle and ring folded | Wide two-finger V | Invite a garden creature |
| Lightning | Index extended; other fingers folded | Long pointing silhouette | Strike at your hand's horizontal position |

Hold each pose briefly (roughly 200 ms). A confirmed pose casts **once**. Lower your hand for about a third of a second, then raise the same pose to cast again. You can also change directly to another spell. Finger-mode aiming uses the mirrored index fingertip; shadow aiming uses the silhouette center. Impact and harvesting also follow that target.

**Explore without a camera** uses the same garden and spell effects. Click the five spell buttons or press **1–5**. The interface clearly labels this as Explore mode. Keyboard spell shortcuts are inactive in camera modes.

## Controls and progression

- **Esc / pause:** freeze the garden and audio. Resume, recalibrate, switch between finger and shadow control, or return to the title.
- **World / book / trophy:** choose a biome, inspect discovered seeds, or view achievements. These panels pause play.
- **Settings:** volume, particle density, reduced motion and flashes, and shadow sensitivity. Sound can also be muted from the HUD.
- **Camera preview:** collapse it with the minus button; inference continues.
- **Fullscreen:** toggle from the HUD if supported by the browser.
- **Discovery goal:** harvest flowering plants for essence and spend it to unlock the next biome. Calling rain reliably creates a seed when there is room, with a short cooldown.

Progress, unlocks, discoveries, and preferences save in this browser's localStorage. **Continue Garden restores progression**, while plants and creatures start a new session. Switching input or recalibrating within a session preserves its existing plants. A new garden resets progression while retaining current volume, motion, and particle settings.

## Presentation

The Canvas scene includes layered forest ridges, a moon/sun halo with orbit markings, stars, drifting mist, a reflective pool, grass, and fireflies. Each biome has its own sky palette and silhouettes. Procedural L-system plants retain growth, seasonal colors, and wind sway. Spells add spatial rings, floating rewards, summon sparks, an aligned lightning bolt, impact shake, and weather particles.

Web Audio synthesizes continuous wind and rain, overlapping ambient chords, spatially panned spell sounds, reverb, and a compressor. There are no external audio files. Reduced-motion settings suppress shake and screen flashes and stop environmental drift. The interface uses local fonts, visible keyboard focus, a responsive gesture guide, and actionable camera errors.

## Vision and lifecycle

```text
Webcam video
  ├─ Finger mode → MediaPipe Hand Landmarker → world-space joint geometry
  └─ Shadow mode → grayscale / blur → background darkening → threshold
                  → morphology → contour / hull / valley geometry
                              ↓
                  pose confirmation + loss timeout
                              ↓
                  one cast per confirmed pose change
                              ↓
                  garden simulation → Canvas + Web Audio
```

Finger mode uses MediaPipe Tasks Vision **0.10.32**, the bundled Hand Landmarker float16 v1 model, and local WASM. GPU initialization falls back to CPU when unavailable. Four-finger joint extension/folding separates the five spells; unsupported, tiny, clipped, or low-score hands are neutral. World-space landmarks avoid depending on screen rotation or image aspect ratio.

Shadow mode uses the existing OpenCV.js bundle, positive background darkening rather than absolute difference, Otsu thresholding on that same difference image, scale-relative defect depth and valley angles, contour size/border rejection, and explicit Mat cleanup. Both modes require a confirmation dwell and release stale gestures when tracking or camera frames disappear.

Simulation and rendering have guarded start methods. World and creature event subscriptions are disposed on quit. Recalibration resumes the same world, and hidden tabs pause it. Renderer delta times and device pixel ratio are capped to avoid large catch-up steps and excessive resolution.

All camera frames and inference stay in the browser. Camera images are not uploaded or saved. Camera tracks are stopped on quit; model and OpenCV resources are cleaned up. Fonts and vision assets are self-hosted, so gameplay makes no requests to a font CDN or model service.

## Validation

```sh
npm test
npm run test:browser
npm run build
```

Node tests cover all five finger poses under mirroring/rotation/scaling, invalid hands, gesture confirmation and release, frozen camera frames, silhouette V separation, pause behavior, resize positioning, and listener disposal.

Playwright tests run the actual local MediaPipe and OpenCV engines with a synthetic camera. They check both setup flows, mode changes, recalibration, camera denial, resource release, restart behavior, mobile controls, shadow fixtures (including wrist trimming), synthesized audio samples, muting, and pause/resume. Windows uses installed Edge. On other platforms, run `npx playwright install chromium` first, or set `PLAYWRIGHT_CHANNEL` to an installed supported browser.

These automated checks validate the engines and control flow; they do **not** replace trying both modes with a physical webcam and varied hands/lighting. No physical webcam recognition accuracy benchmark has been measured.

## Source map

| Directory | Responsibility |
| --- | --- |
| `src/cv` | Camera capture, landmark and silhouette recognition, preview and calibration |
| `src/game` | Garden, growth, weather, creatures, progression and combos |
| `src/render` | Canvas environment, entities, particles and spell effects |
| `src/audio` | Procedural audio graph and soundscape |
| `src/ui` | Menus, setup, tutorial and HUD |
| `public/vision` | Pinned local model and WASM assets |
| `tests` | Unit and browser regressions |

See [THIRD_PARTY.md](THIRD_PARTY.md) for dependency and asset provenance.
