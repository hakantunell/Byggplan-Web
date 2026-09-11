from pathlib import Path

p=Path('studio/src/StudioShell.tsx')
s=p.read_text()
needle="const PROJECT_STORAGE_KEY='byggplan.studio.projectId';\n"
insert="const PROJECT_STORAGE_KEY='byggplan.studio.projectId';\nconst PROJECT_PAGE_LABELS:Record<'overview'|'activities'|'administration'|'conditions'|'information'|'reports'|'settings',string>={overview:'Översikt',activities:'Aktiviteter',administration:'Administrativa kontrollpunkter',conditions:'Projektvillkor',information:'Projektinformation',reports:'Rapporter',settings:'Inställningar'};\n"
if needle not in s: raise SystemExit('storage key marker not found')
s=s.replace(needle,insert,1)
old="<small>{systemWorkspaces?'System · Projektytor':projectsView?'Projekt':newProject?'Nytt projekt':mapping?'Kartläggning':users?'Användare':controlPlan?'Kontrollplan':graphicalPlan?'Grafisk plan':backup?'Backup':projectDocuments?'Projektdokument':'Styrdokument'}</small>"
new="<small>{systemWorkspaces?'System · Projektytor':projectsView?PROJECT_PAGE_LABELS[projectPage]:newProject?'Nytt projekt':mapping?'Kartläggning':users?'Användare':controlPlan?'Kontrollplan':graphicalPlan?'Grafisk plan':backup?'Backup':projectDocuments?'Projektdokument':'Styrdokument'}</small>"
if old not in s: raise SystemExit('header label marker not found')
s=s.replace(old,new,1)
old2="aria-label={systemWorkspaces?'Systemadministration för projektytor':projectsView?'Projekt':newProject?'Nytt projekt':"
new2="aria-label={systemWorkspaces?'Systemadministration för projektytor':projectsView?PROJECT_PAGE_LABELS[projectPage]:newProject?'Nytt projekt':"
if old2 not in s: raise SystemExit('aria label marker not found')
s=s.replace(old2,new2,1)
p.write_text(s)

p=Path('studio/src/ProjectWorkspace.tsx')
s=p.read_text()
old='<Placeholder title="Rapporter" text="Projektstatus, dokumentationsunderlag, styrdokumentsuppfyllelse och slutdokumentation samlas här."/>'
new='<Placeholder title="Rapporter" eyebrow="RAPPORTER" text="Projektstatus, dokumentationsunderlag, styrdokumentsuppfyllelse och slutdokumentation samlas här."/>'
if old not in s: raise SystemExit('reports placeholder marker not found')
s=s.replace(old,new,1)
old3='function Placeholder({title,text}:{title:string;text:string}){return <div className="projectPage"><div className="pageHero"><small>PROJEKT</small><h1>{title}</h1><p>{text}</p></div></div>}'
new3='function Placeholder({title,text,eyebrow="PROJEKT"}:{title:string;text:string;eyebrow?:string}){return <div className="projectPage"><div className="pageHero"><small>{eyebrow}</small><h1>{title}</h1><p>{text}</p></div></div>}'
if old3 not in s: raise SystemExit('placeholder function marker not found')
s=s.replace(old3,new3,1)
p.write_text(s)

# trigger
