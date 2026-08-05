import { useCallback, useEffect, useMemo, useState } from 'react';

type Requirement = { id:string; label:string; kind:'photo'|'measurement'|'check'; unit?:string; min?:number; done:boolean; value?:string; required?:boolean };
type TechnicalItem = { id:string; title:string; type:'text'|'drawing'|'image'|'document'|'material'; summary:string; revision?:string; details?:string[]; objectKey?:string; externalUrl?:string; sourceLevel?:'project'|'work_area'|'work_section'|'task' };
type Project = { id:string; name:string; property_designation?:string; status:string; work_area_count:number; work_section_count:number; task_count:number };
type Task = { id:string; projectId:string; project:string; workAreaId:string; workArea:string; workSectionId:string; workSection:string; title:string; description:string; status:'todo'|'active'|'review'|'done'|'blocked'; assignee?:string; requirements:Requirement[]; technical:TechnicalItem[] };
type DetailTab = 'work'|'technical'|'history';

const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');
const labels={todo:'Kan göras',active:'Pågår',review:'Redo för kontroll',done:'Klart',blocked:'Blockerat'};
const typeLabels={text:'Tekniska data',drawing:'Ritning',image:'Bild',document:'Dokument',material:'Material'};
const levelLabels={project:'Projekt',work_area:'Arbetsområde',work_section:'Arbetsavsnitt',task:'Moment'};

