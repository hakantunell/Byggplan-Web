import {useEffect,useState} from 'react';

type Person={name:string;email:string;role:string};
type ProjectInformation={projectId:string;projectName:string;propertyDesignation:string;address:string;municipality:string;buildingAuthority:string;caseNumber:string;buildingPermitDate:string;startNoticeDate:string;decisionNotes:string;importantDatesNotes:string;builders:Person[];ka:Person[]};

const EMPTY:ProjectInformation={projectId:'',projectName:'',propertyDesignation:'',address:'',municipality:'',buildingAuthority:'',caseNumber:'',buildingPermitDate:'',startNoticeDate:'',decisionNotes:'',importantDatesNotes:'',builders:[],ka:[]};

export function ProjectInformationEditor({projectId}:{projectId:string}){
 const[data,setData]=useState<ProjectInformation>(EMPTY),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 async function load(){setLoading(true);setMessage('');try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/information`,{cache:'no-store'});const x=await r.json() as {information?:ProjectInformation;error?:string};if(!r.ok)throw new Error(x.error||'Kunde inte läsa projektinformationen.');setData(x.information||EMPTY)}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte läsa projektinformationen.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[projectId]);
 function set<K extends keyof ProjectInformation>(key:K,value:ProjectInformation[K]){setData(current=>({...current,[key]:value}))}
 async function save(){setSaving(true);setMessage('Sparar…');try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/information`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const x=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(x.error||'Kunde inte spara projektinformationen.');setMessage('Projektinformationen är sparad.');await load()}catch(e){setMessage(e instanceof Error?e.message:'Kunde inte spara projektinformationen.')}finally{setSaving(false)}}
 if(loading)return <section className="projectInfoCard">Hämtar projektinformation…</section>;
 return <section className="projectInfoCard projectInformationEditor"><div className="projectInfoCardHeader"><div><small>KA OCH MYNDIGHETSINFORMATION</small><h3>Projekt- och ärendeuppgifter</h3><p>Grunduppgifter som KA och andra projektroller behöver kunna identifiera och hänvisa till.</p></div><button className="primary" disabled={saving} onClick={()=>void save()}>{saving?'Sparar…':'Spara'}</button></div>
 <div className="projectInformationGrid">
  <label><span>Fastighetsbeteckning</span><input value={data.propertyDesignation} onChange={e=>set('propertyDesignation',e.target.value)} placeholder="t.ex. Vemdalens Kyrkby 44:10"/></label>
  <label><span>Projektadress</span><input value={data.address} onChange={e=>set('address',e.target.value)}/></label>
  <label><span>Kommun</span><input value={data.municipality} onChange={e=>set('municipality',e.target.value)}/></label>
  <label><span>Byggnadsnämnd / myndighet</span><input value={data.buildingAuthority} onChange={e=>set('buildingAuthority',e.target.value)}/></label>
  <label><span>Diarie-/ärendenummer</span><input value={data.caseNumber} onChange={e=>set('caseNumber',e.target.value)}/></label>
  <label><span>Bygglovsbeslut</span><input type="date" value={data.buildingPermitDate} onChange={e=>set('buildingPermitDate',e.target.value)}/></label>
  <label><span>Startbesked</span><input type="date" value={data.startNoticeDate} onChange={e=>set('startNoticeDate',e.target.value)}/></label>
 </div>
 <div className="projectRoleSummary"><div><small>BYGGHERRE</small>{data.builders.length?data.builders.map(p=><p key={p.email}><b>{p.name}</b><span>{p.email}</span></p>):<p>Ingen BH registrerad på projektet.</p>}</div><div><small>KONTROLLANSVARIG</small>{data.ka.length?data.ka.map(p=><p key={p.email}><b>{p.name}</b><span>{p.email}</span></p>):<p>Ingen KA registrerad på projektet.</p>}</div></div>
 <label className="projectInfoTextarea"><span>Beslut / myndighetsanteckningar</span><textarea value={data.decisionNotes} onChange={e=>set('decisionNotes',e.target.value)} placeholder="Beslut, villkor eller annan myndighetsinformation som bör vara lätt att hitta."/></label>
 <label className="projectInfoTextarea"><span>Viktiga datum / övrigt</span><textarea value={data.importantDatesNotes} onChange={e=>set('importantDatesNotes',e.target.value)} placeholder="Tidsfrister, slutdatum eller andra viktiga datum."/></label>
 {message&&<div className="projectInformationMessage">{message}</div>}
 </section>
}
