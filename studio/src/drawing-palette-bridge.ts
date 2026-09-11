type UtilityKind='water'|'sewer'|'storm'|'combined'|'electric'|'fiber';
type SymbolKind='water-service'|'shutoff'|'water-connection'|'spill-manhole'|'spill-inspection'|'spill-cleanout'|'storm-manhole'|'storm-inlet'|'drain-well'|'septic'|'inspection-well'|'meter-cabinet'|'meter-pole'|'fiber-well'|'connection';
type Pt={x:number;y:number};
type UtilityLine={id:string;kind:UtilityKind;a:Pt;b:Pt;aSymbolId?:string;bSymbolId?:string};
type DrawingSymbol={id:string;kind:SymbolKind;point:Pt};
type PaletteState={lines:UtilityLine[];symbols:DrawingSymbol[];layers:Record<string,boolean>};
type Mode={type:'none'}|{type:'select'}|{type:'line';kind:UtilityKind}|{type:'symbol';kind:SymbolKind};
type Selection={type:'line';id:string}|{type:'symbol';id:string}|null;
type DragState=
 |{type:'symbol';id:string;start:Pt;original:Pt}
 |{type:'line';id:string;part:'a'|'b'|'whole';start:Pt;originalA:Pt;originalB:Pt}
 |null;
type P109Shape='valve-large'|'valve-small'|'point'|'open-circle'|'filled-small'|'filled-large'|'storm-inlet'|'drain-well'|'septic'|'custom';

const PREFIX='byggplan.drawingPalette.v1.';
const DEFAULT_LAYERS={measure:true,water:true,sewer:true,storm:true,combined:true,electric:true,fiber:true,symbols:true};
const SNAP_PX=20;

/* P109 bilaga 1: K=127,63,0; D=0,80,0; S=255,0,0; V=0,0,255. */
const LINE_META:Record<UtilityKind,{name:string;icon:string;stroke:string;dash?:string;standard:'P109'|'ByggPlan'}>={
 water:{name:'Dricksvatten (V)',icon:'V',stroke:'#0000ff',dash:'8 4',standard:'P109'},
 sewer:{name:'Spillvatten (S)',icon:'S',stroke:'#ff0000',standard:'P109'},
 storm:{name:'Dagvatten (D)',icon:'D',stroke:'#005000',dash:'12 1.5 1 1.5',standard:'P109'},
 combined:{name:'Kombinerat avlopp (K)',icon:'K',stroke:'#7f3f00',standard:'P109'},
 electric:{name:'El',icon:'⚡',stroke:'#d19a00',standard:'ByggPlan'},
 fiber:{name:'Fiber',icon:'⌁',stroke:'#8b45b8',dash:'7 4',standard:'ByggPlan'},
};

