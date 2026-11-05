# Fix: Second-Section (Our Story) Missing Ending Frames

## Root Cause Analysis
The second section animation (`WelcomeStory.jsx`) plays a scroll-controlled sequence of JPEG frames located in `/public/video-frames-second/`.

- The assets directory `/public/video-frames-second/` was updated to contain **70 frames**, sequentially named from `ezgif-frame-001.jpg` to `ezgif-frame-070.jpg` (indices `0` to `69` in zero-based terms).
- In `src/components/sections/WelcomeStory.jsx`, `FRAME_COUNT` was hardcoded to `56`:
  ```javascript
  const FRAME_COUNT = 56;
  ```
- The frame index mapping is driven by scroll progress:
  ```javascript
  showFrame(progress * (FRAME_COUNT - 1));
  ```
  With `FRAME_COUNT = 56`, `progress * 55` only requested and rendered frame indices `0` through `55` (corresponding to files `ezgif-frame-001.jpg` through `ezgif-frame-056.jpg`).
- As a direct result, the final 14 frames (`ezgif-frame-057.jpg` through `ezgif-frame-070.jpg`) were never calculated, requested, preloaded, or displayed during scrolling.

## Fix
In `src/components/sections/WelcomeStory.jsx`:
1. Updated `FRAME_COUNT` from `56` to `70`:
   ```javascript
   const FRAME_COUNT = 70;
   /** 70 × 2 vh = 140 vh of pinned travel (the track is 240 vh tall). */
   const SCROLL_VH_PER_FRAME = 2;
   ```
2. Preserved the animation timing constant `SCROLL_VH_PER_FRAME = 2`. The dynamic track height `${100 + FRAME_COUNT * SCROLL_VH_PER_FRAME}vh` scales naturally to `240vh`, providing 140vh of pinned travel so each frame advances at the identical scroll rate (2vh per frame) as before.
3. Updated the header comment documentation to reflect the 70-frame sequence.

## Validation Results

### 1. Build and Lint Checks
- `npm run lint` (`tsc --noEmit`): **Passed** with 0 errors.
- `npm run build` (`vite build`): **Passed** successfully without errors.

### 2. Live Headless Chrome Test
Executed end-to-end browser validation using Headless Chrome DevTools Protocol (CDP) connected to the production build preview:
- **Forward Scrub Verification (0.0 to 1.0)**:
  - `Progress   0%` -> Active frame: `ezgif-frame-001.jpg`
  - `Progress  10%` -> Active frame: `ezgif-frame-008.jpg`
  - `Progress  25%` -> Active frame: `ezgif-frame-018.jpg`
  - `Progress  50%` -> Active frame: `ezgif-frame-036.jpg`
  - `Progress  70%` -> Active frame: `ezgif-frame-049.jpg`
  - `Progress  80%` -> Active frame: `ezgif-frame-056.jpg`
  - `Progress  85%` -> Active frame: `ezgif-frame-060.jpg`
  - `Progress  90%` -> Active frame: `ezgif-frame-063.jpg`
  - `Progress  95%` -> Active frame: `ezgif-frame-067.jpg`
  - `Progress  98%` -> Active frame: `ezgif-frame-069.jpg`
  - `Progress 100%` -> Active frame: `ezgif-frame-070.jpg` (verified visible and active with `opacity: 1`)
- **End-of-Range Pin Release / Overscroll**:
  - Scrolled beyond pinned travel into subsequent content.
  - Active frame remained pinned at `ezgif-frame-070.jpg` without flickering or resetting.
- **Reverse Scrub Verification (1.0 to 0.0)**:
  - `Reverse 100%` -> Active frame: `ezgif-frame-070.jpg`
  - `Reverse  90%` -> Active frame: `ezgif-frame-063.jpg`
  - `Reverse  75%` -> Active frame: `ezgif-frame-053.jpg`
  - `Reverse  50%` -> Active frame: `ezgif-frame-036.jpg`
  - `Reverse  30%` -> Active frame: `ezgif-frame-022.jpg`
  - `Reverse  10%` -> Active frame: `ezgif-frame-008.jpg`
  - `Reverse   0%` -> Active frame: `ezgif-frame-001.jpg`
- **Responsive Resize**:
  - Emulated mobile viewport (`390x844`, 2x scale).
  - Track height and scroll metrics measured dynamically (`offsetHeight: 2026px`, `viewportHeight: 844px`).
  - Mobile start `0%` displayed `ezgif-frame-001.jpg`.
  - Mobile end `100%` displayed `ezgif-frame-070.jpg`.
