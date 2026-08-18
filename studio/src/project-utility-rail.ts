const utilityItems=[
  {label:'Projektinformation',icon:'ℹ️'},
  {label:'Kontrollplan',icon:'📋'},
  {label:'Rapporter',icon:'📊'},
  {label:'Inställningar',icon:'⚙️'}
] as const;

type UtilityLabel=(typeof utilityItems)[number]['label'];
function projectRows(){return Array.from(document.querySelectorAll('.projectWorkspace .projectTreeRow')) as HTMLElement[]}
function rowLabel(row:HTMLElement){return row.querySelector('.projectTreeLabel')?.textContent?.trim()||''}
function findRow(label:UtilityLabel){return projectRows().find(row=>rowLabel(row)===label)||null}
function hideNativeUtilityRows(){for(const row of projectRows())if(utilityItems.some(item=>item.label===rowLabel(row)))row.style.display='none'}
function syncActive(){const activeLabel=projectRows().find(row=>row.classList.contains('selected'))?.querySelector('.projectTreeLabel')?.textContent?.trim()||'';const nativeControlPlan=Boolean(document.querySelector('.studioShell.view-native-control-plan'));const utilityActive=utilityItems.some(item=>item.label===activeLabel);for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('.rail .projectUtilityRailButton')))button.classList.toggle('active',button.dataset.utilityLabel===activeLabel||(nativeControlPlan&&button.dataset.utilityLabel==='Kontrollplan'));const workspace=document.querySelector<HTMLElement>('.projectWorkspace');workspace?.classList.toggle('projectUtilityView',utilityActive)}
function openUtility(label:UtilityLabel,attempt=0){if(label==='Kontrollplan'){window.dispatchEvent(new CustomEvent('byggplan:open-control-plan'));return}hideNativeUtilityRows();const row=findRow(label);if(row){row.click();window.setTimeout(syncActive,30);return}const projectButton=document.querySelector<HTMLButtonElement>('.rail button[title="Projekt"]');if(projectButton&&!document.querySelector('.projectWorkspace'))projectButton.click();if(attempt<30)window.setTimeout(()=>openUtility(label,attempt+1),50)}
function wireUsers(rail:HTMLElement){const button=rail.querySelector<HTMLButtonElement>('button[title="Användare"]');if(!button)return;button.disabled=false;if(button.dataset.usersWired==='1')return;button.dataset.usersWired='1';button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('byggplan:open-users')))}
function ensureRailButtons(){const rails=Array.from(document.querySelectorAll<HTMLElement>('.rail'));for(const rail of rails){if(rail.classList.contains('kaRail'))continue;wireUsers(rail);if(rail.querySelector('.projectUtilityRailButton'))continue;for(const item of utilityItems){const button=document.createElement('button');button.type='button';button.className='projectUtilityRailButton';button.title=item.label;button.dataset.utilityLabel=item.label;button.innerHTML=`<span class="projectUtilityRailIcon">${item.icon}</span><span>${item.label}</span>`;button.addEventListener('click',()=>openUtility(item.label));rail.appendChild(button)}}hideNativeUtilityRows();syncActive()}
export function installProjectUtilityRail(){ensureRailButtons();let scheduled=0;const observer=new MutationObserver(()=>{window.clearTimeout(scheduled);scheduled=window.setTimeout(ensureRailButtons,20)});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})}