const SYMBOL_META:Record<SymbolKind,{name:string;icon:string;glyph:string;standard:'P109'|'ByggPlan';shape:P109Shape;flow?:UtilityKind}>={
 'water-service':{name:'Servisventil vatten (VSV)',icon:'＋',glyph:'VSV',standard:'P109',shape:'valve-small',flow:'water'},
 shutoff:{name:'Avstängningsventil vatten (VAV)',icon:'＋',glyph:'VAV',standard:'P109',shape:'valve-large',flow:'water'},
 'water-connection':{name:'Förbindelsepunkt vatten (VFP)',icon:'•',glyph:'VFP',standard:'P109',shape:'point',flow:'water'},
 'spill-manhole':{name:'Nedstigningsbrunn spillvatten (SNB)',icon:'○',glyph:'SNB',standard:'P109',shape:'open-circle',flow:'sewer'},
 'spill-inspection':{name:'Tillsynsbrunn spillvatten (STB)',icon:'●',glyph:'STB',standard:'P109',shape:'filled-large',flow:'sewer'},
 'spill-cleanout':{name:'Rensbrunn spillvatten (SRB)',icon:'•',glyph:'SRB',standard:'P109',shape:'filled-small',flow:'sewer'},
 'storm-manhole':{name:'Nedstigningsbrunn dagvatten (DNB)',icon:'○',glyph:'DNB',standard:'P109',shape:'open-circle',flow:'storm'},
 'storm-inlet':{name:'Dagvattenbrunn (DDB)',icon:'▭',glyph:'DDB',standard:'P109',shape:'storm-inlet',flow:'storm'},
 'drain-well':{name:'Dränvattenbrunn (DDR)',icon:'◐',glyph:'DDR',standard:'P109',shape:'drain-well',flow:'storm'},
 septic:{name:'Trekammarbrunn spillvatten (STK)',icon:'⊕',glyph:'STK',standard:'P109',shape:'septic',flow:'sewer'},
 'inspection-well':{name:'Brunn, generell',icon:'○',glyph:'B',standard:'ByggPlan',shape:'custom'},
 'meter-cabinet':{name:'El-/mätarskåp',icon:'▤',glyph:'EL',standard:'ByggPlan',shape:'custom'},
 'meter-pole':{name:'Mätstolpe',icon:'⚑',glyph:'MS',standard:'ByggPlan',shape:'custom'},
 'fiber-well':{name:'Fiberbrunn',icon:'◎',glyph:'FB',standard:'ByggPlan',shape:'custom'},
 connection:{name:'Anslutningspunkt, generell',icon:'◆',glyph:'A',standard:'ByggPlan',shape:'custom'},
};

let mode:Mode={type:'none'};
let selection:Selection=null;
let drag:DragState=null;
let firstPoint:Pt|null=null;
let firstSymbolId:string|undefined;
let hoverPoint:Pt|null=null;
let hoverSymbolId:string|undefined;
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
function samePoint(a:Pt,b:Pt){return Math.abs(a.x-b.x)<1e-9&&Math.abs(a.y-b.y)<1e-9}

function drawingIdentity(){
 const project=q<HTMLElement>('.projectDocumentsTitle h1')?.textContent?.trim()||'projekt';
 const drawing=q<HTMLElement>('.drawingList>button.active b')?.textContent?.trim()||'ritning';
 const file=q<HTMLSelectElement>('.drawingFilePicker select')?.value||'';
 const page=q<HTMLElement>('.drawingPages span')?.textContent?.trim()||'sida1';
 return `${project}|${drawing}|${file}|${page}`;
}

function loadState(){
 stateKey=PREFIX+encodeURIComponent(drawingIdentity());
 selection=null;drag=null;firstPoint=null;firstSymbolId=undefined;hoverPoint=null;hoverSymbolId=undefined;
 try{
  const raw=localStorage.getItem(stateKey);
  if(raw){
   const parsed=JSON.parse(raw);
   state={...parsed,lines:Array.isArray(parsed.lines)?parsed.lines:[],symbols:Array.isArray(parsed.symbols)?parsed.symbols:[],layers:{...DEFAULT_LAYERS,...parsed.layers}};
  }else state={lines:[],symbols:[],layers:{...DEFAULT_LAYERS}};
 }catch{state={lines:[],symbols:[],layers:{...DEFAULT_LAYERS}}}
}
function saveState(){try{localStorage.setItem(stateKey,JSON.stringify(state))}catch{}}

