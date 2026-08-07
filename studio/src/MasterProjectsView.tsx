import { useEffect, useMemo, useState } from 'react';

type MasterProjectSummary = {
  id: string;
  code: string;
  name: string;
  description: string;
  version: number;
  status: string;
  area_count: number;
  section_count: number;
  task_count: number;
  activity_count: number;
};

type Area = { id:string; master_project_id:string; number:string; name:string; sort_order:number };
type Section = { id:string; master_work_area_id:string; number:string; name:string; sort_order:number };
type Task = { id:string; master_work_section_id:string; title:string; description:string; sort_order:number };
type Activity = { id:string; master_task_id:string; title:string; description:string; activity_type:string; required:number; sort_order:number };

type TreeResponse = {
  masterProject: MasterProjectSummary;
  areas: Area[];
  sections: Section[];
  tasks: Task[];
  activities: Activity[];
};

type Props = { onProjectCreated?: (projectId:string) => void };

const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');
const ACTIVITY_LABELS:Record<string,string>={perform:'Utför',document:'Dokumentera',measurement:'Mät',check:'Kontrollera',approval:'Godkänn',note:'Kom ihåg',choice:'Välj'};
const ACTIVITY_ICONS:Record<string,string>={perform:'●',document:'📷',measurement:'📏',check:'✓',approval:'✍',note:'📝',choice:'◉'};

