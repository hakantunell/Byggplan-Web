import { useState } from 'react';

const documentTypes=[
  ['control_plan','Kontrollplan'],
  ['authority_decision','Myndighetsbeslut / tillstånd'],
  ['building_permit','Bygglov'],
  ['technical_consultation','Tekniskt samråd'],
  ['work_environment','Arbetsmiljö'],
  ['other','Annat styrdokument']
] as const;

export function GoverningDocumentsImportAction({projectId}:{projectId:string}){
  const[open,setOpen]=useState(false);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
  const[documentType,setDocumentType]=useState('control_plan');const[title,setTitle]=useState('');const[issuer,setIssuer]=useState('');const[reference,setReference]=useState('');const[file,setFile]=useState<File|null>(null);
  function reset(){setOpen(false);setBusy(false);setMessage('');setDocumentType('control_plan');setTitle('');setIssuer('');setReference('');setFile(null)}
  async function save(){if(!projectId||!title.trim()||!file)return;setBusy(true);setMessage('Importerar styrdokument…');try{if(file.size>25*1024*1024)throw new Error('Filen får vara högst 25 MB.');const form=new FormData();form.append('projectId',projectId);form.append('documentType',documentType);form.append('title',title.trim());form.append('issuer',issuer.trim());form.append('reference',reference.trim());form.append('file',file,file.name);const r=await fetch('/api/studio/governing-document-files/import',{method:'POST',body:form});const raw=await r.text();let d:{error?:string}={};try{d=raw?JSON.parse(raw):{}}catch{}if(!r.ok)throw new Error(d.error||raw||`Importen misslyckades (HTTP ${r.status}).`);setMessage('Styrdokumentet är importerat.');window.setTimeout(()=>window.location.reload(),450);}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte importera styrdokumentet.');setBusy(false)}}
  return <><button className="governingImportActionButton" onClick={()=>setOpen(true)}>＋ Importera styrdokument</button>{open&&<div className="governingImportModalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)reset()}}><div className="governingImportModal"><div className="governingImportModalHeader"><div><small>STYRDOKUMENT</small><h2>Importera styrdokument</h2></div><button disabled={busy} onClick={reset}>×</button></div>{message&&<div className="projectSupportMessage">{message}</div>}<div className="projectSupportForm"><label><span>Dokumenttyp</span><select value={documentType} onChange={e=>setDocumentType(e.target.value)}>{documentTypes.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label><span>Rubrik</span><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. Kontrollplan inför tekniskt samråd"/></label><label><span>Utfärdare</span><input value={issuer} onChange={e=>setIssuer(e.target.value)} placeholder="Ex. Kontrollansvarig eller Härjedalens kommun"/></label><label><span>Referens / diarienummer</span><input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Valfritt"/></label><label className="projectSupportUpload"><input type="file" accept="image/*,application/pdf,.pdf" onChange={e=>{const selected=e.target.files?.[0]||null;e.target.value='';setFile(selected)}}/><span>{file?`📎 ${file.name}`:'＋ Välj PDF eller bild'}</span></label><div><button disabled={busy} onClick={reset}>Avbryt</button><button className="primary" disabled={busy||!title.trim()||!file} onClick={()=>void save()}>{busy?'Importerar…':'Importera'}</button></div></div></div></div>}</>;
}