export function App(){
  const[projects,setProjects]=useState<Project[]>([]);
  const[projectId,setProjectId]=useState<string|null>(null);
  const[tasks,setTasks]=useState<Task[]>([]);
  const[selectedId,setSelectedId]=useState<string|null>(null);
  const[tab,setTab]=useState<DetailTab>('work');
  const[lastSync,setLastSync]=useState(new Date());
  const[apiState,setApiState]=useState<'loading'|'connected'|'error'|'offline'>('loading');
  const[openAreas,setOpenAreas]=useState<string[]>([]);
  const[openSections,setOpenSections]=useState<string[]>([]);

  const selected=useMemo(()=>tasks.find(t=>t.id===selectedId)??tasks[0],[tasks,selectedId]);
  const currentProject=projects.find(p=>p.id===projectId);
  const grouped=useMemo(()=>{
    const areas=new Map<string,{id:string;name:string;sections:Map<string,{id:string;name:string;tasks:Task[]}>}>();
    for(const task of tasks){
      if(!areas.has(task.workAreaId))areas.set(task.workAreaId,{id:task.workAreaId,name:task.workArea,sections:new Map()});
      const area=areas.get(task.workAreaId)!;
      if(!area.sections.has(task.workSectionId))area.sections.set(task.workSectionId,{id:task.workSectionId,name:task.workSection,tasks:[]});
      area.sections.get(task.workSectionId)!.tasks.push(task);
    }
    return[...areas.values()].map(a=>({...a,sections:[...a.sections.values()]}));
  },[tasks]);

  const loadTasks=useCallback(async(id:string)=>{
    if(!navigator.onLine){setApiState('offline');return;}
    try{
      const response=await fetch(`${API_BASE}/api/tasks?projectId=${encodeURIComponent(id)}`);
      if(!response.ok)throw new Error(`API svarade ${response.status}`);
      const data=await response.json() as {tasks:Task[]};
      setTasks(data.tasks);
      setSelectedId(current=>data.tasks.some(t=>t.id===current)?current:(data.tasks[0]?.id??null));
      if(data.tasks[0]){setOpenAreas([data.tasks[0].workAreaId]);setOpenSections([data.tasks[0].workSectionId]);}
      setApiState('connected');setLastSync(new Date());
    }catch(error){console.error(error);setApiState('error');}
  },[]);

  const loadProjects=useCallback(async()=>{
    if(!navigator.onLine){setApiState('offline');return;}
    try{
      const response=await fetch(`${API_BASE}/api/projects`);
      if(!response.ok)throw new Error(`API svarade ${response.status}`);
      const data=await response.json() as {projects:Project[]};
      setProjects(data.projects);setProjectId(current=>current??(data.projects.length===1?data.projects[0].id:null));setApiState('connected');
    }catch(error){console.error(error);setApiState('error');}
  },[]);

  useEffect(()=>{void loadProjects()},[loadProjects]);
  useEffect(()=>{if(projectId)void loadTasks(projectId)},[projectId,loadTasks]);
  useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible'&&projectId)void loadTasks(projectId)},60000);return()=>clearInterval(timer)},[projectId,loadTasks]);

  const chooseProject=(id:string)=>{setProjectId(id);setSelectedId(null);setTab('work')};
  const selectTask=(id:string)=>{setSelectedId(id);setTab('work');requestAnimationFrame(()=>document.querySelector('.detailPane')?.scrollIntoView({behavior:'smooth',block:'start'}));};
  const toggleArea=(id:string)=>setOpenAreas(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  const toggleSection=(id:string)=>setOpenSections(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);

  const update=async(req:Requirement,value?:string)=>{
    if(!navigator.onLine)return alert('Du måste vara online för att registrera.');
    const done=req.kind==='check'?!req.done:Boolean(value);
    const response=await fetch(`${API_BASE}/api/requirements/${req.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:value??null,done})});
    if(!response.ok)return alert('Uppgiften kunde inte sparas.');
    setTasks(current=>current.map(task=>task.id!==selected.id?task:{...task,requirements:task.requirements.map(item=>item.id!==req.id?item:{...item,value,done})}));setLastSync(new Date());
  };
  const submit=async()=>{
    const missing=selected.requirements.filter(req=>(req.required??true)&&!req.done);
    if(missing.length)return alert(`${missing.length} obligatoriska uppgifter saknas.`);
    const response=await fetch(`${API_BASE}/api/tasks/${selected.id}/review`,{method:'POST'});
    if(!response.ok)return alert('Momentet kunde inte skickas för kontroll.');
    setTasks(current=>current.map(task=>task.id===selected.id?{...task,status:'review'}:task));
  };

  if(projects.length>1&&!projectId)return<ProjectChooser projects={projects} onChoose={chooseProject}/>;
  if(apiState==='loading'&&!projectId)return<CenterState text="Hämtar projekt…"/>;
  if(!currentProject)return<CenterState text="Inget projekt kunde öppnas." retry={()=>void loadProjects()}/>;
  const connection=apiState==='connected'?'Online':apiState==='offline'?'Offline':'API-fel';

  return <div className="app">
    <header><div><strong>{currentProject.name}</strong><span>ByggPlan</span></div><div className="headerActions">{projects.length>1&&<button onClick={()=>setProjectId(null)}>Byt projekt</button>}<b className={apiState==='connected'?'online':'offline'}>{connection}</b></div></header>
    <main>
      <section className="grid">
        <nav className="panel hierarchy" aria-label="Arbetsstruktur">
          <h2>Arbetsområden</h2>
          {grouped.map(area=><section className={`areaGroup ${openAreas.includes(area.id)?'open':''}`} key={area.id}>
            <button className="areaToggle" onClick={()=>toggleArea(area.id)}><span><b>{area.name}</b><small>{area.sections.length} arbetsavsnitt</small></span><em>{openAreas.includes(area.id)?'−':'+'}</em></button>
            {openAreas.includes(area.id)&&<div className="areaContent">{area.sections.map(section=><section className={`sectionGroup ${openSections.includes(section.id)?'open':''}`} key={section.id}>
              <button className="sectionToggle" onClick={()=>toggleSection(section.id)}><span><b>{section.name}</b><small>{section.tasks.length} moment</small></span><em>{openSections.includes(section.id)?'−':'+'}</em></button>
              {openSections.includes(section.id)&&<div className="taskList">{section.tasks.map(task=><button className={`task ${selected?.id===task.id?'selected':''}`} onClick={()=>selectTask(task.id)} key={task.id}><i className={task.status}/><span><b>{task.title}</b><small>{labels[task.status]}{task.assignee?` · ${task.assignee}`:''}</small></span><em>›</em></button>)}</div>}
            </section>)}</div>}
          </section>)}
        </nav>
        {selected&&<aside className="detailPane">
          <button className="mobileBack" onClick={()=>document.querySelector('.hierarchy')?.scrollIntoView({behavior:'smooth'})}>← Arbetsområden</button>
          <p>{selected.workArea} / {selected.workSection}</p><h2>{selected.title}</h2><span className={`pill ${selected.status}`}>{labels[selected.status]}</span>{selected.description&&<p className="description">{selected.description}</p>}
          <div className="detailTabs"><button className={tab==='work'?'active':''} onClick={()=>setTab('work')}>Arbete</button><button className={tab==='technical'?'active':''} onClick={()=>setTab('technical')}>Underlag <span>{selected.technical.length}</span></button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>Historik</button></div>
          {tab==='work'&&<WorkTab selected={selected} update={update} submit={submit} showTechnical={()=>setTab('technical')}/>} {tab==='technical'&&<TechnicalTab items={selected.technical}/>} {tab==='history'&&<section className="history"><h3>Historik</h3><p>Ändringar och registreringar visas här.</p></section>}
        </aside>}
      </section>
    </main>
  </div>;
}

function WorkTab({selected,update,submit,showTechnical}:{selected:Task;update:(req:Requirement,value?:string)=>Promise<void>;submit:()=>Promise<void>;showTechnical:()=>void}){return <><h3>Kontrollpunkter</h3>{selected.requirements.map(req=><div className="requirement" key={req.id}><div><b>{req.label}</b>{req.kind==='measurement'?<label><input inputMode="decimal" value={req.value??''} onChange={e=>void update(req,e.target.value)}/>{req.unit}</label>:req.kind==='photo'?<button onClick={()=>void update(req,'registrerat')}>{req.done?'Foto registrerat':'Lägg till foto'}</button>:<label><input type="checkbox" checked={req.done} onChange={()=>void update(req)}/> Kontrollerat</label>}{req.min!=null&&<small>Minst {req.min} {req.unit}</small>}</div><strong className={req.done?'done':''}>{req.done?'Klar':'Saknas'}</strong></div>)}<button className="technicalShortcut" onClick={showTechnical}>Tekniskt underlag</button><button className="complete" onClick={()=>void submit()}>Skicka för kontroll</button></>}
function TechnicalTab({items}:{items:TechnicalItem[]}){return <section className="technicalPanel"><div className="technicalHeader"><h3>Tekniskt underlag</h3><button>＋ Lägg till</button></div>{items.length===0&&<p className="emptyText">Inget underlag kopplat.</p>}{items.map(item=><article className="technicalCard" key={item.id}><div className={`fileIcon ${item.type}`}>{item.type==='drawing'?'▱':item.type==='image'?'▧':item.type==='document'?'▤':item.type==='material'?'▦':'i'}</div><div><div className="technicalMeta"><span>{typeLabels[item.type]}</span>{item.sourceLevel&&<b>{levelLabels[item.sourceLevel]}</b>}{item.revision&&<b>{item.revision}</b>}</div><h4>{item.title}</h4>{item.summary&&<p>{item.summary}</p>}{item.details&&item.details.length>0&&<ul>{item.details.map(detail=><li key={detail}>{detail}</li>)}</ul>}{(item.objectKey||item.externalUrl)&&<button className="openResource">Öppna underlag</button>}</div></article>)}</section>}
function ProjectChooser({projects,onChoose}:{projects:Project[];onChoose:(id:string)=>void}){return <main className="projectChooser"><div><strong className="brand">ByggPlan</strong><p>Välj projekt.</p></div><section>{projects.map(project=><button key={project.id} onClick={()=>onChoose(project.id)}><span><b>{project.name}</b><small>{project.property_designation??'Ingen fastighetsbeteckning'}</small><em>{project.work_area_count} områden · {project.task_count} moment</em></span><i>›</i></button>)}</section></main>}
function CenterState({text,retry}:{text:string;retry?:()=>void}){return <div className="centerState"><strong>ByggPlan</strong><p>{text}</p>{retry&&<button onClick={retry}>Försök igen</button>}</div>}
