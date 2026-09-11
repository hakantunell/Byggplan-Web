const SYMBOL_GLYPHS:Record<string,string>={
 'water-service':'VS',shutoff:'AV',septic:'3K','inspection-well':'B','meter-cabinet':'EL','meter-pole':'MS','fiber-well':'FB',connection:'A'
};

let preview:HTMLDivElement|null=null;
let previewStage:HTMLElement|null=null;

function ensurePreview(){
 if(preview)return preview;
 preview=document.createElement('div');
 preview.className='drawingSymbolCursorPreview';
 preview.setAttribute('aria-hidden','true');
 document.body.appendChild(preview);
 return preview;
}
function hidePreview(){
 if(preview)preview.style.display='none';
 previewStage?.classList.remove('drawingSymbolCursorActive');
 previewStage=null;
}
function activeSymbolButton(){return document.querySelector<HTMLButtonElement>('.drawingPalettePanel [data-symbol].active')}
function drawingTarget(stage:HTMLElement){return stage.querySelector<HTMLCanvasElement|HTMLImageElement>('canvas,img')}
function inside(r:DOMRect,x:number,y:number){return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}

function onPointerMove(e:PointerEvent){
 const stage=(e.target as Element|null)?.closest?.('.drawingStage') as HTMLElement|null;
 const button=activeSymbolButton();
 if(!stage||!button){hidePreview();return}
 const target=drawingTarget(stage);if(!target){hidePreview();return}
 const r=target.getBoundingClientRect();if(!inside(r,e.clientX,e.clientY)){hidePreview();return}
 const kind=button.dataset.symbol||'';
 const p=ensurePreview();
 p.textContent=SYMBOL_GLYPHS[kind]||'•';
 p.style.left=`${e.clientX}px`;p.style.top=`${e.clientY}px`;p.style.display='grid';
 if(previewStage!==stage){previewStage?.classList.remove('drawingSymbolCursorActive');previewStage=stage;stage.classList.add('drawingSymbolCursorActive')}
}
function onPointerOut(e:PointerEvent){
 const from=(e.target as Element|null)?.closest?.('.drawingStage');
 const to=(e.relatedTarget as Element|null)?.closest?.('.drawingStage');
 if(from&&!to)hidePreview();
}
function onKeyDown(e:KeyboardEvent){
 if(e.key!=='Escape'||!document.querySelector('.drawingBody'))return;
 const placement=document.querySelector('.drawingPalettePanel [data-symbol].active,.drawingPalettePanel [data-line].active');
 const selected=document.querySelector('.drawingPalettePanel [data-select].active');
 if(!placement&&!selected)return;
 hidePreview();
 requestAnimationFrame(()=>{
  document.querySelector<HTMLButtonElement>('.drawingPaletteTabs [data-tab="tools"]')?.click();
  requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('.drawingPalettePanel [data-select]')?.click());
 });
}

export function installDrawingPaletteWorkflowUx(){
 document.addEventListener('pointermove',onPointerMove,true);
 document.addEventListener('pointerout',onPointerOut,true);
 window.addEventListener('keydown',onKeyDown);
}
