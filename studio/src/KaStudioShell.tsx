import {useEffect,useState} from 'react';
import {useAuth} from './AuthGate';
import {ControlPlanReviewView} from './ControlPlanReviewView';
import {KaProjectInformationView} from './KaProjectInformationView';

type Project={id:string;name:string;property_designation?:string};
type KaView='control-plan'|'project-information';
const PROJECT_STORAGE_KEY='byggplan.studio.projectId';

export function KaStudioShell(){
 const auth=useAuth();
 const[view,setView]=useState<KaView>('control-plan');
 const[projectId,setProjectId]=useState('');
 const projects:Project[]=(auth.user?.projects||[]).map(p=>({id:p.id,name:p.name}));
 useEffect(()=>{let stored='';try{stored=localStorage.getItem(PROJECT_STORAGE_KEY)||''}catch{}const next=(stored&&projects.some(p=>p.id===stored)?stored:'')||projects[0]?.id||'';setProjectId(current=>current&&projects.some(p=>p.id===current)?current:next)},[auth.user?.id]);
 function selectProject(id:string){setProjectId(id);try{localStorage.setItem(PROJECT_STORAGE_KEY,id)}catch{}}
 const current=projects.find(p=>p.id===projectId);
 return <div className={`studioShell view-control-plan view-native-control-plan view-ka ${view==='project-information'?'view-ka-project-information':''}`}><div className="controlPlanStudioFrame"><header className="topbar controlPlanTopbar"><div className="brand"><span>BP</span><div><strong>ByggPlan Studio</strong><small>{view==='control-plan'?'Kontrollplan · KA':'Projektinformation · KA'}</small></div></div><select value={projectId} onChange={e=>selectProject(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><div className="connection ready">● Ansluten</div></header><aside className="rail controlPlanRail kaRail"><button className={view==='control-plan'?'active':''} title="Kontrollplan" onClick={()=>setView('control-plan')}>📋<span>Kontrollplan</span></button><button className={view==='project-information'?'active':''} title="Projektinformation" onClick={()=>setView('project-information')}>ℹ<span>Projektinformation</span></button></aside><section className="controlPlanMainRegion" aria-label={view==='control-plan'?"KA:s kontrollplan":"KA:s projektinformation"}>{projectId?(view==='control-plan'?<ControlPlanReviewView projectId={projectId} projectName={current?.name} propertyDesignation={current?.property_designation}/>:<KaProjectInformationView projectId={projectId}/>):<div className="empty"><span>{view==='control-plan'?'📋':'ℹ'}</span><h2>Inget projekt valt</h2></div>}</section></div></div>
}
