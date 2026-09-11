type TouchPoint={x:number;y:number};

type DrawingUi={
 workspace:HTMLElement;
 body:HTMLElement;
 list:HTMLElement|null;
 measurements:HTMLElement|null;
 stage:HTMLElement|null;
 viewport:HTMLElement|null;
 toolbar:HTMLElement|null;
};

const LEFT_KEY='byggplan.drawingUi.leftCollapsed';
const RIGHT_KEY='byggplan.drawingUi.rightCollapsed';
let currentWorkspace:HTMLElement|null=null;
let cleanupCurrent:(()=>void)|null=null;

function q<T extends Element>(selector:string,root:ParentNode=document){return root.querySelector(selector) as T|null}
function stored(key:string){try{return localStorage.getItem(key)==='1'}catch{return false}}
function store(key:string,value:boolean){try{localStorage.setItem(key,value?'1':'0')}catch{}}

function getUi(workspace:HTMLElement):DrawingUi{
 const main=q<HTMLElement>('.drawingMain',workspace);
 const body=main?q<HTMLElement>('.drawingBody',main):null;
 return {
  workspace,
  body:body||document.createElement('div'),
  list:q<HTMLElement>('.drawingList',workspace),
  measurements:body?q<HTMLElement>('.measurementPanel',body):null,
  stage:body?q<HTMLElement>('.drawingStage',body):null,
  viewport:body?q<HTMLElement>('.drawingStageViewport',body):null,
  toolbar:q<HTMLElement>('.projectDocumentsHeaderTools .drawingToolbar')
 };
}

function installPanelControls(ui:DrawingUi){
 let leftCollapsed=stored(LEFT_KEY),rightCollapsed=stored(RIGHT_KEY);
 let controls=q<HTMLElement>('.drawingViewControls',ui.toolbar||document);
 if(!controls&&ui.toolbar){
  controls=document.createElement('div');
  controls.className='drawingViewControls';
  controls.innerHTML='<button type="button" data-drawing-toggle="left" title="Visa/dölj ritningslistan">☰ Ritningar</button><button type="button" data-drawing-toggle="right" title="Visa/dölj skala och registrerade mått">▤ Mått</button><button type="button" data-drawing-toggle="max" title="Maximera/minimera ritytan">⛶ Rityta</button>';
  ui.toolbar.prepend(controls);
 }
 const leftButton=controls?q<HTMLButtonElement>('[data-drawing-toggle="left"]',controls):null;
 const rightButton=controls?q<HTMLButtonElement>('[data-drawing-toggle="right"]',controls):null;
 const maxButton=controls?q<HTMLButtonElement>('[data-drawing-toggle="max"]',controls):null;

 const apply=()=>{
  ui.workspace.classList.toggle('drawingListCollapsed',leftCollapsed);
  ui.body.classList.toggle('measurementPanelCollapsed',rightCollapsed);
  ui.body.classList.toggle('drawingCanvasMaximized',leftCollapsed&&rightCollapsed);
  if(leftButton){leftButton.classList.toggle('active',!leftCollapsed);leftButton.setAttribute('aria-pressed',String(!leftCollapsed));leftButton.title=leftCollapsed?'Visa ritningslistan':'Dölj ritningslistan'}
  if(rightButton){rightButton.classList.toggle('active',!rightCollapsed);rightButton.setAttribute('aria-pressed',String(!rightCollapsed));rightButton.title=rightCollapsed?'Visa skala och mått':'Dölj skala och mått'}
  if(maxButton){maxButton.classList.toggle('active',leftCollapsed&&rightCollapsed);maxButton.textContent=leftCollapsed&&rightCollapsed?'▣ Återställ':'⛶ Rityta'}
  store(LEFT_KEY,leftCollapsed);store(RIGHT_KEY,rightCollapsed);
 };
 const toggleLeft=()=>{leftCollapsed=!leftCollapsed;apply()};
 const toggleRight=()=>{rightCollapsed=!rightCollapsed;apply()};
 const toggleMax=()=>{const maximized=leftCollapsed&&rightCollapsed;leftCollapsed=!maximized;rightCollapsed=!maximized;apply()};
 if(leftButton)leftButton.onclick=toggleLeft;
 if(rightButton)rightButton.onclick=toggleRight;
 if(maxButton)maxButton.onclick=toggleMax;

 if(ui.list){
  let b=q<HTMLButtonElement>('.drawingPanelCollapseButton[data-side="left"]',ui.list);
  if(!b){b=document.createElement('button');b.type='button';b.className='drawingPanelCollapseButton';b.dataset.side='left';b.title='Dölj ritningslistan';b.textContent='‹';ui.list.prepend(b)}
  b.onclick=toggleLeft;
 }
 if(ui.measurements){
  let b=q<HTMLButtonElement>('.drawingPanelCollapseButton[data-side="right"]',ui.measurements);
  if(!b){b=document.createElement('button');b.type='button';b.className='drawingPanelCollapseButton';b.dataset.side='right';b.title='Dölj måttpanelen';b.textContent='›';ui.measurements.prepend(b)}
  b.onclick=toggleRight;
 }
 apply();
 return()=>{if(leftButton)leftButton.onclick=null;if(rightButton)rightButton.onclick=null;if(maxButton)maxButton.onclick=null};
}

