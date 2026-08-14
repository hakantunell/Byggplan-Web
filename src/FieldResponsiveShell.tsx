import {useCallback,useEffect,useMemo,useState} from 'react';
import {App} from './App';
import {ProjectDocumentsBar} from './ProjectDocumentsBar';

type Attachment={id:string;originalName:string;contentType:string;sizeBytes:number;url:string};
type ProjectDocument={id:string;title:string;description:string;category?:string;attachments:Attachment[]};
type Selection={kind:'activities'}|{kind:'document';documentId:string};
const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');

export function FieldResponsiveShell(){
  const[projectId,setProjectId]=useState('');
  const[documents,setDocuments]=useState<ProjectDocument[]>([]);
  const[selection,setSelection]=useState<Selection>({kind:'activities'});
  const[loading,setLoading]=useState(false);
  const[message,setMessage]=useState('');
  const[objectUrl,setObjectUrl]=useState('');
  const[openDrawings,setOpenDrawings]=useState(true);
  const[openOther,setOpenOther]=useState(true);

  useEffect(()=>{
    const onProject=(event:Event)=>{const id=(event as CustomEvent<{projectId?:string}>).detail?.projectId||'';if(id){setProjectId(id);setSelection({kind:'activities'});}};
    window.addEventListener('byggplan:active-project',onProject);
    return()=>window.removeEventListener('byggplan:active-project',onProject);
  },[]);

  const loadDocuments=useCallback(async()=>{
    if(!projectId)return;
    setLoading(true);setMessage('');
    try{
      const response=await fetch(`${API_BASE}/api/project-documents?projectId=${encodeURIComponent(projectId)}`,{cache:'no-store'});
      const data=await response.json().catch(()=>({})) as {documents?:ProjectDocument[];error?:string};
      if(!response.ok)throw new Error(data.error||'Kunde inte läsa projektdokument.');
      setDocuments(data.documents||[]);
    }catch(error){setDocuments([]);setMessage(error instanceof Error?error.message:'Kunde inte läsa projektdokument.');}
    finally{setLoading(false);}
  },[projectId]);

  useEffect(()=>{void loadDocuments()},[loadDocuments]);
  useEffect(()=>{const onVisible=()=>{if(document.visibilityState==='visible')void loadDocuments()};document.addEventListener('visibilitychange',onVisible);return()=>document.removeEventListener('visibilitychange',onVisible)},[loadDocuments]);

  const drawings=useMemo(()=>documents.filter(isDrawing),[documents]);
  const other=useMemo(()=>documents.filter(document=>!isDrawing(document)),[documents]);
  const selectedDocument=selection.kind==='document'?documents.find(document=>document.id===selection.documentId):undefined;
  const selectedFile=selectedDocument?.attachments?.[0];

  useEffect(()=>{
    let cancelled=false;
    if(selection.kind!=='document'||!selectedFile){setObjectUrl(current=>{if(current)URL.revokeObjectURL(current);return''});return;}
    setMessage('');
    void (async()=>{
      try{
        const response=await fetch(selectedFile.url,{cache:'no-store'});
        if(!response.ok)throw new Error(`Kunde inte öppna filen (HTTP ${response.status}).`);
        const blob=await response.blob();
        if(cancelled)return;
        const next=URL.createObjectURL(blob);
        setObjectUrl(current=>{if(current)URL.revokeObjectURL(current);return next});
      }catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:'Kunde inte öppna filen.');}
    })();
    return()=>{cancelled=true};
  },[selection.kind==='document'?selection.documentId:'',selectedFile?.id]);

  return <div className="fieldResponsiveShell">
    <aside className="fieldDesktopNav">
      <div className="fieldDesktopNavHeader"><small>FÄLTAPP</small><strong>Projekt</strong></div>
      <button className={`fieldTreeRoot ${selection.kind==='activities'?'active':''}`} onClick={()=>setSelection({kind:'activities'})}><span>☑</span><span>Aktiviteter</span></button>
      <div className="fieldTreeGroup">
        <div className="fieldTreeGroupTitle"><span>📚</span><strong>Projektdokument</strong>{loading&&<small>laddar…</small>}</div>
        <button className="fieldTreeCategory" onClick={()=>setOpenDrawings(value=>!value)}><span>{openDrawings?'⌄':'›'}</span><span>📐</span><strong>Ritningar</strong><small>{drawings.length}</small></button>
        {openDrawings&&<div className="fieldTreeChildren">{drawings.map(document=><DocumentNode key={document.id} document={document} selected={selection.kind==='document'&&selection.documentId===document.id} onSelect={()=>setSelection({kind:'document',documentId:document.id})}/>) }{!drawings.length&&!loading&&<span className="fieldTreeEmpty">Inga ritningar</span>}</div>}
        <button className="fieldTreeCategory" onClick={()=>setOpenOther(value=>!value)}><span>{openOther?'⌄':'›'}</span><span>📄</span><strong>Övriga dokument</strong><small>{other.length}</small></button>
        {openOther&&<div className="fieldTreeChildren">{other.map(document=><DocumentNode key={document.id} document={document} selected={selection.kind==='document'&&selection.documentId===document.id} onSelect={()=>setSelection({kind:'document',documentId:document.id})}/>) }{!other.length&&!loading&&<span className="fieldTreeEmpty">Inga övriga dokument</span>}</div>}
      </div>
      {message&&<p className="fieldDesktopNavMessage">{message}</p>}
    </aside>
    <section className={`fieldDesktopDetail ${selection.kind==='activities'?'activities':'document'}`}>
      <div className={selection.kind==='activities'?'fieldActivitiesPane':'fieldActivitiesPane hidden'}><App/></div>
      {selection.kind==='document'&&<DocumentViewer document={selectedDocument} file={selectedFile} objectUrl={objectUrl} message={message}/>} 
    </section>
    <div className="fieldMobileDocuments"><ProjectDocumentsBar/></div>
  </div>;
}

