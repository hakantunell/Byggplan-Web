import { useCallback, useEffect, useMemo, useState } from 'react';

type ActivityType = 'perform'|'document'|'measurement'|'check'|'approval'|'note'|'choice';
type Activity = { id:string; title:string; description?:string; type:ActivityType; unit?:string; required:boolean; blocking:boolean; irreversible:boolean; technicalResourceId?:string; done:boolean; value?:string };
type TechnicalItem = { id:string; title:string; type:'text'|'drawing'|'image'|'document'|'material'; summary:string; revision?:string; details?:string[]; objectKey?:string; externalUrl?:string; sourceLevel?:'project'|'work_area'|'work_section'|'task' };
type Project = { id:string; name:string; property_designation?:string; status:string; work_area_count:number; work_section_count:number; task_count:number };
type Task = { id:string; projectId:string; project:string; workAreaId:string; workArea:string; workSectionId:string; workSection:string; title:string; description:string; status:'todo'|'active'|'review'|'done'|'blocked'; assignee?:string; activities:Activity[]; technical:TechnicalItem[] };

const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');
const labels={todo:'Kan göras',active:'Pågår',review:'Redo för kontroll',done:'Klart',blocked:'Blockerat'};
const typeLabels={text:'Tekniska data',drawing:'Ritning',image:'Bild',document:'Dokument',material:'Material'};
const levelLabels={project:'Projekt',work_area:'Arbetsområde',work_section:'Arbetsavsnitt',task:'Moment'};
const activityLabels:Record<ActivityType,string>={perform:'Utför',document:'Dokumentera',measurement:'Mät och registrera',check:'Kontrollera',approval:'Godkänn',note:'Anteckna',choice:'Välj'};
const activityIcons:Record<ActivityType,string>={perform:'🛠',document:'📷',measurement:'📏',check:'✓',approval:'✍',note:'📝',choice:'◉'};
const areaIcons:Record<string,string>={Markarbete:'⛏',Avlopp:'◉',Grund:'▦',Stomme:'▥',Tak:'⌂'};

