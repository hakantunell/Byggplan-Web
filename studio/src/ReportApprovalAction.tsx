import {useEffect,useState} from 'react';

type AvailableAttestation={roleCode:string;attestationType:'control'|'ka_review';label:string};
type Eligibility={canAttest?:boolean;performed?:boolean;fullyAttested?:boolean;controlComplete?:boolean;requiresKaReview?:boolean;kaReviewDone?:boolean;controllerRoles?:string[];controlAttestedRoles?:string[];missingControllerRoles?:string[];availableAttestations?:AvailableAttestation[]};

export function ReportApprovalAction({projectId,itemId,onDone}:{projectId:string;itemId:string;responsibleRole?:string;onDone?:()=>void}){
 const[action,setAction]=useState<AvailableAttestation|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[eligibility,setEligibility]=useState<Eligibility>({});
 async function refreshEligibility(){try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-attestations`,{cache:'no-store'});if(!r.ok)return;const x=await r.json() as {eligibility?:Record<string,Eligibility>};const next=x.eligibility?.[itemId]||{};setEligibility(next);setAction((next.availableAttestations||[])[0]||null)}catch{}}
 useEffect(()=>{void refreshEligibility();const changed=()=>void refreshEligibility();window.addEventListener('byggplan:activity-status-changed',changed);return()=>window.removeEventListener('byggplan:activity-status-changed',changed)},[projectId,itemId]);
 const canAttest=Boolean(eligibility.canAttest&&action);
 async function approve(){if(!canAttest||!action)return;setBusy(true);setError('');try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-items/${encodeURIComponent(itemId)}/attest`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roleCode:action.roleCode,attestationType:action.attestationType})});const x=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(x.error||'Kunde inte signera punkten.');await refreshEligibility();onDone?.()}catch(e){setError(e instanceof Error?e.message:'Kunde inte signera punkten.')}finally{setBusy(false)}}
 const missingControl=eligibility.missingControllerRoles||[];
 let waiting='Kontrollen är inte genomförd ännu.';
 if(eligibility.performed&&!eligibility.controlComplete)waiting=missingControl.length?`Väntar på kontrollintyg: ${missingControl.join(' + ')}`:'Väntar på kontrollintyg.';
 else if(eligibility.performed&&eligibility.controlComplete&&eligibility.requiresKaReview&&!eligibility.kaReviewDone)waiting='Kontrollintyget är klart · väntar på KA-signering.';
 else if(eligibility.fullyAttested)waiting='Kontrollpunktens signering är komplett.';
 return <div className={`reportApprovalAction ${canAttest?'ready':'locked'}`}>{canAttest&&action?<><span className="attestationRole">{action.label}</span><button disabled={busy} onClick={()=>void approve()}>{busy?'Signerar…':action.attestationType==='ka_review'?'✓ Signera som KA':'✓ Signera kontroll'}</button></>:<small className={eligibility.fullyAttested?'attestationComplete':''}>{waiting}</small>}{error&&<small>{error}</small>}</div>
}