function targetElement(){return q<HTMLCanvasElement|HTMLImageElement>('.drawingStage canvas,.drawingStage img',currentStage||document)}
function pointFromEvent(e:PointerEvent,clamp=false):Pt|null{
 const t=targetElement();if(!t)return null;
 const r=t.getBoundingClientRect();
 if(!clamp&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))return null;
 return{x:clamp01((e.clientX-r.left)/r.width),y:clamp01((e.clientY-r.top)/r.height)};
}
function snap(origin:Pt,p:Pt,shift:boolean){
 if(!shift)return p;const t=targetElement();if(!t)return p;
 const r=t.getBoundingClientRect(),dx=(p.x-origin.x)*r.width,dy=(p.y-origin.y)*r.height,len=Math.hypot(dx,dy);if(!len)return p;
 const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4);
 return{x:clamp01(origin.x+Math.cos(a)*len/r.width),y:clamp01(origin.y+Math.sin(a)*len/r.height)};
}
function snapToSymbol(p:Pt,excludeId?:string):{point:Pt;symbolId?:string}{
 const t=targetElement();if(!t||state.layers.symbols===false)return{point:p};
 const r=t.getBoundingClientRect();let best:DrawingSymbol|undefined,bestD=SNAP_PX+1;
 for(const s of state.symbols){
  if(s.id===excludeId)continue;
  const d=Math.hypot((p.x-s.point.x)*r.width,(p.y-s.point.y)*r.height);
  if(d<=SNAP_PX&&d<bestD){best=s;bestD=d}
 }
 return best?{point:{...best.point},symbolId:best.id}:{point:p};
}

function clickLegacy(text:string){qa<HTMLButtonElement>('.drawingToolbar button').find(x=>x.textContent?.includes(text))?.click()}
function clearMode(){mode={type:'none'};drag=null;firstPoint=null;firstSymbolId=undefined;hoverPoint=null;hoverSymbolId=undefined;renderPalette();renderOverlay()}
function setSelectMode(){clickLegacy('Hand');mode={type:'select'};firstPoint=null;firstSymbolId=undefined;hoverPoint=null;hoverSymbolId=undefined;activeTab='tools';renderPalette();renderOverlay()}
function setLineMode(kind:UtilityKind){selection=null;drag=null;mode={type:'line',kind};firstPoint=null;firstSymbolId=undefined;hoverPoint=null;hoverSymbolId=undefined;activeTab='lines';renderPalette();renderOverlay()}
function setSymbolMode(kind:SymbolKind){selection=null;drag=null;mode={type:'symbol',kind};firstPoint=null;firstSymbolId=undefined;hoverPoint=null;hoverSymbolId=undefined;activeTab='symbols';renderPalette();renderOverlay()}
function activateLegacy(label:string){selection=null;drag=null;clearMode();clickLegacy(label)}

function clearBindingsForSymbol(id:string){
 for(const l of state.lines){if(l.aSymbolId===id)delete l.aSymbolId;if(l.bSymbolId===id)delete l.bSymbolId}
}
function deleteSelection(){
 if(!selection)return;
 if(selection.type==='symbol'){
  clearBindingsForSymbol(selection.id);
  state.symbols=state.symbols.filter(s=>s.id!==selection!.id);
 }else state.lines=state.lines.filter(l=>l.id!==selection!.id);
 selection=null;drag=null;saveState();renderPalette();renderOverlay();
}
function selectedDescription(){
 if(!selection)return '';
 if(selection.type==='symbol'){const s=state.symbols.find(x=>x.id===selection!.id);return s?SYMBOL_META[s.kind]?.name||s.kind:''}
 const l=state.lines.find(x=>x.id===selection!.id);return l?`${LINE_META[l.kind]?.name||l.kind}-ledning`:'';
}

