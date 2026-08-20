import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const BUTTON_ATTR='data-graph-pdf-export';

function safeFileName(value:string){
  return (value||'grafisk-plan')
    .trim()
    .toLowerCase()
    .replace(/[åä]/g,'a')
    .replace(/ö/g,'o')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')||'grafisk-plan';
}

async function exportGraphicalPlan(button:HTMLButtonElement){
  const page=button.closest('.graphPlanPage') as HTMLElement|null;
  const graph=page?.querySelector('.dependencyGraph') as HTMLElement|null;
  if(!page||!graph)return;

  const title=(page.querySelector('.graphPlanTitle h1')?.textContent||'Projektplan').trim();
  const oldText=button.textContent||'Exportera PDF';
  button.disabled=true;
  button.textContent='Skapar PDF…';

  const clone=graph.cloneNode(true) as HTMLElement;
  clone.style.transform='none';
  clone.style.transformOrigin='0 0';
  clone.style.position='relative';
  clone.style.left='0';
  clone.style.top='0';

  clone.querySelectorAll('.dependencyRouteHandle,.dependencyLaneHandle,.dependencyEndpointHandle,.dependencyPort,.dependencyPreview,.dependencyEdgeHit').forEach(el=>el.remove());
  clone.querySelectorAll('.selected,.edgeSelected,.related,.dimmed,.depValid,.depInvalid,.depEdit').forEach(el=>{
    el.classList.remove('selected','edgeSelected','related','dimmed','depValid','depInvalid','depEdit');
  });

  const width=Math.ceil(parseFloat(graph.style.width)||graph.scrollWidth||graph.getBoundingClientRect().width);
  const height=Math.ceil(parseFloat(graph.style.height)||graph.scrollHeight||graph.getBoundingClientRect().height);
  clone.style.width=`${width}px`;
  clone.style.height=`${height}px`;

  const host=document.createElement('div');
  host.setAttribute('aria-hidden','true');
  Object.assign(host.style,{
    position:'fixed',left:'-100000px',top:'0',width:`${width}px`,height:`${height}px`,
    overflow:'hidden',background:'#fff',zIndex:'-1'
  });
  host.appendChild(clone);
  document.body.appendChild(host);

  try{
    const maxDimension=Math.max(width,height);
    const renderScale=Math.max(.8,Math.min(1.8,12000/maxDimension));
    const canvas=await html2canvas(clone,{
      backgroundColor:'#ffffff',
      scale:renderScale,
      useCORS:true,
      logging:false,
      width,
      height,
      windowWidth:width,
      windowHeight:height
    });

    // Keep the graph readable instead of forcing it onto A4/A3. The PDF page
    // follows the graph proportions and can later be printed at any standard size.
    const margin=12;
    const titleHeight=16;
    const pxToMm=.22;
    const contentW=Math.max(120,width*pxToMm);
    const contentH=Math.max(80,height*pxToMm);
    const pageW=contentW+margin*2;
    const pageH=contentH+margin*2+titleHeight;
    const orientation=pageW>=pageH?'landscape':'portrait';
    const pdf=new jsPDF({orientation,unit:'mm',format:[pageW,pageH],compress:true});

    pdf.setFont('helvetica','bold');
    pdf.setFontSize(15);
    pdf.text('Grafisk plan',margin,margin+5);
    pdf.setFont('helvetica','normal');
    pdf.setFontSize(10);
    pdf.text(title,margin,margin+11);
    pdf.addImage(canvas.toDataURL('image/png'),'PNG',margin,margin+titleHeight,contentW,contentH,undefined,'FAST');
    pdf.save(`${safeFileName(title)}-grafisk-plan.pdf`);
  }catch(error){
    console.error('Kunde inte exportera grafisk plan som PDF',error);
    window.alert('Kunde inte skapa PDF-filen. Försök igen eller zooma ut grafen något.');
  }finally{
    host.remove();
    button.disabled=false;
    button.textContent=oldText;
  }
}

function installButton(){
  document.querySelectorAll<HTMLElement>('.graphPlanButtons').forEach(actions=>{
    if(actions.querySelector(`[${BUTTON_ATTR}]`))return;
    const button=document.createElement('button');
    button.type='button';
    button.setAttribute(BUTTON_ATTR,'');
    button.textContent='Exportera PDF';
    button.title='Exportera hela den grafiska planen som PDF';
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      void exportGraphicalPlan(button);
    });
    actions.appendChild(button);
  });
}

export function installGraphicalPlanPdfExport(){
  installButton();
  const observer=new MutationObserver(()=>installButton());
  observer.observe(document.documentElement,{childList:true,subtree:true});
}
