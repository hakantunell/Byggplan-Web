type PreviewMeta={shape:'valve-large'|'valve-small'|'point'|'open-circle'|'filled-small'|'filled-large'|'storm-inlet'|'drain-well'|'septic'|'custom';color:string;glyph?:string};
const PREVIEW_META:Record<string,PreviewMeta>={
 'water-service':{shape:'valve-small',color:'#0000ff'},shutoff:{shape:'valve-large',color:'#0000ff'},'water-connection':{shape:'point',color:'#0000ff'},
 'spill-manhole':{shape:'open-circle',color:'#ff0000'},'spill-inspection':{shape:'filled-large',color:'#ff0000'},'spill-cleanout':{shape:'filled-small',color:'#ff0000'},
 'storm-manhole':{shape:'open-circle',color:'#005000'},'storm-inlet':{shape:'storm-inlet',color:'#005000'},'drain-well':{shape:'drain-well',color:'#005000'},
 septic:{shape:'septic',color:'#ff0000'},'inspection-well':{shape:'custom',color:'#244b37',glyph:'B'},'meter-cabinet':{shape:'custom',color:'#244b37',glyph:'EL'},'meter-pole':{shape:'custom',color:'#244b37',glyph:'MS'},'fiber-well':{shape:'custom',color:'#244b37',glyph:'FB'},connection:{shape:'custom',color:'#244b37',glyph:'A'}
};

let preview:HTMLDivElement|null=null;
let previewStage:HTMLElement|null=null;
function ensurePreview(){if(preview)return preview;preview=document.createElement('div');preview.className='drawingSymbolCursorPreview';preview.setAttribute('aria-hidden','true');document.body.appendChild(preview);return preview}
function hidePreview(){if(preview)preview.style.display='none';previewStage?.classList.remove('drawingSymbolCursorActive');previewStage=null}
function activeSymbolButton(){return document.querySelector<HTMLButtonElement>('.drawingPalettePanel [data-symbol].active')}
function drawingTarget(stage:HTMLElement){return stage.querySelector<HTMLCanvasElement|HTMLImageElement>('canvas,img')}
function inside(r:DOMRect,x:number,y:number){return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
function symbolSvg(m:PreviewMeta){
 const c=m.color,w='#fff';let body='';
 if(m.shape==='valve-large'||m.shape==='valve-small'){const h=m.shape==='valve-large'?11:8,v=m.shape==='valve-large'?9:7;body=`<line x1="${18-h}" y1="18" x2="${18+h}" y2="18" stroke="${w}" stroke-width="5"/><line x1="${18-h}" y1="18" x2="${18+h}" y2="18" stroke="${c}" stroke-width="2"/><line x1="18" y1="${18-v}" x2="18" y2="${18+v}" stroke="${w}" stroke-width="5"/><line x1="18" y1="${18-v}" x2="18" y2="${18+v}" stroke="${c}" stroke-width="2"/>`}
 else if(m.shape==='point')body=`<circle cx="18" cy="18" r="3.5" fill="${c}" stroke="${w}" stroke-width="2"/>`;
 else if(m.shape==='open-circle')body=`<circle cx="18" cy="18" r="9" fill="${w}" stroke="${c}" stroke-width="2"/>`;
 else if(m.shape==='filled-small')body=`<circle cx="18" cy="18" r="3.5" fill="${c}"/>`;
 else if(m.shape==='filled-large')body=`<circle cx="18" cy="18" r="6" fill="${c}"/>`;
 else if(m.shape==='storm-inlet')body=`<rect x="8" y="14" width="20" height="8" fill="${w}" stroke="${c}" stroke-width="2"/>`;
 else if(m.shape==='drain-well')body=`<circle cx="18" cy="18" r="7" fill="${w}" stroke="${c}" stroke-width="2"/><path d="M18 11 A7 7 0 0 0 18 25 Z" fill="${c}"/>`;
 else if(m.shape==='septic')body=`<circle cx="18" cy="18" r="9" fill="${w}" stroke="${c}" stroke-width="2"/><line x1="18" y1="9" x2="18" y2="27" stroke="${c}" stroke-width="1.8"/><line x1="18" y1="18" x2="27" y2="18" stroke="${c}" stroke-width="1.8"/>`;
 else body=`<circle cx="18" cy="18" r="12" fill="${w}" stroke="${c}" stroke-width="2"/><text x="18" y="21" text-anchor="middle" font-size="8" font-weight="900" fill="${c}">${m.glyph||'•'}</text>`;
 return `<svg viewBox="0 0 36 36" aria-hidden="true">${body}</svg>`;
}
function onPointerMove(e:PointerEvent){const stage=(e.target as Element|null)?.closest?.('.drawingStage') as HTMLElement|null,button=activeSymbolButton();if(!stage||!button){hidePreview();return}const target=drawingTarget(stage);if(!target){hidePreview();return}const r=target.getBoundingClientRect();if(!inside(r,e.clientX,e.clientY)){hidePreview();return}const kind=button.dataset.symbol||'',m=PREVIEW_META[kind]||{shape:'custom',color:'#244b37',glyph:'•'};const p=ensurePreview();p.innerHTML=symbolSvg(m);p.style.left=`${e.clientX}px`;p.style.top=`${e.clientY}px`;p.style.display='grid';if(previewStage!==stage){previewStage?.classList.remove('drawingSymbolCursorActive');previewStage=stage;stage.classList.add('drawingSymbolCursorActive')}}
function onPointerOut(e:PointerEvent){const from=(e.target as Element|null)?.closest?.('.drawingStage'),to=(e.relatedTarget as Element|null)?.closest?.('.drawingStage');if(from&&!to)hidePreview()}
function onKeyDown(e:KeyboardEvent){if(e.key!=='Escape'||!document.querySelector('.drawingBody'))return;const placement=document.querySelector('.drawingPalettePanel [data-symbol].active,.drawingPalettePanel [data-line].active'),selected=document.querySelector('.drawingPalettePanel [data-select].active');if(!placement&&!selected)return;hidePreview();requestAnimationFrame(()=>{document.querySelector<HTMLButtonElement>('.drawingPaletteTabs [data-tab="tools"]')?.click();requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.drawingPalettePanel [data-select]')?.click())})}
export function installDrawingPaletteWorkflowUx(){document.addEventListener('pointermove',onPointerMove,true);document.addEventListener('pointerout',onPointerOut,true);window.addEventListener('keydown',onKeyDown)}
