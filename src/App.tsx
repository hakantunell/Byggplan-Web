import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

type ActivityType = 'perform' | 'document' | 'measurement' | 'check' | 'approval' | 'note' | 'choice';
type DocumentationEntry = { id:string; valueText?:string; valueNumber?:number; valueBoolean?:boolean; objectKey?:string; originalName?:string; contentType?:string; note?:string; createdAt:string };
type DocumentationField = { id:string; type:'photo'|'number'|'text'|'boolean'|'file'|'choice'|'signature'; label:string; helpText?:string; unit?:string; required:boolean; minimumItems?:number; maximumItems?:number; minimumValue?:number; maximumValue?:number; options?:string[]; entries:DocumentationEntry[] };
type DocumentationProfile = { id:string; code:string; name:string; type:string };
type Activity = { id:string; title:string; description?:string; type:ActivityType; unit?:string; required:boolean; blocking:boolean; irreversible:boolean; technicalResourceId?:string; done:boolean; value?:string; documentationFields:DocumentationField[]; documentationProfiles:DocumentationProfile[] };
type TechnicalItem = { id:string; title:string; type:'text'|'drawing'|'image'|'document'|'material'; summary:string; revision?:string; details?:string[]; objectKey?:string; externalUrl?:string; sourceLevel?:'project'|'work_area'|'work_section'|'task' };
type Project = { id:string; name:string; property_designation?:string; status:string; work_area_count:number; work_section_count:number; task_count:number };
type TaskStatus = 'todo'|'active'|'review'|'done'|'blocked';
type Task = { id:string; projectId:string; project:string; workAreaId:string; workArea:string; workSectionId:string; workSection:string; title:string; description:string; status:TaskStatus; assignee?:string; activities:Activity[]; technical:TechnicalItem[] };
type MeResponse = { user:{ id:string; email:string; displayName:string; globalRoles:string[]; projects:{id:string;name:string;roles:string[];permissions:string[]}[] }; developmentIdentity:boolean };

const API_BASE=(import.meta.env.VITE_API_BASE_URL||'https://api.byggplan.tunell.org').replace(/\/$/,'');
const labels:Record<TaskStatus,string>={todo:'Kan göras',active:'Pågår',review:'Redo för kontroll',done:'Klart',blocked:'Blockerat'};
const typeLabels={text:'Tekniska data',drawing:'Ritning',image:'Bild',document:'Dokument',material:'Material'};
const levelLabels={project:'Projekt',work_area:'Arbetsområde',work_section:'Arbetsavsnitt',task:'Moment'};
const activityLabels:Record<ActivityType,string>={perform:'Utför',document:'Dokumentera',measurement:'Mät och registrera',check:'Kontrollera',approval:'Godkänn',note:'Anteckna',choice:'Välj'};
const activityIcons:Record<ActivityType,string>={perform:'🛠',document:'📷',measurement:'📏',check:'✓',approval:'✍',note:'📝',choice:'◉'};
const areaIcons:Record<string,string>={Markarbete:'⛏',Avlopp:'◉',Grund:'▦',Stomme:'▥',Tak:'⌂'};