function renderPalette(){
 const host=q<HTMLElement>('.drawingPalettePanel',currentBody||document);if(!host)return;
 qa<HTMLButtonElement>('.drawingPaletteTabs button',currentBody||document).forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));
 if(activeTab==='tools')host.innerHTML=`<small>VERKTYG</small><button data-select class="${mode.type==='select'?'active':''}">↖ Markera / flytta</button><button data-legacy="Mät">📏 Längdmått</button><button data-legacy="Vinkel">∠ Vinkel</button>${selection?`<div class="drawingSelectionPanel"><small>MARKERAT</small><b>${esc(selectedDescription())}</b><span>${selection.type==='line'?'Dra linjen för att flytta segmentet eller dra en knut. Ledningsändar kan snäppas och bindas till symboler.':'Dra symbolen till önskad plats. Bundna ledningsändar följer symbolen automatiskt.'}</span><button data-delete-selection>🗑 Ta bort markerat</button></div>`:''}<p>Delete/Backspace tar också bort markerat objekt. Kalibrering ligger kvar i verktygsraden ovanför ritningen.</p>`;
 else if(activeTab==='lines')host.innerHTML=`<small>RITA LEDNING</small>${(Object.entries(LINE_META) as [UtilityKind,typeof LINE_META[UtilityKind]][]).map(([k,m])=>`<button data-line="${k}" class="${mode.type==='line'&&mode.kind===k?'active':''}"><span style="color:${m.stroke}">${m.icon}</span>${m.name}${m.standard==='P109'?'<em>P109</em>':'<em>egen</em>'}</button>`).join('')}<p class="drawingStandardNote"><b>VA:</b> färger och grundlinjetyper följer P109 bilaga 1. El och fiber är egna ByggPlan-konventioner.</p><p>Klicka första punkten och fortsätt med nästa brytpunkt. När markören kommer nära en symbol snäpper ledningen till symbolen och kopplas till den. Tryck Esc när ledningen är klar. Håll Shift för 45°-snäppning.</p>`;
 else if(activeTab==='symbols')host.innerHTML=`<small>PLACERA SYMBOL</small>${(Object.entries(SYMBOL_META) as [SymbolKind,typeof SYMBOL_META[SymbolKind]][]).map(([k,m])=>`<button data-symbol="${k}" class="${mode.type==='symbol'&&mode.kind===k?'active':''}"><span>${m.icon}</span>${esc(m.name)}${m.standard==='P109'?'<em>P109</em>':'<em>egen</em>'}</button>`).join('')}<p class="drawingStandardNote">VA-symbolerna återges efter former och objektkoder i P109 bilaga 1. Generella el-/fiberobjekt är egna ByggPlan-symboler.</p><p>Välj symbol och klicka på ritningen. Esc går till Markera/flytta.</p>`;
 else host.innerHTML=`<small>LAGER</small>${[['measure','Mått'],['water','Dricksvatten (V)'],['sewer','Spillvatten (S)'],['storm','Dagvatten (D)'],['combined','Kombinerat (K)'],['electric','El'],['fiber','Fiber'],['symbols','Symboler']].map(([k,n])=>`<label><input type="checkbox" data-layer="${k}" ${state.layers[k]!==false?'checked':''}><span>${n}</span></label>`).join('')}<p>Lager påverkar bara visningen, inte sparade objekt.</p>`;
 q<HTMLButtonElement>('[data-select]',host)?.addEventListener('click',setSelectMode);
 q<HTMLButtonElement>('[data-delete-selection]',host)?.addEventListener('click',deleteSelection);
 qa<HTMLButtonElement>('[data-legacy]',host).forEach(b=>b.onclick=()=>activateLegacy(b.dataset.legacy||'Hand'));
 qa<HTMLButtonElement>('[data-line]',host).forEach(b=>b.onclick=()=>setLineMode(b.dataset.line as UtilityKind));
 qa<HTMLButtonElement>('[data-symbol]',host).forEach(b=>b.onclick=()=>setSymbolMode(b.dataset.symbol as SymbolKind));
 qa<HTMLInputElement>('[data-layer]',host).forEach(i=>i.onchange=()=>{state.layers[i.dataset.layer||'']=i.checked;saveState();syncMeasurementVisibility();renderOverlay()});
}

function syncMeasurementVisibility(){
 const b=qa<HTMLButtonElement>('.drawingToolbar button').find(x=>/Dölj mått|Visa mått/.test(x.textContent||''));if(!b)return;
 const shown=(b.textContent||'').includes('Dölj mått');
 if(state.layers.measure===false&&shown)b.click();
 if(state.layers.measure!==false&&!shown)b.click();
}
function ensureOverlay(){
 if(!currentStage)return;
 let svg=q<SVGSVGElement>('svg.drawingInfrastructureOverlay',currentStage);
 if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('drawingInfrastructureOverlay');currentStage.appendChild(svg)}
 overlay=svg;resizeObserver?.disconnect();const t=targetElement();if(t){resizeObserver=new ResizeObserver(()=>renderOverlay());resizeObserver.observe(t)}
}

