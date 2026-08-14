function ensureMappingButton(){
  const rail=document.querySelector('.projectWorkspace .rail');
  if(!rail)return;
  let button=rail.querySelector('button[data-governing-mapping="true"]') as HTMLButtonElement|null;
  if(button)return;
  button=document.createElement('button');
  button.dataset.governingMapping='true';
  button.className='governingMappingRailButton';
  button.title='Kartläggning';
  button.innerHTML='<span class="railIconWrap">🧭<em class="railWarningBadge" hidden>⚠</em></span><span>Kartläggning</span>';
  button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('byggplan:open-governing-mapping')));
  const governing=Array.from(rail.querySelectorAll('button')).find(b=>b.title==='Styrdokument');
  if(governing?.nextSibling)rail.insertBefore(button,governing.nextSibling);else rail.appendChild(button);
}

export function installGoverningMappingRail(){
  const sync=()=>ensureMappingButton();
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('byggplan:mapping-warning',(event:Event)=>{
    const count=Number((event as CustomEvent<{count?:number}>).detail?.count||0);
    const button=document.querySelector('.projectWorkspace .rail button[data-governing-mapping="true"]') as HTMLButtonElement|null;
    if(!button)return;
    const badge=button.querySelector('.railWarningBadge') as HTMLElement|null;
    if(badge)badge.hidden=count<=0;
    button.title=count>0?`Kartläggning – ${count} punkt${count===1?'':'er'} behöver åtgärdas`:'Kartläggning';
  });
}
