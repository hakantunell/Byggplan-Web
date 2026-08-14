import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';

type Props={warningCount:number;onOpen:()=>void};

export function GoverningMappingRailBridge({warningCount,onOpen}:Props){
  const[target,setTarget]=useState<Element|null>(null);
  useEffect(()=>{
    const sync=()=>setTarget(document.querySelector('.projectWorkspace .rail'));
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  if(!target)return null;
  return createPortal(
    <button className="governingMappingRailButton" title={warningCount>0?`Kartläggning – ${warningCount} punkt${warningCount===1?'':'er'} behöver åtgärdas`:'Kartläggning'} onClick={onOpen}>
      <span className="railIconWrap">🧭{warningCount>0&&<em className="railWarningBadge">⚠</em>}</span><span>Kartläggning</span>
    </button>,
    target
  );
}
