# Phase 7: Testimonials WebM fallback

Date: 2026-10-28

Scope: add the validated WebM fallback only for the testimonials film while keeping the existing MP4/H.264 source as the primary source for browsers that can decode it. No hero changes, no Story changes, no Lenis changes, no unrelated component refactors.

## Verified asset

The exact tested asset is the Cloudinary WebM rendition that Phase 6 validated for the testimonials film:

- Desktop: `https://res.cloudinary.com/z8nlnc6b/video/upload/f_webm,q_auto/v1792900563/Burger_layers_assemble_together_20261025085531.webm`
- Mobile: `https://res.cloudinary.com/z8nlnc6b/video/upload/w_720,f_webm,q_auto/v1792900563/Burger_layers_assemble_together_20261025085531.webm`

This is the same Cloudinary asset family as the existing MP4:

- Desktop MP4: `https://res.cloudinary.com/z8nlnc6b/video/upload/v1792900563/Burger_layers_assemble_together_20261025085531.mp4`
- Mobile MP4: `https://res.cloudinary.com/z8nlnc6b/video/upload/w_720,q_auto/v1792900563/Burger_layers_assemble_together_20261025085531.mp4`

The Phase 6 diagnostics validated the WebM source in LT Browser `HeadlessChrome/107.0.5304.110`: it loaded metadata, played, and seeked successfully with `duration: 8.003`, `readyState: 4`, and `seeked` firing without errors.

## Source-selection rule

The implemented source order is:

- MP4/H.264 first
- WebM/VP9 second as the fallback

This preserves the current behavior for browsers with H.264 support while allowing verified VP9 users to continue playback in LT Browser.

## Implementation notes

The testimonials component now uses nested `<source>` elements with the correct MIME types:

- `video/mp4; codecs=avc1`
- `video/webm; codecs=vp9`

The MP4 remains the primary source as required, and the WebM fallback is only used when the browser cannot decode the first source.

The existing layout, aspect ratio, poster, timing, animation, visibility behavior, and playback trigger were preserved.

A source error handler logs a useful warning with the selected source and media state, so a broken source cannot fail silently without diagnostics.

## Validation performed

- TypeScript check: passed (`npm run lint`)
- Production build: passed (`npm run build`)
- Production preview: running successfully at `http://localhost:4173/` (`HTTP/1.1 200 OK`)
- Media endpoint checks: both MP4 and WebM URLs returned `200 OK` and the Cloudinary response headers confirmed:
  - MP4: `Content-Type: video/mp4;codecs=avc1`
  - WebM: `Content-Type: video/webm;codecs=vp9`

## Environment limitations

This sandbox did not include the installed LT Browser UI or a Chrome 156 automation session, so direct UI-level playback verification in those exact environments was not possible from within this runtime.

The fallback selection was therefore based on the verified Phase 6 evidence and the current cloud-media headers. The exact asset and codec declarations were not invented or substituted; they were taken from the tested source already validated in the prior diagnostics pass.

## Result

The testimonials film now has a validated WebM fallback that matches the tested LT Browser VP9 rendition while preserving the existing MP4/H.264 fallback path and all current section behavior.
