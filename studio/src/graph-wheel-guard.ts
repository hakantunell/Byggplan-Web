declare global {
  interface Window {
    __byggplanGraphWheelGuardInstalled?: boolean;
  }
}

function installGraphWheelGuard() {
  if (window.__byggplanGraphWheelGuardInstalled) return;
  window.__byggplanGraphWheelGuardInstalled = true;

  document.addEventListener(
    'wheel',
    (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const canvas = target.closest('.dependencyCanvas');
      if (!canvas) return;

      // Stop the browser's normal Ctrl+wheel page zoom and route the gesture
      // to the graph's existing zoom controls instead.
      event.preventDefault();
      event.stopPropagation();

      const controls = canvas
        .closest('.graphCanvasShell')
        ?.querySelector('.graphZoomControls');
      if (!controls) return;

      const buttons = controls.querySelectorAll<HTMLButtonElement>('button');
      const zoomOut = buttons[0];
      const zoomIn = buttons[2];
      (event.deltaY < 0 ? zoomIn : zoomOut)?.click();
    },
    { capture: true, passive: false },
  );
}

installGraphWheelGuard();

export {};
