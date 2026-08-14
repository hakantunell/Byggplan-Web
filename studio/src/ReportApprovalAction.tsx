import {useEffect,useState} from 'react';

type Eligibility={canAttest?:boolean;performed?:boolean;fullyAttested?:boolean;activeCount?:number;incompleteCount?:number;requiredRoles?:string[];attestedRoles?:string[];missingRoles?:string[];availableRoles?:string[]};

export function ReportApprovalAction({projectId,itemId,onDone}:{projectId:string;itemId:string;responsibleRole?:string;onDone?:()=>void}){
 const[role,setRole]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[eligibility,setEligibility]=useState<Eligibility>({});
 async function refreshEligibility(){try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-attestations`,{cache:'no-store'});if(!r.ok)return;const x=await r.json() as {eligibility?:Record<string,Eligibility>};const next=x.eligibility?.[itemId]||{};setEligibility(next);setRole((next.availableRoles||[])[0]||'')}catch{}}
 useEffect(()=>{void refreshEligibility();const changed=()=>void refreshEligibility();window.addEventListener('byggplan:activity-status-changed',changed);return()=>window.removeEventListener('byggplan:activity-status-changed',changed)},[projectId,itemId]);
 const canAttest=Boolean(eligibility.canAttest&&role);
 async function approve(){if(!canAttest)return;setBusy(true);setError('');try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-items/${encodeURIComponent(itemId)}/attest`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roleCode:role,attestationType:'approved'})});const x=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(x.error||'Kunde inte attestera punkten.');await refreshEligibility();onDone?.()}catch(e){setError(e instanceof Error?e.message:'Kunde inte attestera punkten.')}finally{setBusy(false)}}
 const missing=eligibility.missingRoles||[];
 return <div className={`reportApprovalAction ${canAttest?'ready':'locked'}`}>{canAttest?<><span className="attestationRole">Attest som <b>{role}</b></span><button disabled={busy} onClick={()=>void approve()}>{busy?'Attesterar…':'✓ Attestera'}</button></>:eligibility.fullyAttested?<small className="attestationComplete">Alla erforderliga attester är gjorda.</small>:eligibility.performed?<small>{missing.length?`Väntar på attest: ${missing.join(' + ')}`:'Kontrollen är genomförd.'}</small>:<small>Kontrollen är inte genomförd ännu.</small>}{error&&<small>{error}</small>}</div>
}