function p109SymbolMarkup(kind:SymbolKind,x:number,y:number,selected:boolean){
 const m=SYMBOL_META[kind];if(!m)return '';const color=m.flow?LINE_META[m.flow].stroke:'#244b37',sel=selected?'#173f2c':color,white='#fff';let body='';
 if(m.shape==='valve-large'||m.shape==='valve-small'){
  const half=m.shape==='valve-large'?11:8,vert=m.shape==='valve-large'?9:7;
  body=`<line x1="${x-half}" y1="${y}" x2="${x+half}" y2="${y}" stroke="${white}" stroke-width="5"/><line x1="${x-half}" y1="${y}" x2="${x+half}" y2="${y}" stroke="${sel}" stroke-width="2"/><line x1="${x}" y1="${y-vert}" x2="${x}" y2="${y+vert}" stroke="${white}" stroke-width="5"/><line x1="${x}" y1="${y-vert}" x2="${x}" y2="${y+vert}" stroke="${sel}" stroke-width="2"/>`;
 }else if(m.shape==='point')body=`<circle cx="${x}" cy="${y}" r="3" fill="${sel}" stroke="${white}" stroke-width="2"/>`;
 else if(m.shape==='open-circle')body=`<circle cx="${x}" cy="${y}" r="9" fill="${white}" stroke="${sel}" stroke-width="2"/>`;
 else if(m.shape==='filled-small')body=`<circle cx="${x}" cy="${y}" r="3.5" fill="${sel}" stroke="${white}" stroke-width="1.5"/>`;
 else if(m.shape==='filled-large')body=`<circle cx="${x}" cy="${y}" r="6" fill="${sel}" stroke="${white}" stroke-width="1.5"/>`;
 else if(m.shape==='storm-inlet')body=`<rect x="${x-10}" y="${y-4}" width="20" height="8" fill="${white}" stroke="${sel}" stroke-width="2"/>`;
 else if(m.shape==='drain-well')body=`<circle cx="${x}" cy="${y}" r="7" fill="${white}" stroke="${sel}" stroke-width="2"/><path d="M ${x} ${y-7} A 7 7 0 0 0 ${x} ${y+7} Z" fill="${sel}"/>`;
 else if(m.shape==='septic')body=`<circle cx="${x}" cy="${y}" r="9" fill="${white}" stroke="${sel}" stroke-width="2"/><line x1="${x}" y1="${y-9}" x2="${x}" y2="${y+9}" stroke="${sel}" stroke-width="1.8"/><line x1="${x}" y1="${y}" x2="${x+9}" y2="${y}" stroke="${sel}" stroke-width="1.8"/>`;
 else body=`<circle cx="${x}" cy="${y}" r="12" fill="${white}" stroke="${sel}" stroke-width="${selected?3:2}"/><text x="${x}" y="${y+3}" text-anchor="middle" font-size="8" font-weight="900" fill="${sel}">${m.glyph}</text>`;
 return `${selected?`<circle cx="${x}" cy="${y}" r="19" fill="none" stroke="#173f2c" stroke-width="3" stroke-dasharray="4 3"/>`:''}${body}`;
}

