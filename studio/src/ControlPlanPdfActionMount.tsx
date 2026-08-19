import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {VK4410_CONTROL_PLAN} from './controlPlanVk4410';
import {VK4410_CONTROL_PLAN_PDF_TEMPLATE as TEMPLATE} from './controlPlanPdfTemplateVk4410';

type Person={name:string;email:string;role:string};
type ProjectInformation={projectName:string;propertyDesignation:string;address:string;municipality:string;buildingAuthority:string;caseNumber:string;buildingPermitDate:string;startNoticeDate:string;decisionNotes:string;importantDatesNotes:string;builders:Person[];ka:Person[]};
type DocumentRow={id:string;title:string;document_type:string;issuer?:string;reference?:string;source_filename?:string};
type GoverningItem={id:string;code?:string;description:string;section_code?:string;section_title?:string;responsible_role?:string;evidence_required?:string;handling_status?:string;handling_comment?:string;sort_order?:number};
type Approval={id:string;governing_item_id:string;signer_name:string;signer_email?:string;role_code:string;attestation_type?:string;signing_method?:string;content_hash?:string|null;signed_at:string};
type Group={code:string;title:string;items:GoverningItem[]};

export function ControlPlanPdfActionMount({projectId}:{projectId:string}){
 const[target,setTarget]=useState<HTMLElement|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{let timer=0;function sync(){setTarget(document.querySelector('.governingReports .pageHero') as HTMLElement|null);timer=window.setTimeout(sync,300)}sync();return()=>window.clearTimeout(timer)},[projectId]);
 async function createPdf(){
  const popup=window.open('','_blank');
  if(!popup){alert('Tillåt popup-fönster för att skapa kontrollplanen.');return}
  popup.document.write('<!doctype html><title>Skapar kontrollplan...</title><p style="font-family:Arial,sans-serif;padding:24px">Skapar kontrollplan...</p>');
  setBusy(true);
  try{
   const[ir,dr,ar]=await Promise.all([
    fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/information`,{cache:'no-store'}),
    fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-documents`,{cache:'no-store'}),
    fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/governing-attestations`,{cache:'no-store'})
   ]);
   const infoData=await ir.json() as {information?:ProjectInformation};
   const docsData=await dr.json() as {documents?:DocumentRow[]};
   const attData=await ar.json() as {attestations?:Approval[]};
   if(!dr.ok)throw new Error('Kunde inte läsa projektets kontrollplan.');
   const controlDoc=(docsData.documents||[]).find(d=>d.document_type==='control_plan'||d.title.toLocaleLowerCase('sv').includes('kontrollplan'));
   if(!controlDoc)throw new Error('Ingen kontrollplan finns registrerad som styrdokument.');
   const detailResponse=await fetch(`/api/studio/governing-documents/${encodeURIComponent(controlDoc.id)}`,{cache:'no-store'});
   const detail=await detailResponse.json() as {items?:GoverningItem[]};
   if(!detailResponse.ok)throw new Error('Kunde inte läsa kontrollplanens kontrollpunkter.');
   const html=buildControlPlanHtml(infoData.information,controlDoc,detail.items||[],attData.attestations||[]);
   popup.document.open();popup.document.write(html);popup.document.close();
   popup.addEventListener('load',()=>window.setTimeout(()=>popup.print(),250),{once:true});
  }catch(error){popup.document.open();popup.document.write(`<p style="font-family:Arial,sans-serif;padding:24px">${escapeHtml(error instanceof Error?error.message:'Kontrollplanen kunde inte skapas.')}</p>`);popup.document.close()}
  finally{setBusy(false)}
 }
 if(!target)return null;
 return createPortal(<div style={{marginTop:12,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><button type="button" className="primary" disabled={busy} onClick={()=>void createPdf()}>{busy?'Skapar...':'📄 Skapa kontrollplan PDF'}</button><small style={{color:'#667085'}}>Skapar KA-layouten i sju sidor. Välj Spara som PDF i utskriftsdialogen.</small></div>,target);
}

function buildControlPlanHtml(info:ProjectInformation|undefined,doc:DocumentRow,items:GoverningItem[],approvals:Approval[]){
 const methods=new Map(VK4410_CONTROL_PLAN.points.map(point=>[point.code,point.method]));
 const approvalMap=new Map<string,Approval[]>();
 for(const approval of approvals){const list=approvalMap.get(approval.governing_item_id)||[];list.push(approval);approvalMap.set(approval.governing_item_id,list)}
 const groups=groupItems(items);
 const general=groups.get('A')||{code:'-',title:'Allmänna PBL/PBF',items:[]};
 const generalFirst={...general,code:'-',items:general.items.slice(0,6)};
 const generalSecond={...general,code:'',items:general.items.slice(6)};
 const builder=info?.builders?.[0];const ka=info?.ka?.[0];
 const permit=info?.buildingPermitDate?`Beslutsdatum ${formatDate(info.buildingPermitDate)}`:'-';
 const page3=controlPage(3,info?.propertyDesignation||'',[generalFirst],methods,approvalMap,abbreviationColumns());
 const page4=controlPage(4,info?.propertyDesignation||'',[generalSecond],methods,approvalMap);
 const page5=controlPage(5,info?.propertyDesignation||'',pickGroups(groups,['1','2']),methods,approvalMap);
 const page6=controlPage(6,info?.propertyDesignation||'',pickGroups(groups,['3','4','5','6']),methods,approvalMap);
 const page7=controlPage(7,info?.propertyDesignation||'',pickGroups(groups,['7','8','9','10','11']),methods,approvalMap,'',signatureFooter(info,doc));
 return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title><style>${printCss()}</style></head><body><div class="noPrint"><button onclick="window.print()">Skriv ut / spara som PDF</button><span> Kontrollplanen är uppdelad enligt KA-originalet. Välj "Spara som PDF" i utskriftsdialogen.</span></div>
 <section class="sheet">${header(1,info?.propertyDesignation||'')}<table class="info"><tr><th class="sectionTitle" colspan="2">Allmänna uppgifter</th></tr><tr><td>Ärendenummer:</td><td>${v(info?.caseNumber)}</td></tr><tr><td>Byggherre</td><td>${v(builder?.name)}</td></tr><tr><td>Fastighet</td><td>${v(info?.propertyDesignation)}</td></tr><tr><td class="normal">Adress</td><td><i>${v(info?.address)}</i></td></tr><tr><td class="normal">Byggnad</td><td>${escapeHtml(TEMPLATE.buildingDescription)}</td></tr><tr><td class="normal">Orienterande beskrivning</td><td>${escapeHtml(TEMPLATE.orientationDescription)}</td></tr><tr><th class="sectionTitle" colspan="2">Projektunderlag för kontrollplanen</th></tr><tr><td class="normal">Bygglov</td><td>${permit}</td></tr><tr><td class="normal">Tekniskt samråd</td><td>${escapeHtml(TEMPLATE.technicalConsultationDate)}</td></tr><tr><td class="normal">Handlingsförteckning</td><td>Handlingar enligt projektets dokumentförteckning</td></tr><tr><td class="normal">Gällande normer, version</td><td>${escapeHtml(TEMPLATE.applicableStandards)}</td></tr><tr><td class="normal">Branddimensionering</td><td>${escapeHtml(TEMPLATE.fireDesign)}</td></tr><tr><td class="normal">Verksamhetsklass(er)</td><td>${escapeHtml(TEMPLATE.occupancyClass)}</td></tr><tr><td class="spacer" colspan="2"></td></tr><tr><th class="sectionTitle" colspan="2">Kontrollansvarig</th></tr><tr><td class="normal">Namn</td><td>${v(ka?.name||TEMPLATE.company.contactName)}</td></tr><tr><td class="normal">Företag</td><td>${escapeHtml(TEMPLATE.company.name)}</td></tr><tr><td class="normal">Adress</td><td>${escapeHtml(TEMPLATE.company.addressLines.join(', '))}</td></tr><tr><td class="normal">Epost</td><td>${v(ka?.email||TEMPLATE.company.email)}</td></tr><tr><td class="normal">Mobil nr</td><td>${escapeHtml(TEMPLATE.company.phone)}</td></tr></table>${caseFooter(info)}</section>
 <section class="sheet">${header(2,info?.propertyDesignation||'')}<table class="roleTable"><tr><th colspan="2">Projektörer - Ansvariga för egenkontroll<br><span class="small">Kontaktuppgifter enligt kontaktlista</span></th><th>Egenkontroll<br>Förslag<br>Mottagen datum</th><th>Egenkontroll<br>Verifierad<br>Mottagen datum</th><th>Sign KA</th><th>Anteckningar</th></tr>${TEMPLATE.designers.map(row=>`<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td></td><td></td><td></td><td>${escapeHtml(row[2])}</td></tr>`).join('')}</table><div class="tableGap"></div><table class="roleTable"><tr><th colspan="6">Entreprenörer - Ansvariga för egenkontroll<br><span class="small">Kontaktuppgifter enligt kontaktlista <i>Tekniska kontroller enligt respektive egenkontrollplan</i></span></th></tr><tr><th></th><th>Kontaktuppgifter</th><th>Egenkontroll<br>Förslag<br>Mottagen datum</th><th>Egenkontroll<br>Verifierad<br>Mottagen datum</th><th>Sign KA</th><th>Anteckningar</th></tr>${TEMPLATE.contractors.map(row=>`<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td></td><td></td><td></td><td>${escapeHtml(row[2])}</td></tr>`).join('')}</table>${caseFooter(info)}</section>
 ${page3}${page4}${page5}${page6}${page7}</body></html>`
}

function groupItems(items:GoverningItem[]){
 const sorted=[...items].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
 const map=new Map<string,Group>();
 for(const item of sorted){const code=item.code||'';const inferred=code.startsWith('A-')?'A':(code.match(/^(\d+)-/)?.[1]||'A');const key=item.section_code||inferred;const title=item.section_title||VK4410_CONTROL_PLAN.points.find(p=>p.code===code)?.categoryTitle||'Allmänna PBL/PBF';if(!map.has(key))map.set(key,{code:key,title,items:[]});map.get(key)!.items.push(item)}
 return map;
}
function pickGroups(groups:Map<string,Group>,codes:string[]){return codes.map(code=>groups.get(code)).filter(Boolean) as Group[]}
function controlPage(page:number,property:string,groups:Group[],methods:Map<string,string>,approvalMap:Map<string,Approval[]>,before='',after=''){return `<section class="sheet">${header(page,property)}${before}${renderControlTable(groups,methods,approvalMap)}${after}</section>`}
function renderControlTable(groups:Group[],methods:Map<string,string>,approvalMap:Map<string,Approval[]>){return `<table class="controlTable"><thead><tr><th>Egen<br>sk nr</th><th>Kontrollpunkt</th><th>Utfört enligt</th><th>Egenkontr/<br>alt KA</th><th>Genomförd/<br>Intyg inkommit<br>datum</th><th>Sign<br>KA</th><th>Anteckningar</th></tr></thead><tbody>${groups.map(group=>renderGroup(group,methods,approvalMap)).join('')}</tbody></table>`}
function renderGroup(group:Group,methods:Map<string,string>,approvalMap:Map<string,Approval[]>){const section=group.code===''?'':`<tr class="section"><td>${escapeHtml(group.code)}</td><td colspan="6">${escapeHtml(group.title)}</td></tr>`;return section+group.items.map(item=>controlRow(item,methods.get(item.code||'')||'',approvalMap.get(item.id)||[])).join('')}
function controlRow(item:GoverningItem,method:string,approvals:Approval[]){const sorted=[...approvals].sort((a,b)=>a.signed_at.localeCompare(b.signed_at));const kaApprovals=sorted.filter(a=>a.role_code==='KA');const latest=kaApprovals[kaApprovals.length-1]||sorted[sorted.length-1];const signed=latest?`${escapeHtml(latest.signer_name)}<br><span class="muted">${escapeHtml(formatDate(latest.signed_at))}</span>`:'';const completed=latest?escapeHtml(formatDate(latest.signed_at)):'';const note=[item.evidence_required,item.handling_comment].filter(Boolean).join(' - ');return `<tr><td></td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(method)}</td><td>${escapeHtml(item.responsible_role||'')}</td><td>${completed}</td><td class="signature">${signed}</td><td>${escapeHtml(note)}</td></tr>`}
function abbreviationColumns(){const midpoint=Math.ceil(TEMPLATE.abbreviations.length/2),left=TEMPLATE.abbreviations.slice(0,midpoint),right=TEMPLATE.abbreviations.slice(midpoint);const render=(rows:readonly (readonly [string,string])[])=>rows.map(([abbr,text])=>`<div><b>${escapeHtml(abbr)}</b> - ${escapeHtml(text)}</div>`).join('');return `<div class="abbr"><div><div>Förkortningar:</div>${render(left)}</div><div>${render(right)}</div></div>`}
function signatureFooter(info:ProjectInformation|undefined,doc:DocumentRow){const builder=info?.builders?.[0],ka=info?.ka?.[0];return `<div class="footerSign"><div><b>Vemdalen ${escapeHtml(TEMPLATE.documentDate)}</b></div><div class="signatureLine">${v(ka?.name||TEMPLATE.company.contactName)} / Kontrollansvarig</div><div class="signatureLine">${v(builder?.name)} / Byggherre</div></div>${info?.decisionNotes?`<p class="note"><b>Beslut / myndighetsanteckningar:</b> ${escapeHtml(info.decisionNotes)}</p>`:''}<div class="source">Genererad i ByggPlan från kontrollplanens mall och registrerad projektstatus. Källdokument: ${escapeHtml(doc.source_filename||doc.title)}.</div>${caseFooter(info)}`}
function caseFooter(info:ProjectInformation|undefined){return info?.caseNumber?`<div class="caseFooter">Dnr ${escapeHtml(info.caseNumber)}</div>`:''}
function header(page:number,property:string){const address=TEMPLATE.company.addressLines.map(line=>escapeHtml(line)).join('<br>');return `<table class="docHeader"><tr><td rowspan="2"><div class="company">Företagsnamn ${escapeHtml(TEMPLATE.company.name)}</div><div class="strong small">Kontaktuppgifter: ${escapeHtml(TEMPLATE.company.contactName)}<br>${escapeHtml(TEMPLATE.company.phone)}<br>${escapeHtml(TEMPLATE.company.email)}</div></td><td><span class="small">Dokument</span><br><b>${escapeHtml(TEMPLATE.documentTitle)}</b></td><td><span class="small">Sid</span><br><b>${page}/7</b></td></tr><tr><td><b>${escapeHtml(TEMPLATE.documentSubtitle)}</b></td><td><span class="small">Handläggare</span><br><b>${escapeHtml(TEMPLATE.caseOfficer)}</b></td></tr><tr><td><span class="small">Adress:</span><br>${address}</td><td><b>${escapeHtml(property||'Projekt')}</b></td><td><span class="small">Datum</span><br><b>${escapeHtml(TEMPLATE.documentDate)} /</b></td></tr></table>`}
function printCss(){return `@page{size:A4 landscape;margin:8mm 10mm 10mm 10mm}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:9.5pt}.noPrint{margin:8px;padding:8px 10px;background:#f2f4f7;border:1px solid #d0d5dd}.noPrint button{padding:8px 12px;font-weight:700}@media print{.noPrint{display:none}.sheet{break-after:page}.sheet:last-child{break-after:auto}}.sheet{position:relative;min-height:185mm;padding-bottom:7mm;break-after:page}table{width:100%;border-collapse:collapse}td,th{border:1px solid #555;padding:2px 4px;vertical-align:top}.docHeader{width:76%;margin:0 auto 6mm}.docHeader td{height:13mm}.company{font-size:16pt;font-weight:700;line-height:1}.small{font-size:8pt}.strong{font-weight:700}.sectionTitle{text-align:center;background:#e6e6e6;font-weight:700}.info td:first-child{width:23%;font-weight:700}.info .normal{font-weight:400}.spacer{height:3mm;border:0}.roleTable th,.controlTable th{background:#e6e6e6;text-align:left}.roleTable th{text-align:center}.roleTable{font-size:9pt}.roleTable td{height:8mm}.tableGap{height:6mm}.abbr{display:grid;grid-template-columns:1fr 1fr;gap:25mm;margin:4mm 0 5mm;font-size:9pt}.controlTable{font-size:8.25pt;line-height:1.08}.controlTable td,.controlTable th{padding:1.6px 4px}.controlTable th:nth-child(1){width:6%}.controlTable th:nth-child(2){width:35%}.controlTable th:nth-child(3){width:12%}.controlTable th:nth-child(4){width:10%}.controlTable th:nth-child(5){width:14%}.controlTable th:nth-child(6){width:9%}.controlTable th:nth-child(7){width:14%}.controlTable .section td{background:#fff200;font-size:9pt;font-weight:700}.signature{font-size:7.6pt;font-weight:700}.muted{color:#555;font-weight:400}.footerSign{margin-top:6mm;display:flex;gap:12mm;align-items:flex-end}.signatureLine{min-width:67mm;border-top:1px solid #333;padding-top:1.5mm}.source{margin-top:3mm;font-size:7.5pt;color:#555}.note{white-space:pre-wrap;font-size:8pt}.caseFooter{position:absolute;right:0;bottom:0;font-size:7.5pt;color:#333}`}
function v(value:string|undefined){return escapeHtml(value||'-')}
function formatDate(value:string){const match=value.match(/^(\d{4})-(\d{2})-(\d{2})/);return match?`${match[1]}-${match[2]}-${match[3]}`:value}
function escapeHtml(value:string){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]||char))}
