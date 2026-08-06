import { useCallback, useEffect, useMemo, useState } from 'react';

type Requirement = { id:string; label:string; kind:'photo'|'measurement'|'check'; unit?:string; min?:number; done:boolean; value?:string; required?:boolean };
type TechnicalItem = { id:string; title:string; type:'text'|'drawing'|'image'|'document'|'material'; summary:string; revision?:string; details?:string[]; objectKey?:string; externalUrl?:string; sourceLevel?:'project'|'work_area'|'work_section'|'task' };
type Project = { id:string; name:string; property_designation?:string; status:string; work_area_count:number; work_section_count:number; task_count:number };
type Task = { id:string; projectId:string; project:string; workAreaId:string; workArea:string; workSectionId:string; workSection:string; title:string; description:string; status:'todo'|'active'|'review'|'done'|'blocked'; assignee?:string; requirements:Requirement[]; technical:TechnicalItem[] };
type DetailTab='work'|'technical'|'history';
type Area={id:string;name:string;sections:Section[]};
type Section={id:string;name:string;tasks:Task[]};

const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');
const labels={todo:'Ej påbörjad',active:'Pågår',review:'För kontroll',done:'Klart',blocked:'Blockerat'};
const areaIcons:Record<string,string>={Markarbete:'♜',Avlopp:'◉',Grund:'▦',Stomme:'◫',Tak:'⌂'};
const typeLabels={text:'Tekniska data',drawing:'Ritning',image:'Bild',document:'Dokument',material:'Material'};
const levelLabels={project:'Projekt',work_area:'Arbetsområde',work_section:'Arbetsavsnitt',task:'Moment'};

