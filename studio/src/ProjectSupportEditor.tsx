import { useEffect, useState } from 'react';

type Attachment = { id:string; originalName:string; contentType:string; sizeBytes:number; url:string };
type Resource = { id:string; resource_type:string; title:string; content_text:string; sort_order:number; attachments?:Attachment[] };
type Props = { ownerType:'task'|'activity'; ownerId:string };

export function ProjectSupportEditor({ ownerType, ownerId }: Props) {
  const [resources,setResources]=useState<Resource[]>([]);
  const [open,setOpen]=useState(true);
  const [editingId,setEditingId]=useState('');
  const [title,setTitle]=useState('');
  const [content,setContent]=useState('');
  const [busy,setBusy]=useState(false);
  const [uploadingId,setUploadingId]=useState('');
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
      const data=await response.json().catch(()=>({})) as {id?:string;error?:string};
      if(!response.ok)throw new Error(data.error||'Kunde inte spara underlaget.');
      cancel();await load();setMessage(isNew?'Underlaget är sparat. Nu kan du lägga till bilder eller PDF.':'Sparat');window.setTimeout(()=>setMessage(''),2500);
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte spara underlaget.');}
    finally{setBusy(false);}
  }

  async function upload(item:Resource,file:File){
    setUploadingId(item.id);setMessage('Laddar upp bilaga…');
    try{
      if(file.size>20*1024*1024)throw new Error('Filen får vara högst 20 MB.');
      const contentType=file.type||(file.name.toLowerCase().endsWith('.pdf')?'application/pdf':'');
      if(!contentType.startsWith('image/')&&contentType!=='application/pdf')throw new Error('Endast bilder och PDF-filer stöds just nu.');
      const dataBase64=await fileToBase64(file);
      const response=await fetch(`/api/studio/project-support/${encodeURIComponent(item.id)}/file`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:file.name,contentType,dataBase64})
      });
      const raw=await response.text();
      if(isCorporateBlockPage(raw)){
        throw new Error('Filuppladdningen blockeras av nätverkets säkerhetsfilter. Text och övriga API-anrop fungerar, men bilder/PDF behöver laddas upp från ett nätverk där filöverföringen är tillåten.');
      }
      let data:{error?:string}={};
      try{data=raw?JSON.parse(raw):{};}catch{}
      if(!response.ok)throw new Error(data.error||raw||`Kunde inte ladda upp bilagan (HTTP ${response.status}).`);
      await load();setMessage('Bilagan är uppladdad');window.setTimeout(()=>setMessage(''),1800);
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte ladda upp bilagan.');}
    finally{setUploadingId('');}
  }

  async function removeAttachment(file:Attachment){
    if(!window.confirm(`Ta bort bilagan ”${file.originalName}”?`))return;
    setBusy(true);
    try{
      const response=await fetch(`/api/studio/project-support-attachments/${encodeURIComponent(file.id)}`,{method:'DELETE'});
      const data=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok)throw new Error(data.error||'Kunde inte ta bort bilagan.');
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte ta bort bilagan.');}
    finally{setBusy(false);}
  }

  async function remove(item:Resource){
    if(!window.confirm(`Ta bort ”${item.title}” och dess bilagor?`))return;
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
      <div className="projectSupportIntro"><p>{ownerType==='task'?'Lägg in ritningar, tekniska beskrivningar, bilder och annan information som gäller hela momentet.':'Lägg in instruktioner, mått, bilder eller ritningsdetaljer som bara gäller denna aktivitet.'}</p><button type="button" onClick={newItem}>＋ Nytt underlag</button></div>
      {message&&<div className="projectSupportMessage">{message}</div>}
      {editingId&&<div className="projectSupportForm"><label><span>Rubrik</span><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder={ownerType==='task'?'Ex. Grundritning och mått':'Ex. Mät från färdigt golv'} /></label><label><span>Beskrivning</span><textarea rows={8} value={content} onChange={e=>setContent(e.target.value)} placeholder="Skriv det som behövs för just detta projekt…" /></label>{editingId==='new'&&<small className="projectSupportHint">Spara underlaget först. Därefter kan du lägga till bilder och PDF-filer.</small>}<div><button onClick={cancel} disabled={busy}>Avbryt</button><button className="primary" onClick={()=>void save()} disabled={busy||!title.trim()}>{busy?'Sparar…':'Spara'}</button></div></div>}
      {!editingId&&resources.map(item=><article className="projectSupportCard" key={item.id}>
        <div className="projectSupportCardMain"><strong>{item.title}</strong>{item.content_text&&<p>{item.content_text}</p>}
          {Boolean(item.attachments?.length)&&<div className="projectSupportAttachments">{item.attachments!.map(file=><div className="projectSupportAttachment" key={file.id}>
            <a href={file.url} target="_blank" rel="noreferrer"><span>{file.contentType.startsWith('image/')?'🖼':'📄'}</span><span><b>{file.originalName}</b><small>{formatBytes(file.sizeBytes)}</small></span></a>
            <button type="button" className="danger" onClick={()=>void removeAttachment(file)} disabled={busy}>Ta bort</button>
          </div>)}</div>}
          <label className={`projectSupportUpload ${uploadingId===item.id?'busy':''}`}><input type="file" accept="image/*,application/pdf,.pdf" disabled={Boolean(uploadingId)||busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void upload(item,file);}}/><span>{uploadingId===item.id?'Laddar upp…':'＋ Lägg till bild eller PDF'}</span></label>
        </div>
        <div className="projectSupportCardActions"><button onClick={()=>edit(item)}>Redigera text</button><button className="danger" onClick={()=>void remove(item)} disabled={busy}>Ta bort underlag</button></div>
      </article>)}
      {!editingId&&!resources.length&&<div className="projectSupportEmpty">Inget {label.toLowerCase()} har lagts in för detta projekt ännu.</div>}
    </div>}
  </section>;
}

function isCorporateBlockPage(raw:string){
  const value=raw.toLowerCase();
  return value.includes('forsakringskassan.se/errorpage') ||
    value.includes('kategorin "suspicious"') ||
    value.includes('sidan &auml;r tyv&auml;rr blockerad') ||
    value.includes('sidan är tyvärr blockerad');
}

async function fileToBase64(file:File){
  const bytes=new Uint8Array(await file.arrayBuffer());
  const chunkSize=49152;
  let result='';
  for(let offset=0;offset<bytes.length;offset+=chunkSize){
    const chunk=bytes.subarray(offset,Math.min(offset+chunkSize,bytes.length));
    let binary='';
    for(let i=0;i<chunk.length;i++)binary+=String.fromCharCode(chunk[i]);
    result+=btoa(binary);
  }
  return result;
}

function formatBytes(value:number){
  if(!value)return '';
  if(value<1024)return `${value} B`;
  if(value<1024*1024)return `${Math.round(value/1024)} kB`;
  return `${(value/(1024*1024)).toFixed(1)} MB`;
}
