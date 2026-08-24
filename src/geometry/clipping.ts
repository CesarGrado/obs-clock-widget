export interface ViewportBounds {
  width: number;
  height: number;
}

export interface RenderedBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface RenderedElementBounds {
  elementId: string;
  label: string;
  enabled: boolean;
  visible: boolean;
  bounds: RenderedBounds;
  paintMargins?: RenderedBounds;
  suggestedFixes: string[];
}

export type ClippedEdge = 'left' | 'top' | 'right' | 'bottom';

export interface ClippingIssue {
  elementId: string;
  label: string;
  clippedEdges: ClippedEdge[];
  suggestedFixes: string[];
}

export interface ElementBoundsDescriptor {
  node: HTMLElement;
  elementId: string;
  label: string;
  enabled: boolean;
  paintMargins?: RenderedBounds;
  suggestedFixes: string[];
}

export function collectElementBounds(
  viewport: HTMLElement,
  elements: ElementBoundsDescriptor[],
): RenderedElementBounds[] {
  const viewportRect = viewport.getBoundingClientRect();
  return elements.map((element) => {
    const rect = element.node.getBoundingClientRect();
    const style = getComputedStyle(element.node);
    return {
      elementId: element.elementId,
      label: element.label,
      enabled: element.enabled,
      visible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
      bounds: {
        left: rect.left - viewportRect.left,
        top: rect.top - viewportRect.top,
        right: rect.right - viewportRect.left,
        bottom: rect.bottom - viewportRect.top,
      },
      paintMargins: element.paintMargins,
      suggestedFixes: element.suggestedFixes,
    };
  });
}

export function evaluateElementBounds(
  viewport: ViewportBounds,
  elements: RenderedElementBounds[],
): ClippingIssue[] {
  return elements.flatMap((element) => {
    if (!element.enabled || !element.visible) return [];

    const margins = element.paintMargins ?? { left: 0, top: 0, right: 0, bottom: 0 };
    const clippedEdges: ClippedEdge[] = [];
    if (element.bounds.left - margins.left < 0) clippedEdges.push('left');
    if (element.bounds.top - margins.top < 0) clippedEdges.push('top');
    if (element.bounds.right + margins.right > viewport.width) clippedEdges.push('right');
    if (element.bounds.bottom + margins.bottom > viewport.height) clippedEdges.push('bottom');

    return clippedEdges.length === 0 ? [] : [{
      elementId: element.elementId,
      label: element.label,
      clippedEdges,
      suggestedFixes: element.suggestedFixes,
    }];
  });
}