export function MasterProjectsView({onProjectCreated}:Props){
  const[projects,setProjects]=useState<MasterProjectSummary[]>([]);
  const[selectedId,setSelectedId]=useState('');
  const[tree,setTree]=useState<TreeResponse|null>(null);
  const[expanded,setExpanded]=useState<Set<string>>(new Set());
  const[loading,setLoading]=useState(false);
  const[message,setMessage]=useState('');
  const[createOpen,setCreateOpen]=useState(false);
  const[projectName,setProjectName]=useState('');
  const[propertyDesignation,setPropertyDesignation]=useState('');

  async function loadProjects(selectId?:string){
    setLoading(true);
    try{
      const response=await fetch(`${API_BASE}/api/studio/master-projects`,{cache:'no-store'});
      const data=await response.json().catch(()=>({})) as {masterProjects?:MasterProjectSummary[];error?:string};
      if(!response.ok)throw new Error(data.error||'Kunde inte läsa masterprojekt.');
      const next=data.masterProjects||[];
      setProjects(next);
      setSelectedId(current=>{
        if(selectId&&next.some(item=>item.id===selectId))return selectId;
        if(current&&next.some(item=>item.id===current))return current;
        return next[0]?.id||'';
      });
      if(!next.length)setTree(null);
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte läsa masterprojekt.');}
    finally{setLoading(false);}
  }

  async function loadTree(id:string){
    setLoading(true);
    try{
      const response=await fetch(`${API_BASE}/api/studio/master-projects/${encodeURIComponent(id)}/tree`,{cache:'no-store'});
      const data=await response.json().catch(()=>({})) as TreeResponse&{error?:string};
      if(!response.ok)throw new Error(data.error||'Kunde inte läsa masterprojektets struktur.');
      setTree(data);
      const firstArea=data.areas[0];
      const firstSection=firstArea?data.sections.find(item=>item.master_work_area_id===firstArea.id):undefined;
      const firstTask=firstSection?data.tasks.find(item=>item.master_work_section_id===firstSection.id):undefined;
      setExpanded(new Set([firstArea&&`area:${firstArea.id}`,firstSection&&`section:${firstSection.id}`,firstTask&&`task:${firstTask.id}`].filter(Boolean) as string[]));
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte läsa masterprojektets struktur.');}
    finally{setLoading(false);}
  }

  useEffect(()=>{void loadProjects();},[]);
  useEffect(()=>{if(selectedId)void loadTree(selectedId);},[selectedId]);

  const selected=projects.find(project=>project.id===selectedId);
  const sectionsByArea=useMemo(()=>{const map=new Map<string,Section[]>();for(const item of tree?.sections||[]){const list=map.get(item.master_work_area_id)||[];list.push(item);map.set(item.master_work_area_id,list);}return map;},[tree]);
  const tasksBySection=useMemo(()=>{const map=new Map<string,Task[]>();for(const item of tree?.tasks||[]){const list=map.get(item.master_work_section_id)||[];list.push(item);map.set(item.master_work_section_id,list);}return map;},[tree]);
  const activitiesByTask=useMemo(()=>{const map=new Map<string,Activity[]>();for(const item of tree?.activities||[]){const list=map.get(item.master_task_id)||[];list.push(item);map.set(item.master_task_id,list);}return map;},[tree]);

  function toggle(key:string){setExpanded(current=>{const next=new Set(current);next.has(key)?next.delete(key):next.add(key);return next;});}

  async function bootstrap(){
    setLoading(true);setMessage('Skapar Masterprojekt – Fritidshus i databasen…');
    try{
      const response=await fetch(`${API_BASE}/api/studio/master-projects/bootstrap-fritidshus`,{method:'POST'});
      const data=await response.json().catch(()=>({})) as {id?:string;created?:boolean;counts?:Record<string,number>;error?:string};
      if(!response.ok)throw new Error(data.error||'Kunde inte skapa masterprojektet.');
      setMessage(data.created?`Masterprojektet skapades i databasen${data.counts?` · ${data.counts.areas} områden · ${data.counts.activities} aktiviteter`:''}.`:'Masterprojektet finns redan i databasen.');
      await loadProjects(data.id);
    }catch(error){setMessage(error instanceof Error?error.message:'Kunde inte skapa masterprojektet.');}
    finally{setLoading(false);}
  }

  function openCreate(){
    setProjectName('');
    setPropertyDesignation('');
    setMessage('');
    setCreateOpen(true);
  }

  async function createProject(){
    if(!selected||!projectName.trim())return;
    setLoading(true);
    setMessage('Skapar projektkopia från masterprojektet…');
    try{
      const response=await fetch(`${API_BASE}/api/studio/master-projects/${encodeURIComponent(selected.id)}/create-project`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:projectName.trim(),propertyDesignation:propertyDesignation.trim()})
      });
      const data=await response.json().catch(()=>({})) as {project?:{id:string;name:string};created?:{areas:number;sections:number;tasks:number;activities:number};error?:string};
      if(!response.ok)throw new Error(data.error||'Projektet kunde inte skapas.');
      if(!data.project?.id)throw new Error('Projektet skapades men inget projekt-ID returnerades.');
      const created=data.created;
      setMessage(`Projektet ”${data.project.name}” skapades${created?` · ${created.areas} områden · ${created.tasks} moment · ${created.activities} aktiviteter`:''}.`);
      setCreateOpen(false);
      onProjectCreated?.(data.project.id);
    }catch(error){setMessage(error instanceof Error?error.message:'Projektet kunde inte skapas.');}
    finally{setLoading(false);}
  }

  return <div className="masterProjectsView">
    <aside className="masterProjectList">
      <div className="masterProjectListHeader"><small>MASTERPROJEKT</small><strong>Projektmallar</strong><p>Återanvändbara byggprocesser som lagras i databasen.</p></div>
      <div className="masterProjectCards">
        {projects.map(project=><button key={project.id} className={selectedId===project.id?'active':''} onClick={()=>setSelectedId(project.id)}>
          <span className="masterProjectIcon">🏠</span><span><b>{project.name}</b><small>Version {project.version}</small><em>{project.area_count} områden · {project.task_count} moment · {project.activity_count} aktiviteter</em></span>
        </button>)}
        {!projects.length&&!loading&&<div className="masterEmpty"><span>🏠</span><b>Inget masterprojekt ännu</b><p>Skapa den första databaskopian av Fritidshus-processen.</p><button onClick={()=>void bootstrap()}>+ Skapa Masterprojekt – Fritidshus</button></div>}
      </div>
    </aside>

    <main className="masterProjectContent">
      {selected&&tree?<>
        <header className="masterProjectHeader"><div><small>MASTERPROJEKT · {selected.status.toUpperCase()}</small><h1>{selected.name}</h1><p>{selected.description}</p></div><div className="masterProjectHeaderRight"><div className="masterProjectStats"><span><b>{selected.area_count}</b><small>områden</small></span><span><b>{selected.section_count}</b><small>avsnitt</small></span><span><b>{selected.task_count}</b><small>moment</small></span><span><b>{selected.activity_count}</b><small>aktiviteter</small></span></div><button className="masterCreateProjectButton" onClick={openCreate}>＋ Skapa projekt från masterprojekt</button></div></header>
        {message&&<div className="masterMessage">{message}</div>}
        {createOpen&&<section className="masterCreatePanel"><div><small>NY PROJEKTKOPIA</small><h2>Skapa projekt från {selected.name}</h2><p>Projektet blir en fristående snapshot av version {selected.version}. Senare ändringar i masterprojektet ändrar inte projektet automatiskt.</p></div><div className="masterCreateFields"><label><span>Projektnamn</span><input autoFocus value={projectName} onChange={event=>setProjectName(event.target.value)} placeholder="Ex. Vemdalens Kyrkby 44:10" /></label><label><span>Fastighetsbeteckning</span><input value={propertyDesignation} onChange={event=>setPropertyDesignation(event.target.value)} placeholder="Valfritt" /></label><div className="masterCreateActions"><button onClick={()=>setCreateOpen(false)} disabled={loading}>Avbryt</button><button className="primary" onClick={()=>void createProject()} disabled={loading||!projectName.trim()}>{loading?'Skapar…':'Skapa projekt'}</button></div></div></section>}
        <div className="masterTree">{tree.areas.map(area=>{
          const areaKey=`area:${area.id}`;const areaOpen=expanded.has(areaKey);const sections=sectionsByArea.get(area.id)||[];
          return <section className="masterArea" key={area.id}>
            <button className="masterAreaHeader" onClick={()=>toggle(areaKey)}><span>{areaOpen?'⌄':'›'}</span><b>{area.number}</b><strong>{area.name}</strong><small>{sections.length} avsnitt</small></button>
            {areaOpen&&<div className="masterAreaBody">{sections.map(section=>{
              const sectionKey=`section:${section.id}`;const sectionOpen=expanded.has(sectionKey);const tasks=tasksBySection.get(section.id)||[];
              return <section className="masterSection" key={section.id}>
                <button className="masterSectionHeader" onClick={()=>toggle(sectionKey)}><span>{sectionOpen?'⌄':'›'}</span><b>{section.number}</b><strong>{section.name}</strong><small>{tasks.length} moment</small></button>
                {sectionOpen&&<div className="masterSectionBody">{tasks.map(task=>{
                  const taskKey=`task:${task.id}`;const taskOpen=expanded.has(taskKey);const activities=activitiesByTask.get(task.id)||[];
                  return <article className="masterTask" key={task.id}>
                    <button className="masterTaskHeader" onClick={()=>toggle(taskKey)}><span>{taskOpen?'⌄':'›'}</span><strong>{task.title}</strong><small>{activities.length} aktiviteter</small></button>
                    {taskOpen&&<div className="masterActivities">{task.description&&<p>{task.description}</p>}{activities.map((activity,index)=><div className="masterActivity" key={activity.id}><span className="masterActivityIndex">{index+1}</span><span className="masterActivityIcon">{ACTIVITY_ICONS[activity.activity_type]||'●'}</span><span><b>{activity.title}</b>{activity.description&&<p>{activity.description}</p>}<small>{ACTIVITY_LABELS[activity.activity_type]||activity.activity_type}</small></span></div>)}</div>}
                  </article>;
                })}</div>}
              </section>;
            })}</div>}
          </section>;
        })}</div>
      </>:<div className="masterBlank"><span>🏠</span><h2>{loading?'Läser masterprojekt…':'Masterprojekt'}</h2><p>{loading?'Hämtar strukturen från databasen.':'Välj eller skapa ett masterprojekt för att visa byggprocessen.'}</p>{!projects.length&&!loading&&<button onClick={()=>void bootstrap()}>Skapa Fritidshus</button>}</div>}
    </main>
  </div>;
}