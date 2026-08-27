const navigationLink = (href: string, className: string, label: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.className = `preview-nav-link ${className}`;
  link.textContent = label;
  return link;
};

export function addPreviewNavigation(controls: HTMLElement, preview: HTMLElement, returnHost: HTMLElement) {
  controls.id = 'editor-controls';
  controls.tabIndex = -1;
  preview.id = 'preview-panel';
  preview.tabIndex = -1;
  controls.prepend(navigationLink('#preview-panel', 'preview-jump', 'Jump to preview'));
  returnHost.append(navigationLink('#editor-controls', 'controls-return', 'Return to controls'));
  const updateZoomSafety = () => {
    const zoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    preview.classList.toggle('preview-zoomed', zoom >= 2);
    document.documentElement.classList.toggle('editor-zoomed', zoom >= 2);
  };
  const observer = new MutationObserver(updateZoomSafety);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  updateZoomSafety();
  return () => { observer.disconnect(); document.documentElement.classList.remove('editor-zoomed'); };
}