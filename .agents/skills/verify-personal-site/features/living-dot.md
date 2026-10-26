# Living dot in site header

The existing brand link on all localized pages includes a single decorative SVG dot.

## Behavior

- The dot shows an open eye on load — nobody has to hover it to see the face. No extra controls or keyboard stops are introduced.
- About 1.8 seconds after load the eye gives one greeting glance left or right, once per page load, then returns to the open eye.
- While motion is permitted and the page is visible, the eye blinks every 3.5–6.5 seconds — roughly 11 blinks per minute, close to a resting human rate — and about one blink in eight stops half-closed for 170 ms instead of closing fully. A double blink follows about one blink in four.
- Every 20–40 seconds the eye glances left or right for under a second, at the pace of idle fidgets in animated characters rather than something the reader must track.
- Hovering the brand link or focusing it by keyboard makes it look at the reader, then shyly glance left; leaving or blurring glances right and returns to the open idle eye.
- With `prefers-reduced-motion: reduce`, the eye stays open and still, including during hover and focus.
- The standalone `/favicon.svg` is always static and contains a matching eye.

## Accessibility stance

The dot is decorative: it is `aria-hidden="true"` and carries no meaning the reader needs. WCAG 2.2.2 (Pause, Stop, Hide) targets moving or blinking content that starts automatically and lasts more than five seconds; a 70–110 ms blink and a sub-second glance do not qualify as a continuous distraction, and there is no reading task behind the dot to interrupt. WCAG 2.3.1 (Three Flashes) does not apply — nothing flashes near three times per second. WCAG 2.3.3 and W3C G186/G191 are still honoured by keeping the whole animation behind `prefers-reduced-motion: reduce`, which renders a static open eye. Blink and glance timings sit inside observed human ranges: Abusharha et al. 2017 measured resting blink rates of roughly 11–20 per minute, Nyström et al. 2024 measured alert-blink kinematics of about 63 ms closing and 138 ms opening, and the 70 ms transition here follows that shape.

## Chromium checks

Build and run `node scripts/verify.mjs --suite site --port 4321` as documented in the parent skill. On `/en/`, `/ru/`, and one article page:

1. Locate `a.brand [data-living-dot]` exactly once; confirm the eye and pupil are visible with no interaction (`data-state="look"`).
2. Within the first three seconds of a fresh load, observe one greeting glance (`data-state="left"` or `"right"`) that returns to `"look"`; a reload must not repeat it more than once.
3. Observe for up to 7 seconds: `data-blink` appears and clears at least once, and the eye is open again afterwards. The rare `data-blink="half"` variant (eye `scaleY(0.45)`, pupil `scale(0.75)`) can be checked by setting the attribute directly.
4. Hover `a.brand`; inspect `data-state="look"`, then `data-state="left"`. Move the pointer away; expect `data-state="right"`, then the open idle eye after ~600 ms — it must not fall back to a blank circle.
5. Focus the brand link with the keyboard; repeat the eye appearance and the return to idle on blur.
6. Create a fresh Chromium context with `reducedMotion: "reduce"`; confirm the eye stays open, still and never blinks during an eight-second observation, including after hover and focus.
7. Load `/favicon.svg`, check HTTP 200 and SVG content, and assert that it contains no animation or scripting.
8. Inspect both color schemes, keyboard focus, narrow viewport and browser console.

Long idle glances occur every 20–40 seconds and are impractical to wait for in every run; check them once per change that touches the timer, with a controlled clock or a bounded observation.

Note: idle timings are deliberately randomized and should not be verified by fixed wall-clock assumptions. Use bounded observation or controlled clocks without altering production code.
