type MoveActivity={id:string;title:string};
type MoveTask={id:string;workArea:string;workSection:string;title:string;status:string;activities:MoveActivity[]};

const PROJECT_STORAGE_KEY='byggplan.studio.projectId';

function normalized(value:string|undefined|null){return (value||'').replace(/\s+/g,' ').trim()}

export function installActivityMoveBridge(){
 let activeDialog:HTMLElement|null=null;

 const sync=()=>{
  document.querySelectorAll<HTMLElement>('.activityEditor').forEach(editor=>{
   if(editor.querySelector('.studioActivityMoveButton'))return;
   const save=Array.from(editor.querySelectorAll<HTMLButtonElement>('button')).find(button=>normalized(button.textContent).includes('Spara ändringar'));
   if(!save)return;
   const move=document.createElement('button');
   move.type='button';
   move.className='studioActivityMoveButton';
   move.textContent='↪ Flytta aktivitet';
   move.addEventListener('click',()=>void openMoveDialog(editor));
   save.insertAdjacentElement('afterend',move);
  });
 };

 const observer=new MutationObserver(sync);
 observer.observe(document.documentElement,{childList:true,subtree:true});
 sync();

 async function openMoveDialog(editor:HTMLElement){
  const projectId=localStorage.getItem(PROJECT_STORAGE_KEY)||'';
  if(!projectId){window.alert('Inget projekt är valt.');return}
  const response=await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
  const data=await response.json().catch(()=>({})) as {tasks?:MoveTask[];error?:string};
  if(!response.ok){window.alert(data.error||'Kunde inte läsa projektstrukturen.');return}
  const tasks=data.tasks||[];
  const title=normalized(editor.querySelector('h3')?.textContent);
  const path=normalized(editor.querySelector('.activityPath')?.textContent);
  const candidates=tasks.flatMap(task=>(task.activities||[]).map(activity=>({activity,task,path:normalized(`${task.workArea} › ${task.workSection} › ${task.title}`)})));
  const current=candidates.find(item=>normalized(item.activity.title)===title&&item.path===path) || candidates.find(item=>normalized(item.activity.title)===title);
  if(!current){window.alert('Kunde inte identifiera aktiviteten. Uppdatera sidan och försök igen.');return}

  activeDialog?.remove();
  const overlay=document.createElement('div');
  overlay.className='studioMoveOverlay';
  overlay.setAttribute('role','presentation');
  const dialog=document.createElement('section');
  dialog.className='studioMoveDialog';
  dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true');
  dialog.setAttribute('aria-label','Flytta aktivitet');
  overlay.append(dialog);
  activeDialog=overlay;

  let selectedTaskId='';
  const header=document.createElement('header');
  const headerText=document.createElement('div');
  const eyebrow=document.createElement('small');eyebrow.textContent='FLYTTA AKTIVITET';
  const heading=document.createElement('h2');heading.textContent=current.activity.title;
  const from=document.createElement('p');from.textContent=`Nuvarande plats: ${current.path}`;
  headerText.append(eyebrow,heading,from);
  const close=document.createElement('button');close.type='button';close.className='studioMoveClose';close.setAttribute('aria-label','Stäng');close.textContent='×';close.addEventListener('click',()=>dismiss());
  header.append(headerText,close);
  dialog.append(header);

  const intro=document.createElement('p');intro.className='studioMoveIntro';intro.textContent='Välj det moment som aktiviteten ska flyttas till.';dialog.append(intro);
  const tree=document.createElement('div');tree.className='studioMoveTree';dialog.append(tree);

  const footer=document.createElement('footer');
  const error=document.createElement('div');error.className='studioMoveError';error.setAttribute('aria-live','polite');
  const footerButtons=document.createElement('div');
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Avbryt';cancel.addEventListener('click',()=>dismiss());
  const confirm=document.createElement('button');confirm.type='button';confirm.className='primary';confirm.textContent='Flytta hit';confirm.disabled=true;
  footerButtons.append(cancel,confirm);footer.append(error,footerButtons);dialog.append(footer);

  const areas=new Map<string,Map<string,MoveTask[]>>();
  for(const task of tasks){
   const area=task.workArea||'Övrigt';const section=task.workSection||'Övrigt';
   if(!areas.has(area))areas.set(area,new Map());
   const sections=areas.get(area)!;if(!sections.has(section))sections.set(section,[]);sections.get(section)!.push(task);
  }
  for(const[areaName,sections]of areas){
   const area=document.createElement('details');area.className='studioMoveArea';area.open=true;
   const areaSummary=document.createElement('summary');areaSummary.textContent=areaName;area.append(areaSummary);
   for(const[sectionName,sectionTasks]of sections){
    const section=document.createElement('details');section.className='studioMoveSection';section.open=sectionTasks.some(task=>task.id===current.task.id);
    const sectionSummary=document.createElement('summary');sectionSummary.textContent=sectionName;section.append(sectionSummary);
    const moments=document.createElement('div');moments.className='studioMoveMoments';
    for(const task of sectionTasks){
     const button=document.createElement('button');button.type='button';button.className='studioMoveMoment';
     const label=document.createElement('span');label.textContent=task.title;button.append(label);
     if(task.id===current.task.id){button.disabled=true;button.classList.add('current');const badge=document.createElement('small');badge.textContent='Nuvarande';button.append(badge)}
     else{
      button.addEventListener('click',()=>{
       selectedTaskId=task.id;
       tree.querySelectorAll('.studioMoveMoment.selected').forEach(node=>node.classList.remove('selected'));
       button.classList.add('selected');confirm.disabled=false;error.textContent='';
      });
     }
     moments.append(button);
    }
    section.append(moments);area.append(section);
   }
   tree.append(area);
  }

  confirm.addEventListener('click',async()=>{
   if(!selectedTaskId)return;
   confirm.disabled=true;cancel.disabled=true;error.textContent='Flyttar…';
   try{
    const r=await fetch(`/api/activities/${encodeURIComponent(current.activity.id)}/move`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetTaskId:selectedTaskId})});
    const d=await r.json().catch(()=>({})) as {error?:string};
    if(!r.ok)throw new Error(d.error||'Aktiviteten kunde inte flyttas.');
    error.textContent='Aktiviteten är flyttad.';
    window.setTimeout(()=>window.location.reload(),250);
   }catch(e){error.textContent=e instanceof Error?e.message:'Aktiviteten kunde inte flyttas.';confirm.disabled=false;cancel.disabled=false}
  });

  overlay.addEventListener('mousedown',event=>{if(event.target===overlay)dismiss()});
  document.addEventListener('keydown',escapeHandler);
  document.body.append(overlay);
  close.focus();

  function escapeHandler(event:KeyboardEvent){if(event.key==='Escape')dismiss()}
  function dismiss(){document.removeEventListener('keydown',escapeHandler);overlay.remove();if(activeDialog===overlay)activeDialog=null}
 }
}
