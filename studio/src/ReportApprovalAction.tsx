import {useEffect,useState} from 'react';

type Eligibility={canAttest?:boolean;activeCount?:number;incompleteCount?:number};

export function ReportApprovalAction({projectId,itemId,onDone}:{projectId:string;itemId:string;responsibleRole?:string;onDone?:()=>void}){
 const[role,setRole]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[eligibility,setEligibility]=useState<Eligibility>({});
 async function refreshEligibility(){try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-attestations`,{cache:'no-store'});if(!r.ok)return;const x=await r.json() as {eligibility?:Record<string,Eligibility>;attestationRoles?:string[]};setEligibility(x.eligibility?.[itemId]||{});setRole((x.attestationRoles||[])[0]||'')}catch{}}
 useEffect(()=>{void refreshEligibility();const changed=()=>void refreshEligibility();window.addEventListener('byggplan:activity-status-changed',changed);return()=>window.removeEventListener('byggplan:activity-status-changed',changed)},[projectId,itemId]);
 const canAttest=Boolean(eligibility.canAttest&&role);
 async function approve(){if(!canAttest)return;setBusy(true);setError('');try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-items/${encodeURIComponent(itemId)}/attest`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roleCode:role,attestationType:'approved'})});const x=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(x.error||'Kunde inte attestera punkten.');await refreshEligibility();onDone?.()}catch(e){setError(e instanceof Error?e.message:'Kunde inte attestera punkten.')}finally{setBusy(false)}}
 return <div className={`reportApprovalAction ${canAttest?'ready':'locked'}`}><span className="attestationRole">Attest som <b>{role||'—'}</b></span><button disabled={!canAttest||busy} onClick={()=>void approve()}>{busy?'Attesterar…':'✓ Attestera'}</button>{!canAttest&&<small>{!role?'Ingen attestroll är kopplad till användaren.':Number(eligibility.activeCount||0)>0?'Kan attesteras när punkten är klar.':'Ingen klar aktivitet att attestera.'}</small>}{error&&<small>{error}</small>}</div>
}
