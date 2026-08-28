import {useEffect,useMemo,useRef,useState} from 'react';
import './build-documentation-report.css';

type FileItem={id:string;originalName:string;contentType:string;url:string;createdAt?:string};
type Entry={id:string;valueText?:string|null;valueNumber?:number|null;valueBoolean?:boolean|null;originalName?:string|null;contentType?:string|null;url?:string|null;createdAt?:string|null};
type Field={id:string;type:string;label:string;unit?:string;entries:Entry[]};
type Evidence={activityId:string;activityTitle:string;taskId:string;taskTitle:string;sectionId:string;sectionName:string;areaId:string;areaName:string;note:string;ownFiles:FileItem[];requiredFields:Field[]};
type ActivityComment={activityId:string;comment:string};
type ProjectInformation={projectId:string;projectName:string;propertyDesignation:string;address:string;municipality:string;buildingAuthority:string;caseNumber:string;buildingPermitDate:string;startNoticeDate:string};
type ItemLayout={included?:boolean;size?:'large'|'half'|'third';caption?:string};
type SectionLayout={title?:string;hidden?:boolean};
type CoverLayout={included?:boolean;subtitle?:string};
type Layout={version:1;sections:Record<string,SectionLayout>;items:Record<string,ItemLayout>;cover?:CoverLayout};
type ReportItem={key:string;kind:'image'|'value'|'note';activityId:string;activityTitle:string;sectionId:string;sectionName:string;taskTitle:string;label:string;value?:string;url?:string;originalName?:string;contentType?:string};

const COVER='__cover__';
const defaultLayout:Layout={version:1,sections:{},items:{},cover:{included:true,subtitle:'Dokumentation över hur huset är byggt'}};
function storageKey(projectId:string){return `byggplan.buildDocumentationReport.${projectId}`}
function readLayout(projectId:string):Layout{try{const raw=localStorage.getItem(storageKey(projectId));if(raw){const parsed=JSON.parse(raw) as Layout;if(parsed?.version===1)return{version:1,sections:parsed.sections||{},items:parsed.items||{},cover:parsed.cover||{included:true,subtitle:'Dokumentation över hur huset är byggt'}}}}catch{}return defaultLayout}
function isImage(type?:string|null){return Boolean(type?.startsWith('image/'))}
function comparableText(value?:string|null){return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('sv-SE')}

