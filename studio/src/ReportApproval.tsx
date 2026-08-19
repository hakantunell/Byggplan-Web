type Approval={id:string;governing_item_id:string;signer_name:string;signer_email?:string;role_code:string;attestation_type?:string;signing_method?:string;content_hash?:string|null;signed_at:string};
function typeLabel(type:string|undefined,role:string){if(type==='ka_review')return'KA-signering';if(type==='control')return'Kontrollintyg';return role==='KA'?'Kontrollintyg':'Kontrollintyg'}
function methodLabel(a:Approval){if(a.signing_method==='password_reauth_sha256'&&a.content_hash)return'Lösenordsbekräftad · underlag låst med SHA-256';return'Äldre intern signering'}
export function ReportApproval({items,loading=false}:{items:Approval[];loading?:boolean}){
 return <div className="reportApproval"><small>SIGNERINGAR</small>{loading?<span>Laddar signeringar…</span>:items.length?items.map(a=><div key={a.id}><b>{typeLabel(a.attestation_type,a.role_code)} · {a.signer_name}</b><span>{a.role_code} · {a.signed_at}</span><span>{methodLabel(a)}</span>{a.signer_email&&<span>{a.signer_email}</span>}{a.content_hash&&<span title={a.content_hash}>Fingeravtryck {a.content_hash.slice(0,12)}…</span>}</div>):<span>Ingen signering ännu</span>}</div>
}
