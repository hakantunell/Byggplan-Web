import {useEffect,useState} from 'react';

type Approval={id:string;governing_item_id:string;signer_name:string;signer_email?:string;role_code:string;attestation_type?:string;signing_method?:string;content_hash?:string|null;signed_at:string};
function typeLabel(type:string|undefined,role:string){if(type==='ka_review')return'KA-signering';if(type==='control')return'Kontrollintyg';return role==='KA'?'Kontrollintyg':'Kontrollintyg'}
function methodLabel(a:Approval){if(a.signing_method==='password_reauth_sha256'&&a.content_hash)return'Lösenordsbekräftad · underlag låst med SHA-256';return'Äldre intern signering'}

type Props={items?:Approval[];loading?:boolean;projectId?:string;itemId?:string};
export function ReportApproval({items:providedItems,loading:providedLoading=false,projectId,itemId}:Props){
 const[fetchedItems,setFetchedItems]=useState<Approval[]>([]),[fetching,setFetching]=useState(false),[error,setError]=useState('');
 const shouldFetch=providedItems===undefined&&Boolean(projectId&&itemId);
 useEffect(()=>{if(!shouldFetch||!projectId||!itemId)return;let active=true;setFetching(true);setError('');fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-attestations`,{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Kunde inte läsa signeringarna.');return r.json() as Promise<{attestations?:Approval[]}>}).then(x=>{if(active)setFetchedItems((x.attestations||[]).filter(a=>a.governing_item_id===itemId))}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Kunde inte läsa signeringarna.')}).finally(()=>{if(active)setFetching(false)});return()=>{active=false}},[shouldFetch,projectId,itemId]);
 const items=providedItems??fetchedItems,loading=providedItems!==undefined?providedLoading:fetching;
 return <div className="reportApproval"><small>SIGNERINGAR</small>{loading?<span>Laddar signeringar…</span>:error?<span>{error}</span>:items.length?items.map(a=><div key={a.id}><b>{typeLabel(a.attestation_type,a.role_code)} · {a.signer_name}</b><span>{a.role_code} · {a.signed_at}</span><span>{methodLabel(a)}</span>{a.signer_email&&<span>{a.signer_email}</span>}{a.content_hash&&<span title={a.content_hash}>Fingeravtryck {a.content_hash.slice(0,12)}…</span>}</div>):<span>Ingen signering ännu</span>}</div>
}
