import { useEffect,useMemo,useState } from 'react';

type Condition={id:string;code:string;description:string;section_code:string;section_title:string;item_type:string;governing_document_id:string;governing_document_title:string;document_type:string;issuer:string;reference:string};

export function ProjectConditionsView({projectId}:{projectId:string}){
 const[items,setItems]=useState<Condition[]>([]);const[message,setMessage]=useState('');
 useEffect(()=>{let cancelled=false;void(async()=>{try{const r=await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/project-conditions`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as {conditions?:Condition[];error?:string};if(!r.ok)throw new Error(d.error||'Kunde inte läsa projektvillkor.');if(!cancelled)setItems(d.conditions||[])}catch(e){if(!cancelled)setMessage(e instanceof Error?e.message:'Kunde inte läsa projektvillkor.')}})();return()=>{cancelled=true}},[projectId]);
 const groups=useMemo(()=>{const m=new Map<string,{title:string;items:Condition[]}>();for(const item of items){const key=item.governing_document_id||item.governing_document_title;const g=m.get(key)||{title:item.governing_document_title||'Styrande dokument',items:[]};g.items.push(item);m.set(key,g)}return [...m.values()]},[items]);
 if(message)return <section className="projectSupportCard"><small>PROJEKTVILLKOR</small><strong>Projektvillkor</strong><p>{message}</p></section>;
 if(!items.length)return null;
 return <section className="projectSupportCard projectConditions"><small>PROJEKTVILLKOR</small><strong>{items.length} styrande villkor</strong><p>Villkor från projektets styrdokument som ska beaktas under planering, utförande eller förvaltning. De är referenskrav och skapar inte i sig ett extra arbetsmoment.</p><details><summary>Visa projektvillkor</summary>{groups.map(group=><div key={group.title} className="projectConditionGroup"><h3>{group.title}</h3>{group.items.map(item=><article key={item.id} className="projectConditionItem"><small>{[item.section_code,item.section_title,item.code].filter(Boolean).join(' · ')}</small><p>{item.description}</p></article>)}</div>)}</details></section>;
}