export function App(){
  const[projects,setProjects]=useState<Project[]>([]);
  const[projectId,setProjectId]=useState<string|null>(null);
  const[tasks,setTasks]=useState<Task[]>([]);
  const[apiState,setApiState]=useState<'loading'|'connected'|'error'|'offline'>('loading');
  const[openAreas,setOpenAreas]=useState<string[]>([]);
  const[openSections,setOpenSections]=useState<string[]>([]);
  const[openTasks,setOpenTasks]=useState<string[]>([]);
  const[openTechnical,setOpenTechnical]=useState<string[]>([]);
  const currentProject=projects.find(p=>p.id===projectId);

  const grouped=useMemo(()=>{
    const areas=new Map<string,{id:string;name:string;sections:Map<string,{id:string;name:string;tasks:Task[]}>}>();
    for(const task of tasks){
      if(!areas.has(task.workAreaId))areas.set(task.workAreaId,{id:task.workAreaId,name:task.workArea,sections:new Map()});
      const area=areas.get(task.workAreaId)!;
      if(!area.sections.has(task.workSectionId))area.sections.set(task.workSectionId,{id:task.workSectionId,name:task.workSection,tasks:[]});
      area.sections.get(task.workSectionId)!.tasks.push(task);
    }
    return[...areas.values()].map(area=>({...area,sections:[...area.sections.values()]}));
  },[tasks]);

  const loadTasks=useCallback(async(id:string)=>{
    if(!navigator.onLine){setApiState('offline');return;}
    try{
      const response=await fetch(`${API_BASE}/api/tasks?projectId=${encodeURIComponent(id)}`);
      if(!response.ok)throw new Error(`API svarade ${response.status}`);
      const data=await response.json() as {tasks:Task[]};
      setTasks(data.tasks);
      if(data.tasks[0]&&!openAreas.length){setOpenAreas([data.tasks[0].workAreaId]);setOpenSections([data.tasks[0].workSectionId]);setOpenTasks([data.tasks[0].id]);}
      setApiState('connected');
    }catch(error){console.error(error);setApiState('error');}
  },[openAreas.length]);

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

  const toggle=(setter:React.Dispatch<React.SetStateAction<string[]>>,id:string,single=false)=>setter(current=>current.includes(id)?current.filter(x=>x!==id):(single?[id]:[...current,id]));
  const updateActivity=async(taskId:string,activity:Activity,value?:string)=>{
    if(!navigator.onLine)return alert('Du måste vara online för att registrera.');
    const done=activity.type==='measurement'?Boolean(value):!activity.done;
    const response=await fetch(`${API_BASE}/api/activities/${activity.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:value??activity.value??null,done})});
    if(!response.ok)return alert('Aktiviteten kunde inte sparas.');
    setTasks(current=>current.map(task=>task.id!==taskId?task:{...task,activities:task.activities.map(item=>item.id!==activity.id?item:{...item,value:value??item.value,done})}));
  };
  const submit=async(task:Task)=>{
    const missing=task.activities.filter(activity=>activity.required&&!activity.done);
    if(missing.length)return alert(`${missing.length} obligatoriska aktiviteter återstår.`);
    const response=await fetch(`${API_BASE}/api/tasks/${task.id}/review`,{method:'POST'});
    if(!response.ok){const body=await response.json().catch(()=>null) as {error?:string}|null;return alert(body?.error??'Momentet kunde inte skickas för kontroll.');}
    setTasks(current=>current.map(item=>item.id===task.id?{...item,status:'review'}:item));
  };

  if(projects.length>1&&!projectId)return<ProjectChooser projects={projects} onChoose={id=>setProjectId(id)}/>;
  if(apiState==='loading'&&!projectId)return<CenterState text="Hämtar projekt…"/>;
  if(!currentProject)return<CenterState text="Inget projekt kunde öppnas." retry={()=>void loadProjects()}/>;

  return <div className="app">
    <header><div><strong>{currentProject.name}</strong><span>ByggPlan</span></div><b className={apiState==='connected'?'online':'offline'}>{apiState==='connected'?'● Online':apiState==='offline'?'Offline':'API-fel'}</b></header>
    <main><h1>Arbetsområden</h1>
      <div className="workAreas">{grouped.map(area=>{
        const areaOpen=openAreas.includes(area.id);const taskCount=area.sections.reduce((sum,section)=>sum+section.tasks.length,0);
        return <section className={`areaCard ${areaOpen?'open':''}`} key={area.id}>
          <button className="areaHeader" onClick={()=>toggle(setOpenAreas,area.id,true)}><span className="areaIcon">{areaIcons[area.name]??'▣'}</span><span className="headerText"><b>{area.name}</b><small>{area.sections.length} arbetsavsnitt · {taskCount} moment</small></span><em>{areaOpen?'−':'+'}</em></button>
          {areaOpen&&<div className="areaBody">{area.sections.map(section=>{
            const sectionOpen=openSections.includes(section.id);
            return <section className="sectionCard" key={section.id}>
              <button className="sectionHeader" onClick={()=>toggle(setOpenSections,section.id)}><span className="sectionIcon">⌖</span><span className="headerText"><b>{section.name}</b><small>{section.tasks.length} moment</small></span><em>{sectionOpen?'−':'+'}</em></button>
              {sectionOpen&&<div className="sectionBody">{section.tasks.map(task=>{
                const taskOpen=openTasks.includes(task.id);const completed=task.activities.filter(a=>a.done).length;
                return <article className={`taskCard ${taskOpen?'open':''}`} key={task.id}>
                  <button className="taskHeader" onClick={()=>toggle(setOpenTasks,task.id,true)}><i className={task.status}/><span className="headerText"><b>{task.title}</b><small>{completed}/{task.activities.length} aktiviteter klara</small></span><span className={`pill ${task.status}`}>{labels[task.status]}</span><em>{taskOpen?'−':'+'}</em></button>
                  {taskOpen&&<div className="taskBody">{task.description&&<p className="taskDescription">{task.description}</p>}
                    <h3>Aktiviteter</h3><div className="activityFlow">{task.activities.map((activity,index)=><ActivityRow key={activity.id} activity={activity} index={index} task={task} technical={task.technical} onUpdate={updateActivity}/>)}</div>
                    <div className="taskActions"><button className="technicalButton" onClick={()=>toggle(setOpenTechnical,task.id)}><span>📎</span><span><b>Tekniskt underlag</b><small>{task.technical.length} poster</small></span><em>{openTechnical.includes(task.id)?'−':'+'}</em></button><button className="submitButton" onClick={()=>void submit(task)}><span>➤</span><span><b>Skicka för kontroll</b><small>När allt är klart</small></span></button></div>
                    {openTechnical.includes(task.id)&&<TechnicalList items={task.technical}/>}                  
                  </div>}
                </article>})}</div>}
            </section>})}</div>}
        </section>})}</div>
    </main>
  </div>;
}

function ActivityRow({activity,index,task,technical,onUpdate}:{activity:Activity;index:number;task:Task;technical:TechnicalItem[];onUpdate:(taskId:string,activity:Activity,value?:string)=>Promise<void>}){
  const linked=technical.find(item=>item.id===activity.technicalResourceId);
  return <div className={`activityRow ${activity.done?'done':''}`}><div className="activityStep"><span>{index+1}</span>{index<task.activities.length-1&&<i/>}</div><div className="activityCard"><div className="activityTitle"><span className={`activityIcon ${activity.type}`}>{activityIcons[activity.type]}</span><div><small>{activityLabels[activity.type]}</small><b>{activity.title}</b></div><span className={`activityStatus ${activity.done?'done':''}`}>{activity.done?'Klar':'Ej klar'}</span></div>{activity.description&&<p>{activity.description}</p>}{activity.irreversible&&<div className="warning">⚠ Går inte att kontrollera i efterhand</div>}{activity.type==='measurement'?<label className="measurement"><input inputMode="decimal" placeholder="Ange värde" value={activity.value??''} onChange={e=>void onUpdate(task.id,activity,e.target.value)}/><span>{activity.unit}</span></label>:<button className="activityAction" onClick={()=>void onUpdate(task.id,activity)}>{activity.type==='document'?'📷 '+(activity.done?'Dokumenterat':'Ta foto / dokumentera'):activity.done?'Markera som ej klar':'Markera klar'}</button>}{linked&&<button className="linkedTechnical">Se underlag: {linked.title}</button>}</div></div>;
}

function TechnicalList({items}:{items:TechnicalItem[]}){return <div className="technicalList">{items.length===0&&<p>Inget tekniskt underlag är kopplat.</p>}{items.map(item=><article key={item.id}><span>{item.type==='drawing'?'▱':item.type==='image'?'▧':item.type==='document'?'▤':item.type==='material'?'▦':'i'}</span><div><small>{typeLabels[item.type]}{item.sourceLevel?` · ${levelLabels[item.sourceLevel]}`:''}</small><b>{item.title}</b>{item.summary&&<p>{item.summary}</p>}</div></article>)}</div>}
function ProjectChooser({projects,onChoose}:{projects:Project[];onChoose:(id:string)=>void}){return <main className="projectChooser"><strong>ByggPlan</strong>{projects.map(project=><button key={project.id} onClick={()=>onChoose(project.id)}>{project.name}</button>)}</main>}
function CenterState({text,retry}:{text:string;retry?:()=>void}){return <div className="centerState"><strong>ByggPlan</strong><p>{text}</p>{retry&&<button onClick={retry}>Försök igen</button>}</div>}
