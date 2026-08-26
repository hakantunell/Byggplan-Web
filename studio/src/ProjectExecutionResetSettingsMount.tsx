import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

const PROJECT_STORAGE_KEY='byggplan.studio.projectId';
type Project={id:string;name:string};
type ResetResult={ok?:boolean;error?:string;counts?:Record<string,number>};

export function ProjectExecutionResetSettingsMount(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  let host:HTMLElement|null=null;
  const sync=()=>{
   const workspace=document.querySelector('.projectWorkspace') as HTMLElement|null;
   const page=workspace?.querySelector('.projectMain .projectPage') as HTMLElement|null;
   const isSettings=page?.querySelector('.pageHero small')?.textContent?.trim()==='INSTÄLLNINGAR';
   const danger=page?.querySelector(':scope > .infoCard.dangerZone') as HTMLElement|null;
   if(!workspace||!page||!isSettings||!danger){host?.remove();host=null;setTarget(null);return}
   if(!host||!host.isConnected){host=document.createElement('div');host.className='projectExecutionResetHost';danger.appendChild(host);setTarget(host)}
  };
  sync();const timer=window.setInterval(sync,180);
  return()=>{window.clearInterval(timer);host?.remove();setTarget(null)};
 },[]);
 if(!target)return null;
 return createPortal(<ProjectExecutionResetControl/>,target);
}

function ProjectExecutionResetControl(){
 const[project,setProject]=useState<Project|null>(null),[open,setOpen]=useState(false),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{void loadProject()},[]);
 async function loadProject(){
  let id='';try{id=localStorage.getItem(PROJECT_STORAGE_KEY)||''}catch{}
  if(!id)return;
  try{const r=await fetch('/api/projects',{cache:'no-store'});if(!r.ok)return;const d=await r.json() as {projects?:Project[]};setProject((d.projects||[]).find(p=>p.id===id)||null)}catch{}
 }
 async function reset(){
  if(!project||confirmation.trim()!==project.name.trim()||busy)return;
  setBusy(true);setMessage('Återställer projektets utförande…');
  try{
   const r=await fetch(`/api/studio/projects/${encodeURIComponent(project.id)}/reset-execution`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmProjectName:confirmation})});
   const d=await r.json().catch(()=>({})) as ResetResult;
   if(!r.ok)throw new Error(d.error||'Återställningen misslyckades.');
   const removed=Object.values(d.counts||{}).reduce((sum,n)=>sum+Number(n||0),0);
   setMessage(`Projektets utförande är återställt${removed?` (${removed} poster/filer raderade)`:''}. Laddar om…`);
   window.dispatchEvent(new CustomEvent('byggplan:activity-status-changed'));
   window.setTimeout(()=>window.location.reload(),900);
  }catch(e){setMessage(e instanceof Error?e.message:'Återställningen misslyckades.');setBusy(false)}
 }
 return <div style={{borderTop:'1px solid #ead0d0',marginTop:18,paddingTop:18}}>
  <h3 style={{margin:'0 0 6px'}}>Återställ projektets utförande</h3>
  <p style={{margin:'0 0 10px'}}>Nollställer genomförandestatus och tar bort dokumentation som registrerats under arbetets gång, utan att ändra själva projektdefinitionen.</p>
  <p style={{margin:'0 0 12px',fontSize:13}}><b>Raderas:</b> klarmarkeringar och aktivitetsvärden, aktivitetsdokumentation och uppladdade aktivitetsfiler, egna aktivitetsanteckningar/filer, kontrollsigneringar samt momentens genomförandestatus.</p>
  <p style={{margin:'0 0 12px',fontSize:13}}><b>Behålls:</b> projektstruktur, aktiviteters namn och instruktioner, styrdokument, projektdokument, projektinformation, projektvillkor och kartläggning/kopplingar.</p>
  {!open?<button className="danger" onClick={()=>{setOpen(true);setMessage('')}} disabled={!project}>Återställ projektets utförande…</button>:<div style={{display:'grid',gap:9,maxWidth:620}}>
   <div style={{padding:'10px 12px',background:'#fff4f2',border:'1px solid #e2b7b0',borderRadius:8,fontSize:13}}><b>Detta kan inte ångras.</b> Skapa gärna en projektbackup först. Skriv projektets namn <b>{project?.name}</b> för att bekräfta.</div>
   <input aria-label="Bekräfta projektnamn" value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder={project?.name||'Projektets namn'} disabled={busy} style={{maxWidth:420,padding:'9px 10px',border:'1px solid #cfd7dc',borderRadius:7,font:'inherit'}}/>
   <div style={{display:'flex',gap:8}}><button onClick={()=>{setOpen(false);setConfirmation('');setMessage('')}} disabled={busy}>Avbryt</button><button className="danger" onClick={()=>void reset()} disabled={busy||!project||confirmation.trim()!==project.name.trim()}>{busy?'Återställer…':'Ja, återställ utförandet'}</button></div>
  </div>}
  {message&&<p style={{margin:'10px 0 0',fontSize:13}}>{message}</p>}
 </div>;
}
