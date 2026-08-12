import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
type Master={id:string;code:string;name:string;version:number};
const TARGET_VERSION=7;
export function MasterV2UpgradeAction(){const[target,setTarget]=useState<Element|null>(null);const[masters,setMasters]=useState<Master[]>([]);const[selectedName,setSelectedName]=useState('');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
 useEffect(()=>{void load()},[]);useEffect(()=>{const sync=()=>{const header=document.querySelector('.masterProjectHeader');setTarget(header?.querySelector('.masterProjectHeaderRight')||null);setSelectedName(header?.querySelector('h1')?.textContent?.trim()||'')};sync();const timer=window.setInterval(sync,300);return()=>window.clearInterval(timer)},[]);
 async function load(){try{const r=await fetch('/api/studio/master-projects',{cache:'no-store'});const d=await r.json().catch(()=>({})) as {masterProjects?:Master[]};if(r.ok)setMasters(d.masterProjects||[])}catch{}}
 const selected=useMemo(()=>masters.find(m=>m.name===selectedName)||null,[masters,selectedName]);
 async function upgrade(){setBusy(true);setMessage('Uppgraderar…');try{const r=await fetch('/api/studio/master-projects/upgrade-fritidshus-v2',{method:'POST'});const d=await r.json().catch(()=>({})) as {version?:number;createdActivities?:number;error?:string};if(!r.ok)throw new Error(d.error||'Uppgraderingen misslyckades.');setMessage(`Version ${d.version||TARGET_VERSION} · ${d.createdActivities||0} nya aktiviteter`);await load();window.setTimeout(()=>window.location.reload(),500)}catch(e){setMessage(e instanceof Error?e.message:'Uppgraderingen misslyckades.')}finally{setBusy(false)}}
 if(!target||!selected||selected.code!=='fritidshus-v2'||Number(selected.version)>=TARGET_VERSION)return null;
 return createPortal(<div style={{display:'flex',alignItems:'center',gap:8}}><button onClick={()=>void upgrade()} disabled={busy}>↻ Uppgradera till version {TARGET_VERSION}</button>{message&&<small>{message}</small>}</div>,target)}
