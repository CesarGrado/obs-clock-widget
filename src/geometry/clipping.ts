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
