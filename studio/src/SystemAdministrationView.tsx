import {SystemWorkspacesView} from './SystemWorkspacesView';
import {MasterModuleValidation} from './MasterModuleValidation';

type Props={currentProjectId?:string;currentProjectName?:string};

export function SystemAdministrationView(props:Props){
 return <>
  <SystemWorkspacesView {...props}/>
  <div className="systemWorkspacesView"><div className="systemWorkspaceGrid"><section/><aside><MasterModuleValidation/></aside></div></div>
 </>;
}