export function BuildDocumentationReport({projectId,projectName}:{projectId:string;projectName:string}){
 const[evidence,setEvidence]=useState<Evidence[]>([]),[activityComments,setActivityComments]=useState<ActivityComment[]>([]),[projectInfo,setProjectInfo]=useState<ProjectInformation|null>(null),[layout,setLayout]=useState<Layout>(()=>readLayout(projectId)),[selectedSection,setSelectedSection]=useState(COVER),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const suspendAutoSelectionUntil=useRef(0);
 useEffect(()=>{setLayout(readLayout(projectId));setSelectedSection(COVER);setLoading(true);setError('');Promise.all([
  fetch(`/api/projects/${encodeURIComponent(projectId)}/activity-documentation-summary`,{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Kunde inte läsa byggdokumentationen.');const d=await r.json() as {items?:Evidence[]};return d.items||[]}),
  fetch(`/api/projects/${encodeURIComponent(projectId)}/activity-comments`,{cache:'no-store'}).then(async r=>{if(!r.ok)return[];const d=await r.json() as {items?:ActivityComment[]};return d.items||[]}).catch(()=>[] as ActivityComment[]),
  fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/information`,{cache:'no-store'}).then(async r=>{if(!r.ok)return null;const d=await r.json() as {information?:ProjectInformation};return d.information||null}).catch(()=>null)
 ]).then(([items,comments,info])=>{setEvidence(items);setActivityComments(comments);setProjectInfo(info)}).catch(e=>setError(e instanceof Error?e.message:'Kunde inte läsa byggdokumentationen.')).finally(()=>setLoading(false))},[projectId]);
 useEffect(()=>{try{localStorage.setItem(storageKey(projectId),JSON.stringify(layout))}catch{}},[projectId,layout]);
 const items=useMemo(()=>flatten(evidence,activityComments),[evidence,activityComments]);
 const sections=useMemo(()=>{const map=new Map<string,{id:string;name:string;items:ReportItem[]}>();for(const item of items){const current=map.get(item.sectionId)||{id:item.sectionId,name:item.sectionName,items:[]};current.items.push(item);map.set(item.sectionId,current)}return[...map.values()]},[items]);

 useEffect(()=>{
  if(loading)return;
  const preview=document.querySelector<HTMLElement>('.buildDocPreview');
  if(!preview)return;
  let raf=0;
  function syncVisibleSection(){
   raf=0;
   if(performance.now()<suspendAutoSelectionUntil.current)return;
   const nodes=Array.from(preview.querySelectorAll<HTMLElement>('[data-report-section]'));
   if(!nodes.length)return;
   const previewRect=preview.getBoundingClientRect();
   const visibleTop=Math.max(40,previewRect.top);
   const visibleBottom=Math.min(window.innerHeight-16,previewRect.bottom);
   if(visibleBottom<=visibleTop)return;
   const focusY=visibleTop+(visibleBottom-visibleTop)*0.48;
   let candidate:HTMLElement|null=null;
   let nearestDistance=Number.POSITIVE_INFINITY;
   for(const node of nodes){
    const rect=node.getBoundingClientRect();
    if(rect.bottom<visibleTop||rect.top>visibleBottom)continue;
    if(rect.top<=focusY&&rect.bottom>=focusY){candidate=node;break}
    const distance=focusY<rect.top?rect.top-focusY:focusY-rect.bottom;
    if(distance<nearestDistance){nearestDistance=distance;candidate=node}
   }
   if(!candidate)return;
   const lastNode=nodes[nodes.length-1];
   const lastRect=lastNode.getBoundingClientRect();
   if(lastRect.bottom<=visibleBottom+8&&lastRect.top<visibleBottom-24)candidate=lastNode;
   const id=candidate.dataset.reportSection;
   if(id)setSelectedSection(current=>current===id?current:id);
  }
  function onScroll(){if(!raf)raf=window.requestAnimationFrame(syncVisibleSection)}
  document.addEventListener('scroll',onScroll,true);
  window.addEventListener('resize',onScroll);
  syncVisibleSection();
  return()=>{document.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',onScroll);if(raf)window.cancelAnimationFrame(raf)};
 },[loading,sections,layout.sections,layout.cover?.included]);

 const active=sections.find(s=>s.id===selectedSection)||sections[0];
 const updateItem=(key:string,patch:ItemLayout)=>setLayout(cur=>({...cur,items:{...cur.items,[key]:{...cur.items[key],...patch}}}));
 const updateSection=(id:string,patch:SectionLayout)=>setLayout(cur=>({...cur,sections:{...cur.sections,[id]:{...cur.sections[id],...patch}}}));
 const updateCover=(patch:CoverLayout)=>setLayout(cur=>({...cur,cover:{...cur.cover,...patch}}));
 const included=(item:ReportItem)=>layout.items[item.key]?.included!==false;
 const coverIncluded=layout.cover?.included!==false;
 function selectAndScroll(id:string){
  suspendAutoSelectionUntil.current=performance.now()+250;
  setSelectedSection(id);
  window.requestAnimationFrame(()=>{
   const target=document.querySelector<HTMLElement>(`.buildDocPreview [data-report-section="${CSS.escape(id)}"]`);
   if(target)target.scrollIntoView({behavior:'auto',block:'center'});
   window.setTimeout(()=>{suspendAutoSelectionUntil.current=0;window.dispatchEvent(new Event('resize'))},280);
  });
 }
 if(loading)return <div className="workspaceEmpty">Bygger byggdokumentation…</div>;
 if(error)return <div className="reportMessage">⚠ {error}</div>;
 return <div className="buildDocReport projectPage"><div className="pageHero buildDocHero"><div><small>RAPPORTER</small><h1>Byggdokumentation</h1><p>Egen dokumentation över hur huset är byggt. Rapportval och layout påverkar inte originalmaterialet på aktiviteterna.</p></div><button className="primary" onClick={()=>window.print()}>🖨 Skriv ut / PDF</button></div>{sections.length===0?<section className="infoCard">Det finns ännu ingen egen dokumentation att sammanställa.</section>:<div className="buildDocEditor"><aside className="buildDocOutline"><h3>Innehåll</h3><button className={selectedSection===COVER?'selected':''} onClick={()=>selectAndScroll(COVER)}><b>Försättsblad</b><small>{coverIncluded?'med i rapporten':'dolt – klicka för att återställa'}</small></button>{sections.map(section=>{const visible=section.items.filter(included).length;const hidden=section.items.length-visible;return <button key={section.id} className={selectedSection===section.id?'selected':''} onClick={()=>selectAndScroll(section.id)}><b>{layout.sections[section.id]?.title||section.name}</b><small>{visible} med · {hidden} dolda</small></button>})}</aside><main className="buildDocPreview">{coverIncluded&&<div className="paper coverPage" data-report-section={COVER}><div className="coverBrand">ByggPlan</div><div className="coverMain"><small>BYGGDOKUMENTATION</small><h1>{projectInfo?.projectName||projectName}</h1>{layout.cover?.subtitle&&<p>{layout.cover.subtitle}</p>}</div><div className="coverFacts">{projectInfo?.propertyDesignation&&<div><span>Fastighetsbeteckning</span><b>{projectInfo.propertyDesignation}</b></div>}{projectInfo?.address&&<div><span>Adress</span><b>{projectInfo.address}</b></div>}{projectInfo?.municipality&&<div><span>Kommun</span><b>{projectInfo.municipality}</b></div>}{projectInfo?.caseNumber&&<div><span>Ärendenummer</span><b>{projectInfo.caseNumber}</b></div>}</div><div className="coverFooter"><span>Sammanställd {new Date().toLocaleDateString('sv-SE')}</span></div></div>}<div className="paper contentPaper"><header className="paperHeader"><span>Byggdokumentation</span><b>{projectName}</b></header>{sections.filter(s=>!layout.sections[s.id]?.hidden).map(section=><section key={section.id} className="paperSection" data-report-section={section.id}><h2>{layout.sections[section.id]?.title||section.name}</h2>{groupByActivity(section.items.filter(included)).map(group=><div className="paperActivity" key={group.activityId}><h3>{group.activityTitle}</h3><small>{group.taskTitle}</small>{group.items.filter(i=>i.kind==='note').map(i=><p key={i.key}>{i.value}</p>)}<div className="paperValues">{group.items.filter(i=>i.kind==='value').map(i=><span key={i.key}><b>{i.label}:</b> {i.value}</span>)}</div><div className="paperImages">{group.items.filter(i=>i.kind==='image').map(i=>{const settings=layout.items[i.key]||{};return <figure key={i.key} className={`size-${settings.size||'half'}`}><img src={i.url} alt={settings.caption||i.originalName||i.label}/><figcaption>{settings.caption||i.label||i.originalName}</figcaption></figure>})}</div></div>)}</section>)}</div></main><aside className="buildDocMaterial">{selectedSection===COVER?<><div className="materialHeading"><div><small>FÖRSÄTTSBLAD</small><b>Projektuppgifter</b></div><label><input type="checkbox" checked={coverIncluded} onChange={e=>updateCover({included:e.target.checked})}/> Visa försättsblad</label></div><label className="coverEditorField"><span>Underrubrik</span><input value={layout.cover?.subtitle||''} onChange={e=>updateCover({subtitle:e.target.value})}/></label><div className="coverInfoPreview"><small>Hämtas från Projektinformation</small>{projectInfo?.propertyDesignation&&<p><b>Fastighet:</b> {projectInfo.propertyDesignation}</p>}{projectInfo?.address&&<p><b>Adress:</b> {projectInfo.address}</p>}{projectInfo?.municipality&&<p><b>Kommun:</b> {projectInfo.municipality}</p>}{projectInfo?.caseNumber&&<p><b>Ärendenummer:</b> {projectInfo.caseNumber}</p>}</div></>:active&&<><div className="materialHeading"><div><small>AVSNITT</small><input value={layout.sections[active.id]?.title??active.name} onChange={e=>updateSection(active.id,{title:e.target.value})}/></div><label><input type="checkbox" checked={!layout.sections[active.id]?.hidden} onChange={e=>updateSection(active.id,{hidden:!e.target.checked})}/> Visa avsnitt</label></div><h3>Material</h3>{active.items.map(item=>{const settings=layout.items[item.key]||{};const show=included(item);return <article key={item.key} className={show?'':'excluded'}>{item.kind==='image'&&item.url?<img src={item.url} alt=""/>:<div className="materialType">{item.kind==='note'?'T':item.kind==='value'?'#':'□'}</div>}<div className="materialBody"><b>{item.kind==='image'?(settings.caption||item.originalName||item.label):item.label}</b>{item.value&&<small>{item.value}</small>}<label><input type="checkbox" checked={show} onChange={e=>updateItem(item.key,{included:e.target.checked})}/> Med i rapport</label>{item.kind==='image'&&show&&<><select value={settings.size||'half'} onChange={e=>updateItem(item.key,{size:e.target.value as ItemLayout['size']})}><option value="large">Stor</option><option value="half">Halv</option><option value="third">Tredjedel</option></select><input className="captionInput" placeholder="Bildtext" value={settings.caption||''} onChange={e=>updateItem(item.key,{caption:e.target.value})}/></>}</div></article>})}</>}</aside></div>}</div>
}

function flatten(rows:Evidence[],comments:ActivityComment[]):ReportItem[]{const out:ReportItem[]=[];const commentsByActivity=new Map(comments.map(item=>[item.activityId,comparableText(item.comment)]));for(const row of rows){const note=row.note?.trim()||'';const noteIsActivityComment=note!==''&&commentsByActivity.get(row.activityId)===comparableText(note);if(note&&!noteIsActivityComment)out.push({key:`note:${row.activityId}`,kind:'note',activityId:row.activityId,activityTitle:row.activityTitle,sectionId:row.sectionId||row.areaId,sectionName:row.sectionName||row.areaName||'Dokumentation',taskTitle:row.taskTitle||'',label:'Anteckning',value:note});for(const file of row.ownFiles||[]){if(!isImage(file.contentType))continue;out.push({key:`file:${file.id}`,kind:'image',activityId:row.activityId,activityTitle:row.activityTitle,sectionId:row.sectionId||row.areaId,sectionName:row.sectionName||row.areaName||'Dokumentation',taskTitle:row.taskTitle||'',label:file.originalName,originalName:file.originalName,contentType:file.contentType,url:file.url})}for(const field of row.requiredFields||[])for(const entry of field.entries||[]){if(entry.url&&entry.originalName&&isImage(entry.contentType)){out.push({key:`entry:${entry.id}`,kind:'image',activityId:row.activityId,activityTitle:row.activityTitle,sectionId:row.sectionId||row.areaId,sectionName:row.sectionName||row.areaName||'Dokumentation',taskTitle:row.taskTitle||'',label:field.label,originalName:entry.originalName,contentType:entry.contentType||'',url:entry.url});continue}const value=entry.valueText??(entry.valueNumber!=null?`${entry.valueNumber}${field.unit?` ${field.unit}`:''}`:entry.valueBoolean==null?'':entry.valueBoolean?'Ja':'Nej');if(value!=='')out.push({key:`entry:${entry.id}`,kind:'value',activityId:row.activityId,activityTitle:row.activityTitle,sectionId:row.sectionId||row.areaId,sectionName:row.sectionName||row.areaName||'Dokumentation',taskTitle:row.taskTitle||'',label:field.label,value:String(value)})}}return out}
function groupByActivity(items:ReportItem[]){const map=new Map<string,{activityId:string;activityTitle:string;taskTitle:string;items:ReportItem[]}>();for(const item of items){const g=map.get(item.activityId)||{activityId:item.activityId,activityTitle:item.activityTitle,taskTitle:item.taskTitle,items:[]};g.items.push(item);map.set(item.activityId,g)}return[...map.values()]}
