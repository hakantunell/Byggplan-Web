import { useEffect, useState } from 'react';

type Resource = { id:string; resource_type:string; title:string; content_text:string; sort_order:number };
type Props = { ownerType:'task'|'activity'; ownerId:string };

export function ProjectSupportEditor({ ownerType, ownerId }: Props) {
  const [resources,setResources]=useState<Resource[]>([]);
  const [open,setOpen]=useState(true);
  const [editingId,setEditingId]=useState('');
  const [title,setTitle]=useState('');
  const [content,setContent]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const label=ownerType==='task'?'Arbetsunderlag':'Detaljunderlag';

  useEffect(()=>{ void load(); },[ownerType,ownerId]);

  async function load(){
    setMessage('');
    try{
      const response=await fetch(`/api/studio/project-support/${ownerType}/${encodeURIComponent(ownerId)}`,{cache:'no-store'});
      const data=await response.json().catch(()=>({})) as {resources?:Resource[];error?:string};
      if(!response.ok)throw new Error(data.error||`Kunde inte läsa ${label.toLowerCase()}.`);
      setResources(data.resources||[]);
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte läsa underlag.');}
  }

  function newItem(){setEditingId('new');setTitle('');setContent('');setOpen(true);}
  function edit(item:Resource){setEditingId(item.id);setTitle(item.title);setContent(item.content_text||'');setOpen(true);}
  function cancel(){setEditingId('');setTitle('');setContent('');}

  async function save(){
    if(!title.trim())return;
    setBusy(true);setMessage('Sparar…');
    try{
      const isNew=editingId==='new';
      const response=await fetch(isNew?`/api/studio/project-support/${ownerType}/${encodeURIComponent(ownerId)}`:`/api/studio/project-support/${editingId}`,{
        method:isNew?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title.trim(),contentText:content,resourceType:'text'})
      });
      const data=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok)throw new Error(data.error||'Kunde inte spara underlaget.');
      cancel();await load();setMessage('Sparat');window.setTimeout(()=>setMessage(''),1500);
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte spara underlaget.');}
    finally{setBusy(false);}
  }

  async function remove(item:Resource){
    if(!window.confirm(`Ta bort ”${item.title}”?`))return;
    setBusy(true);
    try{
      const response=await fetch(`/api/studio/project-support/${item.id}`,{method:'DELETE'});
      const data=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok)throw new Error(data.error||'Kunde inte ta bort underlaget.');
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte ta bort underlaget.');}
    finally{setBusy(false);}
  }

  return <section className="projectSupportEditor">
    <button type="button" className="projectSupportHeader" onClick={()=>setOpen(value=>!value)}>
      <span>{open?'⌄':'›'}</span><strong>{label}</strong><small>{resources.length ? `${resources.length} underlag` : 'Inget underlag ännu'}</small>
    </button>
    {open&&<div className="projectSupportBody">
      <div className="projectSupportIntro"><p>{ownerType==='task'?'Lägg in ritningsreferenser, tekniska beskrivningar och annan information som gäller hela momentet.':'Lägg in instruktioner, mått eller annan information som bara gäller denna aktivitet.'}</p><button type="button" onClick={newItem}>＋ Ny beskrivning</button></div>
      {message&&<div className="projectSupportMessage">{message}</div>}
      {editingId&&<div className="projectSupportForm"><label><span>Rubrik</span><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder={ownerType==='task'?'Ex. Grundritning och mått':'Ex. Mät från färdigt golv'} /></label><label><span>Beskrivning</span><textarea rows={8} value={content} onChange={e=>setContent(e.target.value)} placeholder="Skriv det som behövs för just detta projekt…" /></label><div><button onClick={cancel} disabled={busy}>Avbryt</button><button className="primary" onClick={()=>void save()} disabled={busy||!title.trim()}>{busy?'Sparar…':'Spara'}</button></div></div>}
      {!editingId&&resources.map(item=><article className="projectSupportCard" key={item.id}><div><strong>{item.title}</strong>{item.content_text&&<p>{item.content_text}</p>}</div><div><button onClick={()=>edit(item)}>Redigera</button><button className="danger" onClick={()=>void remove(item)} disabled={busy}>Ta bort</button></div></article>)}
      {!editingId&&!resources.length&&<div className="projectSupportEmpty">Inget {label.toLowerCase()} har lagts in för detta projekt ännu.</div>}
    </div>}
  </section>;
}