function renderOverlay(){
 if(!overlay)return;const t=targetElement();if(!t)return;
 const r=t.getBoundingClientRect(),w=r.width,h=r.height;
 overlay.setAttribute('width',String(w));overlay.setAttribute('height',String(h));overlay.style.left=`${(t as HTMLElement).offsetLeft}px`;overlay.style.top=`${(t as HTMLElement).offsetTop}px`;
 const parts:string[]=[];
 for(const l of state.lines){
  const m=LINE_META[l.kind];if(!m||state.layers[l.kind]===false)continue;
  const a={x:l.a.x*w,y:l.a.y*h},b={x:l.b.x*w,y:l.b.y*h},selected=selection?.type==='line'&&selection.id===l.id;
  if(selected)parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#173f2c" stroke-width="8" opacity=".22"/>`);
  parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${m.stroke}" stroke-width="${selected?4:3}" ${m.dash?`stroke-dasharray="${m.dash}"`:''}/><circle cx="${a.x}" cy="${a.y}" r="${selected?7:3}" fill="#fff" stroke="${selected?'#173f2c':m.stroke}" stroke-width="${selected?2.5:2}"/><circle cx="${b.x}" cy="${b.y}" r="${selected?7:3}" fill="#fff" stroke="${selected?'#173f2c':m.stroke}" stroke-width="${selected?2.5:2}"/>`);
 }
 if(state.layers.symbols!==false)for(const s of state.symbols){
  const x=s.point.x*w,y=s.point.y*h;
  if(mode.type==='line'&&hoverSymbolId===s.id)parts.push(`<circle cx="${x}" cy="${y}" r="22" fill="none" stroke="#173f2c" stroke-width="2" stroke-dasharray="4 3" opacity=".85"/>`);
  parts.push(p109SymbolMarkup(s.kind,x,y,selection?.type==='symbol'&&selection.id===s.id));
 }
 if(mode.type==='line'&&firstPoint&&hoverPoint){
  const m=LINE_META[mode.kind],a={x:firstPoint.x*w,y:firstPoint.y*h},b={x:hoverPoint.x*w,y:hoverPoint.y*h};
  parts.push(`<line class="drawingUtilityPreview" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${m.stroke}" stroke-width="3" ${m.dash?`stroke-dasharray="${m.dash}"`:''}/><circle cx="${a.x}" cy="${a.y}" r="4" fill="#fff" stroke="${m.stroke}" stroke-width="2"/>`);
 }
 overlay.innerHTML=parts.join('');
}

function distanceToSegment(px:number,py:number,ax:number,ay:number,bx:number,by:number){
 const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;if(!len2)return Math.hypot(px-ax,py-ay);
 const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}
function hitTest(p:Pt):{selection:NonNullable<Selection>;part?:'a'|'b'|'whole'}|null{
 const t=targetElement();if(!t)return null;const r=t.getBoundingClientRect(),px=p.x*r.width,py=p.y*r.height;
 /* Symbols win over line endpoints when they overlap, so a connected symbol remains easy to move. */
 if(state.layers.symbols!==false)for(let i=state.symbols.length-1;i>=0;i--){const s=state.symbols[i],sx=s.point.x*r.width,sy=s.point.y*r.height;if(Math.hypot(px-sx,py-sy)<=19)return{selection:{type:'symbol',id:s.id}}}
 for(let i=state.lines.length-1;i>=0;i--){
  const l=state.lines[i];if(!LINE_META[l.kind]||state.layers[l.kind]===false)continue;
  const ax=l.a.x*r.width,ay=l.a.y*r.height,bx=l.b.x*r.width,by=l.b.y*r.height;
  if(Math.hypot(px-ax,py-ay)<=11)return{selection:{type:'line',id:l.id},part:'a'};
  if(Math.hypot(px-bx,py-by)<=11)return{selection:{type:'line',id:l.id},part:'b'};
 }
 for(let i=state.lines.length-1;i>=0;i--){
  const l=state.lines[i];if(!LINE_META[l.kind]||state.layers[l.kind]===false)continue;
  const ax=l.a.x*r.width,ay=l.a.y*r.height,bx=l.b.x*r.width,by=l.b.y*r.height;
  if(distanceToSegment(px,py,ax,ay,bx,by)<=9)return{selection:{type:'line',id:l.id},part:'whole'};
 }
 return null;
}

