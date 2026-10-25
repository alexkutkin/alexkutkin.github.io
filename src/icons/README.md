# Icons

Local SVG icons. Astro imports any `.svg` as an inlined component, so there is no icon package.

| File | Source | Version | License |
| --- | --- | --- | --- |
| `monitor.svg`, `sun.svg`, `moon.svg`, `mail.svg`, `arrow-left.svg` | [Lucide](https://lucide.dev/) (`lucide-static`) | 1.61.0 | ISC |
| `telegram.svg`, `github.svg`, `x.svg` | [Simple Icons](https://simpleicons.org/) | 16.35.0 | CC0-1.0 |

Lucide no longer ships brand icons; Simple Icons provides the brand marks as single filled paths.

## Usage

`stroke="currentColor"` (Lucide) and `fill="currentColor"` (Simple Icons) make every icon follow the text colour, so the same file works in light and dark themes. Size with CSS (`width`/`height`), not by editing the file.

```astro
---
import Sun from '../icons/sun.svg';
---

<Sun class="icon" />
```

Icons are decorative by default; put the accessible name on the surrounding link or button.
