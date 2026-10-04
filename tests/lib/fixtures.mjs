/**
 * Mock ups of the RemNote screens this theme has to get right.
 *
 * Transcribed from the live DOM, not invented: the PDF route below is the
 * markup from a real PDF document on 2026-10-04, with the class names, the
 * nesting order, the inline styles and the z-indexes left as they appear in
 * the app. That matters more than it sounds. Issue #8 was fixed twice against a
 * guessed structure before the real one showed that the workspace fill is a
 * static, in flow SIBLING of the pages rather than an ancestor of them, which
 * is the single fact the fix depends on.
 *
 * These prove paint order, which is what a theme gets wrong. They cannot prove
 * a selector still matches the app: only opening RemNote does that, and when
 * the markup moves, the transcription here has to be refreshed from it.
 *
 * Each fixture names the rectangles a test can assert on, in the coordinates of
 * a 1280x900 render.
 */

/** Where the layers are expected to be, and not to be, at 1280x900. */
export const VIEWPORT = { width: 1280, height: 900 };

function shell(css, body) {
  return `<!doctype html>
<html lang="en" class="dark"><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%}#main{height:100%}
</style><style>${css}</style></head>
<body class="dark" style="background-color:#181820">${body}</body></html>`;
}

/**
 * A PDF open in the drawing canvas.
 *
 * The page is drawn as a plain block in RemNote's dark mode page colour with no
 * text in it, so that ANY difference inside its rectangle between a petals-off
 * and a petals-on render is artwork that leaked onto the document.
 */
export const pdfRoute = {
  html: (css) =>
    shell(
      css,
      `
<div id="main"><div id="content" class="rn-clr-background-primary" style="height:100%">
 <div class="rn-content-and-right-sidebar" style="height:100%">
  <div class="content__page" style="height:100%;display:flex;flex-direction:column">
   <div id="tab-bar-container" style="background-color:rgb(24,24,24);height:33px"></div>
   <div class="rn-multiple-window-pane rn-pane" style="flex:1;min-height:0;position:relative;overflow:hidden;display:flex;flex-direction:column">
    <div class="rn-pane__top-bar" style="height:44px"></div>
    <div class="rn-pane__body" style="flex:1;min-height:0;overflow:hidden">
     <div style="width:100%;height:100%;position:relative">
      <div class="document-drawing-canvas" style="width:100%;height:100%;display:flex;overflow:hidden;flex-direction:column;position:relative">
       <div style="display:flex;flex:auto;width:100%;height:0;position:relative;flex-direction:column">
        <div class="editor-drawing-canvas" style="overflow:hidden;position:relative;flex:1;width:100%;height:100%">
         <div style="width:100%;height:100%;display:flex;background-color:#232329">
          <div class="drawing-canvas" style="position:relative;overflow:clip;height:100%;width:100%">

           <div class="drawing-canvas-commited-layer" style="pointer-events:none;isolation:isolate;overflow:hidden;position:absolute;inset:0;z-index:10"></div>
           <canvas class="drawing-canvas-pen-layer" style="position:absolute;inset:0;pointer-events:none;z-index:11"></canvas>
           <div class="rn-drawing-canvas-mode" style="isolation:isolate;position:absolute;inset:0;pointer-events:none;z-index:30"></div>

           <div style="width:100%;height:100%;background-color:rgb(60,63,65)">
            <div class="drawing-canvas-bounds-display-container" style="width:0;height:0"></div>
           </div>

           <div class="drawing-canvas-text-highlights" style="position:absolute;top:0;left:0;pointer-events:none;z-index:1;width:100%;height:100%;mix-blend-mode:multiply"></div>
           <div class="rn-drawing-pdf-selected-text-menu" style="position:absolute;top:0;left:0;pointer-events:auto;z-index:103" hidden></div>

           <div class="drawing-canvas-pdf-pages-and-div-targets" style="position:absolute;top:0;left:0;width:100%;height:100%">
            <div class="drawing-canvas-pdf-pages" style="position:absolute;inset:0;pointer-events:none">
             <div class="drawing-pdf-viewer" style="position:absolute;left:0;top:0;width:100%;height:100%">
              <div data-page-number="1" class="rn-drawing-canvas-pdf-page" style="position:absolute;overflow:hidden;left:330px;top:20px;width:612px;height:760px;pointer-events:none;background-color:rgb(35,35,40)"></div>
             </div>
            </div>
           </div>

           <div class="drawing-canvas-fake-scrollbars" style="position:absolute;inset:0;pointer-events:none;z-index:100"></div>
          </div>
         </div>
        </div>
       </div>
      </div>
     </div>
    </div>
   </div>
  </div>
 </div></div>`
    ),
  // The page itself, inset a little so an antialiased edge cannot decide a test.
  page: { left: 340, top: 110, width: 590, height: 730 },
  // Canvas left of the page: workspace, where the petals are supposed to be.
  workspace: { left: 10, top: 110, width: 300, height: 730 },
};

/** An ordinary document, where a petal crossing the text is the whole effect. */
export const documentRoute = {
  html: (css) =>
    shell(
      css,
      `
<div id="main"><div id="content" class="rn-clr-background-primary" style="height:100%">
 <div class="rn-content-and-right-sidebar" style="height:100%;display:flex">
  <div class="rn-sidebar" style="width:240px"></div>
  <div class="content__page" style="flex:1;display:flex;flex-direction:column">
   <div id="tab-bar-container" style="background-color:rgb(24,24,24);height:33px"></div>
   <div class="rn-multiple-window-pane rn-pane" style="flex:1;position:relative">
    <div class="rn-pane__top-bar" style="height:44px"></div>
    <div class="rn-pane__body" style="padding:40px">
     <div class="rn-editor" style="max-width:700px;margin:0 auto">
      <h1 class="rn-doc-title" style="font:600 32px Inter,sans-serif">A document</h1>
      <p class="rn-clr-content-primary" style="font:16px/1.7 Inter,sans-serif">Body text the petals are meant to drift in front of.</p>
     </div>
    </div>
   </div>
  </div>
 </div>
</div></div>`
    ),
  reading: { left: 420, top: 150, width: 680, height: 600 },
};
