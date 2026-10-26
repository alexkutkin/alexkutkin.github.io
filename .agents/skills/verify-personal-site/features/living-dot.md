# Living dot in site header

The existing brand link on all localized pages includes a single decorative SVG dot.

## Behavior

- The dot shows an open eye on load — nobody has to hover it to see the face. No extra controls or keyboard stops are introduced.
- The eye has three gaze states: `name` rests toward the author name (the pupil sits right of the eye centre), `reader` centres the pupil for eye contact, and `away` is a shy down-left glance.
- About 1.8 seconds after load the eye looks at the reader (`reader`) for 700 ms, once per page load, then returns to `name`.
- While motion is permitted and the page is visible, the eye blinks every 3.5–6.5 seconds — roughly 11 blinks per minute, close to a resting human rate — and about one blink in eight stops half-closed for 170 ms instead of closing fully. A double blink follows about one blink in four. The eye squashes slightly when it closes and settles with a small overshoot when it opens.
- Every 2–4 minutes a slower sequence runs: two half-blinks followed by a roughly 450 ms narrowing, 1.3 seconds in total. Normal blinks pause for its duration; this is the closest thing to the relaxed half-lidded look.
- Every 20–40 seconds the eye glances at the reader or away for 900 ms, at the pace of idle fidgets in animated characters rather than something the reader must track.
- Hovering the brand link or focusing it by keyboard plays one shy cycle: `name` → `reader` at ~550 ms → `away` at ~1150 ms → `reader` peek at ~2050 ms → `away` at ~2450 ms, which it holds while the pointer or focus remains. Leaving or blurring returns to `name` immediately and resumes blinking after 500 ms.
- With `prefers-reduced-motion: reduce`, the eye stays open, still and at `name`, including during hover and focus.
- The standalone `/favicon.svg` is always static and contains a matching eye.

## Gaze geometry

The dot renders at 16 px, so the visible eye is 8 px and the pupil 3.3 px. Measured in Chromium: in `name` the pupil centre sits 1.25 px right of the eye centre, in `reader` it is exactly centred, and in `away` it is 1.75 px left and 1 px down — all inside the eye. Earlier `left`/`right` state names were misleading: the old `left` value centred the pupil (eye contact) and there was no true leftward gaze. Keep new values inside ±2.35 px of the eye centre or the pupil clips the eye edge.

## Accessibility stance

The dot is decorative: it is `aria-hidden="true"` and carries no meaning the reader needs. WCAG 2.2.2 (Pause, Stop, Hide) targets moving or blinking content that starts automatically and lasts more than five seconds; the repeating motion here is a blink that closes in 70 ms and holds for 110–170 ms every 3.5–6.5 seconds plus a 1.3-second slow blink every 2–4 minutes, not a continuous moving object and not information the reader must follow. WCAG 2.3.1 (Three Flashes) does not apply — nothing flashes near three times per second. WCAG 2.3.3 and W3C G186/G191 are honoured by keeping the whole animation behind `prefers-reduced-motion: reduce`, which renders a static open eye. If the dot ever becomes informative or gains longer looping motion, add an explicit pause/stop control for 2.2.2 instead of relying on reduced motion alone. Blink and glance timings sit inside observed human ranges: Abusharha et al. 2017 measured resting blink rates of roughly 11–20 per minute, Nyström et al. 2024 measured alert-blink kinematics of about 63 ms closing and 138 ms opening, and the 70 ms transition here follows that shape.

## Chromium checks

Build and run `node scripts/verify.mjs --suite site --port 4321` as documented in the parent skill. On `/en/`, `/ru/`, and one article page:

1. Locate `a.brand [data-living-dot]` exactly once; confirm the eye and pupil are visible with no interaction and `data-state="name"`.
2. Within the first three seconds of a fresh load, observe `data-state="reader"` for about 700 ms, then a return to `"name"`; a reload must not repeat the greeting more than once.
3. Observe for up to 7 seconds: `data-blink` appears and clears at least once, and the eye is open again afterwards. A full blink computes to eye `scale(1.06, 0.04)` and pupil `scale(0)`; `data-blink="half"` computes to eye `scale(1.02, 0.45)` and pupil `scale(0.75)`. On removal the eye should briefly overshoot past `scale(1)` before settling (follow-through).
4. Hover `a.brand`; expect `name` → `reader` at ~550 ms → `away` at ~1150 ms → `reader` at ~2050 ms → `away` at ~2450 ms, held while hovering. Move the pointer away; expect `name` immediately and blinking resumed after ~500 ms — the eye must not stay closed or half-closed.
5. Focus the brand link with the keyboard; repeat the shy cycle and the return to `name` on blur.
6. Create a fresh Chromium context with `reducedMotion: "reduce"`; confirm the eye stays open, still and at `name` during an eight-second observation, including after hover and focus.
7. Check the slow blink once per change that touches the timer. Either set `data-slow-blink` directly and verify the 1.3 s sequence, or install Playwright's clock, make `Math.random()` deterministic, fast-forward 180–240 s and observe `data-slow-blink` appear and clear after 1.4 s. Normal `data-blink` must not stack on top of it.
8. Load `/favicon.svg`, check HTTP 200 and SVG content, and assert that it contains no animation or scripting.
9. Inspect both color schemes, keyboard focus, narrow viewport and browser console.

Long idle glances occur every 20–40 seconds and are impractical to wait for in every run; check them once per change that touches the timer, with a controlled clock or a bounded observation.

Note: idle timings are deliberately randomized and should not be verified by fixed wall-clock assumptions. Use bounded observation or controlled clocks without altering production code.
