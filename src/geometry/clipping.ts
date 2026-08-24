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
  suggestedFixes: string[];
}

export type ClippedEdge = 'left' | 'top' | 'right' | 'bottom';

export interface ClippingIssue {
  elementId: string;
  label: string;
  clippedEdges: ClippedEdge[];
  suggestedFixes: string[];
}

export function evaluateElementBounds(
  viewport: ViewportBounds,
  elements: RenderedElementBounds[],
): ClippingIssue[] {
  return elements.flatMap((element) => {
    if (!element.enabled || !element.visible) return [];

    const clippedEdges: ClippedEdge[] = [];
    if (element.bounds.left < 0) clippedEdges.push('left');
    if (element.bounds.top < 0) clippedEdges.push('top');
    if (element.bounds.right > viewport.width) clippedEdges.push('right');
    if (element.bounds.bottom > viewport.height) clippedEdges.push('bottom');

    return clippedEdges.length === 0 ? [] : [{
      elementId: element.elementId,
      label: element.label,
      clippedEdges,
      suggestedFixes: element.suggestedFixes,
    }];
  });
}
