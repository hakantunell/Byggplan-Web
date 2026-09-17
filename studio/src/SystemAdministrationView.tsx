import {SystemWorkspacesView} from './SystemWorkspacesView';
import {MasterModuleValidation} from './MasterModuleValidation';
import './system-administration.css';

type Props={currentProjectId?:string;currentProjectName?:string};

export function SystemAdministrationView(props:Props){
 return <div className="systemAdministrationView">
  <SystemWorkspacesView {...props}/>
  <div className="systemWorkspacesView systemAdministrationValidation"><div className="systemWorkspaceGrid"><section/><aside><MasterModuleValidation/></aside></div></div>
 </div>;
}
