import { useEffect } from 'react';

/**
 * Makes the control plan behave as a primary Studio view.
 * The existing control-plan component keeps ownership of its data and API calls,
 * while this bridge handles navigation between Project and Control plan.
 */
export function ControlPlanInlineMode() {
  useEffect(() => {
    let projectButton: HTMLButtonElement | null = null;

    const closeControlPlan = () => {
      const closeButton = document.querySelector('.controlPlanHeaderActions .close') as HTMLButtonElement | null;
      closeButton?.click();
    };

    const connectProjectButton = () => {
      const rail = document.querySelector('.rail');
      const nextProjectButton = rail
        ? Array.from(rail.querySelectorAll('button')).find(button =>
            button.textContent?.toLocaleLowerCase('sv').includes('projekt')
          ) as HTMLButtonElement | undefined
        : undefined;

      if (nextProjectButton && nextProjectButton !== projectButton) {
        projectButton?.removeEventListener('click', closeControlPlan);
        projectButton = nextProjectButton;
        projectButton.addEventListener('click', closeControlPlan);
      }
    };

    const updateViewClass = () => {
      const isOpen = Boolean(document.querySelector('.controlPlanBackdrop'));
      document.body.classList.toggle('control-plan-view', isOpen);
      connectProjectButton();
    };

    const observer = new MutationObserver(updateViewClass);
    observer.observe(document.body, { childList: true, subtree: true });
    updateViewClass();

    return () => {
      observer.disconnect();
      projectButton?.removeEventListener('click', closeControlPlan);
      document.body.classList.remove('control-plan-view');
    };
  }, []);

  return null;
}
