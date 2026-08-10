import { useState } from 'react';

export function ProjectDeleteControl({projectId,projectName}:{projectId:string;projectName:string}){
  const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
  async function remove(){
    const typed=window.prompt(`Radera projektet ”${projectName}”?\n\nDetta tar bort projektets struktur, underlag, administrativa uppgifter och projektdokument. Masterprojektet påverkas inte.\n\nSkriv projektnamnet för att bekräfta:`,'');
    if(typed!==projectName)return;
    if(!window.confirm(`Sista bekräftelsen: radera ”${projectName}” permanent?`))return;
    setBusy(true);setMessage('Tar bort projektet…');
    try{
      const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}`,{method:'DELETE'});
      const d=await r.json().catch(()=>({})) as {error?:string};
      if(!r.ok)throw new Error(d.error||'Projektet kunde inte tas bort.');
      window.location.reload();
    }catch(e){setMessage(e instanceof Error?e.message:'Projektet kunde inte tas bort.');setBusy(false)}
  }
  return <section className="projectDeleteZone"><div><small>PROJEKTÅTGÄRDER</small><h2>Radera projekt</h2><p>Tar bort det aktuella projektet och dess projektspecifika data. Masterprojektet påverkas inte.</p>{message&&<div className="projectSupportMessage">{message}</div>}</div><button className="danger" disabled={busy} onClick={()=>void remove()}>{busy?'Tar bort…':'Radera projekt'}</button></section>;
}