export function App(){
  const[projects,setProjects]=useState<Project[]>([]);
  const[projectId,setProjectId]=useState<string|null>(null);
  const[tasks,setTasks]=useState<Task[]>([]);
  const[selectedId,setSelectedId]=useState<string|null>(null);
  const[tab,setTab]=useState<DetailTab>('work');
  const[apiState,setApiState]=useState<'loading'|'connected'|'error'|'offline'>('loading');
  const[openAreas,setOpenAreas]=useState<string[]>([]);
  const[openSections,setOpenSections]=useState<string[]>([]);

  const selected=tasks.find(t=>t.id===selectedId)??null;
  const currentProject=projects.find(p=>p.id===projectId);
  const grouped=useMemo<Area[]>(()=>{
    const areas=new Map<string,{id:string;name:string;sections:Map<string,Section>}>();
    for(const task of tasks){
      if(!areas.has(task.workAreaId))areas.set(task.workAreaId,{id:task.workAreaId,name:task.workArea,sections:new Map()});
      const area=areas.get(task.workAreaId)!;
      if(!area.sections.has(task.workSectionId))area.sections.set(task.workSectionId,{id:task.workSectionId,name:task.workSection,tasks:[]});
      area.sections.get(task.workSectionId)!.tasks.push(task);
    }
    return[...areas.values()].map(a=>({id:a.id,name:a.name,sections:[...a.sections.values()]}));
  },[tasks]);

  const loadTasks=useCallback(async(id:string)=>{
    if(!navigator.onLine){setApiState('offline');return;}
    try{
      const response=await fetch(`${API_BASE}/api/tasks?projectId=${encodeURIComponent(id)}`);
      if(!response.ok)throw new Error(`API svarade ${response.status}`);
      const data=await response.json() as {tasks:Task[]};
      setTasks(data.tasks);setApiState('connected');
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
  const toggleArea=(id:string)=>setOpenAreas(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  const toggleSection=(id:string)=>setOpenSections(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  const toggleTask=(task:Task)=>{setSelectedId(current=>current===task.id?null:task.id);setTab('work')};

  const update=async(req:Requirement,value?:string)=>{
    if(!navigator.onLine)return alert('Du måste vara online för att registrera.');
    const done=req.kind==='check'?!req.done:Boolean(value);
    const response=await fetch(`${API_BASE}/api/requirements/${req.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:value??null,done})});
    if(!response.ok)return alert('Uppgiften kunde inte sparas.');
    setTasks(current=>current.map(task=>task.id!==selectedId?task:{...task,requirements:task.requirements.map(item=>item.id!==req.id?item:{...item,value,done})}));
  };
  const submit=async(task:Task)=>{
    const missing=task.requirements.filter(req=>(req.required??true)&&!req.done);
    if(missing.length)return alert(`${missing.length} obligatoriska uppgifter saknas.`);
    const response=await fetch(`${API_BASE}/api/tasks/${task.id}/review`,{method:'POST'});
    if(!response.ok)return alert('Momentet kunde inte skickas för kontroll.');
    setTasks(current=>current.map(item=>item.id===task.id?{...item,status:'review'}:item));
  };

  if(projects.length>1&&!projectId)return<ProjectChooser projects={projects} onChoose={chooseProject}/>;
  if(apiState==='loading'&&!projectId)return<CenterState text="Hämtar projekt…"/>;
  if(!currentProject)return<CenterState text="Inget projekt kunde öppnas." retry={()=>void loadProjects()}/>;

  return <div className="app">
    <header><div><strong>{currentProject.name}</strong><span>ByggPlan</span></div><div className="headerActions">{projects.length>1&&<button onClick={()=>setProjectId(null)}>Byt projekt</button>}<b className={apiState==='connected'?'online':'offline'}>● {apiState==='connected'?'Online':apiState==='offline'?'Offline':'API-fel'}</b></div></header>
    <main><h1 className="pageTitle">Arbetsområden</h1><section className="layout">
      <nav className="workTree" aria-label="Arbetsområden">
        {grouped.map(area=>{
          const areaOpen=openAreas.includes(area.id);
          const taskCount=area.sections.reduce((sum,s)=>sum+s.tasks.length,0);
          return <section className={`areaCard ${areaOpen?'open':''}`} key={area.id}>
            <button className="areaToggle" onClick={()=>toggleArea(area.id)}><span className="levelIcon">{areaIcons[area.name]??'▣'}</span><span className="levelText"><b>{area.name}</b><small>{area.sections.length} arbetsavsnitt · {taskCount} moment</small></span><span className="expand">{areaOpen?'−':'+'}</span></button>
            {areaOpen&&<div className="areaBody">{area.sections.map(section=>{
              const sectionOpen=openSections.includes(section.id);
              return <section className="sectionCard" key={section.id}>
                <button className="sectionToggle" onClick={()=>toggleSection(section.id)}><span className="sectionIcon">⌖</span><span className="levelText"><b>{section.name}</b><small>{section.tasks.length} moment</small></span><span className="expand">{sectionOpen?'−':'+'}</span></button>
                {sectionOpen&&<div className="taskList">{section.tasks.map(task=>{
                  const taskOpen=selectedId===task.id;
                  return <article className={`taskCard ${taskOpen?'open':''}`} key={task.id}>
                    <button className="taskToggle" onClick={()=>toggleTask(task)}><span className={`statusDot ${task.status}`}/><span className="levelText"><b>{task.title}</b><small>{labels[task.status]}</small></span><span className="expand">{taskOpen?'−':'+'}</span></button>
                    {taskOpen&&<div className="mobileInline"><TaskDetails task={task} tab={tab} setTab={setTab} update={update} submit={submit}/></div>}
                  </article>;
                })}</div>}
              </section>;
            })}</div>}
          </section>;
        })}
      </nav>
      <aside className="desktopDetail">{selected?<TaskDetails task={selected} tab={tab} setTab={setTab} update={update} submit={submit}/>:<div className="emptyDetail"><span>☷</span><b>Välj ett moment</b><p>Detaljer och kontrollpunkter visas här.</p></div>}</aside>
    </section></main>
  </div>;
}

function TaskDetails({task,tab,setTab,update,submit}:{task:Task;tab:DetailTab;setTab:(tab:DetailTab)=>void;update:(req:Requirement,value?:string)=>Promise<void>;submit:(task:Task)=>Promise<void>}){
  return <div className="taskDetails"><div className="taskHeading"><div><span className={`statusDot large ${task.status}`}/><h2>{task.title}</h2></div><span className={`pill ${task.status}`}>{labels[task.status]}</span></div>{task.description&&<p className="taskDescription">{task.description}</p>}
    <div className="detailTabs"><button className={tab==='work'?'active':''} onClick={()=>setTab('work')}>Arbete</button><button className={tab==='technical'?'active':''} onClick={()=>setTab('technical')}>Underlag</button><button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>Historik</button></div>
    {tab==='work'&&<><h3>Kontrollpunkter</h3><div className="requirementList">{task.requirements.map(req=><div className="requirementRow" key={req.id}><span className="reqIcon">{req.kind==='photo'?'▣':req.kind==='measurement'?'⌁':'☷'}</span><div className="reqMain"><b>{req.label}</b>{req.kind==='measurement'?<label><input inputMode="decimal" value={req.value??''} onChange={e=>void update(req,e.target.value)}/>{req.unit}</label>:req.kind==='photo'?<button onClick={()=>void update(req,'registrerat')}>{req.done?'Foto registrerat':'Lägg till foto'}</button>:<label><input type="checkbox" checked={req.done} onChange={()=>void update(req)}/> Kontrollerat</label>}</div><span className={`reqState ${req.done?'done':''}`}>{req.done?'Klar ✓':'Saknas'}</span></div>)}</div><div className="taskActions"><button onClick={()=>setTab('technical')}>⌕ <span><b>Tekniskt underlag</b><small>{task.technical.length} filer</small></span></button><button onClick={()=>void submit(task)}>➤ <span><b>Skicka för kontroll</b><small>När du är klar</small></span></button></div></>}
    {tab==='technical'&&<TechnicalTab items={task.technical}/>} {tab==='history'&&<section className="history"><h3>Historik</h3><p>Ändringar och registreringar visas här.</p></section>}
  </div>;
}

function TechnicalTab({items}:{items:TechnicalItem[]}){return <section className="technicalPanel">{items.length===0&&<p className="emptyText">Inget underlag kopplat.</p>}{items.map(item=><article className="technicalCard" key={item.id}><div className={`fileIcon ${item.type}`}>{item.type==='drawing'?'⌑':item.type==='image'?'▧':item.type==='document'?'▤':item.type==='material'?'▦':'i'}</div><div><div className="technicalMeta"><span>{typeLabels[item.type]}</span>{item.sourceLevel&&<b>{levelLabels[item.sourceLevel]}</b>}{item.revision&&<b>{item.revision}</b>}</div><h4>{item.title}</h4>{item.summary&&<p>{item.summary}</p>}{item.details&&item.details.length>0&&<ul>{item.details.map(detail=><li key={detail}>{detail}</li>)}</ul>}</div></article>)}</section>}
function ProjectChooser({projects,onChoose}:{projects:Project[];onChoose:(id:string)=>void}){return <main className="projectChooser"><strong className="brand">ByggPlan</strong><section>{projects.map(project=><button key={project.id} onClick={()=>onChoose(project.id)}><span><b>{project.name}</b><small>{project.property_designation??'Ingen fastighetsbeteckning'}</small></span><i>›</i></button>)}</section></main>}
function CenterState({text,retry}:{text:string;retry?:()=>void}){return <div className="centerState"><strong>ByggPlan</strong><p>{text}</p>{retry&&<button onClick={retry}>Försök igen</button>}</div>}
