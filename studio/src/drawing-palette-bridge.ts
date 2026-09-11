type UtilityKind='water'|'sewer'|'electric'|'fiber';
type SymbolKind='water-service'|'shutoff'|'septic'|'inspection-well'|'meter-cabinet'|'meter-pole'|'fiber-well'|'connection';
type Pt={x:number;y:number};
type UtilityLine={id:string;kind:UtilityKind;a:Pt;b:Pt};
type DrawingSymbol={id:string;kind:SymbolKind;point:Pt};
type PaletteState={lines:UtilityLine[];symbols:DrawingSymbol[];layers:Record<string,boolean>};
type Mode={type:'none'}|{type:'select'}|{type:'line';kind:UtilityKind}|{type:'symbol';kind:SymbolKind};
type Selection={type:'line';id:string}|{type:'symbol';id:string}|null;
type DragState=
 |{type:'symbol';id:string;start:Pt;original:Pt}
 |{type:'line';id:string;part:'a'|'b'|'whole';start:Pt;originalA:Pt;originalB:Pt}
 |null;

const PREFIX='byggplan.drawingPalette.v1.';
const DEFAULT_LAYERS={measure:true,water:true,sewer:true,electric:true,fiber:true,symbols:true};
const LINE_META:Record<UtilityKind,{name:string;icon:string;stroke:string;dash?:string}>={
 water:{name:'Vatten',icon:'💧',stroke:'#1677c8'},
 sewer:{name:'Avlopp',icon:'↘',stroke:'#8a5a2b'},
 electric:{name:'El',icon:'⚡',stroke:'#d19a00'},
 fiber:{name:'Fiber',icon:'⌁',stroke:'#8b45b8',dash:'7 4'},
};
const SYMBOL_META:Record<SymbolKind,{name:string;icon:string;glyph:string}>={
 'water-service':{name:'Vattenservis',icon:'◉',glyph:'VS'},
 shutoff:{name:'Avstängningsventil',icon:'⊗',glyph:'AV'},
 septic:{name:'Trekammarbrunn',icon:'▣',glyph:'3K'},
 'inspection-well':{name:'Brunn',icon:'○',glyph:'B'},
 'meter-cabinet':{name:'El-/mätarskåp',icon:'▤',glyph:'EL'},
 'meter-pole':{name:'Mätstolpe',icon:'⚑',glyph:'MS'},
 'fiber-well':{name:'Fiberbrunn',icon:'◎',glyph:'FB'},
 connection:{name:'Anslutningspunkt',icon:'◆',glyph:'A'},
};

let mode:Mode={type:'none'};
let selection:Selection=null;
let drag:DragState=null;
let firstPoint:Pt|null=null;
let hoverPoint:Pt|null=null;
let activeTab='tools';
let currentBody:HTMLElement|null=null;
let currentStage:HTMLElement|null=null;
let overlay:SVGSVGElement|null=null;
let resizeObserver:ResizeObserver|null=null;
let state:PaletteState={lines:[],symbols:[],layers:{...DEFAULT_LAYERS}};
let stateKey='';

