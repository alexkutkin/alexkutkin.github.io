# Living dot in site header

The existing brand link on all localized pages includes a single decorative SVG dot.

## Behavior

- The dot is a solid accent-colored circle at rest. No extra controls or keyboard stops are introduced.
- While motion is permitted and the page is visible, it briefly peeks left or right after an idle delay of 15–25 seconds.
- Hovering the brand link or focusing it by keyboard reveals an eye. Leaving or blurring causes a short glance and restores the resting circle.
- With `prefers-reduced-motion: reduce`, the dot stays still, including during hover and focus.
- The standalone `/favicon.svg` is always static and contains a matching eye.

## Chromium checks

Build and run `node scripts/verify.mjs --suite site --port 4321` as documented in the parent skill. On `/en/`, `/ru/`, and one article page:

1. Locate `a.brand [data-living-dot]` exactly once; confirm a static, circular resting state.
2. Hover `a.brand` and inspect `data-state="look"`; verify the eye is visible.
3. Move the pointer away; wait at least 600 ms; verify the resting state and hidden eye.
4. Focus the brand link with the keyboard; repeat the eye appearance and reset on blur.
5. Create a fresh Chromium context with `reducedMotion: "reduce"`; confirm it remains at rest after hover and focus.
6. Load `/favicon.svg`, check HTTP 200 and SVG content, and assert that it contains no animation or scripting.
7. Inspect both color schemes, keyboard focus, narrow viewport and browser console.

Note: the idle interval is deliberately randomized and should not be verified by fixed wall-clock assumptions. Use bounded observation or controlled clocks without altering production code.