function beginSelectionDrag(p:Pt,hit:{selection:NonNullable<Selection>;part?:'a'|'b'|'whole'}){
 selection=hit.selection;activeTab='tools';
 if(selection.type==='symbol'){
  const s=state.symbols.find(x=>x.id===selection!.id);if(s)drag={type:'symbol',id:s.id,start:p,original:{...s.point}};
 }else{
  const l=state.lines.find(x=>x.id===selection!.id);if(l)drag={type:'line',id:l.id,part:hit.part||'whole',start:p,originalA:{...l.a},originalB:{...l.b}};
 }
 renderPalette();renderOverlay();
}
function setEndpointBinding(segment:UtilityLine,end:'a'|'b',symbolId?:string){
 if(end==='a'){if(symbolId)segment.aSymbolId=symbolId;else delete segment.aSymbolId}
 else{if(symbolId)segment.bSymbolId=symbolId;else delete segment.bSymbolId}
}
function moveConnectedEndpoint(kind:UtilityKind,origin:Pt,next:Pt,symbolId?:string){
 for(const segment of state.lines){
  if(segment.kind!==kind)continue;
  if(samePoint(segment.a,origin)){segment.a={...next};setEndpointBinding(segment,'a',symbolId)}
  if(samePoint(segment.b,origin)){segment.b={...next};setEndpointBinding(segment,'b',symbolId)}
 }
}
function syncBoundEndpoints(symbolId:string,point:Pt){
 for(const l of state.lines){if(l.aSymbolId===symbolId)l.a={...point};if(l.bSymbolId===symbolId)l.b={...point}}
}
function moveDrag(p:Pt,e:PointerEvent){
 if(!drag)return;
 if(drag.type==='symbol'){
  const s=state.symbols.find(x=>x.id===drag!.id);if(!s)return;
  s.point={x:clamp01(drag.original.x+p.x-drag.start.x),y:clamp01(drag.original.y+p.y-drag.start.y)};
  syncBoundEndpoints(s.id,s.point);
 }else{
  const l=state.lines.find(x=>x.id===drag!.id);if(!l)return;
  if(drag.part==='a'){
   const current={...l.a};const raw=snap(drag.originalB,{x:clamp01(p.x),y:clamp01(p.y)},e.shiftKey);const snapped=snapToSymbol(raw);
   moveConnectedEndpoint(l.kind,current,snapped.point,snapped.symbolId);
  }else if(drag.part==='b'){
   const current={...l.b};const raw=snap(drag.originalA,{x:clamp01(p.x),y:clamp01(p.y)},e.shiftKey);const snapped=snapToSymbol(raw);
   moveConnectedEndpoint(l.kind,current,snapped.point,snapped.symbolId);
  }else{
   let dx=p.x-drag.start.x,dy=p.y-drag.start.y;
   dx=Math.max(-Math.min(drag.originalA.x,drag.originalB.x),Math.min(1-Math.max(drag.originalA.x,drag.originalB.x),dx));
   dy=Math.max(-Math.min(drag.originalA.y,drag.originalB.y),Math.min(1-Math.max(drag.originalA.y,drag.originalB.y),dy));
   const currentA={...l.a},currentB={...l.b};
   const nextA={x:drag.originalA.x+dx,y:drag.originalA.y+dy},nextB={x:drag.originalB.x+dx,y:drag.originalB.y+dy};
   /* Moving a whole segment deliberately detaches its moved joints from symbols. */
   moveConnectedEndpoint(l.kind,currentA,nextA);moveConnectedEndpoint(l.kind,currentB,nextB);
  }
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
 const raw=firstPoint?snap(firstPoint,p0,e.shiftKey):p0;
 const snapped=snapToSymbol(raw);
 if(!firstPoint){firstPoint=snapped.point;firstSymbolId=snapped.symbolId;hoverPoint=snapped.point;hoverSymbolId=snapped.symbolId;renderOverlay();return}
 state.lines.push({id:uid(),kind:mode.kind,a:{...firstPoint},b:{...snapped.point},aSymbolId:firstSymbolId,bSymbolId:snapped.symbolId});
 firstPoint={...snapped.point};firstSymbolId=snapped.symbolId;hoverPoint={...snapped.point};hoverSymbolId=snapped.symbolId;saveState();renderOverlay();
}
function onPointerMove(e:PointerEvent){
 if(drag){const p=pointFromEvent(e,true);if(p)moveDrag(p,e);return}
 if(mode.type!=='line'||!firstPoint)return;
 const p=pointFromEvent(e);if(!p){hoverPoint=null;hoverSymbolId=undefined;renderOverlay();return}
 const raw=snap(firstPoint,p,e.shiftKey),snapped=snapToSymbol(raw);hoverPoint=snapped.point;hoverSymbolId=snapped.symbolId;renderOverlay();
}
function onPointerUp(e:PointerEvent){
 if(!drag)return;drag=null;saveState();renderPalette();renderOverlay();try{currentStage?.releasePointerCapture(e.pointerId)}catch{}
}
function onKey(e:KeyboardEvent){
 const target=e.target as HTMLElement|null;if(target&&(target.tagName==='INPUT'||target.tagName==='TEXTAREA'||target.isContentEditable))return;
 if((e.key==='Delete'||e.key==='Backspace')&&selection){e.preventDefault();deleteSelection();return}
 if(e.key==='Escape'){
  if(drag){drag=null;renderOverlay();return}
  if(mode.type==='line'||mode.type==='symbol'){e.preventDefault();setSelectMode();return}
  if(selection){selection=null;renderPalette();renderOverlay();return}
  if(mode.type!=='none')clearMode();
 }
}

function installInto(body:HTMLElement){
 if(body.dataset.drawingPaletteInstalled==='1')return;
 body.dataset.drawingPaletteInstalled='1';currentBody=body;currentStage=q<HTMLElement>('.drawingStage',body);if(!currentStage)return;
 loadState();
 const palette=document.createElement('aside');palette.className='drawingPalette';palette.innerHTML=`<div class="drawingPaletteTabs"><button data-tab="tools">⌖<span>Verktyg</span></button><button data-tab="lines">╱<span>Ledningar</span></button><button data-tab="symbols">◇<span>Symboler</span></button><button data-tab="layers">▱<span>Lager</span></button></div><div class="drawingPalettePanel"></div>`;
 const viewport=q<HTMLElement>('.drawingStageViewport',body);if(viewport)body.insertBefore(palette,viewport);else body.prepend(palette);
 qa<HTMLButtonElement>('.drawingPaletteTabs button',palette).forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab||'tools';renderPalette()});
 for(const b of qa<HTMLButtonElement>('.drawingToolbar button')){const txt=b.textContent||'';if(/Hand|Mät|Vinkel/.test(txt)&&!txt.includes('Kalibrera'))b.classList.add('drawingPaletteLegacyTool')}
 currentStage.addEventListener('pointerdown',onPointerDown,true);currentStage.addEventListener('pointermove',onPointerMove,true);currentStage.addEventListener('pointerup',onPointerUp,true);currentStage.addEventListener('pointercancel',onPointerUp,true);window.addEventListener('keydown',onKey);
 ensureOverlay();setSelectMode();syncMeasurementVisibility();renderOverlay();
}
function scan(){
 const body=q<HTMLElement>('.drawingBody');if(!body){currentBody=null;currentStage=null;overlay=null;return}
 if(body!==currentBody||body.dataset.drawingPaletteInstalled!=='1')installInto(body);
 else{
  const nextKey=PREFIX+encodeURIComponent(drawingIdentity());if(nextKey!==stateKey){loadState();renderPalette();syncMeasurementVisibility();renderOverlay()}
 }
}
export function installDrawingPaletteBridge(){const observer=new MutationObserver(()=>scan());observer.observe(document.documentElement,{childList:true,subtree:true});setInterval(scan,700);scan()}
