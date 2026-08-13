import {useEffect,useState} from 'react';

type Approval={id:string;governing_item_id:string;signer_name:string;role_code:string;signed_at:string};

export function ReportApproval({projectId,itemId}:{projectId:string;itemId:string}){
 const[items,setItems]=useState<Approval[]>([]);
 useEffect(()=>{fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-attestations`,{cache:'no-store'}).then(r=>r.json()).then((x:{attestations?:Approval[]})=>setItems((x.attestations||[]).filter(a=>a.governing_item_id===itemId))).catch(()=>{})},[projectId,itemId]);
 return <div className="reportApproval"><small>GODKÄNNANDEN</small>{items.length?items.map(a=><div key={a.id}><b>{a.signer_name}</b><span>{a.role_code} · {a.signed_at}</span></div>):<span>Ingen attest ännu</span>}</div>
}