function q<T extends Element>(selector:string,root:ParentNode=document){return root.querySelector(selector) as T|null}
function qa<T extends Element>(selector:string,root:ParentNode=document){return Array.from(root.querySelectorAll(selector)) as T[]}
function esc(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
function uid(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`}
function clamp01(v:number){return Math.max(0,Math.min(1,v))}
function drawingIdentity(){
 const project=q<HTMLElement>('.projectDocumentsTitle h1')?.textContent?.trim()||'projekt';
 const drawing=q<HTMLElement>('.drawingList>button.active b')?.textContent?.trim()||'ritning';
 const file=q<HTMLSelectElement>('.drawingFilePicker select')?.value||'';
 const page=q<HTMLElement>('.drawingPages span')?.textContent?.trim()||'sida1';
 return `${project}|${drawing}|${file}|${page}`;
}
function loadState(){
 stateKey=PREFIX+encodeURIComponent(drawingIdentity());selection=null;drag=null;
 try{const raw=localStorage.getItem(stateKey);state=raw?{...JSON.parse(raw),layers:{...DEFAULT_LAYERS,...JSON.parse(raw).layers}}:{lines:[],symbols:[],layers:{...DEFAULT_LAYERS}}}catch{state={lines:[],symbols:[],layers:{...DEFAULT_LAYERS}}}
}
function saveState(){try{localStorage.setItem(stateKey,JSON.stringify(state))}catch{}}
function targetElement(){return q<HTMLCanvasElement|HTMLImageElement>('.drawingStage canvas,.drawingStage img',currentStage||document)}
function pointFromEvent(e:PointerEvent):Pt|null{const t=targetElement();if(!t)return null;const r=t.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return null;return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
function snap(origin:Pt,p:Pt,shift:boolean){if(!shift)return p;const t=targetElement();if(!t)return p;const r=t.getBoundingClientRect(),dx=(p.x-origin.x)*r.width,dy=(p.y-origin.y)*r.height,len=Math.hypot(dx,dy);if(!len)return p;const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4);return{x:origin.x+Math.cos(a)*len/r.width,y:origin.y+Math.sin(a)*len/r.height}}
function clickLegacy(text:string){const b=qa<HTMLButtonElement>('.drawingToolbar button').find(x=>x.textContent?.includes(text));b?.click()}
function clearMode(){mode={type:'none'};drag=null;firstPoint=null;hoverPoint=null;renderPalette();renderOverlay()}
function setSelectMode(){clickLegacy('Hand');mode={type:'select'};firstPoint=null;hoverPoint=null;activeTab='tools';renderPalette();renderOverlay()}
function setLineMode(kind:UtilityKind){selection=null;drag=null;mode={type:'line',kind};firstPoint=null;hoverPoint=null;activeTab='lines';renderPalette();renderOverlay()}
function setSymbolMode(kind:SymbolKind){selection=null;drag=null;mode={type:'symbol',kind};firstPoint=null;hoverPoint=null;activeTab='symbols';renderPalette();renderOverlay()}
function activateLegacy(label:string){selection=null;drag=null;clearMode();clickLegacy(label)}
function deleteSelection(){
 if(!selection)return;
 if(selection.type==='symbol')state.symbols=state.symbols.filter(s=>s.id!==selection!.id);
 else state.lines=state.lines.filter(l=>l.id!==selection!.id);
 selection=null;drag=null;saveState();renderPalette();renderOverlay();
}
function selectedDescription(){
 if(!selection)return '';
 if(selection.type==='symbol'){const s=state.symbols.find(x=>x.id===selection!.id);return s?SYMBOL_META[s.kind].name:''}
 const l=state.lines.find(x=>x.id===selection!.id);return l?`${LINE_META[l.kind].name}-ledning`:'';
}
function renderPalette(){
 const host=q<HTMLElement>('.drawingPalettePanel',currentBody||document);if(!host)return;
 const tabs=qa<HTMLButtonElement>('.drawingPaletteTabs button',currentBody||document);tabs.forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));
 if(activeTab==='tools')host.innerHTML=`<small>VERKTYG</small><button data-select class="${mode.type==='select'?'active':''}">↖ Markera / flytta</button><button data-legacy="Mät">📏 Längdmått</button><button data-legacy="Vinkel">∠ Vinkel</button>${selection?`<div class="drawingSelectionPanel"><small>MARKERAT</small><b>${esc(selectedDescription())}</b><span>${selection.type==='line'?'Dra linjen för att flytta hela ledningen eller dra något av ändpunktshandtagen.':'Dra symbolen till önskad plats.'}</span><button data-delete-selection>🗑 Ta bort markerat</button></div>`:''}<p>Delete/Backspace tar också bort markerat objekt. Kalibrering ligger kvar i verktygsraden ovanför ritningen.</p>`;
 else if(activeTab==='lines')host.innerHTML=`<small>RITA LEDNING</small>${(Object.entries(LINE_META) as [UtilityKind,typeof LINE_META[UtilityKind]][]).map(([k,m])=>`<button data-line="${k}" class="${mode.type==='line'&&mode.kind===k?'active':''}"><span>${m.icon}</span>${m.name}</button>`).join('')}<p>Klicka start- och slutpunkt. Håll Shift för 45°-snäppning.</p>`;
 else if(activeTab==='symbols')host.innerHTML=`<small>PLACERA SYMBOL</small>${(Object.entries(SYMBOL_META) as [SymbolKind,typeof SYMBOL_META[SymbolKind]][]).map(([k,m])=>`<button data-symbol="${k}" class="${mode.type==='symbol'&&mode.kind===k?'active':''}"><span>${m.icon}</span>${esc(m.name)}</button>`).join('')}<p>Välj symbol och klicka på ritningen. Du kan placera flera av samma symbol efter varandra.</p>`;
 else host.innerHTML=`<small>LAGER</small>${[['measure','Mått'],['water','Vatten'],['sewer','Avlopp'],['electric','El'],['fiber','Fiber'],['symbols','Symboler']].map(([k,n])=>`<label><input type="checkbox" data-layer="${k}" ${state.layers[k]!==false?'checked':''}><span>${n}</span></label>`).join('')}<p>Lager påverkar bara visningen, inte sparade objekt.</p>`;
 q<HTMLButtonElement>('[data-select]',host)?.addEventListener('click',setSelectMode);
 q<HTMLButtonElement>('[data-delete-selection]',host)?.addEventListener('click',deleteSelection);
 qa<HTMLButtonElement>('[data-legacy]',host).forEach(b=>b.onclick=()=>activateLegacy(b.dataset.legacy||'Hand'));
 qa<HTMLButtonElement>('[data-line]',host).forEach(b=>b.onclick=()=>setLineMode(b.dataset.line as UtilityKind));
 qa<HTMLButtonElement>('[data-symbol]',host).forEach(b=>b.onclick=()=>setSymbolMode(b.dataset.symbol as SymbolKind));
 qa<HTMLInputElement>('[data-layer]',host).forEach(i=>i.onchange=()=>{state.layers[i.dataset.layer||'']=i.checked;saveState();syncMeasurementVisibility();renderOverlay()});
}
function syncMeasurementVisibility(){const b=qa<HTMLButtonElement>('.drawingToolbar button').find(x=>/Dölj mått|Visa mått/.test(x.textContent||''));if(!b)return;const shown=(b.textContent||'').includes('Dölj mått');if(state.layers.measure===false&&shown)b.click();if(state.layers.measure!==false&&!shown)b.click()}
function ensureOverlay(){
 if(!currentStage)return;let svg=q<SVGSVGElement>('svg.drawingInfrastructureOverlay',currentStage);if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('drawingInfrastructureOverlay');currentStage.appendChild(svg)}overlay=svg;
 resizeObserver?.disconnect();const t=targetElement();if(t){resizeObserver=new ResizeObserver(()=>renderOverlay());resizeObserver.observe(t)}
}
function renderOverlay(){
 if(!overlay)return;const t=targetElement();if(!t)return;const r=t.getBoundingClientRect(),w=r.width,h=r.height;overlay.setAttribute('width',String(w));overlay.setAttribute('height',String(h));overlay.style.left=`${(t as HTMLElement).offsetLeft}px`;overlay.style.top=`${(t as HTMLElement).offsetTop}px`;
 const parts:string[]=[];
 for(const l of state.lines){
  if(state.layers[l.kind]===false)continue;const m=LINE_META[l.kind],a={x:l.a.x*w,y:l.a.y*h},b={x:l.b.x*w,y:l.b.y*h},selected=selection?.type==='line'&&selection.id===l.id;
  if(selected)parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#173f2c" stroke-width="8" opacity=".22"/>`);
  parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${m.stroke}" stroke-width="${selected?4:3}" ${m.dash?`stroke-dasharray="${m.dash}"`:''}/><circle cx="${a.x}" cy="${a.y}" r="${selected?7:3}" fill="#fff" stroke="${selected?'#173f2c':m.stroke}" stroke-width="${selected?2.5:2}"/><circle cx="${b.x}" cy="${b.y}" r="${selected?7:3}" fill="#fff" stroke="${selected?'#173f2c':m.stroke}" stroke-width="${selected?2.5:2}"/>`);
 }
 if(state.layers.symbols!==false)for(const s of state.symbols){
  const m=SYMBOL_META[s.kind],x=s.point.x*w,y=s.point.y*h,selected=selection?.type==='symbol'&&selection.id===s.id;
  if(selected)parts.push(`<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#173f2c" stroke-width="3" stroke-dasharray="4 3"/>`);
  parts.push(`<g><circle cx="${x}" cy="${y}" r="12" fill="white" stroke="${selected?'#173f2c':'#244b37'}" stroke-width="${selected?3:2}"/><text x="${x}" y="${y+3}" text-anchor="middle" font-size="8" font-weight="900" fill="#244b37">${m.glyph}</text></g>`)
 }
 if(mode.type==='line'&&firstPoint&&hoverPoint){const m=LINE_META[mode.kind],a={x:firstPoint.x*w,y:firstPoint.y*h},b={x:hoverPoint.x*w,y:hoverPoint.y*h};parts.push(`<line class="drawingUtilityPreview" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${m.stroke}" stroke-width="3" ${m.dash?`stroke-dasharray="${m.dash}"`:''}/><circle cx="${a.x}" cy="${a.y}" r="4" fill="#fff" stroke="${m.stroke}" stroke-width="2"/>`)}
 overlay.innerHTML=parts.join('');
}
function distanceToSegment(px:number,py:number,ax:number,ay:number,bx:number,by:number){const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;if(!len2)return Math.hypot(px-ax,py-ay);const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));return Math.hypot(px-(ax+t*dx),py-(ay+t*dy))}
function hitTest(p:Pt):{selection:NonNullable<Selection>;part?:'a'|'b'|'whole'}|null{
 const t=targetElement();if(!t)return null;const r=t.getBoundingClientRect(),px=p.x*r.width,py=p.y*r.height;
 for(let i=state.lines.length-1;i>=0;i--){const l=state.lines[i];if(state.layers[l.kind]===false)continue;const ax=l.a.x*r.width,ay=l.a.y*r.height,bx=l.b.x*r.width,by=l.b.y*r.height;if(Math.hypot(px-ax,py-ay)<=11)return{selection:{type:'line',id:l.id},part:'a'};if(Math.hypot(px-bx,py-by)<=11)return{selection:{type:'line',id:l.id},part:'b'}}
 if(state.layers.symbols!==false)for(let i=state.symbols.length-1;i>=0;i--){const s=state.symbols[i],sx=s.point.x*r.width,sy=s.point.y*r.height;if(Math.hypot(px-sx,py-sy)<=17)return{selection:{type:'symbol',id:s.id}}}
 for(let i=state.lines.length-1;i>=0;i--){const l=state.lines[i];if(state.layers[l.kind]===false)continue;const ax=l.a.x*r.width,ay=l.a.y*r.height,bx=l.b.x*r.width,by=l.b.y*r.height;if(distanceToSegment(px,py,ax,ay,bx,by)<=9)return{selection:{type:'line',id:l.id},part:'whole'}}
 return null;
}
function beginSelectionDrag(p:Pt,hit:{selection:NonNullable<Selection>;part?:'a'|'b'|'whole'}){
 selection=hit.selection;activeTab='tools';
 if(selection.type==='symbol'){const s=state.symbols.find(x=>x.id===selection!.id);if(s)drag={type:'symbol',id:s.id,start:p,original:{...s.point}}}
 else{const l=state.lines.find(x=>x.id===selection!.id);if(l)drag={type:'line',id:l.id,part:hit.part||'whole',start:p,originalA:{...l.a},originalB:{...l.b}}}
 renderPalette();renderOverlay();
}
function moveDrag(p:Pt,e:PointerEvent){
 if(!drag)return;
 if(drag.type==='symbol'){const s=state.symbols.find(x=>x.id===drag!.id);if(!s)return;s.point={x:clamp01(drag.original.x+p.x-drag.start.x),y:clamp01(drag.original.y+p.y-drag.start.y)}}
 else{
  const l=state.lines.find(x=>x.id===drag!.id);if(!l)return;
  if(drag.part==='a'){l.a=snap(drag.originalB,{x:clamp01(p.x),y:clamp01(p.y)},e.shiftKey)}
  else if(drag.part==='b'){l.b=snap(drag.originalA,{x:clamp01(p.x),y:clamp01(p.y)},e.shiftKey)}
  else{let dx=p.x-drag.start.x,dy=p.y-drag.start.y;dx=Math.max(-Math.min(drag.originalA.x,drag.originalB.x),Math.min(1-Math.max(drag.originalA.x,drag.originalB.x),dx));dy=Math.max(-Math.min(drag.originalA.y,drag.originalB.y),Math.min(1-Math.max(drag.originalA.y,drag.originalB.y),dy));l.a={x:drag.originalA.x+dx,y:drag.originalA.y+dy};l.b={x:drag.originalB.x+dx,y:drag.originalB.y+dy}}
 }
 renderOverlay();
}
function onPointerDown(e:PointerEvent){
 const p0=pointFromEvent(e);if(!p0)return;
 if(mode.type==='select'){
  const hit=hitTest(p0);if(!hit){selection=null;drag=null;renderPalette();renderOverlay();return}
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();beginSelectionDrag(p0,hit);try{currentStage?.setPointerCapture(e.pointerId)}catch{}return;
 }
 if(mode.type==='none')return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 if(mode.type==='symbol'){state.symbols.push({id:uid(),kind:mode.kind,point:p0});saveState();renderOverlay();return}
 if(mode.type!=='line')return;
 const p=firstPoint?snap(firstPoint,p0,e.shiftKey):p0;if(!firstPoint){firstPoint=p;hoverPoint=p;renderOverlay();return}state.lines.push({id:uid(),kind:mode.kind,a:firstPoint,b:p});firstPoint=null;hoverPoint=null;saveState();renderOverlay();
}
function onPointerMove(e:PointerEvent){
 if(drag){const p=pointFromEvent(e);if(p)moveDrag(p,e);return}
 if(mode.type!=='line'||!firstPoint)return;const p=pointFromEvent(e);if(!p)return;hoverPoint=snap(firstPoint,p,e.shiftKey);renderOverlay();
}
function onPointerUp(e:PointerEvent){if(!drag)return;drag=null;saveState();renderPalette();renderOverlay();try{currentStage?.releasePointerCapture(e.pointerId)}catch{}}
function onKey(e:KeyboardEvent){
 const target=e.target as HTMLElement|null;if(target&&(target.tagName==='INPUT'||target.tagName==='TEXTAREA'||target.isContentEditable))return;
 if((e.key==='Delete'||e.key==='Backspace')&&selection){e.preventDefault();deleteSelection();return}
 if(e.key==='Escape'){if(drag){drag=null;renderOverlay();return}if(selection){selection=null;renderPalette();renderOverlay();return}if(mode.type!=='none')clearMode()}
}
function installInto(body:HTMLElement){
 if(body.dataset.drawingPaletteInstalled==='1')return;body.dataset.drawingPaletteInstalled='1';currentBody=body;currentStage=q<HTMLElement>('.drawingStage',body);if(!currentStage)return;
 loadState();
 const palette=document.createElement('aside');palette.className='drawingPalette';palette.innerHTML=`<div class="drawingPaletteTabs"><button data-tab="tools">⌖<span>Verktyg</span></button><button data-tab="lines">╱<span>Ledningar</span></button><button data-tab="symbols">◇<span>Symboler</span></button><button data-tab="layers">▱<span>Lager</span></button></div><div class="drawingPalettePanel"></div>`;
 const viewport=q<HTMLElement>('.drawingStageViewport',body);if(viewport)body.insertBefore(palette,viewport);else body.prepend(palette);
 qa<HTMLButtonElement>('.drawingPaletteTabs button',palette).forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab||'tools';renderPalette()});
 for(const b of qa<HTMLButtonElement>('.drawingToolbar button')){const txt=b.textContent||'';if(/Hand|Mät|Vinkel/.test(txt)&&!txt.includes('Kalibrera'))b.classList.add('drawingPaletteLegacyTool')}
 currentStage.addEventListener('pointerdown',onPointerDown,true);currentStage.addEventListener('pointermove',onPointerMove,true);currentStage.addEventListener('pointerup',onPointerUp,true);currentStage.addEventListener('pointercancel',onPointerUp,true);window.addEventListener('keydown',onKey);
 ensureOverlay();setSelectMode();syncMeasurementVisibility();renderOverlay();
}
function scan(){const body=q<HTMLElement>('.drawingBody');if(!body){currentBody=null;currentStage=null;overlay=null;return}if(body!==currentBody||body.dataset.drawingPaletteInstalled!=='1')installInto(body);else{const nextKey=PREFIX+encodeURIComponent(drawingIdentity());if(nextKey!==stateKey){loadState();renderPalette();syncMeasurementVisibility();renderOverlay()}}}

export function installDrawingPaletteBridge(){
 const observer=new MutationObserver(()=>scan());observer.observe(document.documentElement,{childList:true,subtree:true});setInterval(scan,700);scan();
}
