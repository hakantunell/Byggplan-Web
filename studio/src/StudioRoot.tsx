import {useAuth} from './AuthGate';
import {StudioShell} from './StudioShell';
import {KaStudioShell} from './KaStudioShell';

export function StudioRoot(){
 const auth=useAuth();
 const isAdmin=Boolean(auth.user?.globalRoles.includes('admin'));
 const kaOnly=Boolean(auth.configured&&auth.user&&!isAdmin&&auth.user.projects.length>0&&auth.user.projects.every(p=>p.roles.includes('KA')&&!p.roles.some(r=>['BH','worker','supervisor'].includes(r))));
 return kaOnly?<KaStudioShell/>:<StudioShell/>;
}
