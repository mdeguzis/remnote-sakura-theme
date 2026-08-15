import * as React from 'react';
import { renderWidget, usePlugin, useRunAsync } from '@remnote/plugin-sdk';

import { buildDebugReport, readOptions } from '../lib/settings.ts';

/**
 * The debug report, as a popup you can actually read and copy from.
 *
 * The first version of this wrote to the developer console, which is the wrong
 * place: RemNote does not surface a console, and asking someone to open one to
 * answer "what is the theme doing" is a dead end.
 *
 * A widget can render its own UI, so the report goes in a scrollable textarea
 * with a copy button. The textarea matters as much as the button: the sandboxed
 * iframe often refuses clipboard access, and a textarea can always be selected
 * and copied by hand.
 */
const STYLES = `
.sd-root {
  --sd-bg: #ffffff;
  --sd-fg: #1c1c1f;
  --sd-muted: #6b6b73;
  --sd-border: #e2e2e6;
  --sd-accent: #c44e7e;
  font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: var(--sd-bg);
  color: var(--sd-fg);
  padding: 14px;
  box-sizing: border-box;
}
@media (prefers-color-scheme: dark) {
  .sd-root {
    --sd-bg: #1e1c20;
    --sd-fg: #eceaee;
    --sd-muted: #a09aa4;
    --sd-border: #3a363c;
    --sd-accent: #f89ac2;
  }
}
.sd-root * { box-sizing: border-box; }
.sd-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.sd-title { font-size: 14px; font-weight: 650; margin: 0; }
.sd-hint { font-size: 11px; color: var(--sd-muted); }
.sd-text {
  width: 100%;
  height: 260px;
  resize: vertical;
  font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--sd-fg);
  background: transparent;
  border: 1px solid var(--sd-border);
  border-radius: 8px;
  padding: 9px;
  white-space: pre;
  overflow: auto;
}
.sd-row { display: flex; gap: 8px; margin-top: 10px; }
.sd-btn {
  font: inherit;
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--sd-border);
  background: transparent;
  color: var(--sd-fg);
  cursor: pointer;
}
.sd-btn--primary { background: var(--sd-accent); border-color: var(--sd-accent); color: #fff; }
.sd-btn:hover { border-color: var(--sd-accent); }
`;

function DebugReport() {
  const plugin = usePlugin();
  const [status, setStatus] = React.useState('');
  const textRef = React.useRef<HTMLTextAreaElement>(null);

  const report = useRunAsync(async () => buildDebugReport(await readOptions(plugin)), []);
  const body = report ?? 'Reading settings...';

  const copy = React.useCallback(async () => {
    // Try the clipboard API, then fall back to selecting the text so the user
    // can copy it themselves. The sandboxed iframe blocks the API often enough
    // that the fallback is the point, not a nicety.
    try {
      await navigator.clipboard.writeText(body);
      setStatus('Copied');
    } catch {
      textRef.current?.select();
      setStatus('Select all is done, press Ctrl+C');
    }
    setTimeout(() => setStatus(''), 2500);
  }, [body]);

  return (
    <div className="sd-root">
      <style>{STYLES}</style>

      <div className="sd-head">
        <h1 className="sd-title">Sakura debug info</h1>
        <span className="sd-hint">{status || 'paste this into a bug report'}</span>
      </div>

      <textarea className="sd-text" ref={textRef} readOnly value={body} spellCheck={false} />

      <div className="sd-row">
        <button type="button" className="sd-btn sd-btn--primary" onClick={() => void copy()}>
          Copy
        </button>
        <button type="button" className="sd-btn" onClick={() => void plugin.widget.closePopup()}>
          Close
        </button>
      </div>
    </div>
  );
}

renderWidget(DebugReport);
