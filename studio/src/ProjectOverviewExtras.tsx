import { useEffect,useState } from 'react';
import { createPortal } from 'react-dom';
import { ProjectDocumentsEditor } from './ProjectDocumentsEditor';
import { ProjectAdministrationEditor } from './ProjectAdministrationEditor';
import { ProjectConditionsView } from './ProjectConditionsView';
import { ProjectDeleteControl } from './ProjectDeleteControl';

type MasterDiagnostics={hasSnapshot:boolean;masterProjectCode?:string;masterProjectName?:string;snapshotVersion?:number;currentMasterVersion?:number;selectedModuleCodes?:string[];activityCount?:number;linkedActivityCount?:number;canonicalCheck?:{present:string[];missing:string[];presentCount:number;total:number}};
type Tab='overview'|'administration'|'conditions'|'documents'|'information'|'reports'|'settings';
const TABS:{id:Tab;label:string;icon:string}[]=[
 {id:'overview',label:'Översikt',icon:'⌂'},
 {id:'administration',label:'Administrativa kontrollpunkter',icon:'✓'},
 {id:'conditions',label:'Projektvillkor',icon:'◆'},
 {id:'documents',label:'Projektdokument',icon:'📄'},
 {id:'information',label:'Projektinformation',icon:'ℹ'},
 {id:'reports',label:'Rapporter',icon:'▥'},
 {id:'settings',label:'Inställningar',icon:'⚙'}
];

function MasterSnapshotInfo({projectId}:{projectId:string}){
 const[data,setData]=useState<MasterDiagnostics|null>(null);const[repairing,setRepairing]=useState(false);const[message,setMessage]=useState('');
 async function load(){try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/master-diagnostics`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {diagnostics?:MasterDiagnostics};if(r.ok)setData(d.diagnostics||null)}catch{setData(null)}}
 useEffect(()=>{void load()},[projectId]);
 async function responseData(r:Response){const raw=await r.text();if(!raw)return{} as any;try{return JSON.parse(raw) as any}catch{return{error:raw.slice(0,1200)}}}
 async function repair(){setRepairing(true);setMessage('Reparerar Master…');try{const mr=await fetch('/api/studio/master-projects',{cache:'no-store'});const md=await responseData(mr) as {error?:string};if(!mr.ok)throw new Error(md.error||`Masterprojektet kunde inte reconcileras (HTTP ${mr.status}).`);const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/repair-from-master`,{method:'POST'});const d=await responseData(r) as {created?:{activities:number;retired?:number};error?:string};if(!r.ok)throw new Error(d.error||`Projektet kunde inte repareras (HTTP ${r.status}).`);await load();setMessage(`Klart: ${d.created?.activities||0} nya aktiviteter, ${d.created?.retired||0} pensionerade.`);window.setTimeout(()=>window.location.reload(),900)}catch(e){setMessage(e instanceof Error?e.message:'Projektet kunde inte repareras.')}finally{setRepairing(false)}}
 if(!data)return null;if(!data.hasSnapshot)return <section className="projectInfoCard"><h3>Master</h3><p>Ingen Master-snapshot registrerad.</p></section>;
 const missing=data.canonicalCheck?.missing||[];const newer=Number(data.currentMasterVersion||0)>Number(data.snapshotVersion||0);const needsRepair=missing.length>0||newer||Number(data.activityCount||0)<10;
 return <section className="projectInfoCard"><div><small>MASTER-SNAPSHOT</small><h3>{data.masterProjectName||data.masterProjectCode||'Masterprojekt'} · v{data.snapshotVersion||'?'}</h3></div><p>Aktuell Master: v{data.currentMasterVersion||'?'} · {data.activityCount||0} projektaktiviteter · {data.linkedActivityCount||0} Master-kopplade.</p><p><b>Valda moduler:</b> {(data.selectedModuleCodes||[]).join(', ')||'inga'}</p>{needsRepair&&<button className="primary" disabled={repairing} onClick={()=>void repair()}>{repairing?'Reparerar…':'Reparera projekt från Master'}</button>}{message&&<p>{message}</p>}</section>;
}

