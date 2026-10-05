# Third-party components and assets

- **MediaPipe Tasks Vision 0.10.32:** `@mediapipe/tasks-vision`, published by Google under Apache-2.0 according to its package metadata. The WASM loader and SIMD/non-SIMD binaries in `public/vision` are copied from this exact package's `wasm` directory. [Source](https://github.com/google-ai-edge/mediapipe) · [Web Hand Landmarker documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js).
- **Hand Landmarker model:** Google's published float16, version 1 task bundle, downloaded from [the official model asset](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task). See Google's [Hand Landmarker overview](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) for model information. The original model binary is unmodified. This project makes no ownership claim over it.
- **OpenCV.js:** the project's existing `public/opencv.js` browser bundle. [OpenCV source and license](https://github.com/opencv/opencv). The preexisting bundle is unchanged by the dual-input update.
- **Inter:** local variable font from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/inter), licensed under SIL Open Font License 1.1. Full notice: `public/fonts/inter-OFL.txt`.
- **Outfit:** local variable font from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/outfit), licensed under SIL Open Font License 1.1. Full notice: `public/fonts/outfit-OFL.txt`.
- **Vite** and **Playwright:** development/build and test dependencies. Their versions are recorded in `package-lock.json`, with license information provided by their packages.

The environment illustrations, plant rendering, spell effects, and audio synthesis are drawn or generated in code; no third-party background images, music tracks, or sound-effect recordings were added.