export function App(){
  const[projects,setProjects]=useState<Project[]>([]);
  const[projectId,setProjectId]=useState<string|null>(null);
  const[tasks,setTasks]=useState<Task[]>([]);
  const[me,setMe]=useState<MeResponse['user']|null>(null);
  const[apiState,setApiState]=useState<'loading'|'connected'|'error'|'offline'>('loading');
  const[openAreas,setOpenAreas]=useState<string[]>([]);
  const[openSections,setOpenSections]=useState<string[]>([]);
  const[openTasks,setOpenTasks]=useState<string[]>([]);
  const[openTechnical,setOpenTechnical]=useState<string[]>([]);
  const[openActivityId,setOpenActivityId]=useState<string|null>(null);
  const[autoFocusedProjectId,setAutoFocusedProjectId]=useState<string|null>(null);

  const currentProject=projects.find(project=>project.id===projectId);
  const currentAccess=me?.projects.find(project=>project.id===projectId);
  const canApprove=Boolean(currentAccess?.permissions.includes('task:approve'));
  const canReject=Boolean(currentAccess?.permissions.includes('task:reject'));

  const grouped=useMemo(()=>{
    const areas=new Map<string,{id:string;name:string;sections:Map<string,{id:string;name:string;tasks:Task[]}>}>();
    for(const task of tasks){
      if(!areas.has(task.workAreaId))areas.set(task.workAreaId,{id:task.workAreaId,name:task.workArea,sections:new Map()});
      const area=areas.get(task.workAreaId)!;
      if(!area.sections.has(task.workSectionId))area.sections.set(task.workSectionId,{id:task.workSectionId,name:task.workSection,tasks:[]});
      area.sections.get(task.workSectionId)!.tasks.push(task);
    }
    return [...areas.values()].map(area=>({...area,sections:[...area.sections.values()]}));
  },[tasks]);

  const currentWorkTask=useMemo(()=>{
    const unfinished=(task:Task)=>task.activities.some(activity=>!activity.done);
    return tasks.find(task=>task.status==='active'&&unfinished(task))
      ??tasks.find(task=>task.status==='todo'&&unfinished(task))
      ??tasks.find(task=>task.status!=='done'&&task.status!=='review'&&task.status!=='blocked'&&unfinished(task))
      ??null;
  },[tasks]);

  const focusCurrentActivity=useCallback(()=>{
    if(!currentWorkTask)return;
    const nextActivity=currentWorkTask.activities.find(activity=>!activity.done)??currentWorkTask.activities[0];
    setOpenAreas([currentWorkTask.workAreaId]);
    setOpenSections([currentWorkTask.workSectionId]);
    setOpenTasks([currentWorkTask.id]);
    setOpenTechnical([]);
    setOpenActivityId(nextActivity?.id??null);
  },[currentWorkTask]);

  const loadMe=useCallback(async()=>{const response=await fetch(`${API_BASE}/api/me`);if(!response.ok)throw new Error(`API svarade ${response.status}`);const data=await response.json() as MeResponse;setMe(data.user);},[]);
  const loadTasks=useCallback(async(id:string)=>{if(!navigator.onLine){setApiState('offline');return;}try{const response=await fetch(`${API_BASE}/api/tasks?projectId=${encodeURIComponent(id)}`);if(!response.ok)throw new Error(`API svarade ${response.status}`);const data=await response.json() as {tasks:Task[]};setTasks(data.tasks);setApiState('connected');}catch(error){console.error(error);setApiState('error');}},[]);
  const loadProjects=useCallback(async()=>{if(!navigator.onLine){setApiState('offline');return;}try{const[projectsResponse]=await Promise.all([fetch(`${API_BASE}/api/projects`),loadMe()]);if(!projectsResponse.ok)throw new Error(`API svarade ${projectsResponse.status}`);const data=await projectsResponse.json() as {projects:Project[]};setProjects(data.projects);setProjectId(current=>current??(data.projects.length===1?data.projects[0].id:null));setApiState('connected');}catch(error){console.error(error);setApiState('error');}},[loadMe]);

  useEffect(()=>{void loadProjects();},[loadProjects]);
  useEffect(()=>{if(projectId){setTasks([]);setOpenAreas([]);setOpenSections([]);setOpenTasks([]);setOpenTechnical([]);setOpenActivityId(null);setAutoFocusedProjectId(null);void loadTasks(projectId);}},[projectId,loadTasks]);
  useEffect(()=>{if(projectId&&currentWorkTask&&autoFocusedProjectId!==projectId){focusCurrentActivity();setAutoFocusedProjectId(projectId);}},[projectId,currentWorkTask,autoFocusedProjectId,focusCurrentActivity]);
  useEffect(()=>{if(!openActivityId)return;const timer=setTimeout(()=>{document.querySelector(`[data-activity-id="${openActivityId}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});},80);return()=>clearTimeout(timer);},[openActivityId,openTasks]);
  useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible'&&projectId)void loadTasks(projectId);},60000);return()=>clearInterval(timer);},[projectId,loadTasks]);

  const toggle=(setter:Dispatch<SetStateAction<string[]>>,id:string,single=false)=>setter(current=>current.includes(id)?current.filter(value=>value!==id):(single?[id]:[...current,id]));
  const toggleArea=(id:string)=>{const isOpen=openAreas.includes(id);setOpenAreas(isOpen?[]:[id]);setOpenSections([]);setOpenTasks([]);setOpenTechnical([]);setOpenActivityId(null);};
  const toggleSection=(id:string)=>{const isOpen=openSections.includes(id);setOpenSections(isOpen?[]:[id]);setOpenTasks([]);setOpenTechnical([]);setOpenActivityId(null);};
  const toggleTask=(task:Task)=>{const isOpen=openTasks.includes(task.id);setOpenTasks(isOpen?[]:[task.id]);setOpenTechnical([]);setOpenActivityId(isOpen?null:(task.activities.find(activity=>!activity.done)?.id??task.activities[0]?.id??null));};
  const refresh=()=>projectId?loadTasks(projectId):Promise.resolve();
  const apiAction=async(url:string,init?:RequestInit)=>{const response=await fetch(`${API_BASE}${url}`,init);if(!response.ok){const body=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(body?.error??'Åtgärden kunde inte genomföras.');}};
  const updateActivity=async(taskId:string,activity:Activity)=>{
    if(!navigator.onLine)return alert('Du måste vara online för att registrera.');
    try{
      await apiAction(`/api/activities/${activity.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({done:!activity.done})});
      setTasks(current=>current.map(task=>{
        if(task.id!==taskId)return task;
        const currentIndex=task.activities.findIndex(item=>item.id===activity.id);
        const activities=task.activities.map(item=>item.id!==activity.id?item:{...item,done:!item.done});
        if(!activity.done){
          const nextActivity=activities.slice(currentIndex+1).find(item=>!item.done);
          setOpenActivityId(nextActivity?.id??activity.id);
        } else {
          setOpenActivityId(activity.id);
        }
        return {...task,status:task.status==='todo'?'active':task.status,activities};
      }));
    }catch(error){alert(error instanceof Error?error.message:'Aktiviteten kunde inte sparas.');}
  };
  const saveField=async(field:DocumentationField,payload:{valueText?:string|null;valueNumber?:number|null;valueBoolean?:boolean|null})=>{try{await apiAction(`/api/documentation-fields/${field.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});await refresh();}catch(error){alert(error instanceof Error?error.message:'Dokumentationen kunde inte sparas.');}};
  const uploadFieldFile=async(field:DocumentationField,file:File)=>{if(!navigator.onLine){alert('Du måste vara online för att ladda upp.');return false;}const form=new FormData();form.append('file',file,file.name);try{await apiAction(`/api/documentation-fields/${field.id}/files`,{method:'POST',body:form});await refresh();return true;}catch(error){alert(error instanceof Error?error.message:'Filen kunde inte laddas upp.');return false;}};
  const deleteDocumentationEntry=async(entry:DocumentationEntry)=>{if(!confirm(`Ta bort ${entry.originalName??'den här filen'}?`))return;try{await apiAction(`/api/documentation-entries/${entry.id}`,{method:'DELETE'});await refresh();}catch(error){alert(error instanceof Error?error.message:'Filen kunde inte tas bort.');}};
  const submit=async(task:Task)=>{const missing=task.activities.filter(activity=>activity.required&&!activity.done);if(missing.length)return alert(`${missing.length} obligatoriska aktiviteter återstår.`);try{await apiAction(`/api/tasks/${task.id}/review`,{method:'POST'});await refresh();}catch(error){alert(error instanceof Error?error.message:'Momentet kunde inte skickas för kontroll.');}};
  const approve=async(task:Task)=>{try{await apiAction(`/api/tasks/${task.id}/approve`,{method:'POST'});await refresh();}catch(error){alert(error instanceof Error?error.message:'Momentet kunde inte godkännas.');}};
  const reject=async(task:Task,comment:string)=>{try{await apiAction(`/api/tasks/${task.id}/reject`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({comment})});await refresh();}catch(error){alert(error instanceof Error?error.message:'Momentet kunde inte avvisas.');throw error;}};

  if(projects.length>1&&!projectId)return <ProjectChooser projects={projects} onChoose={setProjectId}/>;
  if(apiState==='loading'&&!projectId)return <CenterState text="Hämtar projekt…"/>;
  if(!currentProject)return <CenterState text="Inget projekt kunde öppnas." retry={()=>void loadProjects()}/>;

  return <div className="app">
    <header><div><strong>{currentProject.name}</strong><span>ByggPlan{me?` · ${me.displayName}`:''}</span></div><b className={apiState==='connected'?'online':'offline'}>{apiState==='connected'?'● Online':apiState==='offline'?'Offline':'API-fel'}</b></header>
    <main><div className="mainHeading"><h1>Arbetsområden</h1>{currentWorkTask&&<button className="continueBuilding" onClick={focusCurrentActivity}><span>▶</span><span><b>Fortsätt bygga</b><small>{currentWorkTask.title}</small></span></button>}</div><div className="workAreas">
      {grouped.map(area=>{
        const areaOpen=openAreas.includes(area.id);
        const taskCount=area.sections.reduce((sum,section)=>sum+section.tasks.length,0);
        return <section className={`areaCard ${areaOpen?'open':''}`} key={area.id}>
          <button className="areaHeader" onClick={()=>toggleArea(area.id)}><span className="areaIcon">{areaIcons[area.name]??'▣'}</span><span className="headerText"><b>{area.name}</b><small>{area.sections.length} arbetsavsnitt · {taskCount} moment</small></span><em>{areaOpen?'−':'+'}</em></button>
          {areaOpen&&<div className="areaBody">{area.sections.map(section=>{
            const sectionOpen=openSections.includes(section.id);
            return <section className="sectionCard" key={section.id}>
              <button className="sectionHeader" onClick={()=>toggleSection(section.id)}><span className="sectionIcon">⌖</span><span className="headerText"><b>{section.name}</b><small>{section.tasks.length} moment</small></span><em>{sectionOpen?'−':'+'}</em></button>
              {sectionOpen&&<div className="sectionBody">{section.tasks.map(task=>{
                const taskOpen=openTasks.includes(task.id);
                const completed=task.activities.filter(activity=>activity.done).length;
                const nextActivityIndex=task.activities.findIndex(activity=>!activity.done);
                const nextActivityId=nextActivityIndex>=0?task.activities[nextActivityIndex].id:undefined;
                return <article className={`taskCard ${taskOpen?'open':''}`} key={task.id}>
                  <button className="taskHeader" onClick={()=>toggleTask(task)}><i className={task.status}/><span className="headerText"><b>{task.title}</b><small>{completed}/{task.activities.length} aktiviteter klara</small></span>{task.status==='review'&&canApprove&&<span className="reviewFlag" title="Väntar på ditt godkännande">!</span>}<span className={`pill ${task.status}`}>{labels[task.status]}</span><em>{taskOpen?'−':'+'}</em></button>
                  {taskOpen&&<div className="taskBody">
                    {task.description&&<p className="taskDescription">{task.description}</p>}
                    {task.status==='review'&&<ReviewNotice supervisor={canApprove}/>} 
                    {task.status==='done'&&<div className="approvedNotice">✓ Momentet är godkänt och klart.</div>}
                    <button className="technicalButton technicalFirst" onClick={()=>toggle(setOpenTechnical,task.id)}><span>📚</span><span><b>Arbetsunderlag</b><small>{task.technical.length} poster · läs före start</small></span><em>{openTechnical.includes(task.id)?'−':'+'}</em></button>
                    {openTechnical.includes(task.id)&&<TechnicalList items={task.technical}/>} 
                    <h3>Aktiviteter</h3>
                    <div className="activityFlow">{task.activities.map((activity,index)=><ActivityRow key={activity.id} activity={activity} index={index} task={task} technical={task.technical} expanded={openActivityId===activity.id} isNext={activity.id===nextActivityId} isFuture={!activity.done&&nextActivityIndex>=0&&index>nextActivityIndex} onToggle={()=>setOpenActivityId(current=>current===activity.id?null:activity.id)} onUpdate={updateActivity} onSaveField={saveField} onUpload={uploadFieldFile} onDeleteEntry={deleteDocumentationEntry}/>)}</div>
                    {(task.status==='todo'||task.status==='active')&&<button className="submitButton fullWidth" onClick={()=>void submit(task)}><span>➤</span><span><b>Skicka för kontroll</b><small>När allt är klart</small></span></button>}
                    {task.status==='review'&&canApprove&&canReject&&<ReviewActions task={task} onApprove={approve} onReject={reject}/>} 
                  </div>}
                </article>;
              })}</div>}
            </section>;
          })}</div>}
        </section>;
      })}
    </div></main>
  </div>;
}

function ReviewNotice({supervisor}:{supervisor:boolean}){
  return <div className="reviewNotice"><span>⏳</span><div><b>{supervisor?'Momentet väntar på din kontroll':'Väntar på arbetsledarens kontroll'}</b><small>{supervisor?'Granska aktiviteter och dokumentation innan du godkänner eller avvisar.':'Momentet kan inte ändras till klart förrän arbetsledaren har granskat det.'}</small></div></div>;
}

function ReviewActions({task,onApprove,onReject}:{task:Task;onApprove:(task:Task)=>Promise<void>;onReject:(task:Task,comment:string)=>Promise<void>}){
  const[rejecting,setRejecting]=useState(false);
  const[comment,setComment]=useState('');
  const[busy,setBusy]=useState(false);
  return <div className="reviewActions">
    <h4>Arbetsledarens kontroll</h4>
    {!rejecting ? <div className="reviewButtons">
      <button className="approveButton" disabled={busy} onClick={async()=>{setBusy(true);try{await onApprove(task);}finally{setBusy(false);}}}>✓ Godkänn moment</button>
      <button className="rejectButton" disabled={busy} onClick={()=>setRejecting(true)}>↩ Avvisa</button>
    </div> : <div className="rejectForm">
      <label><span>Vad behöver åtgärdas?</span><textarea value={comment} onChange={event=>setComment(event.target.value)} placeholder="Beskriv tydligt vad som ska rättas innan momentet skickas in igen."/></label>
      <div><button type="button" className="cancelReject" disabled={busy} onClick={()=>{setRejecting(false);setComment('');}}>Avbryt</button><button type="button" className="confirmReject" disabled={busy||!comment.trim()} onClick={async()=>{setBusy(true);try{await onReject(task,comment);setComment('');setRejecting(false);}finally{setBusy(false);}}}>Avvisa moment</button></div>
    </div>}
  </div>;
}

function ActivityRow({activity,index,task,technical,expanded,isNext,isFuture,onToggle,onUpdate,onSaveField,onUpload,onDeleteEntry}:{activity:Activity;index:number;task:Task;technical:TechnicalItem[];expanded:boolean;isNext:boolean;isFuture:boolean;onToggle:()=>void;onUpdate:(taskId:string,activity:Activity)=>Promise<void>;onSaveField:(field:DocumentationField,payload:{valueText?:string|null;valueNumber?:number|null;valueBoolean?:boolean|null})=>Promise<void>;onUpload:(field:DocumentationField,file:File)=>Promise<boolean>;onDeleteEntry:(entry:DocumentationEntry)=>Promise<void>}){
  const linked=technical.find(item=>item.id===activity.technicalResourceId);
  const readOnly=isFuture||task.status==='review'||task.status==='done';
  return <div className={`activityRow ${activity.done?'done':''} ${isNext?'next':''} ${isFuture?'future':''}`} data-activity-id={activity.id}>
    <div className="activityStep"><span>{activity.done?'✓':index+1}</span>{index<task.activities.length-1&&<i/>}</div>
    <div className={`activityCard ${expanded?'expanded':''}`}>
      <button className="activitySummary" onClick={onToggle}><span className={`activityIcon ${activity.type}`}>{activityIcons[activity.type]}</span><span className="activitySummaryText">{isNext&&!activity.done&&<small className="nextLabel">▶ Nästa aktivitet</small>}{isFuture&&<small className="futureLabel">Kommande</small>}<b>{activity.title}</b><small>{activityLabels[activity.type]}</small></span><span className={`activityStatus ${activity.done?'done':isFuture?'future':''}`}>{activity.done?'Klar':isFuture?'Inte dags ännu':'Ej klar'}</span><em>{expanded?'−':'+'}</em></button>
      {expanded&&<div className="activityDetails">
        {activity.description&&<p>{activity.description}</p>}
        {isFuture&&<div className="futureNotice">Du kan läsa och förbereda den här aktiviteten nu, men den kan inte markeras klar förrän tidigare aktiviteter är färdiga.</div>}
        {activity.irreversible&&<div className="warning">⚠ Går inte att kontrollera i efterhand</div>}
        {linked&&<ActivityDetailSupport item={linked}/>} 
        {activity.documentationFields.length>0&&<div className="documentationFields"><h4>Dokumentation</h4>{activity.documentationFields.map(field=><DocumentationInput key={field.id} field={field} disabled={readOnly} onSave={onSaveField} onUpload={onUpload} onDeleteEntry={onDeleteEntry}/>)}</div>}
        {!readOnly&&<button className="activityAction" onClick={()=>void onUpdate(task.id,activity)}>{activity.done?'Markera som ej klar':activity.documentationFields.length>0?'Markera aktiviteten klar':'Markera klar'}</button>}
      </div>}
    </div>
  </div>;
}

function ActivityDetailSupport({item}:{item:TechnicalItem}){
  return <details className="detailSupport"><summary><span>🔎</span><span><b>Detaljunderlag</b><small>{item.title}</small></span><em>+</em></summary><div className="detailSupportBody">{item.summary&&<p>{item.summary}</p>}{item.revision&&<small>Revision: {item.revision}</small>}{item.details?.length?<ul>{item.details.map(detail=><li key={detail}>{detail}</li>)}</ul>:null}{(item.externalUrl||item.objectKey)&&<button type="button">Öppna underlaget</button>}</div></details>;
}

function DocumentationInput({field,disabled,onSave,onUpload,onDeleteEntry}:{field:DocumentationField;disabled:boolean;onSave:(field:DocumentationField,payload:{valueText?:string|null;valueNumber?:number|null;valueBoolean?:boolean|null})=>Promise<void>;onUpload:(field:DocumentationField,file:File)=>Promise<boolean>;onDeleteEntry:(entry:DocumentationEntry)=>Promise<void>}){
  const[uploading,setUploading]=useState(false);
  const entry=field.entries[0];

  if(field.type==='photo'||field.type==='file'){
    const maximumReached=Boolean(field.maximumItems&&field.entries.length>=field.maximumItems);
    return <div className={`docField fileField ${disabled?'readOnly':''}`}>
      <div><b>{field.label}</b>{field.helpText&&<small>{field.helpText}</small>}</div>
      <label className={`filePicker ${uploading?'busy':''} ${disabled?'disabled':''}`}>
        <input type="file" accept={field.type==='photo'?'image/*':undefined} capture={field.type==='photo'?'environment':undefined} disabled={disabled||uploading||maximumReached} onChange={async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;setUploading(true);try{await onUpload(field,file);}finally{setUploading(false);}}}/>
        <span>{disabled?'Endast visning':uploading?'Laddar upp…':field.type==='photo'?'📷 Ta foto / välj bild':'📎 Lägg till fil'}</span>
        <strong>{field.entries.length}{field.minimumItems?`/${field.minimumItems}`:''}</strong>
      </label>
      {field.entries.length>0&&<div className="fileEntries">
        {field.entries.map(item=><div key={item.id}><span>{item.contentType?.startsWith('image/')?'🖼':'📎'}</span><b>{item.originalName??'Fil'}</b>{!disabled&&<button type="button" onClick={()=>void onDeleteEntry(item)} aria-label="Ta bort">×</button>}</div>)}
      </div>}
    </div>;
  }

  if(field.type==='number')return <label className="docField inputField"><span><b>{field.label}</b>{field.helpText&&<small>{field.helpText}</small>}</span><div><input disabled={disabled} inputMode="decimal" defaultValue={entry?.valueNumber??''} onBlur={event=>{if(!disabled)void onSave(field,{valueNumber:event.target.value===''?null:Number(event.target.value)});}}/><em>{field.unit}</em></div></label>;
  if(field.type==='boolean')return <label className="docField booleanField"><span><b>{field.label}</b>{field.helpText&&<small>{field.helpText}</small>}</span><input disabled={disabled} type="checkbox" checked={entry?.valueBoolean??false} onChange={event=>{if(!disabled)void onSave(field,{valueBoolean:event.target.checked});}}/></label>;
  return <label className="docField textField"><span><b>{field.label}</b>{field.helpText&&<small>{field.helpText}</small>}</span><textarea disabled={disabled} defaultValue={entry?.valueText??''} onBlur={event=>{if(!disabled)void onSave(field,{valueText:event.target.value||null});}}/></label>;
}

function TechnicalList({items}:{items:TechnicalItem[]}){return <div className="technicalList">{items.length===0&&<p>Inget arbetsunderlag är kopplat.</p>}{items.map(item=><article key={item.id}><span>{item.type==='drawing'?'▱':item.type==='image'?'▧':item.type==='document'?'▤':item.type==='material'?'▦':'i'}</span><div><small>{typeLabels[item.type]}{item.sourceLevel?` · ${levelLabels[item.sourceLevel]}`:''}</small><b>{item.title}</b>{item.summary&&<p>{item.summary}</p>}</div></article>)}</div>;}
function ProjectChooser({projects,onChoose}:{projects:Project[];onChoose:(id:string)=>void}){return <main className="projectChooser"><strong>ByggPlan</strong>{projects.map(project=><button key={project.id} onClick={()=>onChoose(project.id)}>{project.name}</button>)}</main>;}
function CenterState({text,retry}:{text:string;retry?:()=>void}){return <div className="centerState"><strong>ByggPlan</strong><p>{text}</p>{retry&&<button onClick={retry}>Försök igen</button>}</div>;}
