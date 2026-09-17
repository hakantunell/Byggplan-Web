import {useEffect,useState} from 'react';
import './master-module-validation.css';

type MasterProject={id:string;name:string;version:number;status:string};
type ValidationOption={code:string;name:string;behavior:'add_flow'|'replace_flow'|'augment_base'|'parameter_only';targetTitle:string|null;taskCount:number;directGraphTaskCount:number;taskTitles:string[];warnings:string[];status:'ok'|'review'};
type ValidationGroup={groupCode:string;groupName:string;selectionMode:string;graphAnchorCount:number;options:ValidationOption[];status:'ok'|'review'};
type ValidationResult={master:{id:string;name:string;version:number};summary:{baseTaskCount:number;moduleTaskCount:number;groupCount:number;moduleCount:number;groupsNeedingReview:number;optionsNeedingReview:number;staleGraphRefCount:number;conditionalBaseCandidateCount:number};base:{taskCount:number;conditionalCandidates:Array<{id:string;title:string;areaName:string;sectionName:string;inGraph:boolean}>};groups:ValidationGroup[];staleGraphRefs:string[];error?:string};

const behaviorLabels:Record<ValidationOption['behavior'],string>={add_flow:'Lägger till eget flöde',replace_flow:'Ersätter flöde',augment_base:'Kompletterar basmoment',parameter_only:'Styr basmoment'};

export function MasterModuleValidation(){
 const[masters,setMasters]=useState<MasterProject[]>([]),[masterId,setMasterId]=useState(''),[result,setResult]=useState<ValidationResult|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{void loadMasters()},[]);
 async function loadMasters(){try{const r=await fetch('/api/studio/master-projects',{cache:'no-store'});const d=await r.json().catch(()=>({})) as {masterProjects?:MasterProject[];error?:string};if(!r.ok)throw new Error(d.error||'Kunde inte läsa Masterprojekt.');const next=(d.masterProjects||[]).filter(m=>m.status==='active');setMasters(next);setMasterId(current=>current&&next.some(m=>m.id===current)?current:(next[0]?.id||''))}catch(e){setError(e instanceof Error?e.message:'Kunde inte läsa Masterprojekt.')}}
 async function validate(){if(!masterId)return;setLoading(true);setError('');setResult(null);try{const r=await fetch(`/api/studio/master-projects/${encodeURIComponent(masterId)}/module-validation`,{cache:'no-store'});const d=await r.json().catch(()=>({})) as ValidationResult;if(!r.ok)throw new Error(d.error||'Mastermodulerna kunde inte valideras.');setResult(d)}catch(e){setError(e instanceof Error?e.message:'Mastermodulerna kunde inte valideras.')}finally{setLoading(false)}}
 return <section className="systemCard masterModuleValidationCard">
  <small>MASTERPROJEKT</small><h2>Validera basstruktur och modulval</h2>
  <p>Kontrollerar att basstrukturen är stabil och att varje modul antingen ersätter, kompletterar eller lägger till rätt del av processen utan lösa moment.</p>
  <label>Masterprojekt<select value={masterId} onChange={e=>{setMasterId(e.target.value);setResult(null)}} disabled={loading||masters.length===0}>{masters.length?masters.map(m=><option key={m.id} value={m.id}>{m.name} · version {m.version}</option>):<option value="">Inget aktivt Masterprojekt</option>}</select></label>
  <button className="masterModuleValidateButton" type="button" disabled={!masterId||loading} onClick={()=>void validate()}>{loading?'Validerar…':'Validera alla modulval'}</button>
  {error&&<div className="masterModuleValidationError">{error}</div>}
  {result&&<div className="masterModuleValidationResult">
   <div className="masterModuleValidationSummary"><span><b>{result.summary.baseTaskCount}</b><small>basmoment</small></span><span><b>{result.summary.moduleCount}</b><small>moduler</small></span><span className={result.summary.optionsNeedingReview?'warn':''}><b>{result.summary.optionsNeedingReview}</b><small>behöver granskas</small></span><span className={result.summary.staleGraphRefCount?'warn':''}><b>{result.summary.staleGraphRefCount}</b><small>gamla graf-ID:n</small></span></div>
   {result.base.conditionalCandidates.length>0&&<details className="masterModuleValidationDetails"><summary>⚠ {result.base.conditionalCandidates.length} basmoment ser byggmetodsspecifika ut</summary><div>{result.base.conditionalCandidates.map(t=><article key={t.id}><b>{t.title}</b><small>{t.areaName} · {t.sectionName}{t.inGraph?' · finns i grafen':''}</small></article>)}</div></details>}
   <div className="masterModuleGroups">{result.groups.map(group=><details key={group.groupCode} open={group.status==='review'} className={group.status==='review'?'review':''}><summary><span><b>{group.groupName}</b><small>{group.selectionMode==='multi'?'flera val möjliga':'välj ett'} · {group.graphAnchorCount} grafankare</small></span><strong>{group.status==='review'?'Granska':'OK'}</strong></summary><div className="masterModuleOptions">{group.options.map(option=><article key={option.code} className={option.status==='review'?'review':''}><header><span><b>{option.name}</b><small>{option.code}</small></span><strong>{behaviorLabels[option.behavior]}</strong></header>{option.targetTitle&&<p>Mål i basstruktur: <b>{option.targetTitle}</b></p>}<p>{option.taskCount} modulmoment · {option.directGraphTaskCount} direkt i Master-grafen</p>{option.taskTitles.length>0&&<small>Moment: {option.taskTitles.join(' · ')}</small>}{option.warnings.length>0&&<ul>{option.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>}</article>)}</div></details>)}</div>
   {result.staleGraphRefs.length>0&&<details className="masterModuleValidationDetails"><summary>⚠ {result.staleGraphRefs.length} grafreferenser pekar på borttagna Master-moment</summary><code>{result.staleGraphRefs.join('\n')}</code></details>}
  </div>}
 </section>
}