function installTouchGestures(ui:DrawingUi){
 const stage=ui.stage,viewport=ui.viewport;if(!stage||!viewport)return()=>{};
 const pointers=new Map<number,TouchPoint>();
 let pan:null|{id:number;x:number;y:number;scrollLeft:number;scrollTop:number}=null;
 let pinchDistance=0;
 const isSelectMode=()=>Boolean(q('.drawingPalettePanel [data-select].active',ui.body));
 const distance=()=>{const a=[...pointers.values()];return a.length<2?0:Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y)};
 const resetPanToRemaining=()=>{const first=[...pointers.entries()][0];if(!first){pan=null;return}pan={id:first[0],x:first[1].x,y:first[1].y,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop}};
 const zoomStep=(direction:1|-1)=>{
  const ev=new WheelEvent('wheel',{deltaY:direction>0?-100:100,ctrlKey:true,bubbles:true,cancelable:true});
  viewport.dispatchEvent(ev);
 };
 const down=(e:PointerEvent)=>{
  if(e.pointerType!=='touch'||!isSelectMode()||e.defaultPrevented)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{stage.setPointerCapture(e.pointerId)}catch{}
  if(pointers.size===1)pan={id:e.pointerId,x:e.clientX,y:e.clientY,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop};
  else if(pointers.size===2){pan=null;pinchDistance=distance();}
  e.preventDefault();
 };
 const move=(e:PointerEvent)=>{
  if(e.pointerType!=='touch'||!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  e.preventDefault();
  if(pointers.size>=2){
   const d=distance();if(!pinchDistance){pinchDistance=d;return}
   const ratio=d/pinchDistance;
   if(ratio>=1.035){zoomStep(1);pinchDistance=d}
   else if(ratio<=.966){zoomStep(-1);pinchDistance=d}
   return;
  }
  if(pan&&pan.id===e.pointerId){viewport.scrollLeft=pan.scrollLeft-(e.clientX-pan.x);viewport.scrollTop=pan.scrollTop-(e.clientY-pan.y)}
 };
 const up=(e:PointerEvent)=>{
  if(e.pointerType!=='touch'||!pointers.has(e.pointerId))return;
  pointers.delete(e.pointerId);pinchDistance=pointers.size>=2?distance():0;
  if(pointers.size===1)resetPanToRemaining();else if(!pointers.size)pan=null;
  try{stage.releasePointerCapture(e.pointerId)}catch{}
 };
 stage.addEventListener('pointerdown',down,false);
 stage.addEventListener('pointermove',move,false);
 stage.addEventListener('pointerup',up,false);
 stage.addEventListener('pointercancel',up,false);
 return()=>{stage.removeEventListener('pointerdown',down,false);stage.removeEventListener('pointermove',move,false);stage.removeEventListener('pointerup',up,false);stage.removeEventListener('pointercancel',up,false)};
}

function install(workspace:HTMLElement){
 const ui=getUi(workspace);if(!ui.body.classList.contains('drawingBody'))return;
 const cleanupPanels=installPanelControls(ui),cleanupTouch=installTouchGestures(ui);
 cleanupCurrent=()=>{cleanupPanels();cleanupTouch()};currentWorkspace=workspace;
}

function scan(){
 const workspace=q<HTMLElement>('.drawingWorkspace');
 if(!workspace){cleanupCurrent?.();cleanupCurrent=null;currentWorkspace=null;return}
 if(workspace!==currentWorkspace){cleanupCurrent?.();install(workspace);return}
 const ui=getUi(workspace);
 if(ui.toolbar&&!q('.drawingViewControls',ui.toolbar)){cleanupCurrent?.();install(workspace)}
}

export function installDrawingWorkspaceUx(){
 const observer=new MutationObserver(scan);observer.observe(document.documentElement,{childList:true,subtree:true});window.setInterval(scan,800);scan();
}