function DocumentNode({document,selected,onSelect}:{document:ProjectDocument;selected:boolean;onSelect:()=>void}){
  return <button className={`fieldTreeDocument ${selected?'active':''}`} onClick={onSelect}><span>{document.attachments?.[0]?.contentType?.startsWith('image/')?'🖼':'📄'}</span><span>{document.title}</span></button>;
}

function DocumentViewer({document,file,objectUrl,message}:{document?:ProjectDocument;file?:Attachment;objectUrl:string;message:string}){
  if(!document)return <div className="fieldDocumentEmpty">Dokumentet kunde inte hittas.</div>;
  return <div className="fieldDocumentViewer"><header><div><small>PROJEKTDOKUMENT</small><h1>{document.title}</h1>{document.description&&<p>{document.description}</p>}</div>{file&&<span>{file.originalName}</span>}</header><div className="fieldDocumentCanvas">{message&&<div className="fieldDocumentEmpty">{message}</div>}{!message&&!file&&<div className="fieldDocumentEmpty">Dokumentet saknar fil.</div>}{!message&&file&&!objectUrl&&<div className="fieldDocumentEmpty">Öppnar dokument…</div>}{!message&&file&&objectUrl&&(file.contentType.startsWith('image/')?<img src={objectUrl} alt={document.title}/>:<iframe src={objectUrl} title={document.title}/>)}</div></div>;
}

function isDrawing(document:ProjectDocument){
  if(document.category==='drawing')return true;
  if(document.category==='other')return false;
  const value=`${document.title} ${document.description||''} ${document.attachments?.map(file=>file.originalName).join(' ')||''}`.toLocaleLowerCase('sv-SE');
  return /(ritning|situationsplan|planritning|fasad|sektion|grundplan|takplan|konstruktionsritning)/.test(value);
}