function OverviewTab({projectName}:{projectName:string}){return <div className="projectTabContent"><div className="projectTabHeader"><div><small>PROJEKT</small><h2>{projectName}</h2><p>Projektets samlade styrning och uppföljning. Välj en flik för administrativa kontrollpunkter, stående villkor, dokument, projektinformation eller rapporter.</p></div></div><div className="projectOverviewGrid"><article><strong>✓</strong><h3>Administrativa kontrollpunkter</h3><p>Startbesked, BAS-P/BAS-U och andra verifierbara projektuppgifter.</p></article><article><strong>◆</strong><h3>Projektvillkor</h3><p>Stående instruktioner som gäller under hela eller delar av projektet.</p></article><article><strong>📄</strong><h3>Projektdokument</h3><p>Dokument och underlag som hör till projektet.</p></article><article><strong>ℹ</strong><h3>Projektinformation</h3><p>KA, myndigheter, roller, beslut och teknisk projektkontext.</p></article></div></div>}
function InformationTab({projectId}:{projectId:string}){return <div className="projectTabContent"><div className="projectTabHeader"><div><small>PROJEKTINFORMATION</small><h2>Roller, myndigheter och projektkontext</h2><p>Här samlas information som beskriver projektet men inte är en aktivitet eller ett stående villkor.</p></div></div><MasterSnapshotInfo projectId={projectId}/><section className="projectInfoCard"><h3>KA och myndighetsinformation</h3><p>Den här delen är reserverad för kontrollansvarig, byggnadsnämnd, kontaktuppgifter, diarienummer, beslut, viktiga datum och andra projektroller. Vi kopplar in de befintliga uppgifterna här i nästa steg.</p></section></div>}
function ReportsTab(){return <div className="projectTabContent"><div className="projectTabHeader"><div><small>RAPPORTER</small><h2>Projektstatus och dokumentationsunderlag</h2><p>Plats för sammanställningar av KA-underlag, egen dokumentation, styrdokumentsuppfyllelse, avvikelser och slutdokumentation.</p></div></div><div className="projectComingSoon">Rapportmodellen byggs på befintliga aktiviteter, styrdokument och dokumentationsfält. Inga separata rapportdata skapas ännu.</div></div>}

export function ProjectOverviewExtras(){
 const[target,setTarget]=useState<Element|null>(null);const[projectId,setProjectId]=useState('');const[projectName,setProjectName]=useState('');const[tab,setTab]=useState<Tab>('overview');
 useEffect(()=>{const sync=()=>{const overview=document.querySelector('.studio .workspace .overview');const select=document.querySelector('.studio .topbar select') as HTMLSelectElement|null;setTarget(current=>current===overview?current:overview);const next=select?.value||'';setProjectId(current=>current===next?current:next);const name=select?.selectedOptions?.[0]?.textContent?.trim()||'';setProjectName(current=>current===name?current:name)};sync();const timer=window.setInterval(sync,250);return()=>window.clearInterval(timer)},[]);
 useEffect(()=>setTab('overview'),[projectId]);
 if(!target||!projectId)return null;
 return createPortal(<div className="projectDetailTabs"><nav className="projectTabNav" aria-label="Projektdetaljer">{TABS.map(item=><button key={item.id} className={tab===item.id?'active':''} onClick={()=>setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav><div className="projectTabPanel">{tab==='overview'&&<OverviewTab projectName={projectName||'Projekt'}/>} {tab==='administration'&&<ProjectAdministrationEditor projectId={projectId}/>} {tab==='conditions'&&<ProjectConditionsView projectId={projectId}/>} {tab==='documents'&&<ProjectDocumentsEditor projectId={projectId}/>} {tab==='information'&&<InformationTab projectId={projectId}/>} {tab==='reports'&&<ReportsTab/>} {tab==='settings'&&<div className="projectTabContent"><div className="projectTabHeader"><div><small>INSTÄLLNINGAR</small><h2>Projektinställningar</h2><p>Projektets tekniska inställningar och destruktiva åtgärder hör hemma här.</p></div></div><ProjectDeleteControl projectId={projectId} projectName={projectName||'Projekt'}/></div>}</div></div>,target);
}
