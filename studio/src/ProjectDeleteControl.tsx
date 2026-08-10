import { useState } from 'react';

export function ProjectDeleteControl({projectId,projectName}:{projectId:string;projectName:string}){
  const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
  async function remove(){
    const shortId=projectId.slice(0,8);
    const typed=window.prompt(`Radera projektet ”${projectName}” (${shortId})?\n\nDetta tar bort projektets struktur, underlag, administrativa uppgifter och projektdokument. Masterprojektet påverkas inte.\n\nSkriv projektnamnet för att bekräfta:`,'');
    if(typed!==projectName)return;
    if(!window.confirm(`Sista bekräftelsen: radera ”${projectName}” (${shortId}) permanent?`))return;
    setBusy(true);setMessage('Tar bort projektet…');
    try{
      const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}`,{method:'DELETE'});
      const raw=await r.text();
      let error='';
      try{const d=JSON.parse(raw) as {error?:string};error=d.error||''}catch{error=raw.trim().slice(0,500)}
      if(!r.ok)throw new Error(error||`Projektet kunde inte tas bort (HTTP ${r.status}).`);
      window.location.reload();
    }catch(e){setMessage(e instanceof Error?e.message:'Projektet kunde inte tas bort.');setBusy(false)}
  }
  return <section className="projectDeleteZone"><div><small>PROJEKTÅTGÄRDER</small><h2>Radera projekt</h2><p>Tar bort det aktuella projektet och dess projektspecifika data. Masterprojektet påverkas inte. Projekt-ID: <code>{projectId.slice(0,8)}</code>.</p>{message&&<div className="projectSupportMessage">{message}</div>}</div><button className="danger" disabled={busy} onClick={()=>void remove()}>{busy?'Tar bort…':'Radera projekt'}</button></section>;
}
