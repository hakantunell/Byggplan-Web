import { useEffect,useMemo,useState } from 'react';

type Parameter={name:string;in:'path'|'query';required?:boolean;description?:string;schema?:{type?:string}};
type Operation={tags?:string[];summary?:string;description?:string;parameters?:Parameter[];requestBody?:{content?:Record<string,{example?:unknown}>}};
type Spec={openapi:string;info:{title:string;version:string;description?:string};paths:Record<string,Record<string,Operation>>};
type Endpoint={path:string;method:string;operation:Operation};

type Props={projectId:string};
const METHODS=['get','post','put','patch','delete'];
const methodClass=(method:string)=>`apiMethod apiMethod${method.toUpperCase()}`;

function initialBody(operation:Operation,projectId:string){
 const example=operation.requestBody?.content?.['application/json']?.example;
 if(example===undefined)return'';
 return JSON.stringify(example,null,2).replaceAll('{projectId}',projectId);
}

export function ApiBrowser({projectId}:Props){
 const[spec,setSpec]=useState<Spec|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState('');
 const[selectedKey,setSelectedKey]=useState('');const[paramValues,setParamValues]=useState<Record<string,string>>({});const[body,setBody]=useState('');
 const[running,setRunning]=useState(false);const[result,setResult]=useState<{status:number;statusText:string;duration:number;body:string;url:string}|null>(null);const[search,setSearch]=useState('');
 useEffect(()=>{let cancelled=false;setLoading(true);setError('');void(async()=>{try{const r=await fetch('/api/openapi.json',{cache:'no-store'});const d=await r.json().catch(()=>null) as Spec|null;if(!r.ok||!d)throw new Error(`Kunde inte läsa OpenAPI-specifikationen (HTTP ${r.status}).`);if(!cancelled)setSpec(d)}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Kunde inte läsa OpenAPI-specifikationen.')}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[]);
 const endpoints=useMemo(()=>{if(!spec)return[];const list:Endpoint[]=[];for(const[path,ops]of Object.entries(spec.paths)){for(const method of METHODS){const operation=ops[method];if(operation)list.push({path,method,operation})}}return list},[spec]);
 const filtered=useMemo(()=>{const q=search.trim().toLocaleLowerCase('sv-SE');if(!q)return endpoints;return endpoints.filter(e=>`${e.method} ${e.path} ${e.operation.summary||''} ${(e.operation.tags||[]).join(' ')}`.toLocaleLowerCase('sv-SE').includes(q))},[endpoints,search]);
 const grouped=useMemo(()=>{const groups=new Map<string,Endpoint[]>();for(const endpoint of filtered){const tag=endpoint.operation.tags?.[0]||'Övrigt';const items=groups.get(tag)||[];items.push(endpoint);groups.set(tag,items)}return[...groups.entries()]},[filtered]);
 const selected=endpoints.find(e=>`${e.method}:${e.path}`===selectedKey)||null;
 function choose(endpoint:Endpoint){const values:Record<string,string>={};for(const p of endpoint.operation.parameters||[]){if(p.name==='projectId')values[p.name]=projectId;else values[p.name]=''}setSelectedKey(`${endpoint.method}:${endpoint.path}`);setParamValues(values);setBody(initialBody(endpoint.operation,projectId));setResult(null);setError('')}
 async function run(){if(!selected)return;for(const p of selected.operation.parameters||[]){if(p.required&&!String(paramValues[p.name]||'').trim()){setError(`Parametern ${p.name} krävs.`);return}}
  const write=selected.method!=='get';if(write&&!window.confirm(`${selected.method.toUpperCase()} är ett skrivande API-anrop och kan ändra projektdata. Vill du köra det?`))return;
  let path=selected.path;const query=new URLSearchParams();for(const p of selected.operation.parameters||[]){const value=String(paramValues[p.name]||'').trim();if(p.in==='path')path=path.replace(`{${p.name}}`,encodeURIComponent(value));else if(value)query.set(p.name,value)}if([...query].length)path+=`?${query.toString()}`;
  setRunning(true);setError('');setResult(null);const start=performance.now();try{let parsedBody:unknown=undefined;if(body.trim()){try{parsedBody=JSON.parse(body)}catch{throw new Error('Request body är inte giltig JSON.')}}const r=await fetch(path,{method:selected.method.toUpperCase(),headers:parsedBody!==undefined?{'Content-Type':'application/json'}:undefined,body:parsedBody!==undefined?JSON.stringify(parsedBody):undefined,cache:'no-store'});const text=await r.text();let pretty=text;try{pretty=JSON.stringify(JSON.parse(text),null,2)}catch{}setResult({status:r.status,statusText:r.statusText,duration:Math.round(performance.now()-start),body:pretty,url:path})}catch(e){setError(e instanceof Error?e.message:'API-anropet misslyckades.')}finally{setRunning(false)}}
 if(loading)return <div className="apiBrowserEmpty">Läser OpenAPI-specifikation…</div>;
 if(error&&!spec)return <div className="apiBrowserError">{error}</div>;
 return <div className="apiBrowser">
  <aside className="apiBrowserList"><div className="apiBrowserListHeader"><div><small>OPENAPI {spec?.openapi}</small><strong>{spec?.info.title}</strong><span>v{spec?.info.version}</span></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Sök API…"/></div><div className="apiEndpointGroups">{grouped.map(([tag,items])=><section key={tag}><h4>{tag}</h4>{items.map(endpoint=>{const key=`${endpoint.method}:${endpoint.path}`;return <button key={key} className={selectedKey===key?'active':''} onClick={()=>choose(endpoint)}><span className={methodClass(endpoint.method)}>{endpoint.method.toUpperCase()}</span><span><b>{endpoint.operation.summary||endpoint.path}</b><small>{endpoint.path}</small></span></button>})}</section>)}</div></aside>
  <main className="apiBrowserDetail">{!selected?<div className="apiBrowserEmpty"><strong>Välj ett API till vänster</strong><p>API Browser kör anrop via Studio samma-origin-transport. Den riktiga `/api/...`-sökvägen behöver därför inte öppnas i browserns adressfält.</p></div>:<><header><div><span className={methodClass(selected.method)}>{selected.method.toUpperCase()}</span><div><h3>{selected.operation.summary||selected.path}</h3><code>{selected.path}</code></div></div>{selected.operation.description&&<p>{selected.operation.description}</p>}</header><div className="apiRequestPanel">{(selected.operation.parameters||[]).length>0&&<section><h4>Parametrar</h4><div className="apiFields">{(selected.operation.parameters||[]).map(p=><label key={`${p.in}:${p.name}`}><span>{p.name} <small>{p.in}{p.required?' · krävs':''}</small></span><input value={paramValues[p.name]||''} onChange={e=>setParamValues(v=>({...v,[p.name]:e.target.value}))}/>{p.description&&<small>{p.description}</small>}</label>)}</div></section>}{selected.operation.requestBody&&<section><h4>Request body</h4><textarea rows={12} spellCheck={false} value={body} onChange={e=>setBody(e.target.value)}/></section>}<div className="apiRunRow"><button className={selected.method==='get'?'primary':'apiWriteButton'} disabled={running} onClick={()=>void run()}>{running?'Kör…':`Kör ${selected.method.toUpperCase()}`}</button>{selected.method!=='get'&&<small>⚠ Skrivande anrop – bekräftelse krävs.</small>}</div>{error&&<div className="apiBrowserError">{error}</div>}</div>{result&&<section className="apiResponse"><div><h4>Svar</h4><span className={result.status>=200&&result.status<300?'ok':'bad'}>{result.status} {result.statusText}</span><small>{result.duration} ms</small></div><code>{result.url}</code><pre>{result.body||'(tomt svar)'}</pre></section>}</>}</main>
 </div>
}
