import {useMemo,useState} from 'react';

export function ReportApprovalAction({projectId,itemId,responsibleRole,onDone}:{projectId:string;itemId:string;responsibleRole?:string;onDone?:()=>void}){
 const roles=useMemo(()=>{const base=String(responsibleRole||'').split(/[\/,;+]/).map(x=>x.trim().toUpperCase()).filter(Boolean);return [...new Set([...base,'BH','KA','EK','SAKKUNNIG'])]},[responsibleRole]);
 const[role,setRole]=useState(roles[0]||'BH'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function approve(){setBusy(true);setError('');try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-items/${encodeURIComponent(itemId)}/attest`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roleCode:role,attestationType:'approved'})});const x=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(x.error||'Kunde inte attestera punkten.');onDone?.()}catch(e){setError(e instanceof Error?e.message:'Kunde inte attestera punkten.')}finally{setBusy(false)}}
 return <div className="reportApprovalAction"><select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(r=><option key={r}>{r}</option>)}</select><button disabled={busy} onClick={()=>void approve()}>{busy?'Attesterar…':'✓ Attestera'}</button>{error&&<small>{error}</small>}</div>
}
