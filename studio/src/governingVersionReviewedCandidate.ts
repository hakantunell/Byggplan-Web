import {VK4410_CONTROL_PLAN} from './controlPlanVk4410';

type DocumentSummary={title:string;document_type:string;source_filename:string};
type CurrentDraft={source_item_id?:string|null;code?:string};
export type ReviewedCandidateItem={sourceItemId:string|null;code:string;description:string;sectionCode:string;sectionTitle:string;itemType:string;responsibleRole:string;evidenceRequired:string;sourceNote:string};

const CHILD_SAFETY_POINTS=[
 {code:'4-04',description:'Knivlåda med säkerhetsbeslag',method:'BBR 8:32',responsibleRole:'EK',evidenceRequired:'Egenkontroll',categoryCode:'4',categoryTitle:'Säkerhet vid användning – Barnsäkerhet',pointType:'control' as const},
 {code:'4-05',description:'Medicinskåp med säkerhetsbeslag',method:'BBR 8:7',responsibleRole:'EK',evidenceRequired:'Egenkontroll',categoryCode:'4',categoryTitle:'Säkerhet vid användning – Barnsäkerhet',pointType:'control' as const},
 {code:'4-06',description:'Klassat glas i lågt sittande fönster',method:'Egenkontroll',responsibleRole:'EK',evidenceRequired:'Intyg',categoryCode:'4',categoryTitle:'Säkerhet vid användning – Barnsäkerhet',pointType:'document' as const}
];

function compact(value:string){return value.toLocaleLowerCase('sv-SE').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}

export function reviewedCandidateFor(document:DocumentSummary,current:CurrentDraft[]):ReviewedCandidateItem[]|null{
 const source=compact(document.source_filename||''),title=compact(document.title||'');
 const isKaPlan=document.document_type==='control_plan'&&(source.includes('kontrollplanka')||source.includes('tekniskaegenskapskrav')||title.includes('kontrollplanenligtpblforka'));
 if(!isKaPlan)return null;
 const sourceByCode=new Map(current.filter(item=>item.code).map(item=>[String(item.code),item.source_item_id||null]));
 const points:any[]=[];
 for(const point of VK4410_CONTROL_PLAN.points){
  points.push(point);
  if(point.code==='4-03')points.push(...CHILD_SAFETY_POINTS);
 }
 return points.map(point=>({
  sourceItemId:sourceByCode.get(point.code)||null,
  code:point.code,
  description:point.description,
  sectionCode:point.categoryCode,
  sectionTitle:point.categoryTitle,
  itemType:point.pointType==='document'?'documentation':point.pointType==='not_applicable'?'other':point.pointType,
  responsibleRole:point.responsibleRole,
  evidenceRequired:point.evidenceRequired,
  sourceNote:point.method
 }));
}
