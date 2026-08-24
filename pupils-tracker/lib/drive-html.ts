// Point a Drive-hosted lesson page's asset references at the download proxy.
//
// Google Drive has no directories over HTTP — every file is a separate opaque
// id — so the relative paths an interactive lesson page uses ("images/page.png",
// "lesson.mp3") can never resolve on their own, however the page is served.
// Before the board hands the page to its iframe, the references are repointed
// at /api/drive in two passes:
//
//   1. Literal paths written in the markup or in the page's own config block
//      (`pageImage: "images/page.png"`) are rewritten in place, so those assets
//      load on the first try.
//   2. A shim script, injected ahead of the page's own scripts, catches the
//      paths built at runtime — the lesson pages assemble tile URLs with
//      `'images/' + id + '.png'` and inject them through innerHTML, which no
//      static rewrite can see.
//
// The page runs in a sandboxed iframe with an opaque origin, so the shim only
// ever touches that document.

/** Relative asset path (as the page writes it) → URL that actually serves it. */
export type DriveAssetMap = Record<string, string>;

const ASSET_ATTRS = ["src", "href", "poster"];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Rewrite quoted occurrences of each asset path — markup attributes and the
 *  JS config strings alike, since both are `"images/page.png"` in the source. */
export function rewriteLiteralAssetPaths(
  html: string,
  assets: DriveAssetMap
): string {
  // Longest first so a path is never shadowed by a shorter one it contains.
  const paths = Object.keys(assets).sort((a, b) => b.length - a.length);
  let out = html;
  for (const path of paths) {
    const re = new RegExp(`(["'])(?:\\./)?${escapeRe(path)}\\1`, "g");
    out = out.replace(re, (_m, quote: string) => `${quote}${assets[path]}${quote}`);
  }
  return out;
}

/** The runtime half: rewrites asset URLs the page builds after load. */
export function driveAssetShim(assets: DriveAssetMap): string {
  // </script> inside the map would close the tag early; < keeps it inert.
  const json = JSON.stringify(assets).replace(/</g, "\\u003c");
  return `<script>(function(){
var MAP=${json},BY_NAME={},ATTRS=${JSON.stringify(ASSET_ATTRS)};
for(var k in MAP){BY_NAME[k.split("/").pop()]=MAP[k];}
function look(u){
  if(typeof u!=="string"||!u)return null;
  if(/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|#)/i.test(u))return null;
  var p=u.replace(/^\\.\\//,"").replace(/^\\//,"").split(/[?#]/)[0];
  return MAP[p]||BY_NAME[p.split("/").pop()]||null;
}
function fix(el){
  if(!el||el.nodeType!==1||!el.getAttribute)return;
  for(var i=0;i<ATTRS.length;i++){
    var hit=look(el.getAttribute(ATTRS[i]));
    if(hit)el.setAttribute(ATTRS[i],hit);
  }
}
function scan(node){
  if(!node||node.nodeType!==1)return;
  fix(node);
  if(node.querySelectorAll){
    var kids=node.querySelectorAll("[src],[href],[poster]");
    for(var i=0;i<kids.length;i++)fix(kids[i]);
  }
}
new MutationObserver(function(records){
  for(var i=0;i<records.length;i++){
    var r=records[i];
    if(r.type==="attributes")fix(r.target);
    else for(var j=0;j<r.addedNodes.length;j++)scan(r.addedNodes[j]);
  }
}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:ATTRS});
document.addEventListener("DOMContentLoaded",function(){scan(document.documentElement);});
[window.HTMLImageElement,window.HTMLMediaElement,window.HTMLSourceElement].forEach(function(C){
  if(!C||!C.prototype)return;
  var d=Object.getOwnPropertyDescriptor(C.prototype,"src");
  if(!d||!d.set)return;
  Object.defineProperty(C.prototype,"src",{configurable:true,enumerable:d.enumerable,get:d.get,set:function(v){d.set.call(this,look(v)||v);}});
});
var A=window.Audio;
if(A){function P(s){return new A(arguments.length?(look(s)||s):s);}P.prototype=A.prototype;window.Audio=P;}
})();</script>`;
}

/**
 * Prepare a Drive lesson page for the board's iframe. Returns the HTML
 * unchanged when there are no sibling assets to repoint.
 */
export function withDriveAssets(html: string, assets: DriveAssetMap): string {
  if (Object.keys(assets).length === 0) return html;
  const rewritten = rewriteLiteralAssetPaths(html, assets);
  const shim = driveAssetShim(assets);
  // Ahead of the page's own scripts, so nothing has run before the hooks land.
  const head = rewritten.match(/<head[^>]*>/i);
  if (head?.index != null) {
    const at = head.index + head[0].length;
    return rewritten.slice(0, at) + shim + rewritten.slice(at);
  }
  return shim + rewritten;
}
