let observer: MutationObserver | null = null;

function graphNodeFrom(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>('.dependencyGraphNode[data-node-id]') : null;
}

function glyphFor(node: HTMLElement) {
  return node.querySelector<HTMLElement>('.graphNode');
}

function remember(node: HTMLElement) {
  const glyph = glyphFor(node);
  if (!glyph) return;
  node.dataset.graphOriginalGlyph = glyph.textContent || '';
}

function restoreSelected(node: HTMLElement) {
  const glyph = glyphFor(node);
  if (!glyph) return;
  if (!node.classList.contains('selected')) {
    delete node.dataset.graphOriginalGlyph;
    return;
  }
  if (node.dataset.graphOriginalGlyph === undefined) return;
  const expected = node.dataset.graphOriginalGlyph;
  if ((glyph.textContent || '') !== expected) glyph.textContent = expected;
}

export function installGraphNodeIconPreserver() {
  const w = window as typeof window & Record<string, unknown>;
  const marker = '__byggplanGraphNodeIconPreserverV1';
  if (w[marker]) return;
  w[marker] = true;

  const capture = (event: Event) => {
    const node = graphNodeFrom(event.target);
    if (node && !node.classList.contains('selected')) remember(node);
  };

  document.addEventListener('pointerdown', capture, true);
  document.addEventListener('click', capture, true);
  document.addEventListener('keydown', event => {
    if (!(event instanceof KeyboardEvent) || (event.key !== 'Enter' && event.key !== ' ')) return;
    const node = graphNodeFrom(event.target);
    if (node && !node.classList.contains('selected')) remember(node);
  }, true);

  observer = new MutationObserver(records => {
    const nodes = new Set<HTMLElement>();
    for (const record of records) {
      const element = record.target instanceof HTMLElement ? record.target : record.target.parentElement;
      const node = element?.closest<HTMLElement>('.dependencyGraphNode[data-node-id]');
      if (node) nodes.add(node);
      if (record.type === 'childList') {
        for (const added of Array.from(record.addedNodes)) {
          if (!(added instanceof HTMLElement)) continue;
          if (added.matches('.dependencyGraphNode[data-node-id]')) nodes.add(added);
          for (const nested of Array.from(added.querySelectorAll<HTMLElement>('.dependencyGraphNode[data-node-id]'))) nodes.add(nested);
        }
      }
    }
    for (const node of nodes) restoreSelected(node);
  });

  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
}
