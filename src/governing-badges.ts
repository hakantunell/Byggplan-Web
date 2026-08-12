let installed=false;

// Governing indicators are now calculated from task data before rendering.
// Keep this installer as a harmless compatibility hook for existing entrypoints.
export function installGoverningBadges(){
  if(installed)return;
  installed=true;
}
