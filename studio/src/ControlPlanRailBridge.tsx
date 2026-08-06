import { useEffect } from 'react';

export function ControlPlanRailBridge() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let attempts = 0;

    const connect = () => {
      attempts += 1;
      const rail = document.querySelector('.rail');
      const menuButton = rail
        ? Array.from(rail.querySelectorAll('button')).find(button =>
            button.textContent?.toLocaleLowerCase('sv').includes('kontrollplan')
          ) as HTMLButtonElement | undefined
        : undefined;
      const overlayButton = document.querySelector('.controlPlanRailButton') as HTMLButtonElement | null;

      if (!menuButton || !overlayButton) {
        if (attempts < 40) window.setTimeout(connect, 100);
        return;
      }

      menuButton.disabled = false;
      menuButton.title = 'Öppna projektets kontrollplan';
      menuButton.classList.add('controlPlanMenuButton');
      overlayButton.setAttribute('aria-hidden', 'true');

      const openControlPlan = (event: Event) => {
        event.preventDefault();
        overlayButton.click();
      };

      menuButton.addEventListener('click', openControlPlan);
      cleanup = () => menuButton.removeEventListener('click', openControlPlan);
    };

    connect();
    return () => cleanup?.();
  }, []);

  return null;
}
