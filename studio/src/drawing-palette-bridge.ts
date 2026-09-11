type UtilityKind='water'|'sewer'|'electric'|'fiber';
type SymbolKind='water-service'|'shutoff'|'septic'|'inspection-well'|'meter-cabinet'|'meter-pole'|'fiber-well'|'connection';
type Pt={x:number;y:number};
type UtilityLine={id:string;kind:UtilityKind;a:Pt;b:Pt};
type DrawingSymbol={id:string;kind:SymbolKind;point:Pt};
type PaletteState={lines:UtilityLine[];symbols:DrawingSymbol[];layers:Record<string,boolean>};
type Mode={type:'none'}|{type:'line';kind:UtilityKind}|{type:'symbol';kind:SymbolKind};

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
function drawingIdentity(){
 const project=q<HTMLElement>('.projectDocumentsTitle h1')?.textContent?.trim()||'projekt';
 const drawing=q<HTMLElement>('.drawingList>button.active b')?.textContent?.trim()||'ritning';
 const file=q<HTMLSelectElement>('.drawingFilePicker select')?.value||'';
 const page=q<HTMLElement>('.drawingPages span')?.textContent?.trim()||'sida1';
 return `${project}|${drawing}|${file}|${page}`;
}
function loadState(){
 stateKey=PREFIX+encodeURIComponent(drawingIdentity());
 try{const raw=localStorage.getItem(stateKey);state=raw?{...JSON.parse(raw),layers:{...DEFAULT_LAYERS,...JSON.parse(raw).layers}}:{lines:[],symbols:[],layers:{...DEFAULT_LAYERS}}}catch{state={lines:[],symbols:[],layers:{...DEFAULT_LAYERS}}}
}
function saveState(){try{localStorage.setItem(stateKey,JSON.stringify(state))}catch{}}
function targetElement(){return q<HTMLCanvasElement|HTMLImageElement>('.drawingStage canvas,.drawingStage img',currentStage||document)}
function pointFromEvent(e:PointerEvent):Pt|null{const t=targetElement();if(!t)return null;const r=t.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return null;return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
function snap(origin:Pt,p:Pt,shift:boolean){if(!shift)return p;const t=targetElement();if(!t)return p;const r=t.getBoundingClientRect(),dx=(p.x-origin.x)*r.width,dy=(p.y-origin.y)*r.height,len=Math.hypot(dx,dy);if(!len)return p;const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4);return{x:origin.x+Math.cos(a)*len/r.width,y:origin.y+Math.sin(a)*len/r.height}}
function clickLegacy(text:string){const b=qa<HTMLButtonElement>('.drawingToolbar button').find(x=>x.textContent?.includes(text));b?.click()}
function clearMode(){mode={type:'none'};firstPoint=null;hoverPoint=null;renderPalette();renderOverlay()}
function setLineMode(kind:UtilityKind){mode={type:'line',kind};firstPoint=null;hoverPoint=null;activeTab='lines';renderPalette();renderOverlay()}
function setSymbolMode(kind:SymbolKind){mode={type:'symbol',kind};firstPoint=null;hoverPoint=null;activeTab='symbols';renderPalette();renderOverlay()}
function activateLegacy(label:string){clearMode();clickLegacy(label)}
function renderPalette(){
 const host=q<HTMLElement>('.drawingPalettePanel',currentBody||document);if(!host)return;
 const tabs=qa<HTMLButtonElement>('.drawingPaletteTabs button',currentBody||document);tabs.forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));
 if(activeTab==='tools')host.innerHTML=`<small>VERKTYG</small><button data-legacy="Hand">✋ Hand / markera</button><button data-legacy="Mät">📏 Längdmått</button><button data-legacy="Vinkel">∠ Vinkel</button><p>Kalibrering ligger kvar i verktygsraden ovanför ritningen.</p>`;
 else if(activeTab==='lines')host.innerHTML=`<small>RITA LEDNING</small>${(Object.entries(LINE_META) as [UtilityKind,typeof LINE_META[UtilityKind]][]).map(([k,m])=>`<button data-line="${k}" class="${mode.type==='line'&&mode.kind===k?'active':''}"><span>${m.icon}</span>${m.name}</button>`).join('')}<p>Klicka start- och slutpunkt. Håll Shift för 45°-snäppning.</p>`;
 else if(activeTab==='symbols')host.innerHTML=`<small>PLACERA SYMBOL</small>${(Object.entries(SYMBOL_META) as [SymbolKind,typeof SYMBOL_META[SymbolKind]][]).map(([k,m])=>`<button data-symbol="${k}" class="${mode.type==='symbol'&&mode.kind===k?'active':''}"><span>${m.icon}</span>${esc(m.name)}</button>`).join('')}<p>Välj symbol och klicka på ritningen. Du kan placera flera av samma symbol efter varandra.</p>`;
 else host.innerHTML=`<small>LAGER</small>${[['measure','Mått'],['water','Vatten'],['sewer','Avlopp'],['electric','El'],['fiber','Fiber'],['symbols','Symboler']].map(([k,n])=>`<label><input type="checkbox" data-layer="${k}" ${state.layers[k]!==false?'checked':''}><span>${n}</span></label>`).join('')}<p>Lager påverkar bara visningen, inte sparade objekt.</p>`;
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
 for(const l of state.lines){if(state.layers[l.kind]===false)continue;const m=LINE_META[l.kind],a={x:l.a.x*w,y:l.a.y*h},b={x:l.b.x*w,y:l.b.y*h};parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${m.stroke}" stroke-width="3" ${m.dash?`stroke-dasharray="${m.dash}"`:''}/><circle cx="${a.x}" cy="${a.y}" r="3" fill="#fff" stroke="${m.stroke}" stroke-width="2"/><circle cx="${b.x}" cy="${b.y}" r="3" fill="#fff" stroke="${m.stroke}" stroke-width="2"/>`)}
 if(state.layers.symbols!==false)for(const s of state.symbols){const m=SYMBOL_META[s.kind],x=s.point.x*w,y=s.point.y*h;parts.push(`<g><circle cx="${x}" cy="${y}" r="12" fill="white" stroke="#244b37" stroke-width="2"/><text x="${x}" y="${y+3}" text-anchor="middle" font-size="8" font-weight="900" fill="#244b37">${m.glyph}</text></g>`)}
 if(mode.type==='line'&&firstPoint&&hoverPoint){const m=LINE_META[mode.kind],a={x:firstPoint.x*w,y:firstPoint.y*h},b={x:hoverPoint.x*w,y:hoverPoint.y*h};parts.push(`<line class="drawingUtilityPreview" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${m.stroke}" stroke-width="3" ${m.dash?`stroke-dasharray="${m.dash}"`:''}/><circle cx="${a.x}" cy="${a.y}" r="4" fill="#fff" stroke="${m.stroke}" stroke-width="2"/>`)}
 overlay.innerHTML=parts.join('');
}
function onPointerDown(e:PointerEvent){
 if(mode.type==='none')return;const p0=pointFromEvent(e);if(!p0)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 if(mode.type==='symbol'){state.symbols.push({id:uid(),kind:mode.kind,point:p0});saveState();renderOverlay();return}
 const p=firstPoint?snap(firstPoint,p0,e.shiftKey):p0;if(!firstPoint){firstPoint=p;hoverPoint=p;renderOverlay();return}state.lines.push({id:uid(),kind:mode.kind,a:firstPoint,b:p});firstPoint=null;hoverPoint=null;saveState();renderOverlay();
}
function onPointerMove(e:PointerEvent){if(mode.type!=='line'||!firstPoint)return;const p=pointFromEvent(e);if(!p)return;hoverPoint=snap(firstPoint,p,e.shiftKey);renderOverlay()}
function onKey(e:KeyboardEvent){if(e.key==='Escape'&&mode.type!=='none')clearMode()}
function installInto(body:HTMLElement){
 if(body.dataset.drawingPaletteInstalled==='1')return;body.dataset.drawingPaletteInstalled='1';currentBody=body;currentStage=q<HTMLElement>('.drawingStage',body);if(!currentStage)return;
 loadState();
 const palette=document.createElement('aside');palette.className='drawingPalette';palette.innerHTML=`<div class="drawingPaletteTabs"><button data-tab="tools">⌖<span>Verktyg</span></button><button data-tab="lines">╱<span>Ledningar</span></button><button data-tab="symbols">◇<span>Symboler</span></button><button data-tab="layers">▱<span>Lager</span></button></div><div class="drawingPalettePanel"></div>`;
 const viewport=q<HTMLElement>('.drawingStageViewport',body);if(viewport)body.insertBefore(palette,viewport);else body.prepend(palette);
 qa<HTMLButtonElement>('.drawingPaletteTabs button',palette).forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab||'tools';renderPalette()});
 for(const b of qa<HTMLButtonElement>('.drawingToolbar button')){const txt=b.textContent||'';if(/Hand|Mät|Vinkel/.test(txt)&&!txt.includes('Kalibrera'))b.classList.add('drawingPaletteLegacyTool')}
 currentStage.addEventListener('pointerdown',onPointerDown,true);currentStage.addEventListener('pointermove',onPointerMove,true);window.addEventListener('keydown',onKey);
 ensureOverlay();renderPalette();syncMeasurementVisibility();renderOverlay();
}
function scan(){const body=q<HTMLElement>('.drawingBody');if(!body){currentBody=null;currentStage=null;overlay=null;return}if(body!==currentBody||body.dataset.drawingPaletteInstalled!=='1')installInto(body);else{const nextKey=PREFIX+encodeURIComponent(drawingIdentity());if(nextKey!==stateKey){loadState();renderPalette();syncMeasurementVisibility();renderOverlay()}}}

export function installDrawingPaletteBridge(){
 const observer=new MutationObserver(()=>scan());observer.observe(document.documentElement,{childList:true,subtree:true});setInterval(scan,700);scan();
}
