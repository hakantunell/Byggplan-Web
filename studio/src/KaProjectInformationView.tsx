import {useEffect,useState} from 'react';

type Person={name:string;email:string;role:string};
type ProjectInformation={projectId:string;projectName:string;propertyDesignation:string;address:string;municipality:string;buildingAuthority:string;caseNumber:string;buildingPermitDate:string;startNoticeDate:string;decisionNotes:string;importantDatesNotes:string;builders:Person[];ka:Person[]};

export function KaProjectInformationView({projectId}:{projectId:string}){
 const[data,setData]=useState<ProjectInformation|null>(null),[loading,setLoading]=useState(true),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setMessage('');fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/information`,{cache:'no-store'}).then(async r=>{const x=await r.json() as {information?:ProjectInformation;error?:string};if(!r.ok)throw new Error(x.error||'Kunde inte läsa projektinformationen.');if(active)setData(x.information||null)}).catch(e=>{if(active)setMessage(e instanceof Error?e.message:'Kunde inte läsa projektinformationen.')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[projectId]);
 if(loading)return <div className="workspaceEmpty">Hämtar projektinformation…</div>;
 if(message)return <div className="workspaceEmpty">{message}</div>;
 if(!data)return <div className="workspaceEmpty">Projektinformation saknas.</div>;
 return <div className="projectPage"><div className="pageHero"><small>PROJEKTINFORMATION · KA</small><h1>{data.projectName||'Projektinformation'}</h1><p>Myndighets- och projektuppgifter i läsvy.</p></div><section className="projectInfoCard projectInformationEditor"><div className="projectInfoCardHeader"><div><small>KA OCH MYNDIGHETSINFORMATION</small><h3>Projekt- och ärendeuppgifter</h3></div></div><div className="projectInformationGrid"><Info label="Fastighetsbeteckning" value={data.propertyDesignation}/><Info label="Projektadress" value={data.address}/><Info label="Kommun" value={data.municipality}/><Info label="Byggnadsnämnd / myndighet" value={data.buildingAuthority}/><Info label="Diarie-/ärendenummer" value={data.caseNumber}/><Info label="Bygglovsbeslut" value={data.buildingPermitDate}/><Info label="Startbesked" value={data.startNoticeDate}/></div><div className="projectRoleSummary"><RoleBlock label="BYGGHERRE" people={data.builders}/><RoleBlock label="KONTROLLANSVARIG" people={data.ka}/></div><TextBlock label="Beslut / myndighetsanteckningar" value={data.decisionNotes}/><TextBlock label="Viktiga datum / övrigt" value={data.importantDatesNotes}/></section></div>
}

function Info({label,value}:{label:string;value:string}){return <label><span>{label}</span><div className="kaReadOnlyValue">{value||'—'}</div></label>}
function TextBlock({label,value}:{label:string;value:string}){return <div className="projectInfoTextarea"><span>{label}</span><div className="kaReadOnlyText">{value||'—'}</div></div>}
function RoleBlock({label,people}:{label:string;people:Person[]}){return <div><small>{label}</small>{people.length?people.map((p,index)=><p key={`${p.email}-${index}`}><b>{p.name}</b><span>{p.email}</span></p>):<p>Ingen registrerad.</p>}</div>}
